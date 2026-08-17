import type { PeriodoConfig } from '../models/PlanEvaluacion.js';

export interface PlanAdaptado {
  periodos: PeriodoConfig[];
  /** Competencias del origen que el destino no evalúa (otra materia). */
  competenciasDescartadas: number;
  actividadesMapeadas: number;
  /** Actividades del origen sin equivalente por nombre en el destino. */
  actividadesDescartadas: number;
}

/**
 * Traduce el plan de un grupo para otro.
 *
 * La forma —periodos, nombres, pesos, acumulativo— se copia tal cual. Lo que hay
 * que traducir son las dos listas de ids, y cada una por un motivo distinto:
 *
 * - **Competencias**: viven en el CATÁLOGO de la colección, así que dos grupos de
 *   la misma materia comparten los mismos ids y la copia es literal. Si el
 *   destino evalúa otra materia, no hay nada que mapear y se descartan: dejarlas
 *   sería meter competencias que el alumno no tiene, y el cálculo las omitiría
 *   del promedio sin decir nada.
 *
 * - **Actividades**: son de CADA grupo (`ActividadEvaluacionGrupo`), estampadas
 *   desde la plantilla de la colección, y **no guardan referencia a su
 *   plantilla**. Así que el único puente entre las de un grupo y las de otro es
 *   el NOMBRE — que es, además, la identidad que ya usa `copiarPlantilla` para
 *   no estampar dos veces la misma.
 *
 * Copiar hacia un grupo de otra materia no falla: devuelve la forma con las
 * listas vacías, que es un punto de partida útil. Lo que no puede pasar es que
 * se descarte algo en silencio, y por eso se cuenta lo que se cayó.
 */
export function adaptarPlanAGrupo(
  periodos: readonly PeriodoConfig[],
  competenciasDestino: ReadonlySet<string>,
  nombrePorActividadOrigen: ReadonlyMap<string, string>,
  actividadDestinoPorNombre: ReadonlyMap<string, string>,
): PlanAdaptado {
  let competenciasDescartadas = 0;
  let actividadesMapeadas = 0;
  let actividadesDescartadas = 0;

  const adaptados = periodos.map((p) => {
    const competencias = (p.competencias ?? []).filter((id) => {
      const vale = competenciasDestino.has(id);
      if (!vale) competenciasDescartadas++;
      return vale;
    });

    const actividades: string[] = [];
    for (const id of p.actividades ?? []) {
      const nombre = nombrePorActividadOrigen.get(id);
      const destino = nombre ? actividadDestinoPorNombre.get(nombre) : undefined;
      if (destino) {
        actividades.push(destino);
        actividadesMapeadas++;
      } else {
        actividadesDescartadas++;
      }
    }

    return { ...p, competencias, actividades };
  });

  return {
    periodos: adaptados,
    competenciasDescartadas,
    actividadesMapeadas,
    actividadesDescartadas,
  };
}
