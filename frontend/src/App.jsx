// frontend/src/App.jsx
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import DocumentsPage from "./pages/DocumentsPage";
import ChatPage from "./pages/ChatPage";
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
