import { NavLink } from 'react-router';
import Icon from '../../atoms/Icon/Icon';
import Badge from '../../atoms/Badge/Badge';
import styles from './NavItem.module.css';

interface NavItemProps {
  icon: string;
  label: string;
  path: string;
  badge?: number;
  collapsed?: boolean;
  disabled?: boolean;
  external?: boolean;
  onClick?: () => void;
}

export default function NavItem({ icon, label, path, badge, collapsed, disabled, external, onClick }: NavItemProps) {
  if (disabled) {
    return (
      <div
        className={`${styles.navItem} ${styles.disabled} ${collapsed ? styles.collapsed : ''}`}
        title="Completa tu perfil para acceder"
      >
        <Icon name={icon} size="sm" />
        {!collapsed && <span className={styles.label}>{label}</span>}
        {!collapsed && badge !== undefined && badge > 0 && <Badge count={badge} />}
      </div>
    );
  }

  if (external) {
    return (
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.navItem} ${collapsed ? styles.collapsed : ''}`}
        onClick={onClick}
      >
        <Icon name={icon} size="sm" />
        {!collapsed && <span className={styles.label}>{label}</span>}
        {!collapsed && badge !== undefined && badge > 0 && <Badge count={badge} />}
      </a>
    );
  }

  return (
    <NavLink
      to={path}
      end
      className={({ isActive }) =>
        `${styles.navItem} ${isActive ? styles.active : ''} ${collapsed ? styles.collapsed : ''}`
      }
      onClick={onClick}
    >
      <Icon name={icon} size="sm" />
      {!collapsed && <span className={styles.label}>{label}</span>}
      {!collapsed && badge !== undefined && badge > 0 && <Badge count={badge} />}
    </NavLink>
  );
}
