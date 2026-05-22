import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
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
      </ul>
    </nav>
  );
}

export default Navbar;
