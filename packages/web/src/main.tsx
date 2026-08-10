import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { GrupoActivoProvider } from './context/GrupoActivoContext';
import './styles/variables.css';
import './styles/globals.css';

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <GrupoActivoProvider>
          <App />
        </GrupoActivoProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
