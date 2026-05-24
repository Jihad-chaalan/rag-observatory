import os
import json
import numpy as np
from fastapi import APIRouter, Header, HTTPException
from sklearn.manifold import TSNE
from sqlalchemy import create_engine, text

router = APIRouter()

@router.get("/tsne")
async def get_tsne(session_id: str = Header(..., alias="X-Session-Id")):
    connection_string = os.getenv("DATABASE_URL")
    if not connection_string:
        raise HTTPException(500, "DATABASE_URL not set")
    engine = create_engine(connection_string)
    collection_name = f"session_{session_id.replace('-', '_')}"
    
    with engine.connect() as conn:
        # Get collection UUID
        result = conn.execute(
            text("SELECT uuid FROM langchain_pg_collection WHERE name = :name"),
            {"name": collection_name}
        )
        row = result.fetchone()
        if not row:
            return {"points": []}
        coll_uuid = row[0]
        
        # Fetch embeddings, documents, metadata
        rows = conn.execute(
            text("SELECT embedding, document, cmetadata FROM langchain_pg_embedding WHERE collection_id = :cid"),
            {"cid": coll_uuid}
        ).fetchall()
        
        if not rows:
            return {"points": []}
        
        # Parse embedding strings into lists of floats
        embeddings = []
        documents = []
        metadatas = []
        for emb_str, doc, meta in rows:
            # Remove the 'np.str_' wrapper if present, then parse JSON
            emb_str_clean = str(emb_str).replace("np.str_('", "").replace("')", "")
            # Parse the list string
            try:
                emb_list = json.loads(emb_str_clean)
                embeddings.append(emb_list)
            except:
                # Fallback: eval (unsafe but quick for known format)
                emb_list = eval(emb_str_clean)
                embeddings.append(emb_list)
            documents.append(doc)
            metadatas.append(meta)
        
        embeddings_np = np.array(embeddings, dtype=np.float32)
        n_samples = len(embeddings_np)
        
        if n_samples == 1:
            points = [{
                "x": 0.0,
                "y": 0.0,
                "filename": metadatas[0].get("source", "unknown"),
                "chunk_text": documents[0][:100] + "...",
                "chunk_index": 0
            }]
            return {"points": points}
        
        perplexity = min(30, n_samples - 1) if n_samples > 1 else 1
        tsne = TSNE(n_components=2, random_state=42, perplexity=perplexity)
        coords = tsne.fit_transform(embeddings_np)
        
        points = []
        for i, (x, y) in enumerate(coords):
            points.append({
                "x": float(x),
                "y": float(y),
                "filename": metadatas[i].get("source", "unknown"),
                "chunk_text": documents[i][:100] + "...",
                "chunk_index": i
            })
        return {"points": points}