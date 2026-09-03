import { describe, it, expect } from 'vitest';
import { estadoHueco, expandirFechas, semanasDelMes } from './agenda';

describe('estadoHueco', () => {
  const agendableDesde = '2026-08-27T16:00:00.000Z';
  const ahora = '2026-08-26T16:00:00.000Z';

  it('lo mío manda sobre todo lo demás', () => {
    expect(estadoHueco(
      { inicio: '2026-08-26T15:00:00.000Z', ocupado: true, mia: { id: 'c1' } },
      agendableDesde, ahora,
    )).toBe('mio');
  });

  it('lo de otro sale como ocupado, sin más', () => {
    expect(estadoHueco(
      { inicio: '2026-08-28T15:00:00.000Z', ocupado: true, mia: null }, agendableDesde, ahora,
    )).toBe('ocupado');
  });

  it('lo que ya pasó no se ofrece', () => {
    expect(estadoHueco(
      { inicio: '2026-08-26T15:00:00.000Z', ocupado: false, mia: null }, agendableDesde, ahora,
    )).toBe('pasado');
  });

  it('libre pero demasiado pronto se distingue de libre', () => {
    expect(estadoHueco(
      { inicio: '2026-08-27T15:00:00.000Z', ocupado: false, mia: null }, agendableDesde, ahora,
    )).toBe('pronto');
  });

  it('a partir del límite, libre', () => {
    expect(estadoHueco(
      { inicio: '2026-08-27T16:00:00.000Z', ocupado: false, mia: null }, agendableDesde, ahora,
    )).toBe('libre');
  });
});

describe('expandirFechas', () => {
  it('un horario abre sus días, y solo esos', () => {
    const salida = expandirFechas([
      { fechas: ['2026-09-07', '2026-09-08', '2026-09-09'], desde: '09:00', hasta: '11:00' },
    ]);
    expect(salida).toHaveLength(3);
    expect(salida.map((s) => new Date(s.inicio).getDate())).toEqual([7, 8, 9]);
  });

  it('varios horarios conviven, y salen en orden cronológico', () => {
    // El caso que se pidió: unos días de mañana y otros de tarde, sin que uno
    // dependa del otro.
    const salida = expandirFechas([
      { fechas: ['2026-09-07', '2026-09-09'], desde: '09:00', hasta: '11:00' },
      { fechas: ['2026-09-08', '2026-09-09'], desde: '16:00', hasta: '18:00' },
    ]);
    expect(salida).toHaveLength(4);
    const ordenado = [...salida].sort((a, b) => a.inicio.localeCompare(b.inicio));
    expect(salida).toEqual(ordenado);
    // El 9 sale dos veces: por la mañana y por la tarde.
    expect(salida.filter((s) => new Date(s.inicio).getDate() === 9)).toHaveLength(2);
  });

  it('sin días elegidos no hay nada que abrir', () => {
    expect(expandirFechas([{ fechas: [], desde: '09:00', hasta: '11:00' }])).toEqual([]);
  });

  it('un horario que no cierra se descarta', () => {
    expect(expandirFechas([
      { fechas: ['2026-09-07'], desde: '11:00', hasta: '09:00' },
    ])).toEqual([]);
  });
});

describe('semanasDelMes', () => {
  it('empieza en lunes y rellena los huecos con el mes vecino', () => {
    // Septiembre de 2026 empieza en martes: el lunes 31 de agosto abre la
    // rejilla para que no quede un agujero.
    const semanas = semanasDelMes(2026, 8);
    expect(semanas[0]).toHaveLength(7);
    expect(semanas[0][0].dia).toBe(31);
    expect(semanas[0][0].delMes).toBe(false);
    expect(semanas[0][1].dia).toBe(1);
    expect(semanas[0][1].delMes).toBe(true);
  });

  it('no añade una fila entera del mes siguiente', () => {
    // Con seis filas fijas, un mes corto acababa con una semana que no pisa
    // ningún día suyo: sitio gastado que desplaza el resto del formulario.
    for (const mes of [0, 1, 5, 8, 11]) {
      const semanas = semanasDelMes(2026, mes);
      const ultima = semanas[semanas.length - 1];
      expect(ultima.some((d) => d.delMes)).toBe(true);
    }
  });
});
