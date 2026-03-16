import Icon from '../../atoms/Icon/Icon';
import ProfileMenu from '../../molecules/ProfileMenu/ProfileMenu';
import NotificationBell from '../../molecules/NotificationBell/NotificationBell';
import styles from './DashboardHeader.module.css';
import type { DashboardRole } from '../../../../types/dashboard';

interface DashboardHeaderProps {
  role: DashboardRole;
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export default function DashboardHeader({ role, collapsed, onToggleSidebar }: DashboardHeaderProps) {
  const profileName = role === 'admin' ? 'Prof. García' : 'Carlos López';
  const profileRole = role === 'admin' ? 'Administrador' : 'Alumno';

  return (
    <header
      className={styles.header}
      style={{ left: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)' }}
    >
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <Icon name="menu" size="sm" />
        </button>
      </div>
      <div className={styles.right}>
        <NotificationBell count={role === 'admin' ? 5 : 2} />
        <ProfileMenu name={profileName} role={profileRole} />
      </div>
    </header>
  );
}
