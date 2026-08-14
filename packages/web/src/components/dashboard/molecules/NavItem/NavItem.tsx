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
    // Atenuado se lee como «cargando» o «roto». El candado dice que está
    // CERRADO, y el aria-disabled lo cuenta a quien no ve el gris; el porqué
    // completo va en el `title`, que en táctil no existe, así que la misma
    // explicación se repite entera en el aviso del calendario y del Hub.
    return (
      <div
        className={`${styles.navItem} ${styles.disabled} ${collapsed ? styles.collapsed : ''}`}
        aria-disabled="true"
        title={`${label} se desbloquea al completar tu perfil, en Mi Dashboard`}
      >
        <Icon name={icon} size="sm" />
        {!collapsed && <span className={styles.label}>{label}</span>}
        {!collapsed && <Icon name="lock" size="sm" className={styles.candado} />}
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
