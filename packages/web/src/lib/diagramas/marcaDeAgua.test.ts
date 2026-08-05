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

function svgCon(atributos: Record<string, string>): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries(atributos)) svg.setAttribute(k, v);
  return svg;
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

  it('el tamaño del aviso se adapta al lienzo', () => {
    const pequeno = svgCon({ viewBox: '0 0 200 150' });
    const grande = svgCon({ viewBox: '0 0 1200 900' });
    marcarSvg(pequeno);
    marcarSvg(grande);
    const tamano = (s: SVGSVGElement) =>
      Number(s.querySelector('[data-marca-agua] text')?.getAttribute('font-size'));
    expect(tamano(grande)).toBeGreaterThan(tamano(pequeno));
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
