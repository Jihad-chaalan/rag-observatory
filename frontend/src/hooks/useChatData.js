import { useState, useCallback, useEffect, useRef } from "react";
import { sendChat, getLogsConditional } from "../services/api";
import {
  DEFAULT_CACHE_TTL_MS,
  readSessionCache,
  writeSessionCache,
} from "../utils/sessionCache";

const LOGS_CACHE_KEY = "chat-logs";

export function useChatData() {
  const cachedLogs = readSessionCache(LOGS_CACHE_KEY);
  const cacheRef = useRef(cachedLogs);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [logs, setLogs] = useState(() => cachedLogs?.logs || []);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(() => !cachedLogs);
  const [error, setError] = useState(null);

  const syncLogs = useCallback((logsData) => {
    const payload = { logs: logsData };
    cacheRef.current = { ...payload, cachedAt: Date.now() };
    writeSessionCache(LOGS_CACHE_KEY, payload);
    setLogs(logsData);
    setError(null);
  }, []);

  const fetchLogs = useCallback(
    async ({ force = false, silent = true, background = true } = {}) => {
      const cached = cacheRef.current ?? readSessionCache(LOGS_CACHE_KEY);
      const isFreshCache =
        cached && Date.now() - cached.cachedAt <= DEFAULT_CACHE_TTL_MS;

      if (cached && isFreshCache && !force) {
        cacheRef.current = cached;
        setLogs(cached.logs || []);
        setError(null);
        return;
      }

      const shouldBlock = !silent && !background;
      if (shouldBlock) {
        setLogsLoading(true);
      }

      try {
        const res = await getLogsConditional();
        if (!res.notModified) {
          syncLogs(res.logs || []);
        }
      } catch (err) {
        console.error("Failed to fetch logs:", err);
        setError("Could not load chat logs.");
      } finally {
        if (shouldBlock) {
          setLogsLoading(false);
        }
      }
    },
    [syncLogs],
  );

  useEffect(() => {
    const cached = cacheRef.current ?? readSessionCache(LOGS_CACHE_KEY);
    if (cached) {
      cacheRef.current = cached;
      setLogs(cached.logs || []);
      setLogsLoading(false);

      const isStale = Date.now() - cached.cachedAt > DEFAULT_CACHE_TTL_MS;
      if (isStale) {
        void fetchLogs({ silent: true, background: true });
      }
      return;
    }

    void fetchLogs({ silent: false, background: false });
  }, [fetchLogs]);

  const submitQuestion = useCallback(
    async (q) => {
      setLoading(true);
      setError(null);
      try {
        const response = await sendChat(q);
        setAnswer(response.answer);
        setSources(response.sources);
        setConfidence(response.confidence);
        await fetchLogs({ force: true, silent: true, background: true });
      } catch (err) {
        console.error("Chat error:", err);
        setError(err.message || "Failed to get answer from chatbot.");
        setAnswer("");
        setSources([]);
        setConfidence(0);
      } finally {
        setLoading(false);
      }
    },
    [fetchLogs],
  );

  const refreshLogs = useCallback(() => {
    void fetchLogs({ silent: true, background: true });
  }, [fetchLogs]);

  return {
    question,
    setQuestion,
    answer,
    sources,
    confidence,
    logs,
    loading,
    logsLoading,
    error,
    submitQuestion,
    refreshLogs,
  };
}
