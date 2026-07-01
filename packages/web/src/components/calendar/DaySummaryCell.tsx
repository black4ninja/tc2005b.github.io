import styles from './DaySummaryCell.module.css';

interface DaySummaryCellProps {
  sessions: string[];
}

export default function DaySummaryCell({ sessions }: DaySummaryCellProps) {
  if (sessions.length === 0) {
    return <div className={styles.emptySummary} />;
  }

  const text =
    sessions.length === 1
      ? `Total: ${sessions[0]}`
      : sessions.map((s, i) => `S${i + 1}: ${s}`).join(' · ');

  return (
    <div className={styles.summaryCell}>
      <i className={`material-icons ${styles.icon}`}>schedule</i>
      <span>{text}</span>
    </div>
  );
}
