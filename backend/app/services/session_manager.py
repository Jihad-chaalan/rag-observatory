# backend/app/services/session_manager.py
import time
import threading
from typing import Dict
from collections import defaultdict
from app.models.chat import LogEntry
import os
from sqlalchemy import create_engine, text

_session_logs = defaultdict(list)
_active_sessions: Dict[str, float] = {}
_ttl_seconds = 3600
_cleanup_thread = None
_database_url = None   # will be set from environment

def init_session_manager(database_url: str, ttl_seconds: int = 3600):
    global _ttl_seconds, _cleanup_thread, _database_url
    _ttl_seconds = ttl_seconds
    _database_url = database_url

    def cleanup_loop():
        while True:
            time.sleep(300)  # every 5 minutes
            now = time.time()
            expired = [sid for sid, ts in _active_sessions.items() if now - ts > _ttl_seconds]
            for sid in expired:
                if _database_url:
                    delete_session_vectors(sid, _database_url)
                del _active_sessions[sid]
            if expired:
                print(f"Cleanup: removed {len(expired)} expired sessions. Active: {len(_active_sessions)}")

    _cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
    _cleanup_thread.start()

def delete_session_vectors(session_id: str, connection_string: str):
    """Delete all vectors and the collection for a given session ID."""
    engine = create_engine(connection_string)
    collection_name = f"session_{session_id.replace('-', '_')}"
    with engine.connect() as conn:
        # Get the collection UUID
        result = conn.execute(
            text("SELECT uuid FROM langchain_pg_collection WHERE name = :name"),
            {"name": collection_name}
        )
        row = result.fetchone()
        if not row:
            print(f"Collection {collection_name} not found, nothing to delete.")
            return
        coll_uuid = row[0]
        # Delete embedding vectors
        conn.execute(
            text("DELETE FROM langchain_pg_embedding WHERE collection_id = :cid"),
            {"cid": coll_uuid}
        )
        # Delete the collection itself
        conn.execute(
            text("DELETE FROM langchain_pg_collection WHERE uuid = :cid"),
            {"cid": coll_uuid}
        )
        conn.commit()
        print(f"Deleted collection {collection_name} and its vectors.")



def update_heartbeat(session_id: str):
    _active_sessions[session_id] = time.time()

def add_log(session_id: str, log_entry: dict):
    _session_logs[session_id].append(log_entry)

def get_logs(session_id: str):
    return _session_logs.get(session_id, [])