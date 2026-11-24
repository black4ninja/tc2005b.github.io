/**
 * Quién imparte cada sesión: validación contra el staff del grupo y cómo
 * filtra la agenda (y el .ics) las sesiones de otros profesores.
 */
import { describe, it, expect } from 'vitest';
import { leTocaImpartir, normalizarImparten } from '../src/services/imparten.js';
import { normalizarPreferenciasAgenda, sesionesDelGrupo, sesionParaMi, type EventoAgenda } from '../src/services/agenda-staff.js';
import { generarIcs } from '../src/services/agenda-ics.js';

const staff = new Set(['lalo', 'alex']);

describe('normalizarImparten', () => {
  it('limpia ids repetidos y quita los días vacíos (vuelven a «todos»)', () => {
    expect(normalizarImparten({ lunes: ['lalo', 'alex', 'lalo'], martes: [], miercoles: null }, staff))
      .toEqual({ lunes: ['lalo', 'alex'] });
  });
  it('null borra todo', () => {
    expect(normalizarImparten(null, staff)).toEqual({});
  });
  it('rechaza a quien no es del staff, días inventados y formas raras', () => {
    expect(normalizarImparten({ lunes: ['intruso'] }, staff)).toBe('invalido');
    expect(normalizarImparten({ domingo: ['lalo'] }, staff)).toBe('invalido');
    expect(normalizarImparten({ lunes: 'lalo' }, staff)).toBe('invalido');
    expect(normalizarImparten([], staff)).toBe('invalido');
  });
});

describe('a quién le toca', () => {
  it('sin asignar le toca a todos', () => {
    expect(leTocaImpartir(undefined, 'x')).toBe(true);
    expect(leTocaImpartir([], 'x')).toBe(true);
    expect(leTocaImpartir(['lalo'], 'alex')).toBe(false);
  });

  const sesion = (imparten?: { id: string; name: string }[]): EventoAgenda =>
    ({ id: 's', tipo: 'sesion', grupoId: 'g', fecha: '2026-11-23', inicio: '17:30', fin: '19:30', titulo: '', imparten });

  it('la agenda deja fuera las sesiones de otro, salvo que se pida verlas', () => {
    const deLalo = sesion([{ id: 'lalo', name: 'Eduardo' }]);
    expect(sesionParaMi(deLalo, 'alex', undefined)).toBe(false);
    expect(sesionParaMi(deLalo, 'lalo', undefined)).toBe(true);
    expect(sesionParaMi(deLalo, 'alex', { soloMias: false })).toBe(true);
    expect(sesionParaMi(sesion(), 'alex', undefined)).toBe(true);
  });

  it('sesionesDelGrupo pasa quién imparte cada día', () => {
    const ev = sesionesDelGrupo('g', { lunes: { inicio: '17:30', fin: '19:30' }, martes: { inicio: '17:30', fin: '19:30' } },
      [{ id: 's1', fechaInicio: '2026-11-23', diasActivos: ['lunes', 'martes'], imparten: { lunes: ['lalo', 'alex'] } }], [],
      '2026-11-23', '2026-11-29');
    expect(ev[0].imparten?.map((p) => p.id)).toEqual(['lalo', 'alex']);
    expect(ev[1].imparten).toBeUndefined();
  });

  it('la preferencia soloMias se guarda solo si es booleana', () => {
    expect(normalizarPreferenciasAgenda({ g1: { soloMias: false } })).toEqual({ g1: { soloMias: false } });
    expect(normalizarPreferenciasAgenda({ g1: { soloMias: 'no' } })).toBe('invalido');
  });

  it('el .ics dice quién imparte', () => {
    const ics = generarIcs({ eventos: [sesion([{ id: 'lalo', name: 'Eduardo' }])], nombreGrupo: new Map([['g', 'G']]), base: 'https://x' });
    expect(ics.replace(/\r\n /g, '')).toContain('Imparte: Eduardo');
  });
});
