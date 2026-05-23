import { useState, useCallback, useEffect, useRef } from "react";
import { getLogsConditional } from "../services/api";
import {
  DEFAULT_CACHE_TTL_MS,
  readSessionCache,
  writeSessionCache,
} from "../utils/sessionCache";

const LOGS_CACHE_KEY = "chat-logs";

export function useLogsData() {
  const cachedLogs = readSessionCache(LOGS_CACHE_KEY);
  const cacheRef = useRef(cachedLogs);

  const [logs, setLogs] = useState(() => cachedLogs?.logs || []);
  const [loading, setLoading] = useState(() => !cachedLogs);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const syncLogs = useCallback((logsData) => {
    const payload = { logs: logsData };
    cacheRef.current = { ...payload, cachedAt: Date.now() };
    writeSessionCache(LOGS_CACHE_KEY, payload);
    setLogs(logsData);
    setError(null);
  }, []);

  const fetchLogs = useCallback(
    async ({ force = false, background = true } = {}) => {
      const cached = cacheRef.current ?? readSessionCache(LOGS_CACHE_KEY);
      const isFreshCache =
        cached && Date.now() - cached.cachedAt <= DEFAULT_CACHE_TTL_MS;

      if (cached && isFreshCache && !force) {
        cacheRef.current = cached;
        setLogs(cached.logs || []);
        setError(null);
        return;
      }

      const shouldBlock = !background;
      if (shouldBlock) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

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
          setLoading(false);
        } else {
          setRefreshing(false);
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
      setLoading(false);

      const isStale = Date.now() - cached.cachedAt > DEFAULT_CACHE_TTL_MS;
      if (isStale) {
        void fetchLogs({ background: true });
      }
      return;
    }

    void fetchLogs({ background: false });
  }, [fetchLogs]);

  const refresh = useCallback(
    (options = {}) => {
      const cached = cacheRef.current ?? readSessionCache(LOGS_CACHE_KEY);
      void fetchLogs({
        force: Boolean(options.force),
        background:
          options.background !== undefined
            ? options.background
            : Boolean(cached),
      });
    },
    [fetchLogs],
  );

  return { logs, loading, refreshing, error, refresh };
}
