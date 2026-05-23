import { useState, useCallback, useEffect, useRef } from "react";
import { getTsneConditional } from "../services/api";
import {
  DEFAULT_CACHE_TTL_MS,
  readSessionCache,
  writeSessionCache,
} from "../utils/sessionCache";

const TSNE_CACHE_KEY = "tsne-points";

export function useTsneData() {
  const cachedData = readSessionCache(TSNE_CACHE_KEY);
  const cacheRef = useRef(cachedData);

  const [tsnePoints, setTsnePoints] = useState(() => cachedData?.points || []);
  const [loading, setLoading] = useState(() => !cachedData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const syncFetchedData = useCallback((points) => {
    const payload = { points };
    cacheRef.current = { ...payload, cachedAt: Date.now() };
    writeSessionCache(TSNE_CACHE_KEY, payload);
    setTsnePoints(points);
    setError(null);
  }, []);

  const fetchData = useCallback(
    async ({ force = false, background = true } = {}) => {
      const cached = cacheRef.current ?? readSessionCache(TSNE_CACHE_KEY);
      const isFreshCache =
        cached && Date.now() - cached.cachedAt <= DEFAULT_CACHE_TTL_MS;

      if (cached && isFreshCache && !force) {
        cacheRef.current = cached;
        setTsnePoints(cached.points || []);
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
        const res = await getTsneConditional();
        const points = res.notModified
          ? cached?.points || tsnePoints
          : res.points || [];

        syncFetchedData(points);
      } catch (err) {
        console.error(err);
        setError("Could not load t-SNE data. Is the backend running?");
      } finally {
        if (shouldBlock) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [syncFetchedData, tsnePoints],
  );

  useEffect(() => {
    const cached = cacheRef.current ?? readSessionCache(TSNE_CACHE_KEY);
    if (cached) {
      cacheRef.current = cached;
      setTsnePoints(cached.points || []);
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
      const cached = cacheRef.current ?? readSessionCache(TSNE_CACHE_KEY);
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

  return { tsnePoints, loading, refreshing, error, refresh };
}
