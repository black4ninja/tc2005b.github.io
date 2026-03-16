import Icon from '../../atoms/Icon/Icon';
import styles from './StatCard.module.css';
import type { StatCardData } from '../../../../types/dashboard';

export default function StatCard({ title, value, icon, color, trend }: StatCardData) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrap} style={{ background: `${color}20`, color }}>
        <Icon name={icon} />
      </div>
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        <span className={styles.value}>{value}</span>
        {trend && (
          <span className={`${styles.trend} ${styles[trend.direction]}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
