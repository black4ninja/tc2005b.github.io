/**
 * Reordenar el catálogo de categorías.
 *
 * El endpoint recibe la lista COMPLETA de ids en el orden nuevo, no un
 * «mueve este de la 3 a la 1»: así la operación es idempotente y dos pestañas
 * arrastrando a la vez no se pisan a medias. Esta función es la que decide si
 * un payload se acepta entero o se rechaza entero; aceptar uno parcial dejaría
 * a las categorías que faltan con su orden viejo, intercaladas.
 */
import { describe, it, expect } from 'vitest';
import { esOrdenCompleto } from '../src/controllers/categorias-grupo.controller.js';

const EXISTENTES = ['a', 'b', 'c'];

describe('esOrdenCompleto', () => {
  it('acepta una permutación exacta', () => {
    expect(esOrdenCompleto(['c', 'a', 'b'], EXISTENTES)).toBe(true);
  });

  it('acepta el mismo orden (reordenar a lo que ya era no es un error)', () => {
    expect(esOrdenCompleto(['a', 'b', 'c'], EXISTENTES)).toBe(true);
  });

  it('rechaza una lista incompleta', () => {
    // Las que faltan se quedarían con su orden viejo, en medio de las nuevas.
    expect(esOrdenCompleto(['a', 'b'], EXISTENTES)).toBe(false);
  });

  it('rechaza ids repetidos', () => {
    // Mismo tamaño que el catálogo, pero una categoría se quedaría sin posición.
    expect(esOrdenCompleto(['a', 'a', 'b'], EXISTENTES)).toBe(false);
  });

  it('rechaza un id que no existe', () => {
    expect(esOrdenCompleto(['a', 'b', 'zzz'], EXISTENTES)).toBe(false);
  });

  it('rechaza una lista más larga que el catálogo', () => {
    expect(esOrdenCompleto(['a', 'b', 'c', 'd'], EXISTENTES)).toBe(false);
  });

  it('con el catálogo vacío solo acepta la lista vacía', () => {
    expect(esOrdenCompleto([], [])).toBe(true);
    expect(esOrdenCompleto(['a'], [])).toBe(false);
  });

  it('rechaza la lista vacía cuando sí hay categorías', () => {
    expect(esOrdenCompleto([], EXISTENTES)).toBe(false);
  });
});
