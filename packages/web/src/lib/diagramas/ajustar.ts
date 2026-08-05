/**
 * Ajusta un SVG ya pintado al tamaño de su marco.
 *
 * Los motores fijan en el SVG el tamaño INTRÍNSECO del dibujo —Mermaid con un
 * `style="max-width: …px"` en línea, que además gana a cualquier hoja de
 * estilos—, así que un diagrama pequeño se quedaba diminuto en un panel enorme
 * en lugar de aprovecharlo. Y la marca de agua, que se mide en unidades del
 * lienzo, encogía con él.
 *
 * Solo se toca cuando hay `viewBox`: es lo que define las unidades internas y
 * lo que permite escalar sin deformar. Sin él, forzar el tamaño estiraría el
 * dibujo, así que se deja como está.
 *
 * `preserveAspectRatio` se mantiene en su valor por defecto (`xMidYMid meet`):
 * el diagrama crece hasta tocar el borde más cercano y queda centrado, que es
 * lo que se espera de una vista previa.
 */
export function ajustarAlContenedor(svg: SVGSVGElement, alturaPx: number): void {
  if (!svg.getAttribute('viewBox')) return;

  // Los atributos compiten con el estilo; se quitan para que mande el segundo.
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.setProperty('max-width', '100%', 'important');
  svg.style.setProperty('max-height', '100%', 'important');
  svg.style.width = '100%';
  svg.style.height = `${alturaPx}px`;
}
