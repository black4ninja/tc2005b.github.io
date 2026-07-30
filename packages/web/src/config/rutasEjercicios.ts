import { useParams } from 'react-router';

/**
 * Rutas del módulo "Ejercicios" (mini-juez). Fuente única para el sidebar y para
 * las propias páginas del módulo, que necesitan enlazarse entre sí.
 *
 * El módulo vive DENTRO del shell del dashboard (topbar + sidebar), una vez por
 * rol, en lugar de en una pantalla suelta:
 *  - admin/profesor: colgado del grupo abierto, para que el sidebar siga en modo
 *    "detalle de grupo" (`Sidebar` lo detecta con `useMatch('/admin/grupos/:id/*')`);
 *    sin el `:id` el menú se caería al global y se perdería el contexto del grupo.
 *  - alumno: de primer nivel, como el resto de su menú.
 *
 * En ambos casos `:slug` es la COLECCIÓN cuyos ejercicios se listan.
 */
export function rutaEjerciciosAdmin(grupoId: string, slug: string): string {
  return `/admin/grupos/${grupoId}/ejercicios/${slug}`;
}

export function rutaEjerciciosAlumno(slug: string): string {
  return `/alumno/ejercicios/${slug}`;
}

/**
 * Base de la sección para la ruta actual: el listado del módulo. El solver la usa
 * para volver y el listado para enlazar cada ejercicio, así ninguna de las dos
 * páginas necesita saber por cuál de los dos árboles de rutas llegó.
 *
 * `:id` solo existe en el árbol admin, así que distingue el rol sin consultarlo.
 * `slug` en cambio está SIEMPRE: las cuatro rutas del módulo lo declaran, así que
 * se afirma en vez de darle un default que produciría una ruta rota en silencio.
 */
export function useEjerciciosBase(): string {
  const { id, slug } = useParams<{ id?: string; slug: string }>();
  return id ? rutaEjerciciosAdmin(id, slug!) : rutaEjerciciosAlumno(slug!);
}
