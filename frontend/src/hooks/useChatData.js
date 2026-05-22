import { useState, useCallback, useEffect } from "react";
import { sendChat, getLogs } from "../services/api";

export function useChatData() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLogsLoading(true);
    }

    try {
      const logsData = await getLogs();
      setLogs(logsData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setError("Could not load chat logs.");
    } finally {
      if (!silent) {
        setLogsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
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
        await fetchLogs({ silent: true });
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
    void fetchLogs({ silent: true });
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