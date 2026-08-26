import type { ColeccionData } from '../types/contenidos';

/**
 * Búsqueda de colecciones por clave, nombre, slug o categoría.
 *
 * Ignora acentos y mayúsculas a propósito: media plantilla escribe «informatica»
 * sin tilde, y un buscador que no encuentra TC2007B por eso es un buscador que
 * no se usa. La misma normalización que ya emplean las etiquetas del módulo de
 * preguntas.
 *
 * La categoría entra en el saco porque es justo lo que se busca cuando se
 * piensa por familias: «móviles» debe traer las materias de móviles.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function buscarColecciones(
  colecciones: ColeccionData[],
  consulta: string,
): ColeccionData[] {
  const q = normalizar(consulta);
  if (!q) return colecciones;
  // Cada palabra por separado: «ia datos» encuentra la de inteligencia
  // artificial aunque no sea la frase literal.
  const palabras = q.split(/\s+/);
  return colecciones.filter((c) => {
    const heno = normalizar(`${c.clave ?? ''} ${c.nombre} ${c.slug} ${c.categoria?.nombre ?? ''}`);
    return palabras.every((p) => heno.includes(p));
  });
}
