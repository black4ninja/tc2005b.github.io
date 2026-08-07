/**
 * Marca de agua de los diagramas renderizados.
 *
 * Se inyecta DENTRO del SVG y no como una capa de CSS encima del contenedor: así
 * viaja con la imagen. Un «guardar imagen como…» o un copiar y pegar del SVG se
 * lleva la marca con él, que es justo cuando importa que siga estando.
 *
 * Va en `insertarSvg`, el único punto por el que pasan los diagramas de los dos
 * motores y de todas las pantallas —visor, solver, taller y editor de autoría—,
 * de modo que no hay forma de dibujar uno sin ella.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

const TEXTO_USO = 'Solo para fines académicos';
const TEXTO_CREDITO = 'developed by meeplab';

/** Ancho aproximado de un carácter respecto al tamaño de fuente, para una sans. */
const RATIO_CARACTER = 0.55;

/**
 * `currentColor` y NO un gris fijo: el visor dibuja los diagramas con la paleta
 * del tema, así que sobre fondo oscuro un gris oscuro al 10 % es invisible y la
 * marca desaparece justo en el modo en el que el resto del dibujo se ve bien.
 * `currentColor` hereda el color de texto del contenedor, que ya sigue al tema,
 * y en un SVG guardado suelto cae a negro, que es lo que había antes.
 */
const COLOR = 'currentColor';

interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/**
 * Sistema de coordenadas del SVG.
 *
 * Se prefiere el `viewBox` porque es el que fija las unidades internas: `width`
 * y `height` pueden venir en porcentaje o traer unidades, y los motores los
 * usan para el tamaño en pantalla, no para el lienzo.
 */
function cajaDe(svg: SVGSVGElement): Caja | null {
  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const partes = viewBox.split(/[\s,]+/).map(Number);
    if (partes.length === 4 && partes.every((n) => Number.isFinite(n))) {
      const [x, y, ancho, alto] = partes;
      if (ancho > 0 && alto > 0) return { x, y, ancho, alto };
    }
  }
  const ancho = Number.parseFloat(svg.getAttribute('width') ?? '');
  const alto = Number.parseFloat(svg.getAttribute('height') ?? '');
  if (Number.isFinite(ancho) && Number.isFinite(alto) && ancho > 0 && alto > 0) {
    return { x: 0, y: 0, ancho, alto };
  }
  return null;
}

function crearTexto(texto: string, atributos: Record<string, string>): SVGTextElement {
  const el = document.createElementNS(SVG_NS, 'text');
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  el.textContent = texto;
  return el;
}

/**
 * Añade la marca de agua al SVG ya saneado.
 *
 * Si no se puede averiguar el lienzo, no se marca nada: es preferible un
 * diagrama sin marca que uno con un texto colocado en un sitio arbitrario que
 * tape el contenido.
 */
export function marcarSvg(svg: SVGSVGElement): void {
  const caja = cajaDe(svg);
  if (!caja) return;

  const grupo = document.createElementNS(SVG_NS, 'g');
  // La marca no debe interceptar el ratón: por debajo hay enlaces y textos
  // seleccionables del propio diagrama.
  grupo.setAttribute('pointer-events', 'none');
  grupo.setAttribute('aria-hidden', 'true');
  grupo.setAttribute('data-marca-agua', 'true');

  const centroX = caja.x + caja.ancho / 2;
  const centroY = caja.y + caja.alto / 2;

  // El tamaño sale de la DIAGONAL y no del ancho.
  //
  // El texto va inclinado, así que su longitud se reparte entre las dos
  // dimensiones: medirlo contra el ancho lo dejaba diminuto en los diagramas
  // altos y estrechos —una clase encima de otra— mientras se veía bien en los
  // anchos. Con la diagonal, la marca ocupa una fracción parecida del dibujo
  // sea cual sea su forma.
  const diagonal = Math.hypot(caja.ancho, caja.alto);
  // Y aun así se acota para que el texto girado quepa dentro del lienzo: a -30°
  // ocupa `L·cos30` en horizontal y `L·sen30` en vertical. Sin esta cota, un
  // diagrama muy estrecho se llevaría la marca fuera del área visible.
  const largo = Math.min(
    diagonal * 0.72,
    (caja.ancho * 0.95) / Math.cos(Math.PI / 6),
    (caja.alto * 0.95) / Math.sin(Math.PI / 6),
  );
  const tamanoUso = largo / (TEXTO_USO.length * RATIO_CARACTER);

  // Un suelo de tamaño anularía la cota de encaje de arriba: el texto mediría
  // siempre lo mismo y se saldría del lienzo, que además recorta. En un dibujo
  // tan pequeño que el aviso no cabe legible se omite el aviso y queda solo el
  // crédito; una marca fuera del área visible no marca nada.
  const TAMANO_MINIMO = 10;
  if (tamanoUso >= TAMANO_MINIMO) {
    grupo.appendChild(
      crearTexto(TEXTO_USO, {
        x: String(centroX),
        y: String(centroY),
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        transform: `rotate(-30 ${centroX} ${centroY})`,
        fill: COLOR,
        'fill-opacity': '0.10',
        'font-family': 'Inter, system-ui, sans-serif',
        'font-size': String(tamanoUso),
        'font-weight': '700',
        'letter-spacing': '0.04em',
      }),
    );
  }

  // El crédito va ARRIBA A LA IZQUIERDA, no abajo a la derecha: ahí se montaba
  // sobre la última caja de los diagramas que crecen hacia abajo, que son la
  // mayoría. La esquina superior izquierda casi siempre queda libre porque los
  // motores empiezan a dibujar con un margen.
  //
  // El tamaño no depende del diagrama: es una firma, no parte del dibujo.
  const tamanoCredito = Math.max(9, Math.min(12, caja.alto * 0.05));
  grupo.appendChild(
    crearTexto(TEXTO_CREDITO, {
      x: String(caja.x + tamanoCredito * 0.6),
      y: String(caja.y + tamanoCredito * 1.2),
      'text-anchor': 'start',
      fill: COLOR,
      'fill-opacity': '0.45',
      'font-family': 'Inter, system-ui, sans-serif',
      'font-size': String(tamanoCredito),
    }),
  );

  svg.appendChild(grupo);
}
