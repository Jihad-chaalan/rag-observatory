from fastapi import APIRouter, UploadFile, File, Header, HTTPException, BackgroundTasks
from tempfile import NamedTemporaryFile
from sqlalchemy import create_engine, text
import os
import gc
import shutil
import time
import threading
import asyncio
import uuid
import logging
from typing import Iterator, Tuple, Optional, Dict

from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from app.services.vectorstore import get_vector_store


logger = logging.getLogger("app.routers.documents")

# ---------- Document import compatibility ----------
try:
    from langchain_core.documents import Document
except Exception:
    try:
        from langchain_core.documents import Document
    except Exception:
        class Document:
            def __init__(self, page_content: str, metadata: dict = None):
                self.page_content = page_content
                self.metadata = metadata or {}

router = APIRouter()

# ---------- Configuration ----------
BATCH_SIZE = int(os.getenv("UPLOAD_BATCH_SIZE", "32"))
MAX_CHUNKS = int(os.getenv("MAX_CHUNKS", "2000"))
CHUNK_SIZE_LARGE = 1500
CHUNK_OVERLAP_LARGE = 150
CHUNK_SIZE_MEDIUM = 1000
CHUNK_OVERLAP_MEDIUM = 100
CHUNK_SIZE_SMALL = 500
CHUNK_OVERLAP_SMALL = 50
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT_UPLOADS", "2"))
_processing_semaphore = threading.Semaphore(MAX_CONCURRENT)

# ---------- Database engine (reused) ----------
DATABASE_URL = os.getenv("DATABASE_URL")
_engine = create_engine(DATABASE_URL) if DATABASE_URL else None

# ---------- Job tracking (in-memory) ----------
# Simple in-memory job store: job_id -> {status, created_at, started_at, finished_at, message, progress}
# For persistence across restarts, replace with DB/Redis.
_jobs: Dict[str, dict] = {}

# ---------- Streaming document generators ----------
def stream_pdf_pages(file_path: str, filename: str) -> Iterator[Document]:
    """Yield one Document per PDF page using a binary stream (pypdf may still allocate)."""
    with open(file_path, "rb") as f:
        reader = PdfReader(f)
        for page_num, page in enumerate(reader.pages):
            try:
                text = page.extract_text() or ""
            except Exception:
                text = ""
            if text.strip():
                yield Document(page_content=text, metadata={"source": filename, "page": page_num})

def stream_text_chunks(file_path: str, filename: str, target_chunk_size: int) -> Iterator[Document]:
    """Yield Document objects from a text file, building chunks up to target_chunk_size."""
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        buffer = ""
        for line in f:
            buffer += line
            while len(buffer) >= target_chunk_size:
                split_pos = buffer.rfind("\n", 0, target_chunk_size)
                if split_pos == -1:
                    split_pos = target_chunk_size
                yield Document(page_content=buffer[:split_pos], metadata={"source": filename})
                buffer = buffer[split_pos:]
        if buffer:
            yield Document(page_content=buffer, metadata={"source": filename})

# ---------- Helpers ----------
def _log(session_id: str, level: str, message: str):
    """Server-side logging only. Does NOT write to session chat logs."""
    msg = f"session={session_id} {message}"
    lvl = (level or "info").lower()
    if lvl == "debug":
        logger.debug(msg)
    elif lvl in ("warn", "warning"):
        logger.warning(msg)
    elif lvl == "error":
        logger.error(msg)
    else:
        logger.info(msg)

def _maybe_memlog(session_id: str):
    """Optional memory debug to server logs only."""
    try:
        import psutil
        rss = psutil.Process().memory_info().rss / (1024 * 1024)
        logger.debug("session=%s memory_rss_mb=%.1f", session_id, rss)
    except Exception:
        pass

def _choose_chunk_params(file_path: str) -> Tuple[int, int]:
    try:
        size = os.path.getsize(file_path)
    except Exception:
        size = 0
    if size > 100_000:
        return CHUNK_SIZE_LARGE, CHUNK_OVERLAP_LARGE
    elif size > 20_000:
        return CHUNK_SIZE_MEDIUM, CHUNK_OVERLAP_MEDIUM
    else:
        return CHUNK_SIZE_SMALL, CHUNK_OVERLAP_SMALL

