import { describe, it, expect } from 'vitest';
import { bitacoraDelDia, type CitaParaBitacora } from '../src/services/bitacora-citas.js';

const desde = new Date('2026-10-15T15:00:00Z');
const hasta = new Date('2026-10-15T17:00:00Z');
const nombres = new Map([['al1', 'Fuentes Silva, Armando'], ['prof', 'Profesor']]);

function cita(parcial: Partial<CitaParaBitacora>): CitaParaBitacora {
  return {
    id: 'c1',
    inicio: '2026-10-15T15:15:00.000Z',
    creadaEn: '2026-10-12T13:04:07.000Z',
    creadaPorId: 'al1',
    canceladaEn: null,
    canceladaPorId: null,
    movimientos: [],
    alumno: { id: 'al1', nombre: 'Fuentes Silva, Armando', matricula: 'A01712074' },
    competencia: 'SICT0203',
    ...parcial,
  };
}

describe('bitacoraDelDia', () => {
  it('una reserva cancelada da dos eventos en orden, y sin `canceladaPor` no inventa quién', () => {
    const ev = bitacoraDelDia([cita({ canceladaEn: '2026-10-15T06:43:39.000Z' })], desde, hasta, nombres);
    expect(ev.map((e) => e.tipo)).toEqual(['reserva', 'cancelacion']);
    expect(ev[0].por).toEqual({ id: 'al1', nombre: 'Fuentes Silva, Armando', esElAlumno: true });
    expect(ev[1].por).toBeNull();
    expect(ev[1].hueco).toBe('2026-10-15T15:15:00.000Z');
  });

  it('distingue cuando cancela el profesor', () => {
    const ev = bitacoraDelDia([cita({ canceladaEn: '2026-10-14T00:00:00.000Z', canceladaPorId: 'prof' })], desde, hasta, nombres);
    expect(ev[1].por).toEqual({ id: 'prof', nombre: 'Profesor', esElAlumno: false });
  });

  it('la reserva se apunta al hueco original aunque luego la movieran', () => {
    const ev = bitacoraDelDia([cita({
      inicio: '2026-10-15T16:00:00.000Z',
      movimientos: [{ de: '2026-10-15T15:15:00.000Z', a: '2026-10-15T16:00:00.000Z', en: '2026-10-13T10:00:00.000Z', porId: 'prof' }],
    })], desde, hasta, nombres);
    expect(ev.map((e) => [e.tipo, e.hueco, e.desde])).toEqual([
      ['reserva', '2026-10-15T15:15:00.000Z', null],
      ['movimiento', '2026-10-15T16:00:00.000Z', '2026-10-15T15:15:00.000Z'],
    ]);
  });

  it('una cita movida a OTRO día deja rastro en este (el hueco que liberó)', () => {
    const ev = bitacoraDelDia([cita({
      inicio: '2026-10-20T15:00:00.000Z',
      movimientos: [{ de: '2026-10-15T15:15:00.000Z', a: '2026-10-20T15:00:00.000Z', en: '2026-10-13T10:00:00.000Z', porId: 'prof' }],
    })], desde, hasta, nombres);
    expect(ev.map((e) => e.tipo)).toEqual(['reserva', 'movimiento']);
  });

  it('ignora las citas de otros días', () => {
    expect(bitacoraDelDia([cita({ inicio: '2026-10-16T15:15:00.000Z' })], desde, hasta, nombres)).toEqual([]);
  });

  it('ordena todo el día por cuándo pasó, no por hueco', () => {
    const ev = bitacoraDelDia([
      cita({ id: 'a', inicio: '2026-10-15T15:00:00.000Z', creadaEn: '2026-10-10T00:00:00.000Z' }),
      cita({ id: 'b', inicio: '2026-10-15T16:00:00.000Z', creadaEn: '2026-10-05T00:00:00.000Z' }),
    ], desde, hasta, nombres);
    expect(ev.map((e) => e.citaId)).toEqual(['b', 'a']);
  });
});
