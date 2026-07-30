import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useCargaGated } from '../../hooks/useCargaGated';
import { NOMBRE_LENGUAJE } from '../../config/codemirrorLenguaje';
import { useEjerciciosBase } from '../../config/rutasEjercicios';
import {
  agruparEnBloques,
  type BloqueRef,
  type CategoriaRef,
  type EjercicioLista,
} from './agruparEjercicios';
import styles from './EjerciciosAlumno.module.css';

interface ColeccionRef {
  slug: string;
  nombre: string;
  clave: string | null;
}

interface RespuestaLista {
  coleccion: ColeccionRef | null;
  /** Ausente en respuestas de un API anterior a los bloques → agrupado plano. */
  bloques?: BloqueRef[];
  categorias: CategoriaRef[];
  ejercicios: EjercicioLista[];
  progreso: { resueltos: number; total: number };
}

const LENGUAJES = Object.keys(NOMBRE_LENGUAJE);

export default function EjerciciosAlumnoPage() {
  const { slug } = useParams<{ slug: string }>();
  const base = useEjerciciosBase();
  const { data, cargando, error, noEncontrado, reintentar } = useCargaGated<RespuestaLista>(
    slug ? `/api/contenidos/${slug}/ejercicios` : null,
  );
  const [filtroLeng, setFiltroLeng] = useState<'todos' | string>('todos');
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());

  const coleccion = data?.coleccion ?? null;
  const ejercicios = data?.ejercicios ?? [];
  const categorias = data?.categorias ?? [];
  const bloques = data?.bloques ?? [];

  const filtrados = filtroLeng === 'todos' ? ejercicios : ejercicios.filter((e) => e.lenguajes.includes(filtroLeng));
  // Sin bloques devuelve un único bloque sin título → se pinta como siempre.
  const arbol = agruparEnBloques(bloques, categorias, filtrados);
  // El progreso se calcula sobre lo FILTRADO (no el total del servidor): así un
  // alumno que filtra por su lenguaje llega a 100% sin que los ejercicios
  // exclusivos del otro lenguaje —que no puede resolver— lo dejen atascado.
  const progreso = { resueltos: filtrados.filter((e) => e.resuelto).length, total: filtrados.length };

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
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Sin enlace "volver": dentro del shell, Ejercicios es una sección de
          primer nivel del menú y la salida es el propio sidebar. La colección
          va de subtítulo porque un grupo puede tener más de una materia. */}
      <header className={styles.header}>
        <h1 className={styles.titulo}>Ejercicios</h1>
        {(coleccion?.clave || coleccion?.nombre) && (
          <p className={styles.subtitulo}>{coleccion?.clave || coleccion?.nombre}</p>
        )}
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

          {arbol.length === 0 ? (
            <p className={styles.info}>No hay ejercicios para este lenguaje.</p>
          ) : (
            arbol.map((b) => {
              // Las claves van prefijadas: el residual se llama '__otros' en los
              // DOS niveles y sin prefijo colapsar un bloque plegaría su categoría.
              const claveBloque = `bloque:${b.clave}`;
              const bloqueAbierto = !colapsadas.has(claveBloque);
              const items = b.grupos.flatMap((g) => g.items);
              const resueltosBloque = items.filter((e) => e.resuelto).length;
              return (
                <section key={claveBloque} className={b.titulo ? styles.bloque : undefined}>
                  {/* Sin título no hay cabecera: es el caso "no hay bloques",
                      donde la pantalla debe verse como antes de que existieran. */}
                  {b.titulo && (
                    <button className={styles.bloqueHeader} onClick={() => toggle(claveBloque)}>
                      <span className={styles.chevron}>{bloqueAbierto ? '▾' : '▸'}</span>
                      <span className={styles.bloqueTitulo}>{b.titulo}</span>
                      <span className={styles.grupoConteo}>{resueltosBloque}/{items.length}</span>
                    </button>
                  )}
                  {b.titulo && b.descripcion && bloqueAbierto && (
                    <p className={styles.bloqueSub}>{b.descripcion}</p>
                  )}
                  {(!b.titulo || bloqueAbierto) && (
                    <div className={b.titulo ? styles.bloqueBody : undefined}>
                      {b.grupos.map((g) => {
                        const claveGrupo = `cat:${g.clave}`;
                        const abierto = !colapsadas.has(claveGrupo);
                        const resueltos = g.items.filter((e) => e.resuelto).length;
                        return (
                          <section key={claveGrupo} className={styles.grupo}>
                            <button className={styles.grupoHeader} onClick={() => toggle(claveGrupo)}>
                              <span className={styles.chevron}>{abierto ? '▾' : '▸'}</span>
                              <span className={styles.grupoTitulo}>{g.titulo ?? 'Ejercicios'}</span>
                              <span className={styles.grupoConteo}>{resueltos}/{g.items.length}</span>
                            </button>
                            {abierto && (
                              <ul className={styles.lista}>
                                {g.items.map((e) => (
                                  <li key={e.id}>
                                    <Link to={`${base}/${e.slug}`} className={`${styles.item} ${e.resuelto ? styles.itemResuelto : ''}`}>
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
                      })}
                    </div>
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
