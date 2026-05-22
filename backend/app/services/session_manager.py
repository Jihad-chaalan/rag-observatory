# backend/app/services/session_manager.py
import time
import threading
from typing import Dict
import chromadb
from collections import defaultdict
from app.models.chat import LogEntry
import os
import shutil


_session_logs = defaultdict(list)  # session_id -> list of LogEntry dicts

_active_sessions: Dict[str, float] = {}  # session_id -> last_heartbeat timestamp
_chroma_client = None
_ttl_seconds = 3600  # default 1 hour
_cleanup_thread = None

def init_session_manager(data_root: str = "./chroma_data", ttl_seconds: int = 3600):
    global _ttl_seconds, _data_root, _cleanup_thread
    _ttl_seconds = ttl_seconds
    _data_root = data_root
    os.makedirs(_data_root, exist_ok=True)

    def cleanup_loop():
        while True:
            time.sleep(300)
            now = time.time()
            expired = [sid for sid, ts in _active_sessions.items() if now - ts > _ttl_seconds]
            for sid in expired:
                session_dir = os.path.join(_data_root, f"session_{sid.replace('-', '_')}")
                print(f"Deleting session dir: {session_dir}") 
                if os.path.exists(session_dir):
                    shutil.rmtree(session_dir, ignore_errors=True)
                del _active_sessions[sid]
            if expired:
                print(f"Cleanup: removed {len(expired)} expired sessions. Active: {len(_active_sessions)}")

    _cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
    _cleanup_thread.start()

def update_heartbeat(session_id: str):
    _active_sessions[session_id] = time.time()

def get_session_collection(session_id: str):
    """Return ChromaDB collection for this session (create if not exists)"""
    if _chroma_client is None:
        raise RuntimeError("Session manager not initialized")
    coll_name = f"session_{session_id.replace('-', '_')}"
    return _chroma_client.get_or_create_collection(name=coll_name)

def add_log(session_id: str, log_entry: dict):
    _session_logs[session_id].append(log_entry)

def get_logs(session_id: str):
    return _session_logs.get(session_id, [])