// frontend/src/hooks/useChatData.js
import { useState, useCallback } from "react";
import { sendChat, getLogs } from "../services/api";

export function useChatData() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(() => {
    getLogs()
      .then((logsData) => {
        setLogs(logsData);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to fetch logs:", err);
        setError("Could not load chat logs.");
      });
  }, []);

  const submitQuestion = useCallback(
    (q) => {
      setLoading(true);
      setError(null);
      sendChat(q)
        .then((response) => {
          setAnswer(response.answer);
          setSources(response.sources);
          setConfidence(response.confidence);
          // After sending, refresh logs to include this new interaction
          fetchLogs();
        })
        .catch((err) => {
          console.error("Chat error:", err);
          setError(err.message || "Failed to get answer from chatbot.");
          setAnswer("");
          setSources([]);
          setConfidence(0);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [fetchLogs],
  );

  // Expose a function to manually refresh logs (e.g., for polling)
  const refreshLogs = useCallback(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    question,
    setQuestion,
    answer,
    sources,
    confidence,
    logs,
    loading,
    error,
    submitQuestion,
    refreshLogs,
  };
}
