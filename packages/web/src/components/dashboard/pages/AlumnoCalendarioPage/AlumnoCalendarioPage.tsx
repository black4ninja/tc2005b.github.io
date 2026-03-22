import { useParams } from 'react-router';
import CalendarContent from '../../../calendar/CalendarContent';

export default function AlumnoCalendarioPage() {
  const { id } = useParams<{ id: string }>();
  return <CalendarContent grupoId={id} stickyTop="var(--dashboard-header-height)" />;
}
