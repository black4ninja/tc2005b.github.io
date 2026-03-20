import styles from './CalendarSkeleton.module.css';

function SkeletonCard({ lines }: { lines: number }) {
  const lineWidths = ['lineFull', 'lineMedium', 'lineShort'] as const;

  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonHeader}>
        <div className={`${styles.skeletonNumber} ${styles.shimmer}`} />
        <div className={styles.skeletonHeaderLines}>
          <div className={`${styles.shimmer} ${styles.line} ${styles.lineTitle}`} />
          <div className={`${styles.shimmer} ${styles.line} ${styles.lineSubtitle}`} />
        </div>
      </div>
      <div className={styles.skeletonBody}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={`${styles.shimmer} ${styles.line} ${styles[lineWidths[i % lineWidths.length]]}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function CalendarSkeleton() {
  return (
    <div className={styles.skeletonContainer}>
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
    </div>
  );
}
