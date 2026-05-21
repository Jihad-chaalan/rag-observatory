# backend/app/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.dependencies import get_chroma_client
from app.services.session_manager import init_session_manager
from app.routers import session, documents, chat, visualization
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    chroma_client = get_chroma_client()
    init_session_manager(chroma_client, ttl_seconds=3600)
    yield
    # Shutdown: anything needed (nothing special)

app = FastAPI(title="RAG Observatory", lifespan=lifespan)

app.include_router(session.router, prefix="/session", tags=["session"])
app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(visualization.router, prefix="/visualization", tags=["visualization"])


@app.get("/")
async def root():
    return {"message": "FastAPI server is working"}


@app.get("/health")
async def health():
    return {"status": "ok"}