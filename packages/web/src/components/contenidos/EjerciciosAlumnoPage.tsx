import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { NOMBRE_LENGUAJE } from '../../config/codemirrorLenguaje';
import { useEjerciciosNav } from '../../context/EjerciciosNavContext';
import { agruparEnBloques } from './agruparEjercicios';
import styles from './EjerciciosAlumno.module.css';

/**
 * Listado de ejercicios de programación.
 *
 * La navegación —los bloques de la colección y el filtro de lenguaje— ya NO está
 * aquí: la pinta el sidebar (`ArbolEjercicios`), y el avance global, el topbar.
 * Esta pantalla se queda con lo que corresponde al panel principal: las
 * categorías de la sección abierta, con sus ejercicios. Es el mismo reparto que
 * en Diagramas, y el motivo es el espacio: el módulo se resuelve con el
 * enunciado y el editor de código lado a lado, y el menú global entero al lado
 * era la parte más cara de la pantalla.
 *
 * **Sin bloques la pantalla se comporta como antes**: no hay secciones que
 * elegir, así que se listan todas las categorías de corrido. Es la misma
 * garantía de no-regresión que fija `agruparEjercicios.test.ts`.
 */
export default function EjerciciosAlumnoPage() {
  const {
    activo,
    base,
    coleccion,
    bloques,
    categorias,
    filtrados,
    ejercicios,
    seccion,
    cargando,
    error,
    noEncontrado,
    reintentar,
  } = useEjerciciosNav();

  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());

  /**
   * Sección efectiva: la de la URL, o el primer bloque. Sin este respaldo,
   * entrar al módulo sin `?seccion=` dejaría el panel vacío junto a un árbol
   * lleno, que se lee como que no hay nada publicado.
   */
  const nombreSeccion = seccion ?? bloques[0]?.nombre ?? null;

  /**
   * Lo que se pinta en el panel.
   *
   * Con bloques se muestra SOLO el abierto; sin bloques, el agrupado plano de
   * siempre. `agruparEnBloques` resuelve los dos casos, así que se le pasa la
   * lista de bloques ya recortada a la sección en vez de duplicar sus reglas
   * —categorías vacías fuera, huérfanas al residual— aquí.
   */
  const grupos = useMemo(() => {
    if (!bloques.length) return agruparEnBloques([], categorias, filtrados);
    const abierto = bloques.filter((b) => b.nombre === nombreSeccion);
    return agruparEnBloques(abierto, categorias, filtrados);
  }, [bloques, categorias, filtrados, nombreSeccion]);

  /** Descripción del bloque abierto, para la cabecera. */
  const descripcion = useMemo(
    () => bloques.find((b) => b.nombre === nombreSeccion)?.descripcion ?? null,
    [bloques, nombreSeccion],
  );

  function toggle(clave: string) {
    setColapsadas((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  }

  if (!activo) return null;

  if (cargando && !ejercicios.length) {
    return <div className={styles.page}><p className={styles.info}>Cargando…</p></div>;
  }
  if (noEncontrado) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>No se encontró esta sección de ejercicios.</p>
      </div>
    );
  }
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

  // Todas las categorías del bloque abierto, aplanadas: el nivel de bloque ya lo
  // decide el árbol, así que aquí solo hace falta su contenido.
  const contenido = grupos.flatMap((b) => b.grupos);

  return (
    <div className={styles.page}>
      {/* Sin enlace "volver": la salida del módulo es el propio sidebar. */}
      <header className={styles.header}>
        <h1 className={styles.titulo}>{nombreSeccion ?? 'Ejercicios'}</h1>
        {(coleccion?.clave || coleccion?.nombre) && (
          <p className={styles.subtitulo}>{coleccion?.clave || coleccion?.nombre}</p>
        )}
        {descripcion && <p className={styles.info}>{descripcion}</p>}
      </header>

      {ejercicios.length === 0 ? (
        <p className={styles.info}>Aún no hay ejercicios publicados en esta colección.</p>
      ) : contenido.length === 0 ? (
        <p className={styles.info}>No hay ejercicios en esta sección para el lenguaje elegido.</p>
      ) : (
        contenido.map((g) => {
          const abierto = !colapsadas.has(g.clave);
          const resueltos = g.items.filter((e) => e.resuelto).length;
          return (
            <section key={g.clave} className={styles.grupo}>
              <button
                className={styles.grupoHeader}
                aria-expanded={abierto}
                onClick={() => toggle(g.clave)}
              >
                <span className={styles.chevron} aria-hidden>{abierto ? '▾' : '▸'}</span>
                <span className={styles.grupoTitulo}>{g.titulo ?? 'Ejercicios'}</span>
                <span className={styles.grupoConteo}>{resueltos}/{g.items.length}</span>
              </button>
              {abierto && (
                <ul className={styles.lista}>
                  {g.items.map((e) => (
                    <li key={e.id}>
                      <Link
                        to={`${base}/${e.slug}`}
                        className={`${styles.item} ${e.resuelto ? styles.itemResuelto : ''}`}
                      >
                        <span className={styles.itemIzq}>
                          <span className={styles.check} aria-hidden>{e.resuelto ? '✓' : '○'}</span>
                          <span className={styles.itemTitulo}>{e.titulo}</span>
                        </span>
                        {/* `agruparEnBloques` devuelve `EjercicioLista`, donde los
                            lenguajes son opcionales por compartirse con el módulo de
                            diagramas; aquí siempre llegan. */}
                        <span className={styles.itemLeng}>
                          {(e.lenguajes ?? []).map((l) => NOMBRE_LENGUAJE[l] ?? l).join(' · ')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
