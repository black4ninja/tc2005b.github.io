import { describe, it, expect } from 'vitest';
import {
  diasDeSemana,
  fechaFinDeDias,
  lunesDe,
  ordenarDias,
  diaDelMes,
} from '../src/utils/diasSemana';
import type { SemanaNormal } from '../src/types/calendario';

function semana(extra: Partial<SemanaNormal> = {}): SemanaNormal {
  return {
    numero: 1,
    fechaInicio: '2026-08-10', // lunes
    fechaFin: '2026-08-13',
    tipo: 'normal',
    dias: {},
    ...extra,
  };
}

describe('ordenarDias', () => {
  it('ordena de lunes a viernes y quita duplicados e inválidos', () => {
    expect(ordenarDias(['viernes', 'lunes', 'viernes', 'sabado'])).toEqual(['lunes', 'viernes']);
  });
});

describe('diasDeSemana', () => {
  it('respeta los días marcados', () => {
    const s = semana({ diasActivos: ['lunes', 'miercoles', 'jueves', 'viernes'] });
    expect(diasDeSemana(s)).toEqual(['lunes', 'miercoles', 'jueves', 'viernes']);
  });

  it('mantiene lunes a jueves en semanas sin diasActivos (previas al campo)', () => {
    expect(diasDeSemana(semana())).toEqual(['lunes', 'martes', 'miercoles', 'jueves']);
  });

  it('no amplía la semana aunque fechaFin se pase del jueves', () => {
    const s = semana({ fechaFin: '2026-08-15' });
    expect(diasDeSemana(s)).toEqual(['lunes', 'martes', 'miercoles', 'jueves']);
  });

  it('nunca esconde un día que ya tiene actividades', () => {
    const s = semana({
      diasActivos: ['lunes'],
      dias: { viernes: { actividades: [{ tipo: 'lab' }] } },
    });
    expect(diasDeSemana(s)).toEqual(['lunes', 'viernes']);
  });

  it('ignora días inválidos guardados en diasActivos', () => {
    const s = semana({ diasActivos: ['sabado', 'viernes'] });
    expect(diasDeSemana(s)).toEqual(['viernes']);
  });
});

describe('fechaFinDeDias', () => {
  it('toma la fecha del último día con clase', () => {
    expect(fechaFinDeDias('2026-08-10', ['lunes', 'miercoles', 'viernes'])).toBe('2026-08-14');
    expect(fechaFinDeDias('2026-08-10', ['martes'])).toBe('2026-08-11');
  });
});

describe('lunesDe', () => {
  it('devuelve el lunes de la semana de cualquier fecha', () => {
    expect(lunesDe('2026-08-13')).toBe('2026-08-10'); // jueves → lunes
    expect(lunesDe('2026-08-10')).toBe('2026-08-10'); // lunes → mismo día
    expect(lunesDe('2026-08-16')).toBe('2026-08-10'); // domingo → lunes previo
  });
});

describe('diaDelMes', () => {
  it('calcula el día correcto aunque la semana cruce de mes', () => {
    expect(diaDelMes('2026-08-31', 'miercoles')).toBe(2); // 2 de septiembre
  });
});
