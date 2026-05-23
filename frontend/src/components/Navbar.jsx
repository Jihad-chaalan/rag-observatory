import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

function Navbar() {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const infoRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!infoRef.current?.contains(event.target)) {
        setIsInfoOpen(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsInfoOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-title-block">
        <div className="navbar-brand-row">
          <span className="navbar-brand">RAG Observatory</span>

          <div ref={infoRef} className="navbar-info-wrap">
            <button
              type="button"
              className={`navbar-info-trigger ${isInfoOpen ? "is-open" : ""}`}
              aria-label="What is RAG Observatory?"
              aria-expanded={isInfoOpen}
              aria-controls="rag-observatory-tooltip"
              onClick={() => setIsInfoOpen((prev) => !prev)}
            >
              <span className="navbar-info-icon" aria-hidden="true">
                ⓘ
              </span>
            </button>

            <span
              id="rag-observatory-tooltip"
              role="tooltip"
              className={`navbar-tooltip ${isInfoOpen ? "is-visible" : ""}`}
            >
              Upload PDFs, Word, Excel, etc. Ask questions. Get answers with
              source citations, confidence scores, token usage, and latency
              logs. Visualize document chunks in 2D with t-SNE.
            </span>
          </div>
        </div>
      </div>

      <div className="navbar-links-block">
        <ul className="nav-list">
          <li>
            <Link to="/documents" className="nav-link">
              Documents
            </Link>
          </li>
          <li>
            <Link to="/chat" className="nav-link">
              Chat
            </Link>
          </li>
          <li>
            <Link to="/tsne" className="nav-link">
              t-SNE
            </Link>
          </li>
          <li>
            <Link to="/logs" className="nav-link">
              Observability
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
