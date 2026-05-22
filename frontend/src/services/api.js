import axios from "axios";

// ----------------------------- Session ID Management -----------------------------
const STORAGE_KEY = "rag_session_id";

function getSessionId() {
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID(); // generate UUID v4
    localStorage.setItem(STORAGE_KEY, sessionId);
  }
  return sessionId;
}

function setSessionId(sessionId) {
  localStorage.setItem(STORAGE_KEY, sessionId);
}

// ----------------------------- Axios Instance -----------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor: add session ID header
api.interceptors.request.use((config) => {
  const sessionId = getSessionId();
  config.headers["X-Session-Id"] = sessionId;
  return config;
});

// Response interceptor: handle common errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Backend responded with error status
      const message = error.response.data?.detail || error.response.statusText;
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // No response from backend
      return Promise.reject(
        new Error("Backend is unreachable. Is the server running?"),
      );
    } else {
      return Promise.reject(error);
    }
  },
);

// ----------------------------- API Methods -----------------------------

/**
 * Send heartbeat to keep session alive
 */
export async function sendHeartbeat() {
  try {
    await api.post("/session/heartbeat");
  } catch (error) {
    console.warn("Heartbeat failed:", error.message);
  }
}

/**
 * Upload a file (multipart/form-data)
 * @param {File} file - The file to upload
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

/**
 * List all documents in current session
 */
export async function listDocuments() {
  const response = await api.get("/documents/list");
  return response.data.documents; // array of filenames
}

/**
 * Delete a document by filename
 * @param {string} filename
 */
export async function deleteDocument(filename) {
  const response = await api.delete(
    `/documents/delete/${encodeURIComponent(filename)}`,
  );
  return response.data;
}

/**
 * Send a chat question
 * @param {string} question
 */
export async function sendChat(question) {
  const response = await api.post("/chat/chat", { question });
  return response.data; // { answer, sources, confidence, logs }
}

/**
 * Get chat logs for current session
 */
export async function getLogs() {
  const response = await api.get("/chat/logs");
  return response.data.logs; // array of log entries
}

/**
 * Get t‑SNE points for all chunks
 */
export async function getTsne() {
  const response = await api.get("/visualization/tsne");
  return response.data.points; // array of { x, y, filename, chunk_text, chunk_index }
}

/**
 * Manually set a session ID (useful for testing or switching sessions)
 * @param {string} newSessionId
 */
export function setSessionIdManually(newSessionId) {
  setSessionId(newSessionId);
}
