import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import NavBar from './components/NavBar';
import ScanPage from './pages/ScanPage';
import ReportsPage from './pages/ReportsPage';
import AboutPage from './pages/AboutPage';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div className="app">
          <NavBar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<ScanPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
