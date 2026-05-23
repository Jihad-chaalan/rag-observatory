import { lazy, Suspense } from "react";
import { useTsneData } from "../hooks/useTsneData";

const TsnePlot = lazy(() => import("../components/TsnePlot"));

function TsnePage() {
  const { tsnePoints, loading, refreshing, error, refresh } = useTsneData();

  if (error) {
    return (
      <div className="container page-shell">
        <header className="page-header">
          <span className="loading-chip">t-SNE map</span>
          <h1>Chunk Visualization</h1>
          <p className="page-subtitle">
            t-SNE stands for t-distributed Stochastic Neighbor Embedding. It is
            used to project document chunk embeddings into 2D so you can see
            clustering, outliers, and retrieval structure.
          </p>
          <p className="page-subtitle">
            This page can take a moment to load because it fetches chunk points
            from the vector database before drawing the plot.
          </p>
        </header>

        <div className="error-banner">{error}</div>
        <button
          type="button"
          onClick={() => refresh({ force: true, background: false })}
          className="btn btn-ghost btn-inline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container page-shell">
      <header className="page-header">
        <span className="loading-chip">t-SNE map</span>
        <h1>Chunk Visualization</h1>
        <p className="page-subtitle">
          t-SNE stands for t-distributed Stochastic Neighbor Embedding. It is
          used to project document chunk embeddings into 2D so you can visually
          inspect how similar chunks cluster together.
        </p>
        <p className="page-subtitle">
          It helps with understanding document structure, checking retrieval
          quality, and spotting outliers or weakly related chunks.
        </p>
        <p className="page-subtitle">
          Note: this view can take time to load because the app is fetching
          chunk points from the vector database before drawing the plot.
        </p>
        {refreshing && <span className="loading-chip">Refreshing data</span>}
      </header>

      <section className="card stack">
        <div className="page-header">
          <h2>Document Chunk Map</h2>
          <p className="page-subtitle">
            Each point represents a chunk projected into 2D with t-SNE.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="loading-state">
              <span className="loading-chip">Loading semantic map</span>
              <div className="skeleton skeleton-block skeleton-map" />
            </div>
          }
        >
          <TsnePlot points={tsnePoints} loading={loading} />
        </Suspense>
      </section>
    </div>
  );
}

export default TsnePage;
