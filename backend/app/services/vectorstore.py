from langchain_community.vectorstores import Chroma
from app.services.embedding import get_embedding_function
import os

def get_vector_store(session_id: str):
    # Each session gets its own subfolder inside chroma_data/
    persist_dir = f"./chroma_data/session_{session_id.replace('-', '_')}"
    os.makedirs(persist_dir, exist_ok=True)
    return Chroma(
        persist_directory=persist_dir,
        embedding_function=get_embedding_function(),
        collection_name="documents"
    )