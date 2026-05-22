// frontend/src/pages/DocumentsPage.jsx
import DocumentUpload from "../components/DocumentUpload";
import DocumentList from "../components/DocumentList";
import TsnePlot from "../components/TsnePlot";
import { useDocumentsData } from "../hooks/useDocuments";

function DocumentsPage() {
  const { documents, tsnePoints, loading, error, refresh } = useDocumentsData();

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading documents...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        <p>{error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Document Manager</h1>
      <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "250px" }}>
          <h2>Upload</h2>
          <DocumentUpload onUploadSuccess={refresh} />
        </div>
        <div style={{ flex: 1, minWidth: "250px" }}>
          <h2>Uploaded Files</h2>
          <DocumentList documents={documents} onDeleteSuccess={refresh} />
        </div>
      </div>
      <div style={{ marginTop: "40px" }}>
        <h2>Chunk Visualization (t‑SNE)</h2>
        <TsnePlot points={tsnePoints} loading={loading} />
      </div>
    </div>
  );
}

export default DocumentsPage;
