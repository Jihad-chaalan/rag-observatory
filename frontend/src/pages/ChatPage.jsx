import ChatInterface from "../components/ChatInterface";
import RequestLogs from "../components/RequestLogs";
import { useChatData } from "../hooks/useChatData";

function ChatPage() {
  const {
    answer,
    sources,
    confidence,
    logs,
    loading,
    logsLoading,
    error,
    submitQuestion,
    refreshLogs,
  } = useChatData();

  return (
    <div className="container page-shell">
      <header className="page-header">
        <span className="loading-chip">Chat workspace</span>
        <h1>Chat with your Documents</h1>
        <p className="page-subtitle">
          Ask natural questions and get grounded answers with sources,
          confidence, and a clean conversation flow.
        </p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <ChatInterface
          onSubmit={submitQuestion}
          loading={loading}
          answer={answer}
          sources={sources}
          confidence={confidence}
        />
      </div>

      <div className="card">
        <div className="page-header section-gap">
          <h2>Conversation history</h2>
          <p className="page-subtitle">
            Recent questions and response metadata appear here after the backend
            responds.
          </p>
        </div>
        <RequestLogs logs={logs} loading={loading || logsLoading} onRefresh={refreshLogs} />
      </div>
    </div>
  );
}

export default ChatPage;