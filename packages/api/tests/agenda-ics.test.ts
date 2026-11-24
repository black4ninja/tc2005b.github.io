/**
 * Feed `.ics` de «Mi agenda»: horas en UTC desde la zona del curso, formato
 * RFC 5545 (escapes y líneas plegadas) y que no salgan nombres de alumnos.
 */
import { describe, it, expect } from 'vitest';
import { escaparTexto, generarIcs, plegar, relojAUtc, TOKEN_ICS, visibleEnAgenda } from '../src/services/agenda-ics.js';
import type { EventoAgenda } from '../src/services/agenda-staff.js';

describe('relojAUtc', () => {
  it('pasa la hora del centro de México a UTC (UTC−6)', () => {
    expect(relojAUtc('2026-11-23', '17:30').toISOString()).toBe('2026-11-23T23:30:00.000Z');
    expect(relojAUtc('2026-11-23', '19:30').toISOString()).toBe('2026-11-24T01:30:00.000Z');
  });
});

describe('formato', () => {
  it('escapa comas, punto y coma, barras y saltos', () => {
    expect(escaparTexto('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });
  it('pliega a 75 octetos sin partir caracteres', () => {
    const larga = `DESCRIPTION:${'ñ'.repeat(80)}`;
    const partes = plegar(larga).split('\r\n');
    expect(partes.length).toBeGreaterThan(1);
    for (const p of partes) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    expect(partes.map((p, i) => (i === 0 ? p : p.slice(1))).join('')).toBe(larga);
  });
  it('el token es base64url de 32', () => {
    expect(TOKEN_ICS.test('a'.repeat(32))).toBe(true);
    expect(TOKEN_ICS.test('a'.repeat(31))).toBe(false);
    expect(TOKEN_ICS.test('../'.padEnd(32, 'a'))).toBe(false);
  });
});

describe('visibleEnAgenda', () => {
  it('decide como la vista', () => {
    expect(visibleEnAgenda(true, undefined, 'sesion')).toBe(true);
    expect(visibleEnAgenda(false, undefined, 'sesion')).toBe(false);
    expect(visibleEnAgenda(true, { verEntrevistas: false }, 'entrevista')).toBe(false);
    expect(visibleEnAgenda(true, { oculto: true, verSesiones: true }, 'sesion')).toBe(true);
  });
});

describe('generarIcs', () => {
  const eventos: EventoAgenda[] = [
    {
      id: 's-sem1-lunes', tipo: 'sesion', grupoId: 'g1', fecha: '2026-11-23', inicio: '17:30', fin: '19:30',
      titulo: 'Diagnóstico', semana: '1', actividades: [{ id: 'a', tipo: 'info', titulo: 'Diagnóstico, alineación' }],
    },
    {
      id: 'e-dia1', tipo: 'entrevista', grupoId: 'g2', fecha: '2026-11-23', inicio: '17:00', fin: '17:30', titulo: '',
      huecos: {
        duracionMin: 5, total: 6, cerrados: ['17:25'],
        citas: [{ inicio: '17:00', fin: '17:05', alumno: 'Nombre Secreto', competencia: 'STC0203. Diseño' }],
      },
    },
  ];
  const ics = generarIcs({
    eventos,
    nombreGrupo: new Map([['g1', 'Maquisoft'], ['g2', 'TC2007B 501']]),
    base: 'https://ejemplo.mx',
    ahora: new Date('2026-11-24T00:00:00Z'),
  });
  const desplegado = ics.replace(/\r\n /g, '');

  it('arma un VCALENDAR con un VEVENT por evento, con UID estable y horas en UTC', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(desplegado).toContain('UID:s-sem1-lunes@agenda.tc2005b');
    expect(desplegado).toContain('DTSTART:20261123T233000Z');
    expect(desplegado).toContain('SUMMARY:Maquisoft · Sesión');
    expect(desplegado).toContain('URL:https://ejemplo.mx/admin/grupos/g1/calendario?semana=1');
  });

  it('de las entrevistas da la ocupación y la competencia, nunca el nombre del alumno', () => {
    expect(desplegado).toContain('SUMMARY:TC2007B 501 · Entrevistas (1/5)');
    expect(desplegado).toContain('17:00 · STC0203. Diseño');
    expect(desplegado).not.toContain('Nombre Secreto');
  });
});
