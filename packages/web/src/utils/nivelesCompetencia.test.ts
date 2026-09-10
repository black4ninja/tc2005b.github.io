import { describe, it, expect } from 'vitest';
import { PENALIZACION_VALOR } from '@tc2005b/evaluacion';
import {
  etiquetaNivel, opcionesEvaluacion, PENALIZACION_LABEL,
} from './nivelesCompetencia';

describe('opcionesEvaluacion', () => {
  it('sin sanción son «Sin evaluar» y los cinco niveles', () => {
    expect(opcionesEvaluacion(false).map((o) => o.label)).toEqual([
      'Sin evaluar',
      'Incipiente B (0%)',
      'Incipiente A (15%)',
      'Básico (70%)',
      'Sólido (85%)',
      'Destacado (100%)',
    ]);
  });

  it('con sanción, la sanción va PRIMERA de los niveles', () => {
    // −30 es el valor más bajo: detrás del 100 % se leería como el más alto.
    const labels = opcionesEvaluacion(true).map((o) => o.label);
    expect(labels[0]).toBe('Sin evaluar');
    expect(labels[1]).toBe(PENALIZACION_LABEL);
    expect(labels).toHaveLength(7);
  });

  it('sin argumento no la ofrece: solo la da quien la admite', () => {
    expect(opcionesEvaluacion().map((o) => o.label)).not.toContain(PENALIZACION_LABEL);
  });

  it('el valor que viaja al API es el número en texto', () => {
    const sancion = opcionesEvaluacion(true).find((o) => o.label === PENALIZACION_LABEL);
    expect(sancion!.value).toBe(String(PENALIZACION_VALOR));
    expect(opcionesEvaluacion(false).find((o) => o.label === 'Sólido (85%)')!.value).toBe('85');
  });
});

describe('etiquetaNivel', () => {
  it('traduce lo que hay en la base, que son números', () => {
    expect(etiquetaNivel(85)).toBe('Sólido (85%)');
    expect(etiquetaNivel(0)).toBe('Incipiente B (0%)');
    expect(etiquetaNivel(PENALIZACION_VALOR)).toBe(PENALIZACION_LABEL);
  });

  it('sin evaluar no es un nivel: no tiene etiqueta', () => {
    expect(etiquetaNivel('')).toBe('');
    expect(etiquetaNivel(null)).toBe('');
    expect(etiquetaNivel(undefined)).toBe('');
  });

  it('también traduce el número en texto que sale del selector', () => {
    expect(etiquetaNivel('85')).toBe('Sólido (85%)');
  });

  it('respeta lo que guardaron las versiones viejas, que era la etiqueta', () => {
    expect(etiquetaNivel('Básico (70%)')).toBe('Básico (70%)');
  });
});
