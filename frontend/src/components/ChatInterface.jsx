// frontend/src/components/ChatInterface.jsx
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
      <form onSubmit={handleSubmit} style={formStyle}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your documents..."
          rows={3}
          style={textareaStyle}
          disabled={loading}
        />
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      {answer && (
        <div style={answerContainerStyle}>
          <h3>Answer:</h3>
          <p>{answer}</p>
          {confidence > 0 && (
            <div>
              <span>Confidence: </span>
              <progress value={confidence} max={1} style={{ width: "200px" }} />
              <span> {(confidence * 100).toFixed(1)}%</span>
            </div>
          )}
          {sources.length > 0 && (
            <div>
              <h4>Sources:</h4>
              <ul>
                {sources.map((src, idx) => (
                  <li key={idx}>
                    <strong>{src.filename}</strong> – similarity:{" "}
                    {(src.similarity * 100).toFixed(1)}%
                    <br />
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

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  marginBottom: "20px",
};

const textareaStyle = {
  width: "100%",
  padding: "8px",
  fontSize: "14px",
  borderRadius: "4px",
  border: "1px solid #ccc",
};

const buttonStyle = {
  padding: "10px 16px",
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  alignSelf: "flex-start",
};

const answerContainerStyle = {
  marginTop: "20px",
  padding: "15px",
  backgroundColor: "#f8f9fa",
  borderRadius: "8px",
};

export default ChatInterface;
