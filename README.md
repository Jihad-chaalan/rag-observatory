# 🔍 RAG Observatory – Full‑Stack RAG Platform

**RAG Observatory** is a production‑ready, session‑isolated Retrieval‑Augmented Generation (RAG) system that lets users upload documents, chat with them, and visualise embeddings. Built with **FastAPI**, **LangChain**, **PostgreSQL + pgvector**, **React (Vite)**, and **Groq** (via Cloudflare proxy). Deployed on **DigitalOcean** and **Vercel**.

![alt text](image-1.png)

_Live demo: [https://rag-observatory.vercel.app](https://rag-observatory.vercel.app)_

---

## ✨ Features

- 📄 **Multi‑format upload** – PDF, TXT, CSV, Markdown (extensible)
- 🧠 **Smart chunking** – dynamic chunk size based on document length, batch embedding to avoid OOM
- 🔍 **Vector search** – PostgreSQL + pgvector, session‑isolated collections
- 💬 **RAG chatbot** – answers only from uploaded documents, with **sources**, **confidence score**, and **token usage / latency logs**
- 📊 **t‑SNE visualisation** – interactive 2D plot of all chunks (hover shows source)
- 🧹 **Session management** – heartbeats, automatic idle cleanup (1 hour)
- 🚀 **Production ready** – Dockerised backend, Vercel frontend, Cloudflare proxy for Groq
- 🔒 **Secure** – API keys stored as Cloudflare secrets, HTTPS via Let's Encrypt + DuckDNS

---

## 🛠️ Tech Stack

| Layer      | Technology                                                                  |
| ---------- | --------------------------------------------------------------------------- |
| Frontend   | React 18 + Vite + Axios + Plotly.js + React Dropzone                        |
| Backend    | FastAPI + LangChain + pgvector + uvicorn                                    |
| Vector DB  | PostgreSQL + pgvector (hosted on Neon, free tier)                           |
| Embeddings | FastEmbed (`BAAI/bge-small-en-v1.5`) – CPU‑optimised, no torch              |
| LLM        | Groq (`openai/gpt-oss-120b`) via Cloudflare Workers proxy                   |
| Deployment | Backend: DigitalOcean Droplet (Docker), Frontend: Vercel, Proxy: Cloudflare |
| Monitoring | Docker logs + `docker stats` + DigitalOcean metrics                         |

---

## 🏗️ Architecture

```mermaid
graph LR
    User --> Vercel[Frontend (Vercel)]
    Vercel --> DO[Backend (DigitalOcean)]
    DO --> Neon[(Neon PostgreSQL + pgvector)]
    DO --> CF[Cloudflare Worker (Groq proxy)]
    CF --> Groq[Groq API]
Frontend sends requests to https://api.yourdomain.com.

Backend (FastAPI) runs inside a Docker container, handles document processing, retrieval, and chat.

Vector store is a session‑isolated pgvector collection in Neon (free tier).

Groq calls go through a Cloudflare Worker that injects the API key, bypassing IP restrictions.

📈 Performance Optimisations
Dynamic chunk sizing – 500/1000/1500 chars based on document length.

Batch embedding – 100 chunks per batch, gc.collect() after each.

Lightweight embedding – BAAI/bge-small-en-v1.5 (67 MB, no torch).

Cloudflare proxy – bypasses Groq IP blocks, adds security.

🔐 Environment Variables
Variable	Description
DATABASE_URL	Neon PostgreSQL connection string
GROQ_API_KEY	Groq API key (not used directly if proxy)
PROXY_BASE_URL	Cloudflare Worker base URL
PROXY_ACCESS_TOKEN	Optional: auth token for Worker
RETRIEVAL_THRESHOLD	Minimum cosine similarity for retrieval
TOP_K	Number of chunks retrieved per query
🤝 Contributing
This is a personal portfolio project, but feedback and suggestions are welcome.


🙏 Acknowledgements
LangChain

FastEmbed

Groq

Cloudflare Workers

Vercel

DigitalOcean
```
