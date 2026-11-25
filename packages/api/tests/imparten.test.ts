/**
 * Hora y responsables de cada actividad: validación contra el staff del grupo,
 * cómo se parte la clase en eventos y cómo filtra la agenda (y el .ics) las
 * actividades de otros profesores.
 */
import { describe, it, expect } from 'vitest';
import { normalizarFranjaActividad, normalizarResponsables } from '../src/services/imparten.js';
import {
  normalizarPreferenciasAgenda, sesionesDelGrupo, sesionParaMi,
  type ActividadParaAgenda, type EventoAgenda,
} from '../src/services/agenda-staff.js';
import { generarIcs } from '../src/services/agenda-ics.js';

const staff = new Set(['lalo', 'alex']);

describe('normalizarResponsables', () => {
  it('limpia ids repetidos; vacío o null vuelven a «todos»', () => {
    expect(normalizarResponsables(['lalo', 'alex', 'lalo'], staff)).toEqual(['lalo', 'alex']);
    expect(normalizarResponsables([], staff)).toEqual([]);
    expect(normalizarResponsables(null, staff)).toEqual([]);
  });
  it('rechaza a quien no es del staff y formas raras', () => {
    expect(normalizarResponsables(['intruso'], staff)).toBe('invalido');
    expect(normalizarResponsables('lalo', staff)).toBe('invalido');
    expect(normalizarResponsables({ lunes: ['lalo'] }, staff)).toBe('invalido');
  });
});

describe('normalizarFranjaActividad', () => {
  it('las dos horas, normalizadas', () => {
    expect(normalizarFranjaActividad('9:00', '09:30')).toEqual({ inicio: '09:00', fin: '09:30' });
  });
  it('ninguna (vacías o null) = sin hora propia', () => {
    expect(normalizarFranjaActividad('', '')).toBeNull();
    expect(normalizarFranjaActividad(null, null)).toBeNull();
  });
  it('una sola, al revés o que no es hora → inválido', () => {
    expect(normalizarFranjaActividad('09:00', '')).toBe('invalido');
    expect(normalizarFranjaActividad('10:00', '09:00')).toBe('invalido');
    expect(normalizarFranjaActividad('09:00', '09:00')).toBe('invalido');
    expect(normalizarFranjaActividad('nueve', '10:00')).toBe('invalido');
  });
});

describe('la clase partida en actividades', () => {
  const horario = { lunes: { inicio: '09:00', fin: '11:00' } };
  const semanas = [{ id: 's1', numero: '4', fechaInicio: '2026-11-23', diasActivos: ['lunes'] }];
  const act = (id: string, extra: Partial<ActividadParaAgenda> = {}): ActividadParaAgenda =>
    ({ id, semanaId: 's1', dia: 'lunes', tipo: 'info', titulo: id, ...extra });
  const de = (ev: EventoAgenda) => ev.imparten?.map((p) => p.id);

  it('cada actividad con hora es su propio evento, con sus responsables', () => {
    const ev = sesionesDelGrupo('g', horario, semanas, [
      act('kickoff', { horaInicio: '09:00', horaFin: '09:30', responsables: ['lalo'] }),
      act('lab', { horaInicio: '09:30', horaFin: '11:00', responsables: ['alex'] }),
    ], '2026-11-23', '2026-11-29');
    expect(ev.map((e) => [e.id, e.inicio, e.fin, e.titulo, de(e)])).toEqual([
      ['a-kickoff', '09:00', '09:30', 'kickoff', ['lalo']],
      ['a-lab', '09:30', '11:00', 'lab', ['alex']],
    ]);
    expect(ev[0].semana).toBe('4');
  });

  it('las que no tienen hora comparten el bloque de la clase', () => {
    const ev = sesionesDelGrupo('g', horario, semanas, [
      act('kickoff', { horaInicio: '09:00', horaFin: '09:30' }),
      act('repaso', { responsables: ['lalo'] }),
      act('dudas', { responsables: ['alex'] }),
    ], '2026-11-23', '2026-11-29');
    expect(ev.map((e) => e.id)).toEqual(['a-kickoff', 's-s1-lunes']);
    expect(ev[1]).toMatchObject({ inicio: '09:00', fin: '11:00', titulo: 'repaso · dudas' });
    expect(de(ev[1])).toEqual(['lalo', 'alex']);
  });

  it('el bloque es de todos si alguna actividad sin hora no tiene responsables', () => {
    const [ev] = sesionesDelGrupo('g', horario, semanas, [act('repaso', { responsables: ['lalo'] }), act('libre')], '2026-11-23', '2026-11-29');
    expect(ev.imparten).toBeUndefined();
  });

  it('una actividad con hora sale aunque el grupo no tenga horario', () => {
    const ev = sesionesDelGrupo('g', {}, semanas, [
      act('kickoff', { horaInicio: '09:00', horaFin: '09:30' }),
      act('sin-hora'),
    ], '2026-11-23', '2026-11-29');
    expect(ev.map((e) => e.id)).toEqual(['a-kickoff']);
  });

  it('la agenda deja fuera las actividades de otro, salvo que se pida verlas', () => {
    const deLalo = { id: 'a-x', tipo: 'sesion', grupoId: 'g', fecha: '2026-11-23', inicio: '09:00', fin: '09:30', titulo: '', imparten: [{ id: 'lalo', name: 'Eduardo' }] } as EventoAgenda;
    expect(sesionParaMi(deLalo, 'alex', undefined)).toBe(false);
    expect(sesionParaMi(deLalo, 'lalo', undefined)).toBe(true);
    expect(sesionParaMi(deLalo, 'alex', { soloMias: false })).toBe(true);
    expect(sesionParaMi({ ...deLalo, imparten: undefined }, 'alex', undefined)).toBe(true);
  });

  it('la preferencia soloMias se guarda solo si es booleana', () => {
    expect(normalizarPreferenciasAgenda({ g1: { soloMias: false } })).toEqual({ g1: { soloMias: false } });
    expect(normalizarPreferenciasAgenda({ g1: { soloMias: 'no' } })).toBe('invalido');
  });

  it('en el .ics la actividad se nombra sola y dice quién la da', () => {
    const ev: EventoAgenda = {
      id: 'a-k', tipo: 'sesion', grupoId: 'g', fecha: '2026-11-23', inicio: '09:00', fin: '09:30',
      titulo: 'Kickoff', imparten: [{ id: 'lalo', name: 'Eduardo Pérez' }],
    };
    const ics = generarIcs({ eventos: [ev], nombreGrupo: new Map([['g', 'G']]), base: 'https://x' }).replace(/\r\n /g, '');
    expect(ics).toContain('SUMMARY:G · Kickoff (Eduardo)');
    expect(ics).toContain('Imparte: Eduardo Pérez');
    expect(ics).toContain('UID:a-k@agenda.tc2005b');
  });
});
