import { useRef, useEffect } from "react";
import Plotly from "plotly.js-dist";

function TsnePlot({ points, loading }) {
  const plotRef = useRef(null);

  useEffect(() => {
    if (loading || !points || points.length === 0 || !plotRef.current) return;

    const trace = {
      x: points.map((p) => p.x),
      y: points.map((p) => p.y),
      mode: "markers",
      type: "scatter",
      marker: { size: 8, color: "#0ea5e9" },
      text: points.map((p) => `<b>${p.filename}</b><br>${p.chunk_text}`),
      hoverinfo: "text",
    };

    const layout = {
      title: "t‑SNE projection of document chunks",
      xaxis: { title: "t‑SNE component 1" },
      yaxis: { title: "t‑SNE component 2" },
      hovermode: "closest",
      margin: { t: 40, l: 40, r: 24, b: 40 },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: { color: "#0f172a" },
    };

    Plotly.newPlot(plotRef.current, [trace], layout, { responsive: true });

    return () => {
      if (plotRef.current) Plotly.purge(plotRef.current);
    };
  }, [points, loading]);

  if (loading) {
    return (
      <div className="card loading-state tsne-loading-panel">
        <div className="tsne-loading-top">
          <div className="loading-status">
            <span className="pulse-dot" aria-hidden="true" />
            <span className="loading-chip">Loading semantic map</span>
          </div>
          <p className="tsne-loading-copy">
            Fetching chunk points from the vector database and preparing the 2D
            projection.
          </p>
        </div>

        <div className="tsne-loading-graph" aria-hidden="true">
          <div className="tsne-loading-grid">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="tsne-loading-pulse tsne-loading-pulse--one" />
          <div className="tsne-loading-pulse tsne-loading-pulse--two" />
          <div className="tsne-loading-pulse tsne-loading-pulse--three" />
        </div>

        <div className="tsne-loading-footer">
          <div className="skeleton skeleton-line skeleton-w-36" />
          <div className="skeleton skeleton-line skeleton-w-54" />
          <div className="skeleton skeleton-line skeleton-w-28" />
        </div>
      </div>
    );
  }

  if (!points || points.length === 0) {
    return (
      <div className="empty-state">
        No data to display. Upload a document first.
      </div>
    );
  }

  return <div ref={plotRef} className="tsne-plot" />;
}

export default TsnePlot;
