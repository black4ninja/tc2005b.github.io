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
  categoriaId: string | null;
  resuelto: boolean;
}

interface ColeccionRef {
  slug: string;
  nombre: string;
  clave: string | null;
}

interface CategoriaRef { id: string; nombre: string; orden: number }

/** Lista de ejercicios de una colección para el alumno (mini-juez). */
interface RespuestaLista {
  coleccion: ColeccionRef | null;
  categorias: CategoriaRef[];
  ejercicios: EjercicioLista[];
  progreso: { resueltos: number; total: number };
}

/** Agrupa los ejercicios por categoría, en el orden de las categorías. */
function agrupar(categorias: CategoriaRef[], ejercicios: EjercicioLista[]): { titulo: string | null; items: EjercicioLista[] }[] {
  const grupos: { titulo: string | null; items: EjercicioLista[] }[] = [];
  for (const c of categorias) {
    const items = ejercicios.filter((e) => e.categoriaId === c.id);
    if (items.length) grupos.push({ titulo: c.nombre, items });
  }
  const sinCategoria = ejercicios.filter((e) => !e.categoriaId || !categorias.some((c) => c.id === e.categoriaId));
  if (sinCategoria.length) grupos.push({ titulo: categorias.length ? 'Otros' : null, items: sinCategoria });
  return grupos;
}

export default function EjerciciosAlumnoPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, cargando, error, noEncontrado, reintentar } = useCargaGated<RespuestaLista>(
    slug ? `/api/contenidos/${slug}/ejercicios` : null,
  );
  const coleccion = data?.coleccion ?? null;
  const ejercicios = data?.ejercicios ?? [];
  const categorias = data?.categorias ?? [];
  const progreso = data?.progreso ?? { resueltos: 0, total: 0 };
  const grupos = agrupar(categorias, ejercicios);

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
        {progreso.total > 0 && (
          <div className={styles.progreso}>
            <div className={styles.barra}>
              <div className={styles.barraLlena} style={{ width: `${Math.round((progreso.resueltos / progreso.total) * 100)}%` }} />
            </div>
            <span className={styles.progresoTexto}>{progreso.resueltos} / {progreso.total} resueltos</span>
          </div>
        )}
      </header>

      {ejercicios.length === 0 ? (
        <p className={styles.info}>Aún no hay ejercicios publicados en esta colección.</p>
      ) : (
        grupos.map((g, gi) => (
          <section key={g.titulo ?? `g${gi}`} className={styles.grupo}>
            {g.titulo && <h2 className={styles.grupoTitulo}>{g.titulo}</h2>}
            <ul className={styles.lista}>
              {g.items.map((e) => (
                <li key={e.id}>
                  <Link to={`/contenidos/${slug}/ejercicios/${e.slug}`} className={`${styles.item} ${e.resuelto ? styles.itemResuelto : ''}`}>
                    <span className={styles.itemIzq}>
                      <span className={styles.check} aria-hidden>{e.resuelto ? '✓' : '○'}</span>
                      <span className={styles.itemTitulo}>{e.titulo}</span>
                    </span>
                    <span className={styles.itemLeng}>
                      {e.lenguajes.map((l) => NOMBRE_LENGUAJE[l] ?? l).join(' · ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
