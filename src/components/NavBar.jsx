import { NavLink } from 'react-router-dom';

export default function NavBar() {
  return (
    <nav className="navbar">
      <a href="https://52-app.com/" className="nav-home-logo">
        <img src="https://raw.githubusercontent.com/hayimpapa/week00-main-page/main/public/w52.png" alt="Home" className="home-logo" />
      </a>
      <div className="nav-brand">Receipt Analyser</div>
      <div className="nav-links">
        <NavLink to="/" end>Scan</NavLink>
        <NavLink to="/reports">Reports</NavLink>
        <NavLink to="/about">About</NavLink>
      </div>
    </nav>
  );
}
