import styles from './Badge.module.css';

interface BadgeProps {
  count: number;
}

export default function Badge({ count }: BadgeProps) {
  if (count <= 0) return null;
  return (
    <span className={styles.badge}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
