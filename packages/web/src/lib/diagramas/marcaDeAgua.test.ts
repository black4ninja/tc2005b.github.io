/**
 * @vitest-environment jsdom
 *
 * Marca de agua de los diagramas.
 *
 * Lo que fijan estos casos es que la marca vaya DENTRO del SVG y colocada a
 * partir del lienzo real: si se posicionara con medidas fijas, en un diagrama
 * pequeño se saldría del lienzo y en uno grande quedaría invisible, y ninguna de
 * las dos cosas se nota mirando un solo diagrama.
 */
import { describe, it, expect } from 'vitest';
import { marcarSvg } from './marcaDeAgua';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** El mismo texto que inyecta el módulo; se repite aquí para medirlo. */
const TEXTO = 'Solo para fines académicos';

function svgCon(atributos: Record<string, string>): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries(atributos)) svg.setAttribute(k, v);
  return svg;
}

function svg2textos(svg: SVGSVGElement): string[] {
  return textos(svg);
}

function textos(svg: SVGSVGElement): string[] {
  return [...svg.querySelectorAll('[data-marca-agua] text')].map((t) => t.textContent ?? '');
}

describe('marcarSvg', () => {
  it('añade el aviso de uso y el crédito', () => {
    const svg = svgCon({ viewBox: '0 0 400 300' });
    marcarSvg(svg);
    expect(textos(svg)).toEqual(['Solo para fines académicos', 'developed by meeplab']);
  });

  it('el aviso va inclinado y centrado en el lienzo', () => {
    const svg = svgCon({ viewBox: '0 0 400 300' });
    marcarSvg(svg);
    const aviso = svg.querySelector('[data-marca-agua] text');
    expect(aviso?.getAttribute('transform')).toBe('rotate(-30 200 150)');
    expect(aviso?.getAttribute('x')).toBe('200');
    expect(aviso?.getAttribute('y')).toBe('150');
  });

  it('respeta el origen del viewBox, que no siempre es 0 0', () => {
    // Un viewBox desplazado es normal en PlantUML; con el origen ignorado la
    // marca se dibujaría fuera del área visible.
    const svg = svgCon({ viewBox: '100 50 400 300' });
    marcarSvg(svg);
    const aviso = svg.querySelector('[data-marca-agua] text');
    expect(aviso?.getAttribute('x')).toBe('300');
    expect(aviso?.getAttribute('y')).toBe('200');
  });

  it('cae a width y height cuando no hay viewBox', () => {
    const svg = svgCon({ width: '200', height: '100' });
    marcarSvg(svg);
    expect(textos(svg)).toHaveLength(2);
  });

  const tamanoAviso = (s: SVGSVGElement) =>
    Number(s.querySelector('[data-marca-agua] text')?.getAttribute('font-size'));

  it('el tamaño del aviso se adapta al lienzo', () => {
    const pequeno = svgCon({ viewBox: '0 0 200 150' });
    const grande = svgCon({ viewBox: '0 0 1200 900' });
    marcarSvg(pequeno);
    marcarSvg(grande);
    expect(tamanoAviso(grande)).toBeGreaterThan(tamanoAviso(pequeno));
  });

  it('un diagrama alto y estrecho no se queda con una marca diminuta', () => {
    // El caso que motivó el cambio: dos clases una encima de otra. La marca no
    // puede salir igual de grande que en un lienzo ancho —no cabría—, pero sí
    // debe aprovechar el ancho disponible en lugar de encogerse.
    const estrecho = svgCon({ viewBox: '0 0 300 900' });
    marcarSvg(estrecho);
    const largo = tamanoAviso(estrecho) * TEXTO.length * 0.55;
    const ocupaDeAncho = (largo * Math.cos(Math.PI / 6)) / 300;
    expect(ocupaDeAncho).toBeGreaterThan(0.8);
  });

  it('el aviso girado nunca se sale del lienzo, sea cual sea su forma', () => {
    // El suelo de tamaño que había antes anulaba la cota de encaje: el texto
    // medía siempre lo mismo y desbordaba los lienzos pequeños, que además
    // recortan. El test anterior usaba 200×1200, justo por encima del umbral, y
    // por eso no ejercitaba el caso que fallaba.
    for (const [ancho, alto] of [[200, 1200], [1200, 80], [400, 300], [900, 600]]) {
      const svg = svgCon({ viewBox: `0 0 ${ancho} ${alto}` });
      marcarSvg(svg);
      const aviso = svg.querySelector('[data-marca-agua] text[transform]');
      if (!aviso) continue; // se omite cuando no cabe legible; se comprueba aparte
      const largo = Number(aviso.getAttribute('font-size')) * TEXTO.length * 0.55;
      expect(largo * Math.cos(Math.PI / 6), `ancho en ${ancho}x${alto}`).toBeLessThanOrEqual(ancho);
      expect(largo * Math.sin(Math.PI / 6), `alto en ${ancho}x${alto}`).toBeLessThanOrEqual(alto);
    }
  });

  it('en un lienzo donde el aviso no cabe legible, se omite y queda el crédito', () => {
    // Preferible a forzarlo: una marca fuera del área visible no marca nada, y
    // encima tapa el dibujo por el camino.
    const diminuto = svgCon({ viewBox: '0 0 120 500' });
    marcarSvg(diminuto);
    expect(svg2textos(diminuto)).toEqual(['developed by meeplab']);
  });

  it('el crédito va arriba a la izquierda, donde no tapa el dibujo', () => {
    const svg = svgCon({ viewBox: '0 0 400 300' });
    marcarSvg(svg);
    const credito = [...svg.querySelectorAll('[data-marca-agua] text')][1];
    expect(credito.getAttribute('text-anchor')).toBe('start');
    expect(Number(credito.getAttribute('x'))).toBeLessThan(40);
    expect(Number(credito.getAttribute('y'))).toBeLessThan(40);
  });

  it('sin lienzo averiguable no marca nada, en vez de colocarlo a ciegas', () => {
    const svg = svgCon({});
    marcarSvg(svg);
    expect(svg.querySelector('[data-marca-agua]')).toBeNull();
  });

  it('la marca no intercepta el ratón ni la lee un lector de pantalla', () => {
    const svg = svgCon({ viewBox: '0 0 400 300' });
    marcarSvg(svg);
    const grupo = svg.querySelector('[data-marca-agua]');
    expect(grupo?.getAttribute('pointer-events')).toBe('none');
    expect(grupo?.getAttribute('aria-hidden')).toBe('true');
  });
});
