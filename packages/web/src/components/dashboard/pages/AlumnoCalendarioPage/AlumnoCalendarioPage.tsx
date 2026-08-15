import { useParams } from 'react-router';
import CalendarContent from '../../../calendar/CalendarContent';
import AvisoPerfilIncompleto from '../../molecules/AvisoPerfilIncompleto/AvisoPerfilIncompleto';

export default function AlumnoCalendarioPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      {/* El calendario no se bloquea nunca, así que es donde acaba el alumno que
          todavía no ha rellenado el perfil. Sin este aviso, lo único que ve es
          medio menú en gris y ninguna explicación. */}
      <AvisoPerfilIncompleto grupoId={id} />
      <CalendarContent grupoId={id} stickyTop="var(--dashboard-header-height)" />
    </>
  );
}
