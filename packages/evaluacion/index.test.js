/**
 * Tests del cálculo de calificaciones.
 *
 * Esto es código que decide la nota de un alumno. El bug que motivó el paquete
 * (el dashboard leía todas las competencias como 0 y deflactaba la nota hasta 52
 * puntos) habría sido imposible con estos tests puestos, así que cada uno fija
 * una decisión concreta, no el resultado que casualmente da el código de hoy.
 */
import { describe, it, expect } from 'vitest';
import {
  parseValorCompetencia,
  campoValorPeriodo,
  idsActividadesDelPeriodo,
  calcActividadesScore,
  calcCompetenciasScore,
  calcPeriodoScore,
  calcCalificacion,
  round1,
} from './index.js';

/** Plan como los tres de producción: P1 normal, P2 acumulativo. */
const PLAN = [
  {
    nombre: 'Periodo 1',
    pesoFinal: 50,
    pesoActividades: 80,
    pesoCompetencias: 20,
    actividades: ['a1', 'a2'],
    competencias: ['c1', 'c2'],
    acumulativo: false,
  },
  {
    nombre: 'Periodo 2',
    pesoFinal: 50,
    pesoActividades: 30,
    pesoCompetencias: 70,
    actividades: ['a3'],
    competencias: ['c1', 'c2'],
    acumulativo: true,
  },
];

const act = (id, planeado, ganado) => ({
  actividadGrupoId: id,
  aprendizajePlaneado: planeado,
  aprendizajeGanado: ganado,
});

describe('parseValorCompetencia', () => {
  // ── El bug real: en producción las 396 celdas son `number`, y la copia del
  // dashboard del alumno hacía `if (typeof valor !== 'string') return 0`.
  it('lee los valores numéricos, que es como están guardados hoy', () => {
    expect(parseValorCompetencia(0)).toBe(0);
    expect(parseValorCompetencia(15)).toBe(15);
    expect(parseValorCompetencia(70)).toBe(70);
    expect(parseValorCompetencia(85)).toBe(85);
    expect(parseValorCompetencia(100)).toBe(100);
  });

  it('un 100 nunca puede leerse como 0 (la regresión que deflactaba la nota)', () => {
    expect(parseValorCompetencia(100)).not.toBe(0);
  });

  it('lee los strings numéricos', () => {
    expect(parseValorCompetencia('85')).toBe(85);
    expect(parseValorCompetencia(' 70 ')).toBe(70);
  });

  it('lee el formato legacy con etiqueta', () => {
    expect(parseValorCompetencia('Básico (70%)')).toBe(70);
    expect(parseValorCompetencia('Destacado (100%)')).toBe(100);
    expect(parseValorCompetencia('Incipiente B (0%)')).toBe(0);
  });

  it('sin evaluar vale 0', () => {
    expect(parseValorCompetencia('')).toBe(0);
    expect(parseValorCompetencia(null)).toBe(0);
    expect(parseValorCompetencia(undefined)).toBe(0);
  });

  it('no explota ni devuelve NaN con basura', () => {
    for (const v of ['abc', {}, [], true, NaN, Infinity]) {
      const r = parseValorCompetencia(v);
      expect(Number.isFinite(r)).toBe(true);
    }
  });
});

describe('campoValorPeriodo', () => {
  it('el primer periodo usa valorPeriodo1 y el segundo valorPeriodo2', () => {
    expect(campoValorPeriodo(0)).toBe('valorPeriodo1');
    expect(campoValorPeriodo(1)).toBe('valorPeriodo2');
  });

  // Deuda conocida del modelo: solo hay dos campos de valor. Se fija aquí para
  // que quede escrito que un 3er periodo REUSA la evaluación del 2º.
  it('un tercer periodo reusa valorPeriodo2 (limitación del modelo, documentada)', () => {
    expect(campoValorPeriodo(2)).toBe('valorPeriodo2');
  });
});

