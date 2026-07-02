/**
 * Utilidades PURAS de la búsqueda del CMS (US-5) — testeables sin Parse.
 * El scope por permisos vive en el controller; aquí solo el snippet.
 */

const RE_HTML_TAGS = /<[^>]*>/g;
const RE_MD_RUIDO = /[#*_`>|[\]()!:-]+/g;
const RE_ESPACIOS = /\s+/g;

/**
 * Markdown u HTML crudo → texto plano aproximado para snippets. Los tags se
 * quitan primero: los cuerpos de páginas tipo `html` mostrarían sopa de
 * etiquetas en los resultados.
 */
export function aTextoPlano(cuerpo: string): string {
  return cuerpo.replace(RE_HTML_TAGS, ' ').replace(RE_MD_RUIDO, ' ').replace(RE_ESPACIOS, ' ').trim();
}

/**
 * Snippet alrededor de la primera aparición del término (case-insensitive),
 * con elipsis en los cortes. Si el término no aparece (p. ej. matcheó por
 * stemming del índice), devuelve el inicio del texto.
 */
export function extraerSnippet(cuerpo: string, termino: string, radio = 80): string {
  const texto = aTextoPlano(cuerpo);
  if (!texto) return '';
  const idx = texto.toLowerCase().indexOf(termino.toLowerCase());
  if (idx < 0) return texto.slice(0, radio * 2) + (texto.length > radio * 2 ? '…' : '');
  const inicio = Math.max(0, idx - radio);
  const fin = Math.min(texto.length, idx + termino.length + radio);
  return `${inicio > 0 ? '…' : ''}${texto.slice(inicio, fin)}${fin < texto.length ? '…' : ''}`;
}
