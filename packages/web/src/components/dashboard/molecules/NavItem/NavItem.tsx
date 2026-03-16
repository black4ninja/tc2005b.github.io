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
  onClick?: () => void;
}

export default function NavItem({ icon, label, path, badge, collapsed, onClick }: NavItemProps) {
  return (
    <NavLink
      to={path}
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