# ---------- Processing worker (sync) ----------
def process_file(tmp_path: str, filename: str, session_id: str, job_id: Optional[str] = None):
    """
    Ingestion worker:
    - NO add_log calls (so observability/chat logs are only from question flow)
    - updates _jobs for frontend upload status polling
    - keeps batching/streaming/memory protections
    """
    start_ts = time.time()

    if job_id and job_id in _jobs:
        _jobs[job_id].update(
            {
                "status": "running",
                "started_at": start_ts,
                "finished_at": None,
                "message": None,
                "progress": {"chunks_processed": 0},
            }
        )

    acquired = _processing_semaphore.acquire(blocking=False)
    if not acquired:
        _log(session_id, "warning", "too many concurrent uploads, waiting for a slot")
        _processing_semaphore.acquire()
        acquired = True

    try:
        _log(session_id, "info", f"processing started for {filename}")

        ext = filename.split(".")[-1].lower()
        if ext not in ("pdf", "txt"):
            msg = f"unsupported extension: {ext}"
            _log(session_id, "error", msg)
            if job_id and job_id in _jobs:
                _jobs[job_id].update(
                    {"status": "failed", "finished_at": time.time(), "message": msg}
                )
            return

        chunk_size, chunk_overlap = _choose_chunk_params(tmp_path)
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""],
        )

        vector_store = get_vector_store(session_id)
        batch = []
        total_chunks = 0
        progress_interval = max(1, BATCH_SIZE * 2)

        if ext == "pdf":
            doc_stream = stream_pdf_pages(tmp_path, filename)
        else:
            doc_stream = stream_text_chunks(tmp_path, filename, target_chunk_size=chunk_size)

        for doc in doc_stream:
            try:
                doc.page_content = doc.page_content.replace("\x00", "")
            except Exception:
                pass

            if not getattr(doc, "metadata", None):
                doc.metadata = {}
            doc.metadata["source"] = filename

            doc_chunks = text_splitter.split_documents([doc])

            for chunk in doc_chunks:
                batch.append(chunk)
                total_chunks += 1

                if total_chunks > MAX_CHUNKS:
                    msg = f"rejected: would exceed {MAX_CHUNKS} chunks"
                    _log(session_id, "error", msg)
                    if job_id and job_id in _jobs:
                        _jobs[job_id].update(
                            {
                                "status": "failed",
                                "finished_at": time.time(),
                                "message": msg,
                                "progress": {"chunks_processed": total_chunks},
                            }
                        )
                    return

                if len(batch) >= BATCH_SIZE:
                    try:
                        vector_store.add_documents(batch)
                    except Exception as e:
                        msg = f"vector_store.add_documents failed: {e}"
                        _log(session_id, "error", msg)
                        if job_id and job_id in _jobs:
                            _jobs[job_id].update(
                                {
                                    "status": "failed",
                                    "finished_at": time.time(),
                                    "message": str(e),
                                    "progress": {"chunks_processed": total_chunks},
                                }
                            )
                        return

                    batch.clear()
                    gc.collect()
                    _maybe_memlog(session_id)

                if job_id and (total_chunks % progress_interval == 0) and (job_id in _jobs):
                    _jobs[job_id]["progress"] = {"chunks_processed": total_chunks}
                    _jobs[job_id]["message"] = f"processed {total_chunks} chunks"

            del doc_chunks
            gc.collect()

        if batch:
            try:
                vector_store.add_documents(batch)
            except Exception as e:
                msg = f"final flush failed: {e}"
                _log(session_id, "error", msg)
                if job_id and job_id in _jobs:
                    _jobs[job_id].update(
                        {
                            "status": "failed",
                            "finished_at": time.time(),
                            "message": str(e),
                            "progress": {"chunks_processed": total_chunks},
                        }
                    )
                return
            batch.clear()
            gc.collect()
            _maybe_memlog(session_id)

        finished_ts = time.time()
        elapsed = finished_ts - start_ts
        _log(
            session_id,
            "info",
            f"processing finished for {filename}, chunks={total_chunks}, elapsed={elapsed:.2f}s",
        )

        if job_id and job_id in _jobs:
            _jobs[job_id].update(
                {
                    "status": "completed",
                    "finished_at": finished_ts,
                    "message": None,
                    "progress": {"chunks_processed": total_chunks},
                }
            )

    except Exception as e:
        _log(session_id, "error", f"processing error for {filename}: {e}")
        if job_id and job_id in _jobs:
            _jobs[job_id].update(
                {
                    "status": "failed",
                    "finished_at": time.time(),
                    "message": str(e),
                }
            )
    finally:
        try:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        except Exception:
            pass

        if acquired:
            _processing_semaphore.release()

