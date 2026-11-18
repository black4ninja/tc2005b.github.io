import { describe, it, expect } from 'vitest';
import { agruparPorDia, resumenPorDia, type EntradaExport } from './happinessExport';

function e(dia: string, estado: EntradaExport['estado'], createdAt: string): EntradaExport {
  return { id: `${dia}-${createdAt}`, dia, estado, texto: 't', autor: null, autorEmail: null, createdAt, updatedAt: createdAt };
}

const ENTRADAS = [
  e('2026-11-20', 'negativo', '2026-11-20T18:00:00Z'),
  e('2026-11-19', 'positivo', '2026-11-19T20:00:00Z'),
  e('2026-11-19', 'neutral', '2026-11-19T17:00:00Z'),
  e('2026-11-19', 'positivo', '2026-11-19T18:30:00Z'),
];

describe('agruparPorDia', () => {
  it('ordena los días y, dentro de cada uno, por hora', () => {
    const g = agruparPorDia(ENTRADAS);
    expect(g.map(([d]) => d)).toEqual(['2026-11-19', '2026-11-20']);
    expect(g[0][1].map((x) => x.createdAt)).toEqual([
      '2026-11-19T17:00:00Z', '2026-11-19T18:30:00Z', '2026-11-19T20:00:00Z',
    ]);
  });

  it('sin entradas no hay días', () => {
    expect(agruparPorDia([])).toEqual([]);
  });
});

describe('resumenPorDia', () => {
  it('cuenta cada estado por día', () => {
    expect(resumenPorDia(ENTRADAS)).toEqual([
      { dia: '2026-11-19', positivo: 2, neutral: 1, negativo: 0, total: 3 },
      { dia: '2026-11-20', positivo: 0, neutral: 0, negativo: 1, total: 1 },
    ]);
  });
});
