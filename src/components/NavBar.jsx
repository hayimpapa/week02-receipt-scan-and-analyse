import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OwnerModal from './OwnerModal';

export default function NavBar() {
  const { isOwner } = useAuth();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <nav className="navbar">
        <div className="nav-left">
          <a href="https://52-app.com/" className="nav-home-logo">
            <img src="https://raw.githubusercontent.com/hayimpapa/week00-main-page/main/public/w52.png" alt="Home" className="home-logo" />
          </a>
          <div className="nav-brand">Receipt Analyser</div>
        </div>
        <div className="nav-right">
          <div className="nav-links">
            <NavLink to="/" end>Scan</NavLink>
            <NavLink to="/reports">Reports</NavLink>
            <NavLink to="/my-receipts">My Receipts</NavLink>
            <NavLink to="/about">About</NavLink>
          </div>
          <button
            className={`btn-lock ${isOwner ? 'unlocked' : ''}`}
            onClick={() => !isOwner && setShowModal(true)}
            title={isOwner ? 'Owner mode active' : 'Owner login'}
          >
            {isOwner ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
          </button>
        </div>
      </nav>
      {showModal && <OwnerModal onClose={() => setShowModal(false)} />}
    </>
  );
}
