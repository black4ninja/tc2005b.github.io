import { Outlet, useLocation } from 'react-router';
import ErrorBoundary from '../common/ErrorBoundary/ErrorBoundary';
import Navbar from './Navbar';
import styles from './Layout.module.css';

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>
        {/* Por dentro del layout: si una página revienta, la barra sigue
            ahí y se puede salir sin recargar. `resetKey` es la ruta, así
            que navegar limpia el error. */}
        <ErrorBoundary resetKey={pathname} ambito="esta página">
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
