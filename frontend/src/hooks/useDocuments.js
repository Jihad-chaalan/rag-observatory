import { useState, useEffect, useCallback, useRef } from "react";
import { listDocumentsConditional, getTsneConditional } from "../services/api";
import {
  DEFAULT_CACHE_TTL_MS,
  readSessionCache,
  writeSessionCache,
  readSessionCacheMeta,
} from "../utils/sessionCache";

const DOCUMENTS_CACHE_KEY = "documents";

export function useDocumentsData() {
  const cachedData = readSessionCache(DOCUMENTS_CACHE_KEY);
  const cacheRef = useRef(cachedData);
  const [documents, setDocuments] = useState(() => cachedData?.documents || []);
  const [tsnePoints, setTsnePoints] = useState(
    () => cachedData?.tsnePoints || [],
  );
  const [loading, setLoading] = useState(() => !cachedData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const syncFetchedData = useCallback((docs, points) => {
    const payload = { documents: docs, tsnePoints: points };
    cacheRef.current = { ...payload, cachedAt: Date.now() };
    writeSessionCache(DOCUMENTS_CACHE_KEY, payload);
    setDocuments(docs);
    setTsnePoints(points);
    setError(null);
  }, []);

  const fetchData = useCallback(
    async ({ force = false, background = true } = {}) => {
      const cached = cacheRef.current ?? readSessionCache(DOCUMENTS_CACHE_KEY);
      const isFreshCache =
        cached && Date.now() - cached.cachedAt <= DEFAULT_CACHE_TTL_MS;

      if (cached && isFreshCache && !force) {
        cacheRef.current = cached;
        setDocuments(cached.documents || []);
        setTsnePoints(cached.tsnePoints || []);
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
        const [docsRes, pointsRes] = await Promise.all([
          listDocumentsConditional(),
          getTsneConditional(),
        ]);

        const docs = docsRes.notModified
          ? cached?.documents || documents
          : docsRes.documents || [];
        const points = pointsRes.notModified
          ? cached?.tsnePoints || tsnePoints
          : pointsRes.points || [];

        syncFetchedData(docs, points);
      } catch (err) {
        console.error(err);
        setError("Could not load data. Is the backend running?");
      } finally {
        if (shouldBlock) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [syncFetchedData, documents, tsnePoints],
  );

  useEffect(() => {
    const cached = cacheRef.current ?? readSessionCache(DOCUMENTS_CACHE_KEY);
    if (cached) {
      cacheRef.current = cached;
      setDocuments(cached.documents || []);
      setTsnePoints(cached.tsnePoints || []);
      setLoading(false);

      const isStale = Date.now() - cached.cachedAt > DEFAULT_CACHE_TTL_MS;
      if (isStale) {
        void fetchData({ background: true });
      }
      return;
    }

    void fetchData({ background: false });
  }, [fetchData]);

  const refresh = useCallback(
    (options = {}) => {
      const cached = cacheRef.current ?? readSessionCache(DOCUMENTS_CACHE_KEY);
      void fetchData({
        force: Boolean(options.force),
        background:
          options.background !== undefined
            ? options.background
            : Boolean(cached),
      });
    },
    [fetchData],
  );

  return { documents, tsnePoints, loading, refreshing, error, refresh };
}
