import { useParams } from 'react-router';
import CalendarContent from '../../../calendar/CalendarContent';

export default function AdminCalendarioPage() {
  const { id } = useParams<{ id: string }>();
  return <CalendarContent grupoId={id} stickyTop="var(--dashboard-header-height)" editable />;
}
