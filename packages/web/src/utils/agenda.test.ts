import { describe, it, expect } from 'vitest';
import { agruparVacios, estadoHueco, expandirBloques } from './agenda';

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

describe('agruparVacios', () => {
  const h = (min: number, cita: unknown = null) => ({
    inicio: new Date(Date.UTC(2026, 7, 27, 15, min)).toISOString(), cita,
  });

  it('junta los vacíos seguidos en una sola fila', () => {
    const filas = agruparVacios([h(0), h(5), h(10, { id: 'c' }), h(15)], 300);
    expect(filas.map((f) => f.tipo)).toEqual(['vacio', 'cita', 'vacio']);
    expect(filas[0]).toMatchObject({ cuantos: 2 });
  });

  it('el hueco vacío llega hasta el final del último bloque', () => {
    const [fila] = agruparVacios([h(0), h(5)], 300);
    expect(fila).toMatchObject({
      desde: h(0).inicio,
      hasta: new Date(Date.UTC(2026, 7, 27, 15, 10)).toISOString(),
    });
  });

  it('un día lleno no genera filas vacías', () => {
    const filas = agruparVacios([h(0, { id: 'a' }), h(5, { id: 'b' })], 300);
    expect(filas.every((f) => f.tipo === 'cita')).toBe(true);
  });

  it('un día entero vacío es una sola fila', () => {
    const filas = agruparVacios([h(0), h(5), h(10)], 300);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ tipo: 'vacio', cuantos: 3 });
  });
});

describe('expandirBloques', () => {
  it('repite el bloque en cada fecha del rango que caiga en sus días', () => {
    // Del lunes 7 al viernes 11 de septiembre de 2026, martes y jueves.
    const salida = expandirBloques('2026-09-07', '2026-09-11', [
      { dias: [2, 4], desde: '09:00', hasta: '11:00' },
    ]);
    expect(salida).toHaveLength(2);
    expect(salida.map((s) => new Date(s.inicio).getDay())).toEqual([2, 4]);
  });

  it('varios bloques con días distintos conviven, y salen en orden', () => {
    // El caso que se pidió: lunes a jueves de 9 a 11 y, además, martes a
    // viernes de 16 a 18.
    const salida = expandirBloques('2026-09-07', '2026-09-11', [
      { dias: [1, 2, 3, 4], desde: '09:00', hasta: '11:00' },
      { dias: [2, 3, 4, 5], desde: '16:00', hasta: '18:00' },
    ]);
    expect(salida).toHaveLength(8);
    const ordenado = [...salida].sort((a, b) => a.inicio.localeCompare(b.inicio));
    expect(salida).toEqual(ordenado);
    // El martes sale dos veces: por la mañana y por la tarde.
    const martes = salida.filter((s) => new Date(s.inicio).getDay() === 2);
    expect(martes).toHaveLength(2);
  });

  it('una sola fecha en las dos puntas abre un solo día', () => {
    const salida = expandirBloques('2026-09-08', '2026-09-08', [
      { dias: [2], desde: '09:00', hasta: '11:00' },
    ]);
    expect(salida).toHaveLength(1);
  });

  it('no devuelve nada si el rango está del revés o el bloque no cierra', () => {
    expect(expandirBloques('2026-09-11', '2026-09-07', [
      { dias: [1], desde: '09:00', hasta: '11:00' },
    ])).toEqual([]);
    expect(expandirBloques('2026-09-07', '2026-09-11', [
      { dias: [1], desde: '11:00', hasta: '09:00' },
    ])).toEqual([]);
  });
});
