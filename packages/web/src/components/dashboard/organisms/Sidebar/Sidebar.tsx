import { Link } from 'react-router';
import NavItem from '../../molecules/NavItem/NavItem';
import Icon from '../../atoms/Icon/Icon';
import { getSidebarItems } from './sidebarConfig';
import styles from './Sidebar.module.css';
import type { DashboardRole } from '../../../../types/dashboard';

interface SidebarProps {
  role: DashboardRole;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ role, collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const items = getSidebarItems(role);

  return (
    <>
      {mobileOpen && <div className={styles.overlay} onClick={onCloseMobile} />}
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}
      >
        <div className={styles.logo}>
          <Link to={role === 'admin' ? '/admin' : '/alumno'} className={styles.logoLink}>
            <Icon name="school" size="lg" />
            {!collapsed && <span className={styles.logoText}>TC2005B</span>}
          </Link>
        </div>
        <nav className={styles.nav}>
          {items.map(item => (
            <NavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              badge={item.badge}
              collapsed={collapsed}
              onClick={onCloseMobile}
            />
          ))}
        </nav>
        <div className={styles.footer}>
          {!collapsed && (
            <Link to="/" className={styles.backLink}>
              <Icon name="arrow_back" size="sm" />
              <span>Volver al sitio</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
