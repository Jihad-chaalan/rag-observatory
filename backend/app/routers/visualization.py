from fastapi import APIRouter, Header, HTTPException
from sklearn.manifold import TSNE
import numpy as np
from app.services.vectorstore import get_vector_store

router = APIRouter()

@router.get("/tsne")
async def get_tsne(session_id: str = Header(..., alias="X-Session-Id")):
    """
    Returns t‑SNE coordinates for all chunk embeddings in the session.
    """
    vector_store = get_vector_store(session_id)
    
    # Retrieve all stored data: ids, embeddings, metadatas, documents
    result = vector_store.get(limit=10000, include=["embeddings", "metadatas", "documents"])
    
    if not result['ids']:
        return {"points": []}
    
    embeddings = np.array(result['embeddings'])
    n_samples = len(embeddings)
    
    # t‑SNE requires perplexity < n_samples, and at least 2 samples
    if n_samples == 1:
        # Just return a single point at (0,0) with its metadata
        points = [{
            "x": 0.0,
            "y": 0.0,
            "filename": result['metadatas'][0].get("source", "unknown"),
            "chunk_text": result['documents'][0][:100] + "...",
            "chunk_index": 0
        }]
        return {"points": points}
    
    # Set perplexity (default 30, but cannot exceed n_samples-1)
    perplexity = min(30, n_samples - 1)
    
    tsne = TSNE(n_components=2, random_state=42, perplexity=perplexity)
    coords = tsne.fit_transform(embeddings)
    
    points = []
    for i, (x, y) in enumerate(coords):
        points.append({
            "x": float(x),
            "y": float(y),
            "filename": result['metadatas'][i].get("source", "unknown"),
            "chunk_text": result['documents'][i][:100] + "...",
            "chunk_index": i
        })
    
    return {"points": points}