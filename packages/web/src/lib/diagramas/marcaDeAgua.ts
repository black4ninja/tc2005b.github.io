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

  // El tamaño se calcula para que el texto ocupe ~el 80 % del ancho: con una
  // medida fija, la marca se salía de los diagramas pequeños y quedaba
  // invisible en los grandes.
  const tamanoUso = Math.max(
    12,
    Math.min((caja.ancho * 0.8) / (TEXTO_USO.length * RATIO_CARACTER), caja.alto * 0.22),
  );

  grupo.appendChild(
    crearTexto(TEXTO_USO, {
      x: String(centroX),
      y: String(centroY),
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      transform: `rotate(-30 ${centroX} ${centroY})`,
      fill: '#1f2328',
      'fill-opacity': '0.10',
      'font-family': 'Inter, system-ui, sans-serif',
      'font-size': String(tamanoUso),
      'font-weight': '700',
      'letter-spacing': '0.04em',
    }),
  );

  // El crédito va abajo a la derecha, legible pero discreto, y con un tamaño
  // que no depende del diagrama: es una firma, no parte del dibujo.
  const tamanoCredito = Math.max(9, Math.min(12, caja.alto * 0.05));
  grupo.appendChild(
    crearTexto(TEXTO_CREDITO, {
      x: String(caja.x + caja.ancho - tamanoCredito * 0.6),
      y: String(caja.y + caja.alto - tamanoCredito * 0.6),
      'text-anchor': 'end',
      fill: '#57606a',
      'fill-opacity': '0.55',
      'font-family': 'Inter, system-ui, sans-serif',
      'font-size': String(tamanoCredito),
    }),
  );

  svg.appendChild(grupo);
}
