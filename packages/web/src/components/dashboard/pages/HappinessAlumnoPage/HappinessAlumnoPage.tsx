import { useParams } from 'react-router';
import HappinessMisEntradas from '../../organisms/HappinessMisEntradas/HappinessMisEntradas';
import styles from '../HappinessGrupoPage/HappinessGrupoPage.module.css';

/**
 * Happiness Door del alumno: escribe cómo le fue y relee lo suyo. El tablero
 * con las entradas de todos es solo del profesor.
 */
export default function HappinessAlumnoPage() {
  const { grupoId } = useParams<{ grupoId: string }>();
  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.pageTitle}>Happiness Door</h1>
        <p className={styles.subtitulo}>
          Cuéntanos cómo te fue en cada sesión: elige de qué sesión hablas, si fue positiva, neutral o negativa
          y explica por qué. Puedes escribir
          las veces que quieras y editar tus entradas cuando quieras. Solo tu profesor las ve.
        </p>
      </header>
      <HappinessMisEntradas apiBase={`/api/alumno/grupos/${grupoId}/happiness`} />
    </div>
  );
}
