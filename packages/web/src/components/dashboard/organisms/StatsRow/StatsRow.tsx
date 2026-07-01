import StatCard from '../../molecules/StatCard/StatCard';
import styles from './StatsRow.module.css';
import type { StatCardData } from '../../../../types/dashboard';

interface StatsRowProps {
  stats: StatCardData[];
}

export default function StatsRow({ stats }: StatsRowProps) {
  return (
    <div className={styles.grid}>
      {stats.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </div>
  );
}
