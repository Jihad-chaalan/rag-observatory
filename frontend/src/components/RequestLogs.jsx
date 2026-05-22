// frontend/src/components/RequestLogs.jsx
import { useEffect } from "react";

function RequestLogs({ logs, onRefresh }) {
  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  if (logs.length === 0) {
    return <p>No chat history yet.</p>;
  }

  return (
    <div>
      <h3>Request Logs</h3>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Question</th>
            <th>Answer Preview</th>
            <th>Confidence</th>
            <th>Tokens</th>
            <th>Latency (s)</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, idx) => (
            <tr key={idx}>
              <td>{new Date(log.timestamp * 1000).toLocaleTimeString()}</td>
              <td>{log.question}</td>
              <td>{log.answer.substring(0, 60)}...</td>
              <td>
                {log.confidence ? (log.confidence * 100).toFixed(1) + "%" : "-"}
              </td>
              <td>{log.token_usage?.total_tokens || "-"}</td>
              <td>{log.latency ? log.latency.toFixed(2) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px",
};

export default RequestLogs;
