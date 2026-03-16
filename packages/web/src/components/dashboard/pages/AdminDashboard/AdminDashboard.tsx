import StatsRow from '../../organisms/StatsRow/StatsRow';
import ChartCard from '../../molecules/ChartCard/ChartCard';
import DataTable from '../../organisms/DataTable/DataTable';
import RecentActivity from '../../organisms/RecentActivity/RecentActivity';
import { adminStats, weeklyDeliveriesChart, gradesByLabChart, recentStudents, adminActivity } from '../../../../data/dashboard/adminMockData';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Dashboard Administrador</h1>
      <StatsRow stats={adminStats} />
      <div className={styles.chartsGrid}>
        <ChartCard title="Entregas por Semana" config={weeklyDeliveriesChart} />
        <ChartCard title="Calificaciones por Lab" config={gradesByLabChart} />
      </div>
      <div className={styles.bottomGrid}>
        <DataTable
          title="Alumnos Recientes"
          headers={['Alumno', 'Último Lab', 'Promedio', 'Estado']}
          rows={recentStudents}
        />
        <RecentActivity title="Actividad Reciente" items={adminActivity} />
      </div>
    </div>
  );
}
