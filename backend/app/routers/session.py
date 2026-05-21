# backend/app/routers/session.py
from fastapi import APIRouter, Header, HTTPException
from app.services.session_manager import update_heartbeat

router = APIRouter()

@router.post("/heartbeat")
async def heartbeat(session_id: str = Header(..., alias="X-Session-Id")):
    if not session_id:
        raise HTTPException(status_code=400, detail="X-Session-Id header required")
    update_heartbeat(session_id)
    return {"status": "ok", "session_id": session_id}