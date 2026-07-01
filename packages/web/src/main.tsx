import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { MsalProvider } from '@azure/msal-react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { msalInstance } from './config/msal';
import './styles/variables.css';
import './styles/globals.css';

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </MsalProvider>
  </React.StrictMode>
);
