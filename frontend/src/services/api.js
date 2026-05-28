import axios from "axios";
import {
  readSessionCacheMeta,
  writeSessionCacheMeta,
} from "../utils/sessionCache";

const STORAGE_KEY = "rag_session_id";
const DEFAULT_REQUEST_TIMEOUT_MS = 120000;

function getSessionId() {
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, sessionId);
  }
  return sessionId;
}

function setSessionId(sessionId) {
  localStorage.setItem(STORAGE_KEY, sessionId);
}

function createClient(baseURL, timeout = DEFAULT_REQUEST_TIMEOUT_MS) {
  const client = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    timeout,
  });

  client.interceptors.request.use((config) => {
    config.headers["X-Session-Id"] = getSessionId();
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        error.code === "ECONNABORTED" ||
        String(error.message || "")
          .toLowerCase()
          .includes("timeout")
      ) {
        return Promise.reject(
          new Error(
            "Request timed out. The server is still processing this request.",
          ),
        );
      }
      if (error.response) {
        const message =
          error.response.data?.detail || error.response.statusText;
        return Promise.reject(new Error(message));
      }
      if (error.request) {
        return Promise.reject(
          new Error("Backend is unreachable. Is the server running?"),
        );
      }
      return Promise.reject(error);
    },
  );

  return client;
}

const proxyApi = createClient(import.meta.env.VITE_API_URL || "/api");
const directApi = createClient("http://localhost:8000");
const loopbackApi = createClient("http://127.0.0.1:8000");

async function requestWithFallback(config) {
  if (import.meta.env.PROD) {
    return proxyApi.request(config);
  }

  const clients = [proxyApi, directApi, loopbackApi];
  let lastError = null;
  for (const client of clients) {
    try {
      return await client.request(config);
    } catch (error) {
      lastError = error;
      if (error.message !== "Backend is unreachable. Is the server running?") {
        throw error;
      }
    }
  }
  throw lastError;
}

// API Methods

export async function sendHeartbeat() {
  try {
    await requestWithFallback({ method: "post", url: "/session/heartbeat" });
  } catch (error) {
    console.warn("Heartbeat failed:", error.message);
  }
}

export async function uploadFile(file, onUploadProgress = undefined) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await requestWithFallback({
    method: "post",
    url: "/documents/upload",
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
    timeout: 0,
  });
  return response.data; // expects { status: "accepted", job_id, session_id }
}

export async function getJobStatus(jobId) {
  const response = await requestWithFallback({
    method: "get",
    url: `/documents/status/${encodeURIComponent(jobId)}`,
  });
  return response.data; // job object
}

export async function deleteDocument(filename) {
  const response = await requestWithFallback({
    method: "delete",
    url: `/documents/delete/${encodeURIComponent(filename)}`,
  });
  return response.data;
}

export async function sendChat(question) {
  const response = await requestWithFallback({
    method: "post",
    url: "/chat/chat",
    data: { question },
  });
  return response.data;
}

export async function listDocuments() {
  const response = await requestWithFallback({
    method: "get",
    url: "/documents/list",
  });
  return response.data.documents;
}

export async function getLogs() {
  const response = await requestWithFallback({
    method: "get",
    url: "/chat/logs",
  });
  return response.data.logs;
}

export async function getTsne() {
  const response = await requestWithFallback({
    method: "get",
    url: "/visualization/tsne",
  });
  return response.data.points;
}

async function conditionalGet(path, namespace) {
  const meta = readSessionCacheMeta(namespace) || {};
  const headers = {};
  if (meta.etag) headers["If-None-Match"] = meta.etag;
  if (meta.lastModified) headers["If-Modified-Since"] = meta.lastModified;

  const response = await requestWithFallback({
    method: "get",
    url: path,
    headers,
    validateStatus: (status) => status === 200 || status === 304,
  });

  if (response.status === 304) {
    return { notModified: true, data: null, meta };
  }

  const etag = response.headers["etag"] || response.headers["ETag"] || null;
  const lastModified =
    response.headers["last-modified"] ||
    response.headers["Last-Modified"] ||
    null;

  writeSessionCacheMeta(namespace, { etag, lastModified });

  return {
    notModified: false,
    data: response.data,
    meta: { etag, lastModified },
  };
}

export async function listDocumentsConditional() {
  const res = await conditionalGet("/documents/list", "documents");
  return {
    notModified: res.notModified,
    documents: res.data ? res.data.documents : null,
  };
}

export async function getTsneConditional() {
  const res = await conditionalGet("/visualization/tsne", "tsne");
  return {
    notModified: res.notModified,
    points: res.data ? res.data.points : null,
  };
}

export async function getLogsConditional() {
  const res = await conditionalGet("/chat/logs", "chat-logs");
  return {
    notModified: res.notModified,
    logs: res.data ? res.data.logs : null,
  };
}

export function setSessionIdManually(newSessionId) {
  setSessionId(newSessionId);
}
