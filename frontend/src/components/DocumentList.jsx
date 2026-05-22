import { deleteDocument } from "../services/api";

function DocumentList({ documents, onDeleteSuccess }) {
  const handleDelete = async (filename) => {
    if (!window.confirm(`Delete "${filename}"?`)) return;
    try {
      await deleteDocument(filename); // from api.js
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  if (documents.length === 0) {
    return <p>No documents uploaded yet.</p>;
  }

  return (
    <ul style={listStyle}>
      {documents.map((doc) => (
        <li key={doc} style={listItemStyle}>
          <span>{doc}</span>
          <button onClick={() => handleDelete(doc)} style={buttonStyle}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}

const listStyle = {
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const listItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px",
  borderBottom: "1px solid #eee",
};

const buttonStyle = {
  backgroundColor: "#dc3545",
  color: "white",
  border: "none",
  borderRadius: "4px",
  padding: "4px 8px",
  cursor: "pointer",
};

export default DocumentList;
