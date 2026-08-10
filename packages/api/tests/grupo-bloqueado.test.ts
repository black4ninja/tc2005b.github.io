/**
 * Un grupo con `active: false` está BLOQUEADO: para el alumno tiene que ser
 * como si no existiera. La regla se concentra en `grupoDaAccesoAlumno` porque
 * antes vivía copiada en cada camino (selector, módulos, secciones, adjuntos) y
 * bastaba que a uno se le olvidara para que el grupo bloqueado siguiera abierto.
 */
import { describe, it, expect } from 'vitest';
import { grupoDaAccesoAlumno } from '../src/services/grupo-alumno.service.js';

/** Mínimo imprescindible de un Parse.Object para esta decisión. */
function grupoFalso(attrs: Record<string, unknown>) {
  return { get: (k: string) => attrs[k] } as any;
}

describe('grupoDaAccesoAlumno', () => {
  it('deja pasar el grupo normal', () => {
    expect(grupoDaAccesoAlumno(grupoFalso({ active: true, exists: true }))).toBe(true);
  });

  it('cierra el grupo bloqueado', () => {
    expect(grupoDaAccesoAlumno(grupoFalso({ active: false, exists: true }))).toBe(false);
  });

  it('cierra el grupo borrado', () => {
    expect(grupoDaAccesoAlumno(grupoFalso({ active: true, exists: false }))).toBe(false);
  });

  it('no rompe con un grupo que no llegó (pointer sin resolver)', () => {
    expect(grupoDaAccesoAlumno(undefined)).toBe(false);
  });

  it('trata los grupos viejos sin banderas como activos', () => {
    // Los registros anteriores a `initDefaults` no traen `active`/`exists`;
    // exigirlos en positivo dejaría fuera a grupos que sí funcionan.
    expect(grupoDaAccesoAlumno(grupoFalso({}))).toBe(true);
  });
});
