/** Utilidades de slug compartidas (formularios del admin). */

/** kebab-case final (para guardar): minúsculas, sin acentos, sin guiones en los extremos. */
export function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalización para inputs MIENTRAS se teclea: igual que slugify pero
 * conserva el guion de cola — si lo quitáramos en cada tecla, sería imposible
 * escribir "mi-slug" a mano. Aplicar slugify() al guardar.
 */
export function slugifyInput(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '');
}
