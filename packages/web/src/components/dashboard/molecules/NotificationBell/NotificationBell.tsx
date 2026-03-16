import Icon from '../../atoms/Icon/Icon';
import Badge from '../../atoms/Badge/Badge';
import DropdownMenu from '../DropdownMenu/DropdownMenu';
import styles from './NotificationBell.module.css';

interface NotificationBellProps {
  count: number;
  items?: { id: string; title: string; time: string }[];
}

export default function NotificationBell({ count, items = [] }: NotificationBellProps) {
  return (
    <DropdownMenu
      trigger={
        <div className={styles.bell}>
          <Icon name="notifications" size="sm" />
          {count > 0 && (
            <span className={styles.badgeWrap}>
              <Badge count={count} />
            </span>
          )}
        </div>
      }
    >
      <div className={styles.header}>Notificaciones</div>
      <div className={styles.list}>
        {items.length === 0 && (
          <p className={styles.empty}>Sin notificaciones</p>
        )}
        {items.map(item => (
          <div key={item.id} className={styles.item}>
            <span className={styles.itemTitle}>{item.title}</span>
            <span className={styles.itemTime}>{item.time}</span>
          </div>
        ))}
      </div>
    </DropdownMenu>
  );
}
