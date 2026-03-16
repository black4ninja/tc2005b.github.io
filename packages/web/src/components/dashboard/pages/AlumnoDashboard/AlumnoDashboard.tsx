import StatsRow from '../../organisms/StatsRow/StatsRow';
import ChartCard from '../../molecules/ChartCard/ChartCard';
import DataTable from '../../organisms/DataTable/DataTable';
import ProgressBar from '../../atoms/ProgressBar/ProgressBar';
import { alumnoStats, progressChart, upcomingDeliveries, labProgress } from '../../../../data/dashboard/alumnoMockData';
import styles from './AlumnoDashboard.module.css';

export default function AlumnoDashboard() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Mi Dashboard</h1>
      <StatsRow stats={alumnoStats} />
      <div className={styles.chartsGrid}>
        <ChartCard title="Mi Progreso" config={progressChart} />
        <DataTable
          title="Próximas Entregas"
          headers={['Entrega', 'Fecha Límite', 'Estado']}
          rows={upcomingDeliveries}
        />
      </div>
      <div className={styles.progressCard}>
        <h3 className={styles.progressTitle}>Progreso por Laboratorio</h3>
        <div className={styles.progressList}>
          {labProgress.map(lab => (
            <ProgressBar key={lab.label} label={lab.label} value={lab.value} color={lab.color} />
          ))}
        </div>
      </div>
    </div>
  );
}
