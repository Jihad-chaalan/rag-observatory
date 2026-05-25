from fastapi import APIRouter, UploadFile, File, Header, HTTPException
from tempfile import NamedTemporaryFile
from sqlalchemy import create_engine, text
import os
from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    CSVLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.services.vectorstore import get_vector_store

router = APIRouter()

# Map file extensions to LangChain loaders
LOADER_MAP = {
    "txt": TextLoader,
    "pdf": PyPDFLoader,
    "csv": CSVLoader,
}

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Header(..., alias="X-Session-Id")
):
    filename = file.filename
    ext = filename.split('.')[-1].lower()
    if ext not in LOADER_MAP:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(LOADER_MAP.keys())}")
    
    # Save uploaded file temporarily (LangChain loaders need a file path)
    with NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Load documents using the appropriate LangChain loader
        loader_class = LOADER_MAP[ext]
        loader = loader_class(tmp_path)
        docs = loader.load()
        
        if not docs:
            raise HTTPException(400, "No content extracted from file")
        
        # Add source filename to metadata of each document
        for doc in docs:
            doc.page_content = doc.page_content.replace('\x00', '')
            doc.metadata["source"] = filename
        
        # Chunk the documents
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n\n", "\n", " ", ""]
        )
        chunks = text_splitter.split_documents(docs)
        
        # Store in session‑specific vector store
        vector_store = get_vector_store(session_id)
        vector_store.add_documents(chunks)

        
        return {
            "message": f"Uploaded {filename}",
            "chunks": len(chunks),
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(500, f"Processing error: {str(e)}")
    finally:
        # Delete temporary file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

@router.get("/list")
async def list_documents(session_id: str = Header(..., alias="X-Session-Id")):
    connection_string = os.getenv("DATABASE_URL")
    if not connection_string:
        raise HTTPException(500, "DATABASE_URL not set")
    engine = create_engine(connection_string)
    collection_name = f"session_{session_id.replace('-', '_')}"
    with engine.connect() as conn:
        # Get collection UUID
        result = conn.execute(
            text("SELECT uuid FROM langchain_pg_collection WHERE name = :name"),
            {"name": collection_name}
        )
        row = result.fetchone()
        if not row:
            return {"documents": []}
        coll_uuid = row[0]
        # Get distinct source filenames from embeddings metadata
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
    connection_string = os.getenv("DATABASE_URL")
    if not connection_string:
        raise HTTPException(500, "DATABASE_URL not set")
    engine = create_engine(connection_string)
    collection_name = f"session_{session_id.replace('-', '_')}"
    with engine.connect() as conn:
        # Get collection UUID
        result = conn.execute(
            text("SELECT uuid FROM langchain_pg_collection WHERE name = :name"),
            {"name": collection_name}
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(404, f"Document '{filename}' not found")
        coll_uuid = row[0]
        # Delete embeddings where metadata source equals filename
        res = conn.execute(
            text("DELETE FROM langchain_pg_embedding WHERE collection_id = :cid AND cmetadata->>'source' = :src"),
            {"cid": coll_uuid, "src": filename}
        )
        conn.commit()
        deleted_count = res.rowcount
        if deleted_count == 0:
            raise HTTPException(404, f"Document '{filename}' not found")
        # Optionally delete collection if it becomes empty (but keep it for simplicity)
        return {"message": f"Deleted {filename}", "chunks_removed": deleted_count}