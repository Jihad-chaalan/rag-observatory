import { deleteDocument } from "../services/api";

function DocumentList({ documents, onDeleteSuccess }) {
  const handleDelete = async (filename) => {
    if (!window.confirm(`Delete "${filename}"?`)) return;
    try {
      await deleteDocument(filename);
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  if (!documents || documents.length === 0) {
    return <p>No documents uploaded yet.</p>;
  }

  return (
    <ul className="doc-list">
      {documents.map((doc) => (
        <li key={doc} className="doc-item">
          <span className="filename">{doc}</span>
          <button
            onClick={() => handleDelete(doc)}
            className="btn btn-danger small"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}

export default DocumentList;
