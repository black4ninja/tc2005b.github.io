import { Outlet, Navigate } from 'react-router';
import Sidebar from '../../organisms/Sidebar/Sidebar';
import DashboardHeader from '../../organisms/DashboardHeader/DashboardHeader';
import { useSidebarCollapse } from '../../../../hooks/useSidebarCollapse';
import { useAuth } from '../../../../context/AuthContext';
import { ColeccionArbolProvider } from '../../../../context/ColeccionArbolContext';
import styles from './DashboardLayout.module.css';
import type { DashboardRole } from '../../../../types/dashboard';

interface DashboardLayoutProps {
  role: DashboardRole;
}

export default function DashboardLayout({ role }: DashboardLayoutProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { collapsed, mobileOpen, toggle, closeMobile } = useSidebarCollapse();

  if (isLoading) {
    return <div className={styles.loading}>Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // El profesor vive en el árbol de rutas admin (mismas pantallas de grupo), pero
  // su rol EFECTIVO es 'profesor': el sidebar/header le muestran solo su grupo, no
  // el panel global. App.tsx sigue pasando role="admin"; aquí se especializa.
  const effectiveRole: DashboardRole =
    role === 'admin' && user?.userType === 'profesor' ? 'profesor' : role;

  return (
    // El provider envuelve Sidebar y Outlet: el árbol de la colección abierta lo
    // pinta el sidebar y lo muta la página, así que ambos comparten una fuente.
    <ColeccionArbolProvider>
      <div className={styles.layout}>
        <Sidebar role={effectiveRole} collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={closeMobile} />
        <DashboardHeader role={effectiveRole} collapsed={collapsed} onToggleSidebar={toggle} />
        <main
          className={styles.content}
          style={{ marginLeft: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)' }}
        >
          <Outlet />
        </main>
      </div>
    </ColeccionArbolProvider>
  );
}
