import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  label?: string;
}

export default function ProgressBar({ value, max = 100, color, label }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={styles.wrapper}>
      {label && (
        <div className={styles.header}>
          <span className={styles.label}>{label}</span>
          <span className={styles.pct}>{Math.round(pct)}%</span>
        </div>
      )}
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${pct}%`, background: color || 'var(--dash-primary)' }}
        />
      </div>
    </div>
  );
}
