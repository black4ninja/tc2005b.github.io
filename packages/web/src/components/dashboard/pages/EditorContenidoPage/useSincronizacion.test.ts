/**
 * Tests del mapeo línea ⇄ altura que sostiene la sincronización fuente/preview.
 * Solo las funciones puras: el cableado con el DOM y con CodeMirror necesita
 * alturas reales, que jsdom no calcula.
 */
import { describe, it, expect } from 'vitest';
import { lineaEnTop, topEnLinea, indiceDelBloque, type Ancla } from './useSincronizacion';

/** Anclas de juguete; `el` no se usa en las funciones puras. */
const anclas = (pares: [number, number][]): Ancla[] =>
  pares.map(([linea, top]) => ({ linea, top, el: null as unknown as HTMLElement }));

// Un documento con: h1 en la línea 1, un párrafo largo en la 3 y otro en la 20.
const MAPA = anclas([
  [1, 0],
  [3, 40],
  [20, 240],
  [26, 300],
]);

describe('lineaEnTop', () => {
  it('devuelve la línea del ancla cuando la altura cae justo en ella', () => {
    expect(lineaEnTop(MAPA, 0)).toBe(1);
    expect(lineaEnTop(MAPA, 40)).toBe(3);
    expect(lineaEnTop(MAPA, 240)).toBe(20);
  });

  it('interpola entre anclas en vez de dar saltos secos', () => {
    // A media distancia entre las alturas 40 y 240 → media distancia entre 3 y 20.
    expect(lineaEnTop(MAPA, 140)).toBeCloseTo(11.5, 5);
  });

  it('se queda en el último ancla al pasarse por abajo', () => {
    expect(lineaEnTop(MAPA, 99999)).toBe(26);
  });

  it('no se va por debajo de la primera línea con scroll negativo (rebote)', () => {
    expect(lineaEnTop(MAPA, -50)).toBe(1);
  });

  it('sin anclas devuelve la primera línea en vez de romperse', () => {
    expect(lineaEnTop([], 120)).toBe(1);
  });
});

describe('topEnLinea', () => {
  it('es la inversa de lineaEnTop sobre los propios anclas', () => {
    for (const a of MAPA) expect(topEnLinea(MAPA, a.linea)).toBe(a.top);
  });

  it('interpola dentro de un bloque largo', () => {
    // Línea 11.5 de un bloque que va de la 3 a la 20 → mitad de 40..240.
    expect(topEnLinea(MAPA, 11.5)).toBeCloseTo(140, 5);
  });

  it('ida y vuelta no acumula deriva', () => {
    for (const top of [0, 17, 40, 140, 239, 240, 299]) {
      expect(topEnLinea(MAPA, lineaEnTop(MAPA, top))).toBeCloseTo(top, 5);
    }
  });

  it('sin anclas devuelve el principio', () => {
    expect(topEnLinea([], 12)).toBe(0);
  });
});

describe('indiceDelBloque', () => {
  it('un bloque llega hasta donde empieza el siguiente', () => {
    expect(indiceDelBloque(MAPA, 1)).toBe(0);
    expect(indiceDelBloque(MAPA, 2)).toBe(0);
    expect(indiceDelBloque(MAPA, 3)).toBe(1);
    expect(indiceDelBloque(MAPA, 19)).toBe(1);
    expect(indiceDelBloque(MAPA, 20)).toBe(2);
  });

  it('cualquier línea posterior al último ancla cae en el último bloque', () => {
    expect(indiceDelBloque(MAPA, 900)).toBe(3);
  });

  it('sin anclas no hay bloque', () => {
    expect(indiceDelBloque([], 4)).toBe(-1);
  });
});
