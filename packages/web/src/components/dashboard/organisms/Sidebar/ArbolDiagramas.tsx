import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import Icon from '../../atoms/Icon/Icon';
import { useDiagramasNav } from '../../../../context/DiagramasNavContext';
import { BLOQUES_CURSO, TIPOS_CATALOGO, agrupadoDiagramas } from '../../../../lib/diagramas/etiquetas';
import styles from './ArbolDiagramas.module.css';

/**
 * Navegación del módulo Diagramas, DENTRO del sidebar del armazón.
 *
 * La maqueta original traía una tercera columna propia de 248 px. No se añade:
 * esa navegación es exactamente lo que el sidebar hace, y duplicarla dejaba dos
 * columnas compitiendo por el mismo papel. Sigue el precedente de
 * `ArbolContenidos`, que ya convierte el sidebar en el árbol de la colección
 * abierta.
 *
 * Dos secciones, y la distinción entre ellas es la que importa:
 *  - **Curso UML**: los bloques del temario, con ejercicios y su avance. Sale de
 *    los BLOQUES DE LA COLECCIÓN, no del catálogo: es lo que de verdad hay
 *    publicado para este grupo.
 *  - **Catálogo**: los tipos sin ejercicios, agrupados por familia. Se abren en
 *    modo libre. Sale del catálogo, que es quien sabe qué tipos existen.
 */
