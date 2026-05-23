import { useState, useCallback } from "react";
import { sendChat } from "../services/api";

export function useChatData() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitQuestion = useCallback(async (q) => {
    setLoading(true);
    setError(null);
    try {
      const response = await sendChat(q);
      setAnswer(response.answer);
      setSources(response.sources || []);
      setConfidence(response.confidence || 0);
    } catch (err) {
      console.error("Chat error:", err);
      setError(err.message || "Failed to get answer from chatbot.");
      setAnswer("");
      setSources([]);
      setConfidence(0);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    question,
    setQuestion,
    answer,
    sources,
    confidence,
    loading,
    error,
    submitQuestion,
  };
}
