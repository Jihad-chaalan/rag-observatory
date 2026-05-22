import { useState, useEffect, useCallback } from "react";
import { listDocuments, getTsne } from "../services/api";

export function useDocumentsData() {
  const [documents, setDocuments] = useState([]);
  const [tsnePoints, setTsnePoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const applyFetchedData = useCallback(([docs, points]) => {
    setDocuments(docs);
    setTsnePoints(points);
    setError(null);
  }, []);

  const handleFetchError = useCallback((err) => {
    console.error(err);
    setError("Could not load data. Is the backend running?");
  }, []);

  useEffect(() => {
    void Promise.all([listDocuments(), getTsne()])
      .then(applyFetchedData)
      .catch(handleFetchError)
      .finally(() => {
        setLoading(false);
      });
  }, [applyFetchedData, handleFetchError]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);

    void Promise.all([listDocuments(), getTsne()])
      .then(applyFetchedData)
      .catch(handleFetchError)
      .finally(() => {
        setLoading(false);
      });
  }, [applyFetchedData, handleFetchError]);

  return { documents, tsnePoints, loading, error, refresh };
}
