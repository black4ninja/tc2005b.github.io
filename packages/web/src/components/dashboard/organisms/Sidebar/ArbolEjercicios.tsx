import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import Icon from '../../atoms/Icon/Icon';
import { useEjerciciosNav } from '../../../../context/EjerciciosNavContext';
import { NOMBRE_LENGUAJE } from '../../../../config/codemirrorLenguaje';
import { bloquesVisibles } from '../../../contenidos/navegacionDiagramas';
// Se reutiliza la hoja de `ArbolDiagramas`: los dos árboles son la MISMA pieza
// del sidebar con distinto contenido, y duplicar el CSS garantizaba que al
// ajustar uno el otro se quedara atrás.
import styles from './ArbolDiagramas.module.css';

const LENGUAJES = Object.keys(NOMBRE_LENGUAJE);

/**
 * Navegación del módulo Ejercicios, DENTRO del sidebar del armazón.
 *
 * Mismo patrón que `ArbolDiagramas`, y por el mismo motivo: al entrar al módulo
 * el sidebar dejaba el menú global entero —Calendario, Hub, Alumnos, Equipos…—
 * ocupando la columna mientras el enunciado y el editor de código se apretaban a
 * su lado. Aquí esa columna pasa a ser el índice de lo que se está haciendo.
 *
 * Un solo nivel: los BLOQUES de la colección con su avance. La segunda
 * jerarquía —las categorías dentro del bloque— se queda en el panel principal,
 * como en Diagramas, para que el árbol no crezca más que la pantalla.
 */
export default function ArbolEjercicios() {
  const {
    base,
    coleccion,
    bloques,
    ejercicios,
    seccion,
    irA,
    progresoDeBloque,
    filtroLenguaje,
    cambiarFiltroLenguaje,
    cargando,
    error,
    reintentar,
  } = useEjerciciosNav();
  const [busqueda, setBusqueda] = useState('');

  // Misma regla que en `ArbolDiagramas`. Aquí el total va sobre lo FILTRADO por
  // lenguaje, así que un bloque entero de Swift desaparece del árbol al filtrar
  // por Kotlin en vez de quedarse en «0/0».
  const visibles = useMemo(
    () => bloquesVisibles(bloques, (id) => progresoDeBloque(id).total),
    [bloques, progresoDeBloque],
  );

  /** La búsqueda mira los ejercicios por título, que es como los pide el alumno. */
  const coincidencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return null;
    return ejercicios.filter((e) => e.titulo.toLowerCase().includes(q)).slice(0, 12);
  }, [busqueda, ejercicios]);

  return (
    <div className={styles.arbol}>
      <div className={styles.buscador}>
        <Icon name="search" size="sm" />
        <input
          className={styles.campo}
          value={busqueda}
          placeholder="Buscar ejercicio…"
          aria-label="Buscar ejercicio"
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
          {coincidencias.length === 0 && <p className={styles.aviso}>Sin coincidencias.</p>}
          {coincidencias.map((e) => (
            <Link key={e.id} to={`${base}/${e.slug}`} className={styles.fila}>
              <span className={styles.filaTexto}>{e.titulo}</span>
            </Link>
          ))}
        </>
      ) : (
        <>
          {/* El filtro de lenguaje vive aquí y no en la página porque manda sobre
              los contadores del árbol y sobre el avance del topbar: teniéndolo en
              la página, filtrar por Swift dejaba el árbol contando también los de
              Kotlin y las dos cifras se contradecían en pantalla. */}
          <p className={styles.rubro}>Lenguaje</p>
          <button
            type="button"
            className={`${styles.fila} ${filtroLenguaje === 'todos' ? styles.filaActiva : ''}`}
            aria-current={filtroLenguaje === 'todos' ? 'true' : undefined}
            onClick={() => cambiarFiltroLenguaje('todos')}
          >
            <span className={styles.filaTexto}>Todos</span>
          </button>
          {LENGUAJES.map((l) => (
            <button
              key={l}
              type="button"
              className={`${styles.fila} ${filtroLenguaje === l ? styles.filaActiva : ''}`}
              aria-current={filtroLenguaje === l ? 'true' : undefined}
              onClick={() => cambiarFiltroLenguaje(l)}
            >
              <span className={styles.filaTexto}>{NOMBRE_LENGUAJE[l] ?? l}</span>
            </button>
          ))}

          {visibles.length > 0 && <p className={styles.rubro}>Secciones</p>}
          {visibles.map((b) => {
            const { resueltos, total } = progresoDeBloque(b.id);
            const activo = seccion === b.nombre;
            return (
              <button
                key={b.id}
                type="button"
                className={`${styles.fila} ${activo ? styles.filaActiva : ''}`}
                aria-current={activo ? 'true' : undefined}
                onClick={() => irA(b.nombre)}
              >
                <span className={styles.filaTexto}>{b.nombre}</span>
                <span className={styles.filaConteo}>
                  {resueltos}/{total}
                </span>
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
