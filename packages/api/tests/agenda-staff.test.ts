/**
 * «Mi agenda»: validación del horario de clase y de las preferencias de color,
 * y cómo se generan las sesiones a partir del calendario del grupo.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizarHora,
  normalizarHorarioClase,
  normalizarPreferenciasAgenda,
  sesionesDelGrupo,
  eventoDeEntrevistas,
  relojEnZona,
  huecosDeEntrevistas,
} from '../src/services/agenda-staff.js';

describe('normalizarHora', () => {
  it('acepta HH:MM y completa la hora de un dígito', () => {
    expect(normalizarHora('17:30')).toBe('17:30');
    expect(normalizarHora('9:00')).toBe('09:00');
  });
  it('rechaza lo que no es una hora', () => {
    expect(normalizarHora('24:00')).toBeNull();
    expect(normalizarHora('17:60')).toBeNull();
    expect(normalizarHora('mañana')).toBeNull();
    expect(normalizarHora(1730)).toBeNull();
  });
});

describe('normalizarHorarioClase', () => {
  it('limpia un horario válido y salta los días vacíos', () => {
    expect(normalizarHorarioClase({ lunes: { inicio: '17:30', fin: '19:30' }, sabado: { inicio: '9:00', fin: '13:00' }, martes: null }))
      .toEqual({ lunes: { inicio: '17:30', fin: '19:30' }, sabado: { inicio: '09:00', fin: '13:00' } });
  });
  it('null borra el horario', () => {
    expect(normalizarHorarioClase(null)).toEqual({});
  });
  it('rechaza días inventados, franjas al revés y formas raras', () => {
    expect(normalizarHorarioClase({ domingo: { inicio: '9:00', fin: '10:00' } })).toBe('invalido');
    expect(normalizarHorarioClase({ lunes: { inicio: '19:30', fin: '17:30' } })).toBe('invalido');
    expect(normalizarHorarioClase({ lunes: { inicio: '10:00', fin: '10:00' } })).toBe('invalido');
    expect(normalizarHorarioClase([])).toBe('invalido');
    expect(normalizarHorarioClase('lunes')).toBe('invalido');
  });
});

describe('sesionesDelGrupo', () => {
  const horario = { lunes: { inicio: '17:30', fin: '19:30' }, sabado: { inicio: '09:00', fin: '13:00' } };
  const semanas = [{ id: 's1', fechaInicio: '2027-02-01', diasActivos: ['lunes', 'martes', 'sabado'] }];

  it('genera una sesión por día activo con hora, con la fecha real del día', () => {
    const ev = sesionesDelGrupo('g', horario, semanas, [{ semanaId: 's1', dia: 'sabado', tipo: 'info', titulo: 'RAG' }], '2027-01-01', '2027-12-31');
    // martes no tiene hora en el horario: no sale
    expect(ev.map((e) => `${e.fecha} ${e.inicio}-${e.fin}`)).toEqual(['2027-02-01 17:30-19:30', '2027-02-06 09:00-13:00']);
    expect(ev[1].titulo).toBe('RAG');
  });

  it('un día que solo tiene asueto no es sesión', () => {
    const ev = sesionesDelGrupo('g', horario, semanas, [{ semanaId: 's1', dia: 'lunes', tipo: 'asueto', titulo: 'Día de la Constitución' }], '2027-01-01', '2027-12-31');
    expect(ev.map((e) => e.fecha)).toEqual(['2027-02-06']);
  });

  it('lleva el número de semana y el detalle de las actividades, sin los asuetos', () => {
    const [ev] = sesionesDelGrupo('g', horario, [{ ...semanas[0], numero: '3' }], [
      { semanaId: 's1', dia: 'lunes', tipo: 'info', titulo: 'RAG', detalle: { id: 'a1', tipo: 'info', titulo: 'RAG' } },
      { semanaId: 's1', dia: 'lunes', tipo: 'asueto', titulo: 'Puente', detalle: { id: 'a2', tipo: 'asueto' } },
    ], '2027-02-01', '2027-02-01');
    expect(ev.semana).toBe('3');
    expect(ev.actividades).toEqual([{ id: 'a1', tipo: 'info', titulo: 'RAG' }]);
  });

  it('respeta el rango pedido', () => {
    const ev = sesionesDelGrupo('g', horario, semanas, [], '2027-02-02', '2027-02-05');
    expect(ev).toEqual([]);
  });

  it('ignora semanas sin fecha de inicio válida', () => {
    expect(sesionesDelGrupo('g', horario, [{ id: 'x', fechaInicio: '', diasActivos: ['lunes'] }], [], '2000-01-01', '2100-01-01')).toEqual([]);
  });
});

describe('eventoDeEntrevistas y relojEnZona', () => {
  it('pasa los instantes a la hora del centro de México', () => {
    // 15:00 UTC = 09:00 en Ciudad de México (UTC-6, sin horario de verano)
    expect(relojEnZona(new Date('2026-12-01T15:00:00Z'))).toEqual({ fecha: '2026-12-01', hora: '09:00' });
    const ev = eventoDeEntrevistas('d1', 'g', new Date('2026-12-01T15:00:00Z'), new Date('2026-12-01T19:30:00Z'), 'Sala 3', false);
    expect(ev).toMatchObject({ tipo: 'entrevista', fecha: '2026-12-01', inicio: '09:00', fin: '13:30', titulo: 'Sala 3' });
  });
  it('si cruza la medianoche, se recorta al final del día', () => {
    const ev = eventoDeEntrevistas('d1', 'g', new Date('2026-12-02T04:00:00Z'), new Date('2026-12-02T07:00:00Z'), '', false);
    expect(ev).toMatchObject({ fecha: '2026-12-01', inicio: '22:00', fin: '23:59' });
  });
});

describe('normalizarPreferenciasAgenda', () => {
  it('acepta colores #rrggbb y la visibilidad', () => {
    expect(normalizarPreferenciasAgenda({ abc123: { sesiones: '#1E88E5', entrevistas: '#90caf9', oculto: false } }))
      .toEqual({ abc123: { sesiones: '#1e88e5', entrevistas: '#90caf9' } });
  });
  it('rechaza colores que no son hex y ids raros', () => {
    expect(normalizarPreferenciasAgenda({ abc: { sesiones: 'red' } })).toBe('invalido');
    expect(normalizarPreferenciasAgenda({ abc: { sesiones: '#fff;background:url(x)' } })).toBe('invalido');
    expect(normalizarPreferenciasAgenda({ 'a b': {} })).toBe('invalido');
    expect(normalizarPreferenciasAgenda([])).toBe('invalido');
  });
  it('guarda la visibilidad por tipo, y la rechaza si no es booleana', () => {
    expect(normalizarPreferenciasAgenda({ abc: { verSesiones: true, verEntrevistas: false } }))
      .toEqual({ abc: { verSesiones: true, verEntrevistas: false } });
    expect(normalizarPreferenciasAgenda({ abc: { verSesiones: 'si' } })).toBe('invalido');
  });
});

describe('huecosDeEntrevistas', () => {
  // 17:00–17:30 en CDMX (UTC−6), huecos de 5 minutos.
  const inicio = new Date('2026-11-23T23:00:00Z');
  const fin = new Date('2026-11-23T23:30:00Z');

  it('cuenta los huecos y pasa las citas a hora de reloj, en orden', () => {
    const h = huecosDeEntrevistas(inicio, fin, 300, [
      { inicio: new Date('2026-11-23T23:10:00Z'), alumno: 'B', competencia: 'C2' },
      { inicio: new Date('2026-11-23T23:00:00Z'), alumno: 'A', competencia: 'C1' },
    ], []);
    expect(h.total).toBe(6);
    expect(h.duracionMin).toBe(5);
    expect(h.citas).toEqual([
      { inicio: '17:00', fin: '17:05', alumno: 'A', competencia: 'C1' },
      { inicio: '17:10', fin: '17:15', alumno: 'B', competencia: 'C2' },
    ]);
  });

  it('deja fuera las citas y los huecos cerrados que no caen en el bloque', () => {
    const h = huecosDeEntrevistas(inicio, fin, 300, [
      { inicio: new Date('2026-11-23T23:30:00Z'), alumno: 'Tarde', competencia: '' },
    ], ['2026-11-23T23:20:00.000Z', '2026-11-23T22:55:00.000Z', 'basura']);
    expect(h.citas).toEqual([]);
    expect(h.cerrados).toEqual(['17:20']);
  });
});
