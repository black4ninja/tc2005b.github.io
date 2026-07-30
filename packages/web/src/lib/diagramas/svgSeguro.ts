/**
 * Inserta un SVG generado por un motor de diagramas, quitándole antes cualquier
 * cosa ejecutable.
 *
 * Los motores ya sanean por su cuenta —Mermaid con `securityLevel: 'strict'`
 * escapa el texto de las etiquetas— pero esto es la segunda barrera, y aquí
 * importa: el plan es que también los ALUMNOS escriban diagramas, así que el
 * código fuente deja de ser de confianza. Un `<svg onload=…>` no lo para el
 * sanitizador del pipeline, porque el SVG no existe hasta que se renderiza en el
 * cliente.
 *
 * Se parsea con DOMParser y se adopta solo el nodo raíz: así el marcado nunca
 * pasa por `innerHTML` del documento vivo.
 */

/** Atributos que pueden ejecutar código en SVG. */
const EJECUTABLES = /^on/i;

function limpiar(el: Element): void {
  for (const attr of [...el.attributes]) {
    const nombre = attr.name.toLowerCase();
    if (EJECUTABLES.test(nombre)) {
      el.removeAttribute(attr.name);
      continue;
    }
    // `javascript:` en href/xlink:href.
    if ((nombre === 'href' || nombre === 'xlink:href') && /^\s*javascript:/i.test(attr.value)) {
      el.removeAttribute(attr.name);
    }
  }
  for (const hijo of [...el.children]) limpiar(hijo);
}

/** Reemplaza el contenido de `contenedor` por el SVG, ya saneado. */
export function insertarSvg(contenedor: HTMLElement, svg: string): void {
  // `text/html` y NO `image/svg+xml`: el segundo es XML ESTRICTO, y Mermaid mete
  // HTML dentro de `foreignObject` en cuanto una etiqueta lleva `<br/>`. Eso no
  // es XML bien formado, así que el parser estricto devolvía `parsererror` y
  // TODO diagrama con salto de línea en una etiqueta fallaba. El parser de HTML
  // sí entiende contenido extranjero y produce el mismo árbol SVG.
  const doc = new DOMParser().parseFromString(svg, 'text/html');
  const raiz = doc.body.querySelector('svg');
  if (!raiz) throw new Error('El motor no devolvió un SVG.');
  raiz.querySelectorAll('script').forEach((s) => s.remove());
  limpiar(raiz);
  contenedor.replaceChildren(document.importNode(raiz, true));
}
