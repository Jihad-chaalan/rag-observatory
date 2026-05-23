import RequestLogs from "../components/RequestLogs";
import { useLogsData } from "../hooks/useLogsData";

function LogsPage() {
  const { logs, loading, refreshing, error, refresh } = useLogsData();

  return (
    <div className="container page-shell">
      <header className="page-header">
        <span className="loading-chip">Observability</span>
        <h1>Chat Logs Dashboard</h1>
        <p className="page-subtitle">
          Review question history, answer quality, sources, confidence, token
          usage, and latency in one place.
        </p>
        <p className="page-subtitle">
          This view refreshes chat activity separately from the main chat page,
          so observability does not slow down question answering.
        </p>
        {refreshing && <span className="loading-chip">Refreshing data</span>}
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="card stack">
        <div className="page-header section-gap">
          <h2>Request History</h2>
          <p className="page-subtitle">
            Each entry includes the full response metadata for troubleshooting
            and analysis.
          </p>
        </div>

        <RequestLogs logs={logs} loading={loading} onRefresh={refresh} />
      </div>
    </div>
  );
}

export default LogsPage;
