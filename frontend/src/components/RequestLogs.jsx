import { useEffect } from "react";

function RequestLogs({ logs, loading, onRefresh }) {
  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  if (loading) {
    return (
      <div className="loading-state logs-loading">
        <div className="loading-status">
          <span className="pulse-dot" aria-hidden="true" />
          <span className="loading-chip">Refreshing observability dashboard</span>
        </div>
        <div className="logs-loading-grid">
          <div className="log-loading-row">
            <div className="skeleton skeleton-line skeleton-w-28" />
            <div className="skeleton skeleton-line skeleton-w-54" />
            <div className="skeleton skeleton-line skeleton-w-40" />
            <div className="skeleton skeleton-line skeleton-w-36" />
          </div>
          <div className="log-loading-row">
            <div className="skeleton skeleton-line skeleton-w-36" />
            <div className="skeleton skeleton-line skeleton-w-42" />
            <div className="skeleton skeleton-line skeleton-w-28" />
            <div className="skeleton skeleton-line skeleton-w-40" />
          </div>
          <div className="log-loading-row">
            <div className="skeleton skeleton-line skeleton-w-42" />
            <div className="skeleton skeleton-line skeleton-w-54" />
            <div className="skeleton skeleton-line skeleton-w-36" />
            <div className="skeleton skeleton-line skeleton-w-28" />
          </div>
        </div>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="empty-state">
        No chat history yet. Ask a question to start the conversation.
      </div>
    );
  }

  return (
    <div className="logs-grid">
      {logs.map((log, idx) => (
        <article key={idx} className="log-card">
          <div className="log-field log-timestamp">
            <span className="log-label">Timestamp</span>
            <span className="log-value">
              {new Date(log.timestamp * 1000).toLocaleString()}
            </span>
          </div>

          <div className="log-field log-question">
            <span className="log-label">Question</span>
            <span className="log-value">{log.question}</span>
          </div>

          <div className="log-field log-answer">
            <span className="log-label">Answer Preview</span>
            <span className="log-value">
              {(log.answer || "").substring(0, 140)}
              {log.answer && log.answer.length > 140 ? "…" : ""}
            </span>
          </div>

          <div className="log-field log-sources">
            <span className="log-label">Sources</span>
            <span className="log-value">
              {log.sources?.length ? log.sources.join(", ") : "No sources returned"}
            </span>
          </div>

          <div className="log-meta-grid">
            <div className="log-field">
              <span className="log-label">Confidence</span>
              <span className="log-value">
                {log.confidence ? (log.confidence * 100).toFixed(1) + "%" : "-"}
              </span>
            </div>
            <div className="log-field">
              <span className="log-label">Tokens</span>
              <span className="log-value">
                {log.token_usage?.error
                  ? log.token_usage.error
                  : log.token_usage?.total_tokens || "-"}
              </span>
            </div>
            <div className="log-field">
              <span className="log-label">Latency (s)</span>
              <span className="log-value">
                {log.latency ? log.latency.toFixed(2) : "-"}
              </span>
            </div>
          </div>

          {log.token_usage && !log.token_usage.error && (
            <div className="log-token-breakdown">
              <span className="log-label">Token breakdown</span>
              <span className="log-value">
                Prompt {log.token_usage.prompt_tokens || 0} / Completion {" "}
                {log.token_usage.completion_tokens || 0} / Total {" "}
                {log.token_usage.total_tokens || 0}
              </span>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

export default RequestLogs;
