import Icon from '../../atoms/Icon/Icon';
import styles from './RecentActivity.module.css';
import type { ActivityItem } from '../../../../types/dashboard';

interface RecentActivityProps {
  title: string;
  items: ActivityItem[];
}

export default function RecentActivity({ title, items }: RecentActivityProps) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.list}>
        {items.map(item => (
          <div key={item.id} className={styles.item}>
            <div className={styles.iconWrap} style={{ background: `${item.color}20`, color: item.color }}>
              <Icon name={item.icon} size="sm" />
            </div>
            <div className={styles.content}>
              <span className={styles.itemTitle}>{item.title}</span>
              <span className={styles.itemDesc}>{item.description}</span>
            </div>
            <span className={styles.time}>{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
