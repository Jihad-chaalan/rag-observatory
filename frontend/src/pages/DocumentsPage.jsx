import DocumentUpload from "../components/DocumentUpload";
import DocumentList from "../components/DocumentList";
import TsnePlot from "../components/TsnePlot";
import { useDocumentsData } from "../hooks/useDocuments";

function LoadingDocumentsView() {
  return (
    <div className="container page-shell">
      <header className="page-header loading-hero">
        <div className="loading-status">
          <span className="pulse-dot" aria-hidden="true" />
          <span className="loading-chip">Preparing workspace</span>
        </div>
        <h1>Document Manager</h1>
        <p className="page-subtitle">
          Indexing files, refreshing semantic maps, and syncing the current
          conversation context.
        </p>
        <div className="loading-ticks">
          <span className="status-badge">Scanning uploads</span>
          <span className="status-badge">Building chunk map</span>
          <span className="status-badge">Warming chat memory</span>
        </div>
      </header>

      <div className="grid-two loading-grid">
        <div className="card loading-state loading-panel">
          <div className="panel-header-row">
            <div className="skeleton skeleton-line skeleton-w-28" />
            <span className="loading-chip">Live</span>
          </div>
          <div className="skeleton skeleton-block" />
          <div className="metric-grid">
            <div className="metric-card">
              <div className="skeleton skeleton-line skeleton-w-40" />
              <div className="skeleton skeleton-line skeleton-w-54" />
            </div>
            <div className="metric-card">
              <div className="skeleton skeleton-line skeleton-w-36" />
              <div className="skeleton skeleton-line skeleton-w-42" />
            </div>
          </div>
        </div>

        <div className="card loading-state loading-panel">
          <div className="panel-header-row">
            <div className="skeleton skeleton-line skeleton-w-36" />
            <span className="loading-chip">Refreshing</span>
          </div>
          <div className="loading-stream">
            <div className="stream-item">
              <div className="skeleton skeleton-line skeleton-w-54" />
              <div className="skeleton skeleton-line skeleton-line--short skeleton-w-42" />
            </div>
            <div className="stream-item">
              <div className="skeleton skeleton-line skeleton-w-40" />
              <div className="skeleton skeleton-line skeleton-line--short skeleton-w-36" />
            </div>
            <div className="stream-item">
              <div className="skeleton skeleton-line skeleton-w-42" />
              <div className="skeleton skeleton-line skeleton-line--short skeleton-w-28" />
            </div>
          </div>
          <div className="skeleton skeleton-card" />
        </div>
      </div>

      <div className="card loading-state loading-panel">
        <div className="panel-header-row">
          <div className="skeleton skeleton-line skeleton-w-40" />
          <span className="loading-chip">Semantic map</span>
        </div>
        <div className="skeleton skeleton-card skeleton-map" />
      </div>
    </div>
  );
}

function DocumentsPage() {
  const { documents, tsnePoints, loading, error, refresh } = useDocumentsData();

  if (loading) {
    return <LoadingDocumentsView />;
  }

  if (error) {
    return (
      <div className="container page-shell">
        <header className="page-header">
          <span className="loading-chip">Documents</span>
          <h1>Document Manager</h1>
        </header>
        <div className="error-banner">{error}</div>
        <button onClick={refresh} className="btn btn-ghost btn-inline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container page-shell">
      <header className="page-header">
        <span className="loading-chip">Documents workspace</span>
        <h1>Document Manager</h1>
        <p className="page-subtitle">
          Upload files, manage the current knowledge base, and inspect how chunks
          are arranged in semantic space.
        </p>
      </header>

      <div className="grid-two">
        <section className="card stack">
          <div className="page-header">
            <h2>Upload</h2>
            <p className="page-subtitle">
              Drop one file at a time. The interface stays comfortable on mobile
              and desktop.
            </p>
          </div>
          <DocumentUpload onUploadSuccess={refresh} />
        </section>

        <section className="card stack">
          <div className="page-header">
            <h2>Uploaded Files</h2>
            <p className="page-subtitle">
              Keep the active document set clean and easy to scan.
            </p>
          </div>
          <DocumentList documents={documents} onDeleteSuccess={refresh} />
        </section>
      </div>

      <section className="card stack">
        <div className="page-header">
          <h2>Chunk Visualization (t‑SNE)</h2>
          <p className="page-subtitle">
            A live view of document chunk clustering for quick sanity checks.
          </p>
        </div>
        <TsnePlot points={tsnePoints} loading={loading} />
      </section>
    </div>
  );
}

export default DocumentsPage;