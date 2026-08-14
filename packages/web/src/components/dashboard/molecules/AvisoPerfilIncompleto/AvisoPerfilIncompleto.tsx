import { Link } from 'react-router';
import Icon from '../../atoms/Icon/Icon';
import { useAuth } from '../../../../context/AuthContext';
import { useGrupoActivo } from '../../../../context/GrupoActivoContext';
import styles from './AvisoPerfilIncompleto.module.css';

/**
 * «Te falta rellenar el perfil», donde el alumno SÍ puede leerlo.
 *
 * Mientras el perfil del grupo esté a medias, el menú deja en gris Malla,
 * Competencias, Wiki, Ejercicios y Agendar entrevistas. El problema que
 * reportaron los alumnos es que nadie se lo dice: los ítems bloqueados son
 * `div`s que no se pueden pulsar —su explicación vive en un `title`, que en
 * táctil no existe—, y el calendario, que es lo único que sí se abre, no
 * menciona el asunto. Resultado: el alumno nuevo se queda mirando un menú gris
 * sin saber qué hacer.
 *
 * Le pasa igual a quien ya llevaba tiempo en la plataforma y entra a un grupo
 * NUEVO: el perfil es por grupo, así que vuelve a estar incompleto justo cuando
 * ya no espera tener que rellenar nada.
 *
 * Va en el calendario y en el Hub, que son las dos secciones que no se bloquean
 * —y por tanto las únicas donde el alumno puede acabar sin remedio—.
 */
export default function AvisoPerfilIncompleto({ grupoId }: { grupoId?: string }) {
  const { user } = useAuth();
  const { grupoActivoId } = useGrupoActivo();

  if (user?.userType !== 'alumno') return null;
  // Solo con un `false` explícito: `undefined` es «el menú todavía no ha
  // respondido», y avisar entonces sería acusar en falso durante un segundo.
  if (user.perfilCompleto !== false) return null;
  // `perfilCompleto` es el del grupo ACTIVO. Si la página está enseñando otro
  // —un enlace guardado, por ejemplo—, el aviso no le corresponde.
  if (grupoId && grupoActivoId && grupoId !== grupoActivoId) return null;

  return (
    <div className={styles.aviso} role="status">
      <Icon name="lock" size="sm" />
      <div className={styles.texto}>
        <strong className={styles.titulo}>Te falta un paso en este grupo</strong>
        <p className={styles.detalle}>
          Malla, Competencias, Wiki, Ejercicios y Agendar entrevistas están bloqueados hasta que
          completes tu perfil. Se rellena una sola vez por grupo, desde tu panel.
        </p>
      </div>
      <Link to="/alumno" className={styles.accion}>
        Completar mi perfil
      </Link>
    </div>
  );
}
