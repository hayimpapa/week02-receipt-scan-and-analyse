import { NavLink } from 'react-router-dom';

export default function NavBar() {
  return (
    <nav className="navbar">
      <div className="nav-brand">Receipt Analyser</div>
      <div className="nav-links">
        <NavLink to="/" end>Scan</NavLink>
        <NavLink to="/reports">Reports</NavLink>
        <NavLink to="/about">About</NavLink>
      </div>
    </nav>
  );
}
