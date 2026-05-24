from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from app.services.session_manager import init_session_manager
from app.routers import session, documents, chat, visualization
import os
import json

@asynccontextmanager
async def lifespan(app: FastAPI):
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL not set")
    init_session_manager(database_url=database_url, ttl_seconds=3600)
    yield

app = FastAPI(title="RAG Observatory", lifespan=lifespan)


cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env and cors_origins_env.strip():
    try:
        allow_origins = json.loads(cors_origins_env)
    except json.JSONDecodeError:
        print("Invalid CORS_ORIGINS JSON, using defaults")
        allow_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
else:
    allow_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
