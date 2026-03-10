import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initGA4 } from './services/analytics';
import './index.css';
import App from './App.jsx';

initGA4();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
