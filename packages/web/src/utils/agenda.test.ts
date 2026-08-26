import { describe, it, expect } from 'vitest';
import { agruparVacios, estadoHueco } from './agenda';

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
