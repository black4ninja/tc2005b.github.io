import { useParams, Link } from 'react-router';
import { useCargaGated } from '../../hooks/useCargaGated';
import { NOMBRE_LENGUAJE } from '../../config/codemirrorLenguaje';
import styles from './EjerciciosAlumno.module.css';

interface EjercicioLista {
  id: string;
  titulo: string;
  slug: string;
  lenguajes: string[];
  orden: number;
}

interface ColeccionRef {
  slug: string;
  nombre: string;
  clave: string | null;
}

/** Lista de ejercicios de una colección para el alumno (mini-juez). */
interface RespuestaLista { coleccion: ColeccionRef | null; ejercicios: EjercicioLista[] }

export default function EjerciciosAlumnoPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, cargando, error, noEncontrado, reintentar } = useCargaGated<RespuestaLista>(
    slug ? `/api/contenidos/${slug}/ejercicios` : null,
  );
  const coleccion = data?.coleccion ?? null;
  const ejercicios = data?.ejercicios ?? [];

  if (cargando) return <div className={styles.page}><p className={styles.info}>Cargando…</p></div>;
  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>No se pudo cargar. Revisa tu conexión e inténtalo de nuevo.</p>
        <button
          className={styles.volver}
          style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
          onClick={reintentar}
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (noEncontrado) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>No se encontró esta sección de ejercicios.</p>
        <Link to="/alumno" className={styles.volver}>Volver</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={`/contenidos/${slug}/`} className={styles.volver}>← {coleccion?.clave || coleccion?.nombre || 'Contenidos'}</Link>
        <h1 className={styles.titulo}>Ejercicios</h1>
      </header>

      {ejercicios.length === 0 ? (
        <p className={styles.info}>Aún no hay ejercicios publicados en esta colección.</p>
      ) : (
        <ul className={styles.lista}>
          {ejercicios.map((e) => (
            <li key={e.id}>
              <Link to={`/contenidos/${slug}/ejercicios/${e.slug}`} className={styles.item}>
                <span className={styles.itemTitulo}>{e.titulo}</span>
                <span className={styles.itemLeng}>
                  {e.lenguajes.map((l) => NOMBRE_LENGUAJE[l] ?? l).join(' · ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
