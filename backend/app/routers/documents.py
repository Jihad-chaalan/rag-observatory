from fastapi import APIRouter, UploadFile, File, Header, HTTPException
from tempfile import NamedTemporaryFile
import os
from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    CSVLoader,
    UnstructuredExcelLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.services.vectorstore import get_vector_store

router = APIRouter()

# Map file extensions to LangChain loaders
LOADER_MAP = {
    "txt": TextLoader,
    "pdf": PyPDFLoader,
    "csv": CSVLoader,
    "xlsx": UnstructuredExcelLoader,
    "docx": UnstructuredWordDocumentLoader,
    "pptx": UnstructuredPowerPointLoader,
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
        vector_store.persist()
        
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
    vector_store = get_vector_store(session_id)
    try:
        # Retrieve all stored chunks (limit 10000)
        result = vector_store.get(limit=10000)
        sources = set()
        for metadata in result.get('metadatas', []):
            if metadata and 'source' in metadata:
                sources.add(metadata['source'])
        return {"documents": list(sources)}
    except Exception as e:
        raise HTTPException(500, f"Failed to list documents: {str(e)}")

@router.delete("/delete/{filename}")
async def delete_document(
    filename: str,
    session_id: str = Header(..., alias="X-Session-Id")
):
    vector_store = get_vector_store(session_id)
    # Get all chunks with their metadata
    result = vector_store.get(limit=10000)
    ids_to_delete = []
    for i, metadata in enumerate(result.get('metadatas', [])):
        if metadata and metadata.get('source') == filename:
            ids_to_delete.append(result['ids'][i])
    
    if not ids_to_delete:
        raise HTTPException(404, f"Document '{filename}' not found")
    
    vector_store.delete(ids=ids_to_delete)
    vector_store.persist()
    return {"message": f"Deleted {filename}", "chunks_removed": len(ids_to_delete)}