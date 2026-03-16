import { Outlet } from 'react-router';
import Sidebar from '../../organisms/Sidebar/Sidebar';
import DashboardHeader from '../../organisms/DashboardHeader/DashboardHeader';
import { useSidebarCollapse } from '../../../../hooks/useSidebarCollapse';
import styles from './DashboardLayout.module.css';
import type { DashboardRole } from '../../../../types/dashboard';

interface DashboardLayoutProps {
  role: DashboardRole;
}

export default function DashboardLayout({ role }: DashboardLayoutProps) {
  const { collapsed, mobileOpen, toggle, closeMobile } = useSidebarCollapse();

  return (
    <div className={styles.layout}>
      <Sidebar role={role} collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={closeMobile} />
      <DashboardHeader role={role} collapsed={collapsed} onToggleSidebar={toggle} />
      <main
        className={styles.content}
        style={{ marginLeft: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)' }}
      >
        <Outlet />
      </main>
    </div>
  );
}
