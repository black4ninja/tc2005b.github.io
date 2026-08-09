/**
 * Coherencia entre las columnas `matricula` y `correo` del CSV de alumnos.
 *
 * En el Tec el correo institucional se deriva de la matrícula, así que el CSV
 * dice lo mismo dos veces. Que no coincidan es una errata de edición, y la
 * consecuencia no es cosmética: la deduplicación del import mira el CORREO, así
 * que una fila con el correo de otro alumno lo importa como usuario nuevo y deja
 * al de esa matrícula duplicado.
 */
import { describe, it, expect } from 'vitest';
import { motivoIncoherenciaCsv } from '../src/controllers/alumnos.controller.js';

describe('motivoIncoherenciaCsv', () => {
  it('deja pasar la fila normal del Tec', () => {
    expect(motivoIncoherenciaCsv('A01278654', 'a01278654@tec.mx')).toBeNull();
  });

  it('no le importan las mayúsculas: el CSV real las trae en la matrícula y en el correo', () => {
    // grupo.csv del repo viene así: A01278654,A01278654@tec.mx
    expect(motivoIncoherenciaCsv('A01278654', 'A01278654@tec.mx')).toBeNull();
    expect(motivoIncoherenciaCsv('a01278654', 'A01278654@TEC.MX')).toBeNull();
  });

  it('tolera espacios de sobra alrededor', () => {
    expect(motivoIncoherenciaCsv('  A01278654 ', ' a01278654@tec.mx  ')).toBeNull();
  });

  it('caza la errata de un dígito, que es lo que motiva la comprobación', () => {
    const motivo = motivoIncoherenciaCsv('A01278654', 'a01278655@tec.mx');
    expect(motivo).toContain('A01278654');
    expect(motivo).toContain('a01278655@tec.mx');
  });

  it('no juzga el dominio: solo compara la parte local', () => {
    // Un correo personal o el @itesm.mx viejo son válidos mientras la parte
    // local siga siendo la matrícula.
    expect(motivoIncoherenciaCsv('A01278654', 'a01278654@itesm.mx')).toBeNull();
    expect(motivoIncoherenciaCsv('A01278654', 'a01278654@gmail.com')).toBeNull();
  });

  it('sin matrícula no hay nada que contrastar: la fila pasa, como antes', () => {
    expect(motivoIncoherenciaCsv('', 'a01278654@tec.mx')).toBeNull();
    expect(motivoIncoherenciaCsv('   ', 'a01278654@tec.mx')).toBeNull();
    expect(motivoIncoherenciaCsv(undefined, 'a01278654@tec.mx')).toBeNull();
  });

  it('un correo sin arroba se compara entero contra la matrícula', () => {
    expect(motivoIncoherenciaCsv('A01278654', 'a01278654')).toBeNull();
    expect(motivoIncoherenciaCsv('A01278654', 'otracosa')).not.toBeNull();
  });
});
