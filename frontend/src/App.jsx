// frontend/src/App.jsx
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import DocumentsPage from "./pages/DocumentsPage";
import ChatPage from "./pages/ChatPage";
import TsnePage from "./pages/TsnePage";
import LogsPage from "./pages/LogsPage";
import { startHeartbeat, stopHeartbeat } from "./services/heartbeat";

function App() {
  useEffect(() => {
    startHeartbeat(30000);
    return () => stopHeartbeat();
  }, []);

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/documents" />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/tsne" element={<TsnePage />} />
        <Route path="/logs" element={<LogsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
