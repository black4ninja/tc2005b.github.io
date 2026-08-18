/**
 * Copiar el plan de evaluación de un grupo a otro.
 *
 * Lo que se copia tal cual es la FORMA (periodos, pesos, acumulativo). Lo que
 * hay que traducir son las dos listas de ids, y por motivos distintos: las
 * competencias son del catálogo de la materia (dos grupos de la misma materia
 * comparten ids) y las actividades son de cada grupo, sin referencia a su
 * plantilla, así que solo se pueden casar por nombre.
 */
import { describe, it, expect } from 'vitest';
import { adaptarPlanAGrupo } from '../src/services/plan-evaluacion-copia.js';
import type { PeriodoConfig } from '../src/models/PlanEvaluacion.js';

const periodo = (over: Partial<PeriodoConfig> = {}): PeriodoConfig => ({
  nombre: 'Periodo 1',
  pesoFinal: 30,
  pesoCompetencias: 20,
  pesoActividades: 80,
  competencias: [],
  actividades: [],
  acumulativo: false,
  ...over,
});

describe('adaptarPlanAGrupo', () => {
  it('la forma del periodo se copia intacta', () => {
    const origen = [periodo({ nombre: 'P2', pesoFinal: 70, pesoCompetencias: 70, pesoActividades: 30, acumulativo: true })];
    const r = adaptarPlanAGrupo(origen, new Set(), new Map(), new Map());
    expect(r.periodos[0]).toMatchObject({
      nombre: 'P2',
      pesoFinal: 70,
      pesoCompetencias: 70,
      pesoActividades: 30,
      acumulativo: true,
    });
  });

  it('misma materia: las competencias se copian literales', () => {
    // Los ids del catálogo son los mismos para los dos grupos.
    const origen = [periodo({ competencias: ['c1', 'c2'] })];
    const r = adaptarPlanAGrupo(origen, new Set(['c1', 'c2', 'c3']), new Map(), new Map());
    expect(r.periodos[0].competencias).toEqual(['c1', 'c2']);
    expect(r.competenciasDescartadas).toBe(0);
  });

  it('otra materia: las competencias se descartan, y se dice cuántas', () => {
    // Dejarlas metería competencias que el alumno no tiene: el cálculo las
    // omitiría del promedio sin error ni log.
    const origen = [periodo({ competencias: ['c1', 'c2'] })];
    const r = adaptarPlanAGrupo(origen, new Set(['otra']), new Map(), new Map());
    expect(r.periodos[0].competencias).toEqual([]);
    expect(r.competenciasDescartadas).toBe(2);
  });

  it('las actividades se casan por NOMBRE, que es el único puente entre grupos', () => {
    const origen = [periodo({ actividades: ['a-origen-1', 'a-origen-2'] })];
    const r = adaptarPlanAGrupo(
      origen,
      new Set(),
      new Map([['a-origen-1', 'Avance 1'], ['a-origen-2', 'Avance 2']]),
      new Map([['Avance 1', 'a-destino-1'], ['Avance 2', 'a-destino-2']]),
    );
    expect(r.periodos[0].actividades).toEqual(['a-destino-1', 'a-destino-2']);
    expect(r.actividadesMapeadas).toBe(2);
    expect(r.actividadesDescartadas).toBe(0);
  });

  it('una actividad que el destino no tiene se cae, y se cuenta', () => {
    // El destino todavía no ha estampado su plantilla, o tiene otra.
    const origen = [periodo({ actividades: ['a1', 'a2'] })];
    const r = adaptarPlanAGrupo(
      origen,
      new Set(),
      new Map([['a1', 'Avance 1'], ['a2', 'Solo del origen']]),
      new Map([['Avance 1', 'destino-1']]),
    );
    expect(r.periodos[0].actividades).toEqual(['destino-1']);
    expect(r.actividadesMapeadas).toBe(1);
    expect(r.actividadesDescartadas).toBe(1);
  });

  it('NUNCA deja el id del grupo origen: sería la actividad de otro grupo', () => {
    // Es justo lo que el guardado del plan rechaza con un 400, y con razón.
    const origen = [periodo({ actividades: ['a-de-otro-grupo'] })];
    const r = adaptarPlanAGrupo(origen, new Set(), new Map(), new Map());
    expect(r.periodos[0].actividades).not.toContain('a-de-otro-grupo');
    expect(r.periodos[0].actividades).toEqual([]);
  });

  it('copiar a un grupo de otra materia da la FORMA con las listas vacías', () => {
    // No es un error: es un punto de partida útil, y por eso no se rechaza.
    const origen = [
      periodo({ nombre: 'P1', competencias: ['c1'], actividades: ['a1'] }),
      periodo({ nombre: 'P2', pesoFinal: 70, acumulativo: true, competencias: ['c2'] }),
    ];
    const r = adaptarPlanAGrupo(origen, new Set(), new Map(), new Map());
    expect(r.periodos.map((p) => p.nombre)).toEqual(['P1', 'P2']);
    expect(r.periodos.every((p) => p.competencias.length === 0 && p.actividades.length === 0)).toBe(true);
    expect(r.competenciasDescartadas).toBe(2);
    expect(r.actividadesDescartadas).toBe(1);
  });

  it('cuenta los descartes sumando TODOS los periodos, no solo el primero', () => {
    const origen = [
      periodo({ competencias: ['c1'] }),
      periodo({ competencias: ['c2', 'c3'] }),
    ];
    const r = adaptarPlanAGrupo(origen, new Set(), new Map(), new Map());
    expect(r.competenciasDescartadas).toBe(3);
  });

  it('no muta el plan del grupo origen', () => {
    const origen = [periodo({ competencias: ['c1'], actividades: ['a1'] })];
    adaptarPlanAGrupo(origen, new Set(), new Map(), new Map());
    expect(origen[0].competencias).toEqual(['c1']);
    expect(origen[0].actividades).toEqual(['a1']);
  });
});
