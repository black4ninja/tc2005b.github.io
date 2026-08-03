import { useParams } from 'react-router';

/**
 * Rutas del módulo "Diagramas" (juez de diseño UML). Fuente única para el sidebar
 * y para las páginas del módulo, que necesitan enlazarse entre sí.
 *
 * Misma estructura que `rutasEjercicios.ts` y por el mismo motivo: el módulo vive
 * DENTRO del shell del dashboard, una vez por rol.
 *  - admin/profesor: colgado del grupo abierto, para que el sidebar siga en modo
 *    "detalle de grupo"; sin el `:id` el menú se caería al global.
 *  - alumno: de primer nivel.
 *
 * En ambos casos `:slug` es la COLECCIÓN cuyos ejercicios se listan.
 *
 * Son dos ficheros y no uno parametrizado por módulo a propósito: lo único que
 * comparten es la forma, y un helper genérico obligaría a pasar la key en cada
 * llamada sin ahorrar nada.
 */
export function rutaDiagramasAdmin(grupoId: string, slug: string): string {
  return `/admin/grupos/${grupoId}/diagramas/${slug}`;
}

export function rutaDiagramasAlumno(slug: string): string {
  return `/alumno/diagramas/${slug}`;
}

/**
 * Base de la sección para la ruta actual: el listado del módulo. El solver la usa
 * para volver y el listado para enlazar cada ejercicio, así ninguna de las dos
 * páginas necesita saber por cuál de los dos árboles de rutas llegó.
 *
 * `:id` solo existe en el árbol admin, así que distingue el rol sin consultarlo.
 */
export function useDiagramasBase(): string {
  const { id, slug } = useParams<{ id?: string; slug: string }>();
  return id ? rutaDiagramasAdmin(id, slug!) : rutaDiagramasAlumno(slug!);
}
