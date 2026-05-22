// frontend/src/components/TsnePlot.jsx
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
      marker: { size: 8, color: "#1f77b4" },
      text: points.map((p) => `<b>${p.filename}</b><br>${p.chunk_text}`),
      hoverinfo: "text",
    };

    const layout = {
      title: "t‑SNE projection of document chunks",
      xaxis: { title: "t‑SNE component 1" },
      yaxis: { title: "t‑SNE component 2" },
      hovermode: "closest",
      margin: { t: 40, l: 40, r: 40, b: 40 },
    };

    Plotly.newPlot(plotRef.current, [trace], layout, { responsive: true });

    // Cleanup
    return () => {
      if (plotRef.current) Plotly.purge(plotRef.current);
    };
  }, [points, loading]);

  if (loading) return <div>Loading t‑SNE visualization...</div>;
  if (!points || points.length === 0)
    return <div>No data to display. Upload a document first.</div>;

  return <div ref={plotRef} style={{ width: "100%", height: "500px" }} />;
}

export default TsnePlot;
