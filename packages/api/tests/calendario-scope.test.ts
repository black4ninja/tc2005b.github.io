/**
 * Decisión pura del candado de edición del calendario. El profesor edita el
 * calendario de SUS grupos y de ninguno más; una petición que toca varios
 * grupos (un reordenamiento con ids mezclados) solo pasa si son todos suyos.
 */
import { describe, it, expect } from 'vitest';
import { decidirAccesoCalendario } from '../src/middlewares/calendario-scope.middleware.js';

const suyos = new Set(['g1', 'g2']);

describe('decidirAccesoCalendario', () => {
  it('admin pasa siempre, aunque no se haya resuelto ningún grupo', () => {
    expect(decidirAccesoCalendario('admin', ['otro'], new Set())).toBe(true);
    expect(decidirAccesoCalendario('admin', [], new Set())).toBe(true);
  });

  it('profesor pasa en su grupo', () => {
    expect(decidirAccesoCalendario('profesor', ['g1'], suyos)).toBe(true);
    expect(decidirAccesoCalendario('profesor', ['g1', 'g2'], suyos)).toBe(true);
  });

  it('profesor NO pasa en un grupo ajeno', () => {
    expect(decidirAccesoCalendario('profesor', ['g3'], suyos)).toBe(false);
  });

  it('profesor NO pasa si la petición mezcla su grupo con uno ajeno', () => {
    expect(decidirAccesoCalendario('profesor', ['g1', 'g3'], suyos)).toBe(false);
  });

  it('profesor NO pasa si no se pudo resolver el grupo (id inexistente)', () => {
    expect(decidirAccesoCalendario('profesor', [], suyos)).toBe(false);
  });

  it('alumno y anónimo nunca pasan', () => {
    expect(decidirAccesoCalendario('alumno', ['g1'], suyos)).toBe(false);
    expect(decidirAccesoCalendario(undefined, ['g1'], suyos)).toBe(false);
  });
});