export default function ArbolDiagramas() {
  const { base, coleccion, bloques, seccion, irA, progresoDeBloque, ejercicios, cargando, error, reintentar } =
    useDiagramasNav();
  const [busqueda, setBusqueda] = useState('');

  /**
   * Los bloques de la colección se reparten entre las dos secciones por NOMBRE.
   *
   * Un ejercicio del catálogo adicional se siembra con `bloque: 'Catálogo'`, y
   * sin este reparto ese bloque aparecería bajo «Curso UML» junto a Estructura
   * o Interacción, diciendo que un mapa mental es materia del temario.
   */
  const { deCurso, deCatalogo } = useMemo(() => {
    const esDelCurso = new Set(BLOQUES_CURSO);
    return {
      deCurso: bloques.filter((b) => esDelCurso.has(b.nombre)),
      deCatalogo: bloques.filter((b) => !esDelCurso.has(b.nombre)),
    };
  }, [bloques]);

  /** Tipos que YA tienen ejercicios: no se ofrecen otra vez en el catálogo. */
  const tiposConEjercicios = useMemo(
    () => new Set(ejercicios.map((e) => e.tipoDiagrama)),
    [ejercicios],
  );

  const gruposCatalogo = useMemo(
    () =>
      agrupadoDiagramas()
        .filter((g) => g.ambito === 'catalogo')
        .map((g) => ({ ...g, tipos: g.tipos.filter((t) => !tiposConEjercicios.has(t.key)) }))
        .filter((g) => g.tipos.length > 0),
    [tiposConEjercicios],
  );

  /**
   * La búsqueda mira los EJERCICIOS y los TIPOS a la vez, porque el alumno no
   * distingue unos de otros: escribe «gantt» o «carrito» y espera llegar.
   */
  const coincidencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return null;
    return {
      ejercicios: ejercicios.filter((e) => e.titulo.toLowerCase().includes(q)).slice(0, 12),
      tipos: TIPOS_CATALOGO.filter(
        (t) => t.label.toLowerCase().includes(q) || t.key.includes(q),
      ).slice(0, 12),
    };
  }, [busqueda, ejercicios]);

  return (
    <div className={styles.arbol}>
      <div className={styles.buscador}>
        <Icon name="search" size="sm" />
        <input
          className={styles.campo}
          value={busqueda}
          placeholder="Buscar tipo o ejercicio…"
          aria-label="Buscar tipo de diagrama o ejercicio"
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <button
            type="button"
            className={styles.limpiar}
            onClick={() => setBusqueda('')}
            aria-label="Limpiar búsqueda"
          >
            <Icon name="close" size="sm" />
          </button>
        )}
      </div>

      {coleccion?.clave && <p className={styles.materia}>{coleccion.clave}</p>}

      {error && (
        <div className={styles.aviso}>
          No se pudo cargar.{' '}
          <button type="button" className={styles.enlaceBoton} onClick={reintentar}>
            Reintentar
          </button>
        </div>
      )}
      {cargando && !ejercicios.length && !error && <p className={styles.aviso}>Cargando…</p>}

      {coincidencias ? (
        <>
          <p className={styles.rubro}>Ejercicios</p>
          {coincidencias.ejercicios.length === 0 && <p className={styles.aviso}>Sin coincidencias.</p>}
          {coincidencias.ejercicios.map((e) => (
            <Link key={e.id} to={`${base}/${e.slug}`} className={styles.fila}>
              <span className={styles.filaTexto}>{e.titulo}</span>
            </Link>
          ))}
          <p className={styles.rubro}>Tipos</p>
          {coincidencias.tipos.length === 0 && <p className={styles.aviso}>Sin coincidencias.</p>}
          {coincidencias.tipos.map((t) => (
            <button
              key={t.key}
              type="button"
              className={styles.fila}
              onClick={() => {
                irA({ clase: t.ambito === 'curso' ? 'curso' : 'cat', nombre: t.agrupacion });
                setBusqueda('');
              }}
            >
              <span className={styles.filaTexto}>{t.label}</span>
              <span className={styles.filaMeta}>{t.agrupacion}</span>
            </button>
          ))}
        </>
      ) : (
        <>
          {deCurso.length > 0 && <p className={styles.rubro}>Curso UML</p>}
          {deCurso.map((b) => {
            const { resueltos, total } = progresoDeBloque(b.id);
            const activo = seccion?.clase === 'curso' && seccion.nombre === b.nombre;
            return (
              <button
                key={b.id}
                type="button"
                className={`${styles.fila} ${activo ? styles.filaActiva : ''}`}
                aria-current={activo ? 'true' : undefined}
                onClick={() => irA({ clase: 'curso', nombre: b.nombre })}
              >
                <span className={styles.filaTexto}>{b.nombre}</span>
                <span className={styles.filaConteo}>
                  {resueltos}/{total}
                </span>
              </button>
            );
          })}

          {(gruposCatalogo.length > 0 || deCatalogo.length > 0) && (
            <p className={styles.rubro}>Catálogo</p>
          )}
          {/* Primero lo que SÍ tiene ejercicios, con su avance; después los
              tipos que solo se pueden abrir en modo libre. */}
          {deCatalogo.map((b) => {
            const { resueltos, total } = progresoDeBloque(b.id);
            const activo = seccion?.clase === 'curso' && seccion.nombre === b.nombre;
            return (
              <button
                key={b.id}
                type="button"
                className={`${styles.fila} ${activo ? styles.filaActiva : ''}`}
                aria-current={activo ? 'true' : undefined}
                onClick={() => irA({ clase: 'curso', nombre: b.nombre })}
              >
                <span className={styles.filaTexto}>{b.nombre}</span>
                <span className={styles.filaConteo}>
                  {resueltos}/{total}
                </span>
              </button>
            );
          })}
          {gruposCatalogo.map((g) => {
            const activo = seccion?.clase === 'cat' && seccion.nombre === g.nombre;
            return (
              <button
                key={g.nombre}
                type="button"
                className={`${styles.fila} ${activo ? styles.filaActiva : ''}`}
                aria-current={activo ? 'true' : undefined}
                onClick={() => irA({ clase: 'cat', nombre: g.nombre })}
              >
                <span className={styles.filaTexto}>{g.nombre}</span>
                <span className={styles.filaConteoTenue}>{g.tipos.length}</span>
              </button>
            );
          })}
        </>
      )}

      {/* Salida siempre visible: desde el solver de un ejercicio, esta es la
          vuelta al listado sin pasar por el menú global. */}
      <Link to={base} className={styles.todos}>
        <Icon name="list" size="sm" />
        <span>Ver todos los ejercicios</span>
      </Link>
    </div>
  );
}
