/**
 * Fechas de inicio/fin de un grupo: son días de CALENDARIO, no instantes.
 *
 * Parse solo guarda `Date`, así que hay que elegir una hora, y la elección no
 * es inocua: con `new Date('2026-08-10')` se guarda la medianoche UTC, que en
 * México (UTC-6) es el 9-ago a las 18:00. Cualquier lectura en hora local
 * enseñaba el día anterior al capturado.
 *
 * El acuerdo es anclar el día en UTC de punta a punta (aquí al guardar, y con
 * `timeZone: 'UTC'` al pintar). Estos tests fijan ese anclaje y el desbordamiento
 * silencioso de los días imposibles, que es lo que hace que no valga con
 * comprobar `Invalid Date`.
 */
import { describe, it, expect } from 'vitest';
import { parseFechaDia } from '../src/controllers/grupos.controller.js';

describe('parseFechaDia', () => {
  it('ancla el día a medianoche UTC: lo que se captura es lo que se guarda', () => {
    const fecha = parseFechaDia('2026-08-10');
    expect(fecha).toBeInstanceOf(Date);
    expect((fecha as Date).toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });

  it('el día sobrevive a leerlo en UTC (era donde se perdía)', () => {
    const fecha = parseFechaDia('2026-08-10') as Date;
    const pintado = fecha.toLocaleDateString('es-MX', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    expect(pintado).toContain('10');
    expect(pintado).toContain('2026');
  });

  it('null y cadena vacía piden BORRAR la fecha, no son un error', () => {
    expect(parseFechaDia(null)).toBeNull();
    expect(parseFechaDia('')).toBeNull();
  });

  it('rechaza un día que no existe en vez de desbordarlo al mes siguiente', () => {
    // `new Date('2026-02-31')` no da Invalid Date: da el 3 de marzo. Guardarlo
    // sería inventarse una fecha que nadie escribió.
    expect(parseFechaDia('2026-02-31')).toBe('invalida');
    expect(parseFechaDia('2026-04-31')).toBe('invalida');
    expect(parseFechaDia('2026-13-01')).toBe('invalida');
    expect(parseFechaDia('2026-00-10')).toBe('invalida');
    expect(parseFechaDia('2026-08-00')).toBe('invalida');
  });

  it('conoce los años bisiestos', () => {
    expect(parseFechaDia('2024-02-29')).toBeInstanceOf(Date); // bisiesto
    expect(parseFechaDia('2026-02-29')).toBe('invalida'); // no lo es
    expect(parseFechaDia('2000-02-29')).toBeInstanceOf(Date); // múltiplo de 400
    expect(parseFechaDia('1900-02-29')).toBe('invalida'); // múltiplo de 100
  });

  it('exige AAAA-MM-DD: nada de formatos sueltos ni valores que no son texto', () => {
    expect(parseFechaDia('10/08/2026')).toBe('invalida');
    expect(parseFechaDia('2026-8-10')).toBe('invalida');
    expect(parseFechaDia('mañana')).toBe('invalida');
    expect(parseFechaDia(1786225055692)).toBe('invalida');
    expect(parseFechaDia({ dia: 10 })).toBe('invalida');
  });

  it('tolera espacios alrededor', () => {
    expect((parseFechaDia(' 2026-08-10 ') as Date).toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });
});