describe('idsActividadesDelPeriodo', () => {
  it('un periodo normal solo cuenta las suyas', () => {
    expect([...idsActividadesDelPeriodo(PLAN, 0)].sort()).toEqual(['a1', 'a2']);
  });

  it('un periodo acumulativo arrastra las de los anteriores', () => {
    expect([...idsActividadesDelPeriodo(PLAN, 1)].sort()).toEqual(['a1', 'a2', 'a3']);
  });

  it('una actividad repetida en varios periodos se cuenta UNA vez', () => {
    // Este era el doble conteo de las copias de la web: sumaban la actividad
    // por cada periodo previo en el que apareciera.
    const plan = [
      { ...PLAN[0], actividades: ['x'] },
      { ...PLAN[0], actividades: ['x'], acumulativo: true },
      { ...PLAN[1], actividades: [], acumulativo: true },
    ];
    const ids = idsActividadesDelPeriodo(plan, 2);
    expect([...ids]).toEqual(['x']);

    // Y el score lo confirma: 5/10 = 50%, no 10/20 con la misma actividad doble.
    const { planeado, score } = calcActividadesScore([act('x', 10, 5)], ids);
    expect(planeado).toBe(10);
    expect(score).toBe(50);
  });
});

describe('calcActividadesScore', () => {
  it('es ganado / planeado en porcentaje', () => {
    const r = calcActividadesScore([act('a1', 10, 5), act('a2', 10, 10)], new Set(['a1', 'a2']));
    expect(r.planeado).toBe(20);
    expect(r.ganado).toBe(15);
    expect(r.score).toBe(75);
  });

  it('ignora las actividades que no son del periodo', () => {
    const r = calcActividadesScore([act('a1', 10, 5), act('zz', 90, 90)], new Set(['a1']));
    expect(r.score).toBe(50);
  });

  it('sin nada planeado da 0, no NaN', () => {
    const r = calcActividadesScore([act('a1', 0, 0)], new Set(['a1']));
    expect(r.score).toBe(0);
    expect(Number.isNaN(r.score)).toBe(false);
  });

  it('sin actividades da 0', () => {
    expect(calcActividadesScore([], new Set(['a1'])).score).toBe(0);
  });
});

describe('calcCompetenciasScore', () => {
  const comps = [
    { competenciaId: 'c1', valorPeriodo1: 100, valorPeriodo2: 70 },
    { competenciaId: 'c2', valorPeriodo1: 0, valorPeriodo2: 85 },
  ];

  it('promedia las competencias del periodo', () => {
    expect(calcCompetenciasScore(comps, new Set(['c1', 'c2']), 0).score).toBe(50); // (100+0)/2
    expect(calcCompetenciasScore(comps, new Set(['c1', 'c2']), 1).score).toBe(77.5); // (70+85)/2
  });

  it('una competencia SIN EVALUAR cuenta como 0 y sí entra al promedio', () => {
    // Decisión de política: baja la nota. Si se quisiera excluirla del
    // denominador, este test es el que hay que cambiar a conciencia.
    const conVacia = [
      { competenciaId: 'c1', valorPeriodo1: 100 },
      { competenciaId: 'c2', valorPeriodo1: '' },
    ];
    const r = calcCompetenciasScore(conVacia, new Set(['c1', 'c2']), 0);
    expect(r.cuenta).toBe(2);
    expect(r.score).toBe(50);
  });

  it('ignora las competencias que no son del periodo', () => {
    expect(calcCompetenciasScore(comps, new Set(['c1']), 0).score).toBe(100);
  });

  it('sin competencias da 0', () => {
    expect(calcCompetenciasScore([], new Set(['c1']), 0).score).toBe(0);
  });
});

