import { describe, it, expect } from 'vitest';
import {
  HORAS_ANTELACION_EVIDENCIA,
  evidenciaATiempo,
  horasDeAntelacion,
  limiteDeEntrega,
  problemaDeEvidencias,
  fechaYHoraCorta,
} from './agenda';

/** Una cita el miércoles 2 de septiembre de 2026 a las 09:00 de Querétaro. */
const CITA = '2026-09-02T15:00:00.000Z';
/** Justo el límite: 24 horas antes, el martes a las 09:00. */
const LIMITE = '2026-09-01T15:00:00.000Z';

const subida = (createdAt: string) => ({ createdAt });

describe('la antelación de una evidencia', () => {
  it('mide las horas que le sacó a la cita', () => {
    expect(horasDeAntelacion('2026-09-02T12:00:00.000Z', CITA)).toBe(3);
    expect(horasDeAntelacion(LIMITE, CITA)).toBe(HORAS_ANTELACION_EVIDENCIA);
  });

  it('sale negativa si se subió DESPUÉS de la hora de la cita', () => {
    expect(horasDeAntelacion('2026-09-02T17:00:00.000Z', CITA)).toBe(-2);
  });

  it('el límite exacto cuenta como a tiempo', () => {
    // 24 horas justas cumplen: la regla es «con 24 horas», no «con más de 24».
    expect(evidenciaATiempo(LIMITE, CITA)).toBe(true);
  });

  it('un minuto después del límite ya es tarde', () => {
    expect(evidenciaATiempo('2026-09-01T15:01:00.000Z', CITA)).toBe(false);
  });

  it('el límite es la hora de la cita menos las horas pedidas', () => {
    expect(limiteDeEntrega(CITA).toISOString()).toBe(LIMITE);
  });

  it('cuenta horas de reloj, no hábiles: el viernes vale para el lunes', () => {
    // Viernes 17:00 de Querétaro para una cita el lunes a las 09:00. En horas
    // hábiles no llegaría; en horas de reloj le sobran tres días.
    const lunes = '2026-09-07T15:00:00.000Z';
    const viernes = '2026-09-04T23:00:00.000Z';
    expect(evidenciaATiempo(viernes, lunes)).toBe(true);
  });
});

describe('cuándo hay que señalar la cita', () => {
  const antesDelLimite = new Date('2026-08-30T15:00:00.000Z');
  const despuesDelLimite = new Date('2026-09-02T14:00:00.000Z');

  it('sin evidencias y con plazo por delante NO es problema', () => {
    // Reservar con dos semanas y no haber subido nada todavía es lo normal.
    expect(problemaDeEvidencias([], CITA, antesDelLimite)).toBeNull();
  });

  it('sin evidencias y con el plazo vencido es «sin-entregar»', () => {
    expect(problemaDeEvidencias([], CITA, despuesDelLimite)).toBe('sin-entregar');
  });

  it('todo subido a tiempo no es problema, aunque el plazo ya pasara', () => {
    expect(problemaDeEvidencias([subida(LIMITE)], CITA, despuesDelLimite)).toBeNull();
  });

  it('basta con que UNA llegue tarde', () => {
    // Lo que la regla quiere ver es justo esto: colar a última hora la pieza
    // que faltaba.
    const evidencias = [subida('2026-08-30T15:00:00.000Z'), subida('2026-09-02T14:00:00.000Z')];
    expect(problemaDeEvidencias(evidencias, CITA, despuesDelLimite)).toBe('tarde');
  });

  it('una tarde se señala aunque el plazo aún no haya vencido del todo', () => {
    // Subida a 20 horas de la cita: ya incumple, no hace falta esperar.
    const evidencias = [subida('2026-09-01T19:00:00.000Z')];
    expect(problemaDeEvidencias(evidencias, CITA, new Date('2026-09-01T20:00:00.000Z')))
      .toBe('tarde');
  });

  it('el reloj que decide es el que se le pasa, no el del navegador', () => {
    // La misma cita y las mismas evidencias dan distinto según el instante.
    expect(problemaDeEvidencias([], CITA, antesDelLimite)).toBeNull();
    expect(problemaDeEvidencias([], CITA, despuesDelLimite)).toBe('sin-entregar');
  });
});

describe('fechaYHoraCorta', () => {
  it('dice el día y la hora en la zona del curso', () => {
    // 15:00 UTC son las 09:00 en Querétaro.
    expect(fechaYHoraCorta(CITA)).toBe('mié 2 de sep, 09:00');
  });
});
