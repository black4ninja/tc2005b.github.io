// Pipeline unified compartido del CMS "Contenidos" (design/cms-contenidos.html §3).
// El MISMO pipeline renderiza el preview del editor (web) y el cuerpoHtml
// publicado (api) — cero divergencia entre lo que se edita y lo que se sirve.
//
// Orden del pipeline (importa):
//   remark-parse → remark-gfm → remark-directive → admonitions → remark-rehype
//   → rehype-sanitize (allowlist) → rehype-highlight → rehype-stringify
// Sanitizamos ANTES de highlight: así el HTML inline peligroso del autor se
// elimina, y las clases que agrega highlight (código confiable) sobreviven.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';

/** Tipos de admonition con paridad Docusaurus. */
export const ADMONITION_TIPOS = ['note', 'tip', 'info', 'warning', 'danger', 'caution'];

/**
 * Plugin remark: convierte las directivas de contenedor `:::note Título`
 * en la estructura de admonition (equivalente a las de Docusaurus):
 *   <div class="admonition admonition-note">
 *     <p class="admonition-titulo">Título</p>
 *     …contenido…
 *   </div>
 */
function remarkAdmonitions() {
  return (tree) => {
    visit(tree, 'containerDirective', (node) => {
      if (!ADMONITION_TIPOS.includes(node.name)) return;

      // El "label" de la directiva (:::note Título) llega como primer hijo
      // marcado con directiveLabel; sus children se conservan tal cual como
      // título — así el formato inline (**negritas**, `código`) sobrevive.
      const hijos = node.children ?? [];
      let tituloChildren = [{ type: 'text', value: node.name }];
      if (hijos[0]?.data?.directiveLabel) {
        const label = hijos.shift();
        if (label.children?.length) tituloChildren = label.children;
      }

      node.children = [
        {
          type: 'paragraph',
          data: { hName: 'p', hProperties: { className: ['admonition-titulo'] } },
          children: tituloChildren,
        },
        ...hijos,
      ];
      node.data = {
        ...node.data,
        hName: 'div',
        hProperties: { className: ['admonition', `admonition-${node.name}`] },
      };
    });
  };
}

// Allowlist: la default de rehype-sanitize + las clases que usa el pipeline
// (admonitions y highlight). Todo lo demás (scripts, estilos, iframes,
// handlers) se elimina — el HTML crudo de páginas tipo `html` NO pasa por
// aquí: se sirve aparte, sandboxeado (US-5).
const ESQUEMA_SANITIZE = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [...(defaultSchema.attributes?.div ?? []), ['className', 'admonition', /^admonition-/]],
    p: [...(defaultSchema.attributes?.p ?? []), ['className', 'admonition-titulo']],
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-/]],
  },
};

const procesador = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkDirective)
  .use(remarkAdmonitions)
  .use(remarkRehype)
  .use(rehypeSanitize, ESQUEMA_SANITIZE)
  .use(rehypeHighlight, { detect: false })
  .use(rehypeStringify);

// remark-directive exige el título entre corchetes (`:::note[Título]`), pero
// Docusaurus usa `:::note Título` — y la paridad con esa sintaxis es requisito
// de la migración (US-6). Normalizamos el estilo Docusaurus antes de parsear.
// Sangría máx. 3 espacios: con 4+ es bloque de código indentado (CommonMark).
const RE_ADMONITION_DOCUSAURUS = new RegExp(
  `^( {0,3}):::(${ADMONITION_TIPOS.join('|')})[ \\t]+([^\\[\\n{][^\\n]*)$`,
);
const RE_FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Normaliza línea por línea, SALTANDO los bloques de código cercados: un
 * tutorial que documenta la sintaxis `:::note Título` dentro de un fence
 * debe mostrarse tal cual, no reescribirse.
 */
function normalizarAdmonitions(cuerpo) {
  let fence = null; // { char, len } del fence abierto
  return cuerpo
    .split('\n')
    .map((linea) => {
      const marca = linea.match(RE_FENCE);
      if (marca) {
        const char = marca[1][0];
        const len = marca[1].length;
        if (!fence) {
          fence = { char, len };
        } else if (char === fence.char && len >= fence.len && /^ {0,3}(`{3,}|~{3,})\s*$/.test(linea)) {
          fence = null; // cierre del fence
        }
        return linea;
      }
      if (fence) return linea;
      return linea.replace(RE_ADMONITION_DOCUSAURUS, (_m, sangria, tipo, titulo) => {
        return `${sangria}:::${tipo}[${titulo.trim()}]`;
      });
    })
    .join('\n');
}

/**
 * Renderiza Markdown (GFM + admonitions) a HTML sanitizado con highlight.
 * @param {string} cuerpo - fuente Markdown
 * @returns {Promise<string>} HTML listo para servir/mostrar
 */
export async function renderMarkdown(cuerpo) {
  const archivo = await procesador.process(normalizarAdmonitions(cuerpo ?? ''));
  return String(archivo);
}
