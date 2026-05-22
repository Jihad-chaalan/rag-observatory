// frontend/src/components/Navbar.jsx
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav style={navStyle}>
      <ul style={ulStyle}>
        <li>
          <Link to="/documents" style={linkStyle}>
            Documents
          </Link>
        </li>
        <li>
          <Link to="/chat" style={linkStyle}>
            Chat
          </Link>
        </li>
      </ul>
    </nav>
  );
}

const navStyle = {
  backgroundColor: "#333",
  padding: "10px",
};

const ulStyle = {
  listStyle: "none",
  display: "flex",
  gap: "20px",
  margin: 0,
  padding: 0,
};

const linkStyle = {
  color: "white",
  textDecoration: "none",
  fontSize: "18px",
};

export default Navbar;
