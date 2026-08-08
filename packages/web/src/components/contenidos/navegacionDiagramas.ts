import type { BloqueRef, CategoriaRef, EjercicioLista } from './agruparEjercicios';

/**
 * Lógica de navegación del módulo Diagramas, sin React.
 *
 * Vive aparte del contexto por el mismo motivo que `agruparEjercicios.ts`: son
 * las reglas que deciden qué ve el alumno —qué cuenta para el progreso, a qué
 * bloque pertenece un ejercicio— y a ojo no se comprueban en cada cambio.
 */

/**
 * Qué sección del árbol está abierta.
 *  - `curso:<bloque>` → un bloque del temario, con sus ejercicios.
 *  - `cat:<grupo>`    → un grupo del catálogo adicional, sin ejercicios.
 */
export type Seccion = { clase: 'curso' | 'cat'; nombre: string } | null;

/**
 * Lee la sección del parámetro de URL.
 *
 * El nombre puede llevar `:` dentro —ningún bloque los usa hoy, pero los nombres
 * los escribe un autor— así que se corta por el PRIMER separador y el resto se
 * toma entero. Partir por todos dejaría «Datos: y gráficos» irreferenciable.
 */
export function leerSeccion(valor: string | null): Seccion {
  if (!valor) return null;
  const corte = valor.indexOf(':');
  if (corte < 1) return null;
  const clase = valor.slice(0, corte);
  const nombre = valor.slice(corte + 1);
  if ((clase !== 'curso' && clase !== 'cat') || !nombre) return null;
  return { clase, nombre };
}

export function escribirSeccion(seccion: Seccion): string | null {
  return seccion ? `${seccion.clase}:${seccion.nombre}` : null;
}

/**
 * Los que cuentan para el avance.
 *
 * Los ejemplos resueltos NO cuentan: abren con el diagrama ya hecho y se
 * aprueban con solo enviarlos, así que inflarían el progreso sin que el alumno
 * haya resuelto nada.
 */
export function contables<T extends EjercicioLista>(ejercicios: T[]): T[] {
  return ejercicios.filter((e) => !e.esEjemplo);
}

export function progresoDe(ejercicios: EjercicioLista[]): { resueltos: number; total: number } {
  const items = contables(ejercicios);
  return { resueltos: items.filter((e) => e.resuelto).length, total: items.length };
}

/**
 * Nombre del bloque al que pertenece cada ejercicio, a través de su categoría.
 *
 * Devuelve `null` cuando el ejercicio no tiene categoría, cuando su categoría no
 * está en la lista —un borrado a medias— o cuando esa categoría no cuelga de
 * ningún bloque. Los tres casos significan lo mismo para la pantalla: no encaja
 * en ninguna sección del temario, y hay que poder detectarlo en vez de
 * colocarlo en una al azar.
 */
export function indiceDeBloques(bloques: BloqueRef[], categorias: CategoriaRef[]) {
  const bloqueDeCategoria = new Map(categorias.map((c) => [c.id, c.bloqueId ?? null]));
  const nombreDeBloque = new Map(bloques.map((b) => [b.id, b.nombre]));

  return function bloqueDe(ejercicio: { categoriaId: string | null }): string | null {
    if (!ejercicio.categoriaId) return null;
    const bloqueId = bloqueDeCategoria.get(ejercicio.categoriaId);
    if (!bloqueId) return null;
    return nombreDeBloque.get(bloqueId) ?? null;
  };
}

/** Avance de un bloque concreto, para el contador del árbol. */
export function progresoDeBloque(
  bloques: BloqueRef[],
  categorias: CategoriaRef[],
  ejercicios: EjercicioLista[],
  bloqueId: string,
): { resueltos: number; total: number } {
  const suyas = new Set(categorias.filter((c) => c.bloqueId === bloqueId).map((c) => c.id));
  return progresoDe(
    ejercicios.filter((e) => e.categoriaId !== null && suyas.has(e.categoriaId)),
  );
}