describe('calcPeriodoScore', () => {
  const actividades = [act('a1', 10, 10), act('a2', 10, 0), act('a3', 20, 20)];
  const competencias = [
    { competenciaId: 'c1', valorPeriodo1: 100, valorPeriodo2: 100 },
    { competenciaId: 'c2', valorPeriodo1: 0, valorPeriodo2: 100 },
  ];

  it('mezcla actividades y competencias con sus pesos', () => {
    // P1: act = 10/20 = 50%, comp = (100+0)/2 = 50%
    //     score = 50*80/100 + 50*20/100 = 40 + 10 = 50
    const p1 = calcPeriodoScore(PLAN, 0, actividades, competencias);
    expect(p1.actScore).toBe(50);
    expect(p1.compScore).toBe(50);
    expect(p1.periodoScore).toBe(50);
  });

  it('el periodo acumulativo arrastra las actividades previas', () => {
    // P2 acumulativo: act = (10+0+20)/(10+10+20) = 30/40 = 75%
    //                 comp = (100+100)/2 = 100%
    //                 score = 75*30/100 + 100*70/100 = 22.5 + 70 = 92.5
    const p2 = calcPeriodoScore(PLAN, 1, actividades, competencias);
    expect(p2.totalPlaneado).toBe(40);
    expect(p2.totalGanado).toBe(30);
    expect(p2.actScore).toBe(75);
    expect(p2.compScore).toBe(100);
    expect(p2.periodoScore).toBe(92.5);
  });

  it('devuelve las actividades contadas (la malla marca ahí las faltantes)', () => {
    const p1 = calcPeriodoScore(PLAN, 0, actividades, competencias);
    expect(p1.actividadesContadas.map((a) => a.actividadGrupoId)).toEqual(['a1', 'a2']);
  });
});

describe('calcCalificacion', () => {
  const actividades = [act('a1', 10, 10), act('a2', 10, 0), act('a3', 20, 20)];
  const competencias = [
    { competenciaId: 'c1', valorPeriodo1: 100, valorPeriodo2: 100 },
    { competenciaId: 'c2', valorPeriodo1: 0, valorPeriodo2: 100 },
  ];

  it('pondera los periodos por pesoFinal', () => {
    // P1 = 50, P2 = 92.5, ambos al 50% → 25 + 46.25 = 71.25
    const r = calcCalificacion(PLAN, actividades, competencias);
    expect(r.periodos.map((p) => p.periodoScore)).toEqual([50, 92.5]);
    expect(r.calificacionActual).toBeCloseTo(71.25, 10);
  });

  it('NO redondea los periodos antes de ponderarlos', () => {
    // El API lo hacía y la web no, así que el mismo alumno tenía dos notas
    // oficiales con hasta 0.1 de diferencia. Se redondea una sola vez, al final.
    const plan = [
      { ...PLAN[0], pesoFinal: 50, pesoActividades: 100, pesoCompetencias: 0, actividades: ['a1'], competencias: [] },
      { ...PLAN[1], pesoFinal: 50, pesoActividades: 100, pesoCompetencias: 0, actividades: ['a2'], competencias: [], acumulativo: false },
    ];
    // 1/3 → 33.333…%  y  2/3 → 66.666…%
    const acts = [act('a1', 3, 1), act('a2', 3, 2)];
    const r = calcCalificacion(plan, acts, []);
    // exacto: (33.333… + 66.666…)/2 = 50 exacto.
    // redondeando antes: (33.3 + 66.7)/2 = 50.0 — aquí coincide, pero el punto
    // es que el valor que se propaga es el exacto:
    expect(r.periodos[0].periodoScore).toBeCloseTo(100 / 3, 10);
    expect(r.calificacionActual).toBeCloseTo(50, 10);
  });

  it('un alumno sin nada evaluado saca 0, no NaN', () => {
    const r = calcCalificacion(PLAN, [], []);
    expect(r.calificacionActual).toBe(0);
    expect(Number.isNaN(r.calificacionActual)).toBe(false);
  });

  it('un alumno perfecto saca 100', () => {
    const perfectas = [act('a1', 10, 10), act('a2', 10, 10), act('a3', 20, 20)];
    const topes = [
      { competenciaId: 'c1', valorPeriodo1: 100, valorPeriodo2: 100 },
      { competenciaId: 'c2', valorPeriodo1: 100, valorPeriodo2: 100 },
    ];
    expect(calcCalificacion(PLAN, perfectas, topes).calificacionActual).toBeCloseTo(100, 10);
  });

  it('un plan vacío da 0', () => {
    expect(calcCalificacion([], [], []).calificacionActual).toBe(0);
  });
});

describe('round1', () => {
  it('redondea a un decimal', () => {
    expect(round1(71.25)).toBe(71.3);
    expect(round1(0)).toBe(0);
    expect(round1(99.94)).toBe(99.9);
  });
});
