import { useState } from "react";

function ChatInterface({ onSubmit, loading, answer, sources, confidence }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit(input);
    setInput("");
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="chat-form" aria-busy={loading}>
        <textarea
          className="chat-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your documents..."
          rows={3}
          disabled={loading}
        />
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              Thinking...
            </>
          ) : (
            "Ask"
          )}
        </button>
      </form>

      {loading && !answer && (
        <div className="answer-box loading-state" aria-live="polite">
          <span className="loading-chip">Generating answer</span>
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line skeleton-line--short" />
          <div className="skeleton skeleton-block" />
        </div>
      )}

      {answer && (
        <div className="answer-box">
          <h3>Answer:</h3>
          <p>{answer}</p>
          {confidence > 0 && (
            <div className="confidence">
              <span>Confidence:</span>
              <progress value={confidence} max={1} />
              <span>{(confidence * 100).toFixed(1)}%</span>
            </div>
          )}
          {sources.length > 0 && (
            <div>
              <h4>Sources:</h4>
              <ul className="sources-list">
                {sources.map((src, idx) => (
                  <li key={idx} className="source-item">
                    <strong>{src.filename}</strong>
                    <span>Similarity: {(src.similarity * 100).toFixed(1)}%</span>
                    <small>{src.chunk_text}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatInterface;
