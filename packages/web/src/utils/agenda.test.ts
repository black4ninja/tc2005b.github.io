import { describe, it, expect } from 'vitest';
import { diaMasProximo, estadoHueco, expandirFechas, intentoTerminado, semanasDelMes } from './agenda';

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

describe('diaMasProximo', () => {
  // Tres días de 9 a 13, hora de Querétaro.
  const dias = [
    { id: 'a', inicio: '2026-09-01T15:00:00.000Z', fin: '2026-09-01T19:00:00.000Z' },
    { id: 'b', inicio: '2026-09-03T15:00:00.000Z', fin: '2026-09-03T19:00:00.000Z' },
    { id: 'c', inicio: '2026-09-07T15:00:00.000Z', fin: '2026-09-07T19:00:00.000Z' },
  ];

  it('sin días no hay ninguno que enseñar', () => {
    expect(diaMasProximo([], new Date('2026-09-02T12:00:00Z'))).toBe(null);
  });

  it('elige el primero que no ha terminado', () => {
    expect(diaMasProximo(dias, new Date('2026-09-02T12:00:00Z'))).toBe('b');
  });

  it('un día en curso sigue siendo el suyo', () => {
    expect(diaMasProximo(dias, new Date('2026-09-03T16:30:00Z'))).toBe('b');
  });

  it('manda la HORA, no la fecha: acabado el de hoy, pasa al siguiente', () => {
    // 3 de septiembre a las 22:00 de Querétaro: sigue siendo hoy, pero el día
    // terminó a la una de la tarde.
    expect(diaMasProximo(dias, new Date('2026-09-04T04:00:00Z'))).toBe('c');
  });

  it('justo en el minuto de cierre todavía cuenta', () => {
    expect(diaMasProximo(dias, new Date('2026-09-03T19:00:00Z'))).toBe('b');
  });

  it('si ya terminaron todos, el último', () => {
    expect(diaMasProximo(dias, new Date('2026-10-01T12:00:00Z'))).toBe('c');
  });

  it('no depende de que vengan ordenados', () => {
    const revueltos = [dias[2], dias[0], dias[1]];
    expect(diaMasProximo(revueltos, new Date('2026-09-02T12:00:00Z'))).toBe('b');
  });
});

describe('intentoTerminado', () => {
  // Una entrevista de cinco minutos el 2 de septiembre a las 10:00 de Querétaro.
  const cita = { inicio: '2026-09-02T16:00:00.000Z', duracionSegundos: 300 };

  it('sin cita no está hecho: no ha pasado nada', () => {
    expect(intentoTerminado(null, new Date('2026-09-30T12:00:00Z'))).toBe(false);
    expect(intentoTerminado(undefined, new Date('2026-09-30T12:00:00Z'))).toBe(false);
  });

  it('una cita futura no está hecha', () => {
    expect(intentoTerminado(cita, new Date('2026-09-01T12:00:00Z'))).toBe(false);
  });

  it('mientras corre el hueco tampoco', () => {
    expect(intentoTerminado(cita, new Date('2026-09-02T16:03:00Z'))).toBe(false);
  });

  it('al cerrarse su hueco pasa a hecho', () => {
    expect(intentoTerminado(cita, new Date('2026-09-02T16:05:00Z'))).toBe(true);
    expect(intentoTerminado(cita, new Date('2026-09-02T16:05:01Z'))).toBe(true);
  });

  it('el caso del profesor: el del 2 sí, el del 4 no', () => {
    // Hoy es 3 de septiembre. El primer intento fue el 2 y el segundo es el 4.
    const hoy = new Date('2026-09-03T18:00:00Z');
    const segundo = { inicio: '2026-09-04T16:00:00.000Z', duracionSegundos: 300 };
    expect(intentoTerminado(cita, hoy)).toBe(true);
    expect(intentoTerminado(segundo, hoy)).toBe(false);
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
