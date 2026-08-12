import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { GrupoActivoProvider } from './context/GrupoActivoContext';
import TemaConSesion from './context/TemaConSesion';
import { aplicarTema, leerPreferenciaLocal, resolverTema } from './context/TemaContext';
import './styles/variables.css';
import './styles/globals.css';

// ANTES de montar React: si se esperara al primer render, la página aparecería
// en blanco y saltaría a oscuro un instante después. Se usa la copia del
// navegador; cuando se resuelva la sesión, la del usuario la corregirá.
aplicarTema(resolverTema(leerPreferenciaLocal()));

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TemaConSesion>
          <GrupoActivoProvider>
            <App />
          </GrupoActivoProvider>
        </TemaConSesion>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
