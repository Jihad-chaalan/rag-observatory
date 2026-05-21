from pydantic import BaseModel, Field
from typing import List, Optional

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)

class Source(BaseModel):
    filename: str
    chunk_text: str
    similarity: float

 # token usage, latency, timestamp

class LogEntry(BaseModel):
    timestamp: float
    question: str
    answer: str
    sources: List[str]
    confidence: float
    token_usage: dict
    latency: float

class ChatResponse(BaseModel):
    answer: str
    sources: List[Source]
    confidence: float
    logs: LogEntry  