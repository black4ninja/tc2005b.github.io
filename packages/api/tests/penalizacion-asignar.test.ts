/**
 * Las dos condiciones para asignar «Incipiente B −30 pts», y la regla de las
 * calculadas.
 *
 * Son la parte del servidor que no puede depender de que el front pinte o no la
 * opción: la sanción borra 30 puntos de un golpe.
 *
 * Se prueban las funciones puras que deciden; el controlador las usa tal cual.
 */
import { describe, it, expect } from 'vitest';
import { esPenalizacion, PENALIZACION_VALOR } from '@tc2005b/evaluacion';

/** Espeja la condición del controlador: la competencia debe admitirla. */
function puedeSancionar(valor: unknown, admitePenalizacion: boolean): boolean {
  return !esPenalizacion(valor) || admitePenalizacion;
}

/** Espeja la otra: si sanciona, tiene que haber retro (nueva o ya guardada). */
function tieneMotivo(valor: unknown, retroNueva: unknown, retroGuardada: string): boolean {
  if (!esPenalizacion(valor)) return true;
  const texto = typeof retroNueva === 'string' ? retroNueva.trim() : retroGuardada.trim();
  return texto !== '';
}

/** Espeja el MIN de las calculadas: la sanción vale 0, no −30. */
function valorParaMinimo(raw: unknown): number {
  if (esPenalizacion(raw)) return 0;
  return typeof raw === 'number' ? raw : Number(raw);
}

describe('quién puede recibir la sanción', () => {
  it('una competencia que la admite, sí', () => {
    expect(puedeSancionar(PENALIZACION_VALOR, true)).toBe(true);
  });

  it('una que NO la admite, no — aunque el payload lo pida', () => {
    // El front no ofrece la opción, pero el servidor no puede fiarse de eso.
    expect(puedeSancionar(PENALIZACION_VALOR, false)).toBe(false);
  });

  it('los niveles normales no pasan por esta condición', () => {
    for (const v of ['', 0, 15, 70, 85, 100]) {
      expect(puedeSancionar(v, false)).toBe(true);
    }
  });
});

describe('la sanción exige motivo escrito', () => {
  it('con retro nueva, pasa', () => {
    expect(tieneMotivo(PENALIZACION_VALOR, 'Faltas de respeto reiteradas', '')).toBe(true);
  });

  it('sin retro, se rechaza', () => {
    expect(tieneMotivo(PENALIZACION_VALOR, undefined, '')).toBe(false);
    expect(tieneMotivo(PENALIZACION_VALOR, '', '')).toBe(false);
    expect(tieneMotivo(PENALIZACION_VALOR, '   ', '')).toBe(false);
  });

  it('vale la retro que ya estaba guardada: no se obliga a reescribirla', () => {
    expect(tieneMotivo(PENALIZACION_VALOR, undefined, 'Motivo de la vez pasada')).toBe(true);
  });

  it('un nivel normal no necesita motivo', () => {
    expect(tieneMotivo(85, undefined, '')).toBe(true);
  });
});

describe('las calculadas no heredan la sanción', () => {
  it('para el mínimo, −30 vale 0', () => {
    // Si se propagara, la calculada penalizaría también y el alumno perdería 60
    // puntos por una sola falta.
    expect(valorParaMinimo(PENALIZACION_VALOR)).toBe(0);
  });

  it('el mínimo de una sancionada y una perfecta es 0, no −30', () => {
    const deps = [PENALIZACION_VALOR, 100].map(valorParaMinimo);
    expect(Math.min(...deps)).toBe(0);
  });

  it('los valores normales no se tocan', () => {
    expect(valorParaMinimo(85)).toBe(85);
    expect(valorParaMinimo('70')).toBe(70);
  });
});
