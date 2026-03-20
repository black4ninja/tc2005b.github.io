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
  onClick?: () => void;
}

export default function NavItem({ icon, label, path, badge, collapsed, disabled, onClick }: NavItemProps) {
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
