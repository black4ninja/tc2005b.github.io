import { useParams } from 'react-router';
import CalendarContent from './CalendarContent';
import styles from './CalendarPage.module.css';

export default function CalendarPage() {
  const { grupoId } = useParams<{ grupoId: string }>();
  return (
    <div className={styles.calendarPage}>
      <CalendarContent grupoId={grupoId} stickyTop="var(--navbar-height)" />
    </div>
  );
}
