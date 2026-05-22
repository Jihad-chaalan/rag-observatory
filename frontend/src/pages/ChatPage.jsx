// frontend/src/pages/ChatPage.jsx
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
    error,
    submitQuestion,
    refreshLogs,
  } = useChatData();

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      <h1>Chat with your Documents</h1>
      <ChatInterface
        onSubmit={submitQuestion}
        loading={loading}
        answer={answer}
        sources={sources}
        confidence={confidence}
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <hr style={{ margin: "30px 0" }} />
      <RequestLogs logs={logs} onRefresh={refreshLogs} />
    </div>
  );
}

export default ChatPage;
