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

    # def cleanup_loop():
    #     while True:
    #         time.sleep(300)
    #         now = time.time()
    #         expired = [sid for sid, ts in _active_sessions.items() if now - ts > _ttl_seconds]
    #         for sid in expired:
    #             session_dir = os.path.join(_data_root, f"session_{sid.replace('-', '_')}")
    #             print(f"Deleting session dir: {session_dir}") 
    #             if os.path.exists(session_dir):
    #                 shutil.rmtree(session_dir, ignore_errors=True)
    #             del _active_sessions[sid]
    #         if expired:
    #             print(f"Cleanup: removed {len(expired)} expired sessions. Active: {len(_active_sessions)}")

    def cleanup_loop():
        while True:
            time.sleep(300)  # every 5 minutes
            now = time.time()
            expired = [sid for sid, ts in _active_sessions.items() if now - ts > _ttl_seconds]
            for sid in expired:
                session_dir = os.path.join(_data_root, f"session_{sid.replace('-', '_')}")
            #    Use absolute path for clarity
                abs_dir = os.path.abspath(session_dir)
                print(f"Attempting to delete: {abs_dir}")
                if os.path.exists(abs_dir):
                    try:
                        # Retry up to 3 times with a small delay
                        for attempt in range(3):
                            try:
                                shutil.rmtree(abs_dir)   # no ignore_errors
                                print(f"Successfully deleted {abs_dir}")
                                break
                            except PermissionError as e:
                                print(f"Attempt {attempt+1} failed: {e}")
                                time.sleep(1)  # wait and retry
                            except Exception as e:
                                print(f"Unexpected error: {e}")
                                break
                        else:
                            print(f"Failed to delete {abs_dir} after 3 attempts")
                    except Exception as e:
                        print(f"Final error deleting {abs_dir}: {e}")
                else:
                    print(f"Directory does not exist: {abs_dir}")
                # Remove from active sessions regardless
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