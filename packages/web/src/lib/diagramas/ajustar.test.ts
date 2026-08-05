/**
 * @vitest-environment jsdom
 *
 * Ajuste del SVG a su marco.
 *
 * Lo que fija esto es que el `max-width` en línea del motor deje de mandar: es
 * un estilo en línea con el tamaño intrínseco del dibujo, así que gana a
 * cualquier regla de la hoja de estilos y dejaba los diagramas pequeños
 * diminutos dentro de un panel grande.
 */
import { describe, it, expect } from 'vitest';
import { ajustarAlContenedor } from './ajustar';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgDeMotor(atributos: Record<string, string>, estilo = ''): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries(atributos)) svg.setAttribute(k, v);
  if (estilo) svg.setAttribute('style', estilo);
  return svg;
}

describe('ajustarAlContenedor', () => {
  it('sustituye el max-width intrínseco que pone el motor', () => {
    const svg = svgDeMotor({ viewBox: '0 0 190 400', width: '190', height: '400' }, 'max-width: 190px;');
    ajustarAlContenedor(svg, 500);
    expect(svg.style.getPropertyValue('max-width')).toBe('100%');
    expect(svg.style.getPropertyPriority('max-width')).toBe('important');
    expect(svg.style.width).toBe('100%');
    expect(svg.style.height).toBe('500px');
  });

  it('quita los atributos de tamaño, que competirían con el estilo', () => {
    const svg = svgDeMotor({ viewBox: '0 0 190 400', width: '190', height: '400' });
    ajustarAlContenedor(svg, 400);
    expect(svg.hasAttribute('width')).toBe(false);
    expect(svg.hasAttribute('height')).toBe(false);
  });

  it('conserva el viewBox, que es lo que permite escalar sin deformar', () => {
    const svg = svgDeMotor({ viewBox: '0 0 190 400' });
    ajustarAlContenedor(svg, 400);
    expect(svg.getAttribute('viewBox')).toBe('0 0 190 400');
  });

  it('sin viewBox no toca nada: forzar el tamaño estiraría el dibujo', () => {
    const svg = svgDeMotor({ width: '300', height: '200' });
    ajustarAlContenedor(svg, 400);
    expect(svg.getAttribute('width')).toBe('300');
    expect(svg.style.width).toBe('');
  });
});