# ---------- Async helper to schedule the sync worker in a thread ----------
async def process_file_async(tmp_path: str, filename: str, session_id: str, job_id: Optional[str] = None):
    await asyncio.to_thread(process_file, tmp_path, filename, session_id, job_id)

# ---------- Schedule helper for BackgroundTasks ----------
def schedule_process(tmp_path: str, filename: str, session_id: str, job_id: Optional[str] = None):
    """
    This function is invoked by FastAPI BackgroundTasks after response.
    It schedules the async worker as a task on the running loop so the actual work runs asynchronously.
    """
    try:
        loop = asyncio.get_running_loop()
        # schedule to run in a thread without blocking the loop
        loop.create_task(process_file_async(tmp_path, filename, session_id, job_id))
    except RuntimeError:
        # No running loop — fallback to starting a new thread (rare in FastAPI)
        threading.Thread(target=lambda: process_file(tmp_path, filename, session_id, job_id), daemon=True).start()

# ---------- Endpoints ----------
@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Header(..., alias="X-Session-Id"),
    background_tasks: BackgroundTasks = None
):
    """
    Accepts the upload, streams it to disk, creates a job id, schedules processing,
    and returns immediately with a job id the client can poll via /documents/status/{job_id}.
    """
    filename = file.filename
    ext = filename.split(".")[-1].lower()
    if ext not in ("pdf", "txt"):
        raise HTTPException(400, f"Unsupported file type. Allowed: pdf, txt")

    # Stream uploaded file to disk WITHOUT loading full content into memory
    with NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp_path = tmp.name
        try:
            try:
                file.file.seek(0)
            except Exception:
                pass
            shutil.copyfileobj(file.file, tmp)
        except Exception as e:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise HTTPException(500, f"Failed to save upload: {e}")

    _log(session_id, "info", f"upload accepted: {filename}")

    # create job record
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "status": "scheduled",
        "created_at": time.time(),
        "started_at": None,
        "finished_at": None,
        "message": None,
        "progress": {"chunks_processed": 0},
        "filename": filename,
        "session_id": session_id,
    }

    # schedule processing via BackgroundTasks
    if background_tasks is not None:
        background_tasks.add_task(schedule_process, tmp_path, filename, session_id, job_id)
        return {"status": "accepted", "job_id": job_id, "session_id": session_id}
    else:
        # fallback: schedule on loop (awaitable)
        asyncio.create_task(process_file_async(tmp_path, filename, session_id, job_id))
        return {"status": "accepted", "job_id": job_id, "session_id": session_id}

@router.get("/status/{job_id}")
async def job_status(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    return job

@router.get("/list")
async def list_documents(session_id: str = Header(..., alias="X-Session-Id")):
    if _engine is None:
        raise HTTPException(500, "DATABASE_URL not set")
    collection_name = f"session_{session_id.replace('-', '_')}"
    with _engine.connect() as conn:
        result = conn.execute(
            text("SELECT uuid FROM langchain_pg_collection WHERE name = :name"),
            {"name": collection_name}
        )
        row = result.fetchone()
        if not row:
            return {"documents": []}
        coll_uuid = row[0]
        rows = conn.execute(
            text("SELECT DISTINCT cmetadata->>'source' as source FROM langchain_pg_embedding WHERE collection_id = :cid AND cmetadata->>'source' IS NOT NULL"),
            {"cid": coll_uuid}
        )
        sources = [r[0] for r in rows.fetchall() if r[0]]
        return {"documents": sources}

@router.delete("/delete/{filename}")
async def delete_document(
    filename: str,
    session_id: str = Header(..., alias="X-Session-Id")
):
    if _engine is None:
        raise HTTPException(500, "DATABASE_URL not set")
    collection_name = f"session_{session_id.replace('-', '_')}"
    with _engine.connect() as conn:
        result = conn.execute(
            text("SELECT uuid FROM langchain_pg_collection WHERE name = :name"),
            {"name": collection_name}
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(404, f"Document '{filename}' not found")
        coll_uuid = row[0]
        res = conn.execute(
            text("DELETE FROM langchain_pg_embedding WHERE collection_id = :cid AND cmetadata->>'source' = :src"),
            {"cid": coll_uuid, "src": filename}
        )
        conn.commit()
        deleted_count = res.rowcount
        if deleted_count == 0:
            raise HTTPException(404, f"Document '{filename}' not found")
        return {"message": f"Deleted {filename}", "chunks_removed": deleted_count}