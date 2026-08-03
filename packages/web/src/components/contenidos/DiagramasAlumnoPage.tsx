import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router';
import { useCargaGated } from '../../hooks/useCargaGated';
import { useDiagramasBase } from '../../config/rutasDiagramas';
import { TIPOS_DIAGRAMA, etiquetaTipoDiagrama } from '../../lib/diagramas/etiquetas';
import {
  agruparEnBloques,
  type BloqueRef,
  type CategoriaRef,
  type EjercicioLista,
} from './agruparEjercicios';
import styles from './DiagramasAlumno.module.css';

interface ColeccionRef {
  slug: string;
  nombre: string;
  clave: string | null;
}

/**
 * En este módulo el tipo de diagrama SIEMPRE viene: es lo que decide qué
 * comprobaciones aplican, así que ningún ejercicio puede existir sin él. En
 * `EjercicioLista` es opcional porque la comparte con el módulo de código, que
 * no lo tiene.
 */
interface DiagramaLista extends EjercicioLista {
  tipoDiagrama: string;
}

interface RespuestaLista {
  coleccion: ColeccionRef | null;
  categorias: CategoriaRef[];
  bloques: BloqueRef[];
  ejercicios: DiagramaLista[];
}

/** Orden canónico de los tipos, para que los filtros no dependan de los datos. */
const ORDEN_TIPOS = TIPOS_DIAGRAMA.map((t) => String(t.key));

export default function DiagramasAlumnoPage() {
  const { slug } = useParams<{ slug: string }>();
  const base = useDiagramasBase();
  const { data, cargando, error, noEncontrado, reintentar } = useCargaGated<RespuestaLista>(
    slug ? `/api/contenidos/${slug}/diagramas` : null,
  );
  const [filtroTipo, setFiltroTipo] = useState<'todos' | string>('todos');
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());

  const coleccion = data?.coleccion ?? null;
  const ejercicios = useMemo(() => data?.ejercicios ?? [], [data]);
  const categorias = data?.categorias ?? [];
  const bloques = data?.bloques ?? [];

  /**
   * Los chips se derivan de lo que hay publicado, no del catálogo entero: de los
   * ocho tipos que el editor ofrece, una colección suele usar dos o tres, y
   * pintar los seis restantes sería ofrecer filtros que siempre dan vacío. Se
   * ordenan por el catálogo para que la fila no cambie de orden según el
   * contenido, y los tipos que este cliente aún no conozca van al final en vez
   * de desaparecer.
   */
  const tiposPresentes = useMemo(() => {
    const presentes = [...new Set(ejercicios.map((e) => e.tipoDiagrama))];
    const posicion = (t: string) => {
      const i = ORDEN_TIPOS.indexOf(t);
      return i === -1 ? ORDEN_TIPOS.length : i;
    };
    return presentes.sort((a, b) => posicion(a) - posicion(b) || a.localeCompare(b));
  }, [ejercicios]);

  const filtrados =
    filtroTipo === 'todos' ? ejercicios : ejercicios.filter((e) => e.tipoDiagrama === filtroTipo);
  // Sin bloques devuelve un único bloque sin título → se pinta como siempre.
  const arbol = agruparEnBloques(bloques, categorias, filtrados);
  // El progreso se calcula sobre lo FILTRADO, igual que en el módulo de código:
  // quien esté trabajando un solo tipo de diagrama ve su avance en ESE tipo, sin
  // que los de los demás lo dejen permanentemente por debajo del 100%.
  const progreso = {
    resueltos: filtrados.filter((e) => e.resuelto).length,
    total: filtrados.length,
  };

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
        <p className={styles.info}>No se pudo cargar el listado. Puede deberse a un problema de conexión.</p>
        <button className={`${styles.volver} ${styles.enlaceBoton}`} onClick={reintentar}>Reintentar</button>
      </div>
    );
  }
  if (noEncontrado) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>No se encontró esta sección de diagramas.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Sin enlace "volver": dentro del shell, Diagramas es una sección de
          primer nivel del menú y la salida es el propio sidebar. La colección
          va de subtítulo porque un grupo puede tener más de una materia. */}
      <header className={styles.header}>
        <h1 className={styles.titulo}>Diagramas</h1>
        {(coleccion?.clave || coleccion?.nombre) && (
          <p className={styles.subtitulo}>{coleccion?.clave || coleccion?.nombre}</p>
        )}
        {progreso.total > 0 && (
          <div className={styles.progreso}>
            <div className={styles.barra}>
              <div
                className={styles.barraLlena}
                style={{ width: `${Math.round((progreso.resueltos / progreso.total) * 100)}%` }}
              />
            </div>
            <span className={styles.progresoTexto}>{progreso.resueltos} / {progreso.total} resueltos</span>
          </div>
        )}
      </header>

      {ejercicios.length === 0 ? (
        <p className={styles.info}>Aún no hay ejercicios de diagrama publicados en esta colección.</p>
      ) : (
        <>
          {/* Con un solo tipo el filtro no filtra nada: la fila se omite. */}
          {tiposPresentes.length > 1 && (
            <div className={styles.filtros}>
              <span className={styles.filtroLabel}>Tipo de diagrama:</span>
              <button
                className={`${styles.chip} ${filtroTipo === 'todos' ? styles.chipActivo : ''}`}
                onClick={() => setFiltroTipo('todos')}
              >
                Todos
              </button>
              {tiposPresentes.map((t) => (
                <button
                  key={t}
                  className={`${styles.chip} ${filtroTipo === t ? styles.chipActivo : ''}`}
                  onClick={() => setFiltroTipo(t)}
                >
                  {etiquetaTipoDiagrama(t)}
                </button>
              ))}
            </div>
          )}

          {arbol.length === 0 ? (
            <p className={styles.info}>No hay ejercicios de este tipo de diagrama.</p>
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
                      donde la pantalla debe verse como una lista plana. */}
                  {b.titulo && (
                    <button className={styles.bloqueHeader} aria-expanded={bloqueAbierto} onClick={() => toggle(claveBloque)}>
                      <span className={styles.chevron} aria-hidden>{bloqueAbierto ? '▾' : '▸'}</span>
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
                            <button className={styles.grupoHeader} aria-expanded={abierto} onClick={() => toggle(claveGrupo)}>
                              <span className={styles.chevron} aria-hidden>{abierto ? '▾' : '▸'}</span>
                              <span className={styles.grupoTitulo}>{g.titulo ?? 'Diagramas'}</span>
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
                                      {/* `agruparEnBloques` devuelve `EjercicioLista`, donde el tipo
                                          es opcional; aquí siempre llega, y si faltara se omite el
                                          metadato en vez de pintar "undefined". */}
                                      {e.tipoDiagrama && (
                                        <span className={styles.itemTipo}>{etiquetaTipoDiagrama(e.tipoDiagrama)}</span>
                                      )}
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
