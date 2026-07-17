import { useState } from 'react';
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

interface RespuestaLista {
  coleccion: ColeccionRef | null;
  categorias: CategoriaRef[];
  ejercicios: EjercicioLista[];
  progreso: { resueltos: number; total: number };
}

interface Grupo { clave: string; titulo: string | null; items: EjercicioLista[] }

/** Agrupa los ejercicios por categoría, en el orden de las categorías. */
function agrupar(categorias: CategoriaRef[], ejercicios: EjercicioLista[]): Grupo[] {
  const grupos: Grupo[] = [];
  for (const c of categorias) {
    const items = ejercicios.filter((e) => e.categoriaId === c.id);
    if (items.length) grupos.push({ clave: c.id, titulo: c.nombre, items });
  }
  const sinCategoria = ejercicios.filter((e) => !e.categoriaId || !categorias.some((c) => c.id === e.categoriaId));
  if (sinCategoria.length) grupos.push({ clave: '__otros', titulo: categorias.length ? 'Otros' : null, items: sinCategoria });
  return grupos;
}

const LENGUAJES = ['kotlin', 'swift'];

export default function EjerciciosAlumnoPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, cargando, error, noEncontrado, reintentar } = useCargaGated<RespuestaLista>(
    slug ? `/api/contenidos/${slug}/ejercicios` : null,
  );
  const [filtroLeng, setFiltroLeng] = useState<'todos' | string>('todos');
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());

  const coleccion = data?.coleccion ?? null;
  const ejercicios = data?.ejercicios ?? [];
  const categorias = data?.categorias ?? [];
  const progreso = data?.progreso ?? { resueltos: 0, total: 0 };

  const filtrados = filtroLeng === 'todos' ? ejercicios : ejercicios.filter((e) => e.lenguajes.includes(filtroLeng));
  const grupos = agrupar(categorias, filtrados);

  function toggle(clave: string) {
    setColapsadas((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave); else next.add(clave);
      return next;
    });
  }

  if (cargando) return <div className={styles.page}><p className={styles.info}>Cargando…</p></div>;
  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>No se pudo cargar. Revisa tu conexión e inténtalo de nuevo.</p>
        <button className={styles.volver} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} onClick={reintentar}>Reintentar</button>
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
        <>
          <div className={styles.filtros}>
            <span className={styles.filtroLabel}>Lenguaje:</span>
            <button className={`${styles.chip} ${filtroLeng === 'todos' ? styles.chipActivo : ''}`} onClick={() => setFiltroLeng('todos')}>Todos</button>
            {LENGUAJES.map((l) => (
              <button key={l} className={`${styles.chip} ${filtroLeng === l ? styles.chipActivo : ''}`} onClick={() => setFiltroLeng(l)}>
                {NOMBRE_LENGUAJE[l] ?? l}
              </button>
            ))}
          </div>

          {grupos.length === 0 ? (
            <p className={styles.info}>No hay ejercicios para este lenguaje.</p>
          ) : (
            grupos.map((g) => {
              const abierto = !colapsadas.has(g.clave);
              const resueltos = g.items.filter((e) => e.resuelto).length;
              return (
                <section key={g.clave} className={styles.grupo}>
                  <button className={styles.grupoHeader} onClick={() => toggle(g.clave)}>
                    <span className={styles.chevron}>{abierto ? '▾' : '▸'}</span>
                    <span className={styles.grupoTitulo}>{g.titulo ?? 'Ejercicios'}</span>
                    <span className={styles.grupoConteo}>{resueltos}/{g.items.length}</span>
                  </button>
                  {abierto && (
                    <ul className={styles.lista}>
                      {g.items.map((e) => (
                        <li key={e.id}>
                          <Link to={`/contenidos/${slug}/ejercicios/${e.slug}`} className={`${styles.item} ${e.resuelto ? styles.itemResuelto : ''}`}>
                            <span className={styles.itemIzq}>
                              <span className={styles.check} aria-hidden>{e.resuelto ? '✓' : '○'}</span>
                              <span className={styles.itemTitulo}>{e.titulo}</span>
                            </span>
                            <span className={styles.itemLeng}>{e.lenguajes.map((l) => NOMBRE_LENGUAJE[l] ?? l).join(' · ')}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
