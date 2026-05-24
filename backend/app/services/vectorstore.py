from langchain_community.vectorstores import PGVector
from app.services.embedding import get_embedding_function
from sqlalchemy import create_engine, text
import os

# def get_vector_store(session_id: str):
#     connection_string = os.getenv("DATABASE_URL")
#     if not connection_string:
#         raise RuntimeError("DATABASE_URL environment variable not set")
    
#     collection_name = f"session_{session_id.replace('-', '_')}"
    
#     return PGVector(
#         connection_string=connection_string,
#         collection_name=collection_name,
#         embedding_function=get_embedding_function(),
#         # Use cosine similarity (default)
#     )

def get_vector_store(session_id: str):
    connection_string = os.getenv("DATABASE_URL")
    if not connection_string:
        raise RuntimeError("DATABASE_URL not set")
    try:
        return PGVector(
            connection_string=connection_string,
            collection_name=f"session_{session_id.replace('-', '_')}",
            embedding_function=get_embedding_function(),
        )
    except Exception as e:
        print(f"❌ PGVector init error: {e}")
        raise



