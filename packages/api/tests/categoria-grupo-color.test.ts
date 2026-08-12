/**
 * Color de una categoría de grupo.
 *
 * El color acaba en un atributo `style` del cliente, así que lo que se acepte
 * aquí es lo que se inyecta allá: `normalizarColor` es la frontera. Estos tests
 * fijan las dos formas que se teclean a mano (con y sin almohadilla, corta y
 * larga) y, sobre todo, que no pase nada que no sea un hexadecimal.
 */
import { describe, it, expect } from 'vitest';
import { normalizarColor, PALETA_CATEGORIAS, COLOR_POR_DEFECTO } from '../src/models/CategoriaGrupo.js';

describe('normalizarColor', () => {
  it('normaliza a #rrggbb en minúsculas', () => {
    expect(normalizarColor('#2563EB')).toBe('#2563eb');
    expect(normalizarColor('  #16A34A  ')).toBe('#16a34a');
  });

  it('acepta el hex sin almohadilla', () => {
    expect(normalizarColor('9333ea')).toBe('#9333ea');
  });

  it('expande la forma corta de tres dígitos', () => {
    expect(normalizarColor('#abc')).toBe('#aabbcc');
    expect(normalizarColor('f00')).toBe('#ff0000');
  });

  it('rechaza nombres de color: solo hexadecimal', () => {
    expect(normalizarColor('red')).toBeNull();
    expect(normalizarColor('rgb(1,2,3)')).toBeNull();
  });

  it('rechaza lo que intentaría colarse en el atributo style', () => {
    expect(normalizarColor('javascript:alert(1)')).toBeNull();
    expect(normalizarColor('#fff;background:url(x)')).toBeNull();
    expect(normalizarColor('</style>')).toBeNull();
  });

  it('rechaza longitudes que no son 3 ni 6 dígitos', () => {
    expect(normalizarColor('#12345')).toBeNull();
    expect(normalizarColor('#1234567')).toBeNull();
    expect(normalizarColor('')).toBeNull();
  });

  it('rechaza lo que no es texto', () => {
    expect(normalizarColor(null)).toBeNull();
    expect(normalizarColor(undefined)).toBeNull();
    expect(normalizarColor(0x2563eb)).toBeNull();
    expect(normalizarColor({ color: '#fff' })).toBeNull();
  });
});

describe('paleta sugerida', () => {
  it('está formada por colores que pasan la propia validación', () => {
    for (const color of PALETA_CATEGORIAS) {
      expect(normalizarColor(color)).toBe(color);
    }
  });

  it('no repite ningún color', () => {
    expect(new Set(PALETA_CATEGORIAS).size).toBe(PALETA_CATEGORIAS.length);
  });

  it('el color por defecto también es válido', () => {
    expect(normalizarColor(COLOR_POR_DEFECTO)).toBe(COLOR_POR_DEFECTO);
  });
});
