# backend/app/dependencies.py
import chromadb
from functools import lru_cache

@lru_cache()
def get_chroma_client():
    # In Docker, path will be mounted volume; for dev, local folder
    return chromadb.PersistentClient(path="./chroma_data")