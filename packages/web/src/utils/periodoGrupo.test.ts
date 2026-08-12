/**
 * Periodo de un grupo en la tabla de administración.
 *
 * Lo que estos tests protegen de verdad es el anclaje en UTC: las fechas se
 * guardan a medianoche UTC, y leerlas en la zona del navegador las corre un día
 * hacia atrás en todo México. Ya pasó una vez con las columnas separadas.
 */
import { describe, it, expect } from 'vitest';
import { formatFecha, formatPeriodo } from './periodoGrupo';

describe('formatFecha', () => {
  it('pinta el día capturado, no el anterior', () => {
    // Medianoche UTC del 10-ago; en México son las 18:00 del 9-ago.
    expect(formatFecha('2026-08-10T00:00:00.000Z')).toContain('10');
    expect(formatFecha('2026-08-10T00:00:00.000Z')).toContain('2026');
  });

  it('devuelve guion sin fecha o con una ilegible', () => {
    expect(formatFecha(undefined)).toBe('—');
    expect(formatFecha('')).toBe('—');
    expect(formatFecha('no es una fecha')).toBe('—');
  });
});

describe('formatPeriodo', () => {
  it('dice el año una sola vez cuando las dos caen en el mismo', () => {
    const texto = formatPeriodo('2026-08-10T00:00:00.000Z', '2026-10-23T00:00:00.000Z');
    expect(texto).toContain('–');
    // El año aparece al final, no repetido en las dos mitades.
    expect(texto.match(/2026/g)).toHaveLength(1);
    expect(texto).toContain('10');
    expect(texto).toContain('23');
  });

  it('repite el año cuando el grupo cruza de año', () => {
    const texto = formatPeriodo('2026-11-10T00:00:00.000Z', '2027-02-15T00:00:00.000Z');
    expect(texto).toContain('2026');
    expect(texto).toContain('2027');
  });

  it('resuelve los rangos a medias', () => {
    expect(formatPeriodo(undefined, '2026-10-23T00:00:00.000Z')).toMatch(/^hasta /);
    expect(formatPeriodo('2026-08-10T00:00:00.000Z', undefined)).toMatch(/^desde /);
  });

  it('devuelve guion cuando no hay ninguna de las dos', () => {
    expect(formatPeriodo(undefined, undefined)).toBe('—');
    expect(formatPeriodo('', '')).toBe('—');
  });

  it('no revienta si una de las dos es ilegible', () => {
    expect(formatPeriodo('vaya', '2026-10-23T00:00:00.000Z')).toContain('—');
  });
});
