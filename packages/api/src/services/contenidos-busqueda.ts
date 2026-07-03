/**
 * Utilidades PURAS de la búsqueda del CMS (US-5) — testeables sin Parse.
 * El scope por permisos vive en el controller; aquí solo el snippet.
 */

const RE_HTML_TAGS = /<[^>]*>/g;
// Solo puntuación ESTRUCTURAL de Markdown. Sin `-`/`:`: son comunes dentro
// de palabras (flexbox-magico, http:, 10:30) y comérselos rompía el
// centrado del snippet sobre el término buscado.
const RE_MD_RUIDO = /[#*_`>|[\]()!]+/g;
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
 * con elipsis en los cortes. El término se busca sobre el cuerpo CRUDO (no el
 * texto ya limpiado) para no fallar el centrado cuando el término lleva
 * puntuación; la ventana resultante sí se pasa a texto plano. Si el término no
 * aparece (p. ej. matcheó por stemming del índice), devuelve el inicio.
 */
export function extraerSnippet(cuerpo: string, termino: string, radio = 80): string {
  if (!cuerpo) return '';
  const idx = cuerpo.toLowerCase().indexOf(termino.toLowerCase());
  if (idx < 0) {
    const texto = aTextoPlano(cuerpo);
    return texto.slice(0, radio * 2) + (texto.length > radio * 2 ? '…' : '');
  }
  const inicio = Math.max(0, idx - radio);
  const fin = Math.min(cuerpo.length, idx + termino.length + radio);
  const ventana = aTextoPlano(cuerpo.slice(inicio, fin));
  return `${inicio > 0 ? '…' : ''}${ventana}${fin < cuerpo.length ? '…' : ''}`;
}
