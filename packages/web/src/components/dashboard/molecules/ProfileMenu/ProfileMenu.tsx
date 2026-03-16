import Avatar from '../../atoms/Avatar/Avatar';
import DropdownMenu from '../DropdownMenu/DropdownMenu';
import styles from './ProfileMenu.module.css';

interface ProfileMenuProps {
  name: string;
  role: string;
  avatar?: string;
}

export default function ProfileMenu({ name, role, avatar }: ProfileMenuProps) {
  return (
    <DropdownMenu
      trigger={
        <div className={styles.profile}>
          <Avatar src={avatar} name={name} size="sm" />
          <div className={styles.info}>
            <span className={styles.name}>{name}</span>
            <span className={styles.role}>{role}</span>
          </div>
        </div>
      }
    >
      <div className={styles.menuContent}>
        <a className={styles.menuItem} href="#">Mi Perfil</a>
        <a className={styles.menuItem} href="#">Configuración</a>
        <hr className={styles.divider} />
        <a className={styles.menuItem} href="/">Cerrar Sesión</a>
      </div>
    </DropdownMenu>
  );
}
