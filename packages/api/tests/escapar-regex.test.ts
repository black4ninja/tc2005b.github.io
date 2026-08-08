/**
 * Escapado de lo que el usuario teclea antes de convertirlo en `RegExp`.
 *
 * Lo usan los dos buscadores que caen a regex: el de contenidos (cuando no hay
 * índice de texto) y el de alumnos por matrícula/nombre/correo. Ninguno de los
 * dos valida el texto de otra forma, así que este escapado es lo único que
 * separa un cuadro de búsqueda de un 500 o de un cuelgue por retroceso
 * exponencial.
 */
import { describe, it, expect } from 'vitest';
import { escaparRegex } from '../src/utils/regex.js';

/** Lo que hacen ambos buscadores con el texto ya escapado. */
const comoRegex = (q: string) => new RegExp(escaparRegex(q), 'i');

describe('escaparRegex', () => {
  it('deja el texto normal intacto', () => {
    expect(escaparRegex('A01278654')).toBe('A01278654');
    expect(escaparRegex('Arenas Vergara')).toBe('Arenas Vergara');
  });

  it('un paréntesis suelto ya no revienta la construcción de la regex', () => {
    // Sin escapar, `new RegExp('(((')` lanza SyntaxError → 500 del servidor.
    expect(() => comoRegex('(((')).not.toThrow();
    expect(() => comoRegex('a[')).not.toThrow();
    expect(() => comoRegex('*')).not.toThrow();
  });

  it('los metacaracteres casan LITERALMENTE, no como comodín', () => {
    // `.` sin escapar casaría con cualquier cosa y devolvería el padrón entero.
    expect(comoRegex('a.c').test('a.c')).toBe(true);
    expect(comoRegex('a.c').test('abc')).toBe(false);
    expect(comoRegex('A+').test('A+')).toBe(true);
    expect(comoRegex('A+').test('AAAA')).toBe(false);
  });

  it('neutraliza un patrón de retroceso exponencial', () => {
    // `(a+)+$` contra una cadena de aes sin final válido es el ReDoS de manual.
    const patron = comoRegex('(a+)+$');
    const inicio = process.hrtime.bigint();
    expect(patron.test('a'.repeat(40) + 'b')).toBe(false);
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    expect(ms).toBeLessThan(50);
  });

  it('escapa también la propia barra invertida', () => {
    expect(() => comoRegex('\\')).not.toThrow();
    expect(comoRegex('a\\b').test('a\\b')).toBe(true);
  });

  it('el correo con punto sigue encontrándose por su texto', () => {
    expect(comoRegex('a01278654@tec.mx').test('A01278654@tec.mx')).toBe(true);
  });
});
