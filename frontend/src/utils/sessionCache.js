const CACHE_PREFIX = "rag_observatory_cache";
export const DEFAULT_CACHE_TTL_MS = 15000;
const SESSION_STORAGE_KEY = "rag_session_id";

function getSessionScope() {
  if (typeof window === "undefined") {
    return "server";
  }

  return localStorage.getItem(SESSION_STORAGE_KEY) || "anonymous";
}

function buildKey(namespace) {
  return `${CACHE_PREFIX}:${getSessionScope()}:${namespace}`;
}

export function readSessionCache(namespace, maxAgeMs = DEFAULT_CACHE_TTL_MS) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(buildKey(namespace));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (typeof parsed.cachedAt !== "number") {
      return null;
    }

    if (maxAgeMs !== null && Date.now() - parsed.cachedAt > maxAgeMs) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeSessionCache(namespace, payload) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(
      buildKey(namespace),
      JSON.stringify({ ...payload, cachedAt: Date.now() }),
    );
  } catch {
    // Ignore storage quota / serialization errors.
  }
}

export function removeSessionCache(namespace) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.removeItem(buildKey(namespace));
  } catch {
    // Ignore storage errors.
  }
}

// --- metadata helpers for ETag / Last-Modified ---
export function readSessionCacheMeta(namespace) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(buildKey(namespace) + ":meta");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeSessionCacheMeta(namespace, meta) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(buildKey(namespace) + ":meta", JSON.stringify(meta));
  } catch {
    // ignore
  }
}
