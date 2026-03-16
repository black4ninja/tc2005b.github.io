import styles from './StatValue.module.css';

interface StatValueProps {
  value: string | number;
  label: string;
}

export default function StatValue({ value, label }: StatValueProps) {
  return (
    <div className={styles.wrapper}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
