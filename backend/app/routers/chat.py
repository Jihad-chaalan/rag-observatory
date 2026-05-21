from fastapi import APIRouter, Header, HTTPException
from app.models.chat import ChatRequest, ChatResponse, Source, LogEntry
from app.services.vectorstore import get_vector_store
from app.services.llm import call_groq
from app.config import settings
from app.services.session_manager import add_log, get_logs
import time

router = APIRouter()

SYSTEM_PROMPT = """You are a helpful assistant that answers questions **strictly based on the provided context**.
- If the answer is not present in the context, say: "I don't have enough information in the uploaded documents to answer that."
- Do not use any external knowledge, common sense, or your own training data.
- Only cite facts that appear in the given context.
- Keep the answer concise and directly from the context.
"""

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    session_id: str = Header(..., alias="X-Session-Id")
):
    start_time = time.time()
    try:
        vector_store = get_vector_store(session_id)
        docs_with_scores = vector_store.similarity_search_with_score(
            request.question, k=settings.TOP_K
        )
        
        # Case: no documents at all
        if not docs_with_scores:
            answer = "No documents have been uploaded to this session. Please upload files first."
            confidence = 0.0
            sources = []
            token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            latency = time.time() - start_time
            
            log_entry = LogEntry(
                timestamp=start_time,
                question=request.question,
                answer=answer,
                sources=[],
                confidence=confidence,
                token_usage=token_usage,
                latency=latency
            )
            add_log(session_id, log_entry.dict())
            # ✅ Return dict version
            return ChatResponse(answer=answer, sources=[], confidence=confidence, logs=log_entry.dict())
        
        valid_chunks = []
        for doc, score in docs_with_scores:
            # Correct cosine similarity from Euclidean distance
            cosine_sim = 1 - (score ** 2) / 2
            similarity = max(0.0, min(1.0, cosine_sim))
            print(f"Distance: {score}, Cosine Similarity: {similarity}")
            if similarity >= settings.RETRIEVAL_THRESHOLD:
                valid_chunks.append((doc, similarity))
                
        # Case: no chunks above threshold
        if not valid_chunks:
            answer = "I don't have enough information in the uploaded documents to answer that (low relevance)."
            confidence = 0.0
            sources = []
            token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            latency = time.time() - start_time
            
            log_entry = LogEntry(
                timestamp=start_time,
                question=request.question,
                answer=answer,
                sources=[],
                confidence=confidence,
                token_usage=token_usage,
                latency=latency
            )
            add_log(session_id, log_entry.dict())
            # ✅ Return dict version
            return ChatResponse(answer=answer, sources=[], confidence=confidence, logs=log_entry.dict())
        
        # Build context
        context = "\n\n---\n\n".join([chunk.page_content for chunk, _ in valid_chunks])
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {request.question}"}
        ]
        
        answer, usage, llm_latency = call_groq(messages, model="openai/gpt-oss-120b")
        
        if answer is None:
            answer = "Sorry, an error occurred while processing your request. Please try again."
            confidence = 0.0
            sources = []
            token_usage = usage if usage else {}
            latency = time.time() - start_time
        else:
            sources = [
                Source(
                    filename=doc.metadata.get("source", "unknown"),
                    chunk_text=doc.page_content[:200] + "...",
                    similarity=sim
                )
                for doc, sim in valid_chunks
            ]
            confidence = sum(sim for _, sim in valid_chunks) / len(valid_chunks)
            token_usage = usage
            latency = time.time() - start_time
        
        log_entry = LogEntry(
            timestamp=start_time,
            question=request.question,
            answer=answer,
            sources=[s.filename for s in sources],
            confidence=confidence,
            token_usage=token_usage,
            latency=latency
        )
        add_log(session_id, log_entry.dict())
        # ✅ Return dict version
        return ChatResponse(
            answer=answer,
            sources=sources,
            confidence=confidence,
            logs=log_entry.dict()
        )
        
    except Exception as e:
        error_log_entry = LogEntry(
            timestamp=time.time(),
            question=request.question,
            answer=f"System error: {str(e)}",
            sources=[],
            confidence=0.0,
            token_usage={},
            latency=time.time() - start_time
        )
        add_log(session_id, error_log_entry.dict())
        # ✅ Return dict version
        return ChatResponse(
            answer=error_log_entry.answer,
            sources=[],
            confidence=0.0,
            logs=error_log_entry.dict()
        )

@router.get("/logs")
async def get_session_logs(session_id: str = Header(..., alias="X-Session-Id")):
    logs = get_logs(session_id)
    return {"logs": logs}