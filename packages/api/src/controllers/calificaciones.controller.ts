import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { calcCalificacion, round1 } from '@tc2005b/evaluacion';
import { PlanEvaluacion, type PeriodoConfig } from '../models/PlanEvaluacion.js';
import { ActividadEvaluacionAlumno } from '../models/ActividadEvaluacionAlumno.js';
import { CompetenciaAlumno } from '../models/CompetenciaAlumno.js';
import { Grupo } from '../models/Grupo.js';
import { AppUser } from '../models/AppUser.js';
import { getAlumnosDeGrupo } from '../services/grupo-alumno.service.js';

/* El cálculo vive en `@tc2005b/evaluacion`, compartido con la malla del
 * profesor, el dashboard del alumno y el export XLSX. Aquí solo se traducen los
 * `Parse.Object` a las formas planas que espera. */

function aActividadCalc(rec: Parse.Object) {
  return {
    actividadGrupoId: rec.get('actividadGrupo')?.id ?? '',
    aprendizajePlaneado: rec.get('aprendizajePlaneado') ?? 0,
    aprendizajeGanado: rec.get('aprendizajeGanado') ?? 0,
  };
}

function aCompetenciaCalc(rec: Parse.Object) {
  return {
    competenciaId: rec.get('competencia')?.id ?? '',
    valorPeriodo1: rec.get('valorPeriodo1') ?? '',
    valorPeriodo2: rec.get('valorPeriodo2') ?? '',
  };
}

export async function getCalificacionesGrupo(req: Request, res: Response) {
  try {
    const { grupoId } = req.params;
    const grupo = Grupo.createWithoutData(grupoId) as Grupo;

    // 1. Fetch PlanEvaluacion
    const planQuery = new Parse.Query(PlanEvaluacion);
    planQuery.equalTo('grupo', grupo);
    planQuery.equalTo('active', true);
    const plan = await planQuery.first({ useMasterKey: true });

    if (!plan) {
      return res.json({ status: 'ok', plan: null, periodos: [], calificaciones: [] });
    }

    const periodos: PeriodoConfig[] = plan.getPeriodos();
    if (periodos.length === 0) {
      return res.json({ status: 'ok', periodos: [], calificaciones: [] });
    }

    // 2. Fetch all ActividadEvaluacionAlumno for grupo
    const actQuery = new Parse.Query(ActividadEvaluacionAlumno);
    actQuery.equalTo('grupo', grupo);
    actQuery.equalTo('active', true);
    actQuery.include('actividadGrupo');
    actQuery.limit(10000);
    const actRecords = await actQuery.find({ useMasterKey: true });

    // Group by alumnoId
    const actByAlumno = new Map<string, Parse.Object[]>();
    for (const rec of actRecords) {
      const alumnoId = rec.get('alumno')?.id;
      if (!alumnoId) continue;
      if (!actByAlumno.has(alumnoId)) actByAlumno.set(alumnoId, []);
      actByAlumno.get(alumnoId)!.push(rec);
    }

    // 3. Fetch all CompetenciaAlumno for grupo
    const compQuery = new Parse.Query(CompetenciaAlumno);
    compQuery.equalTo('grupo', grupo);
    compQuery.equalTo('active', true);
    compQuery.include('competencia');
    compQuery.limit(10000);
    const compRecords = await compQuery.find({ useMasterKey: true });

    // Group by alumnoId
    const compByAlumno = new Map<string, Parse.Object[]>();
    for (const rec of compRecords) {
      const alumnoId = rec.get('alumno')?.id;
      if (!alumnoId) continue;
      if (!compByAlumno.has(alumnoId)) compByAlumno.set(alumnoId, []);
      compByAlumno.get(alumnoId)!.push(rec);
    }

    // 4. Fetch active alumnos vía GrupoAlumno
    const alumnos = await getAlumnosDeGrupo(grupoId);

    // 5. Compute scores
    const calificaciones = alumnos.map((item) => {
      const alumnoId = item.alumno.id;
      const alumnoActs = (actByAlumno.get(alumnoId) ?? []).map(aActividadCalc);
      const alumnoComps = (compByAlumno.get(alumnoId) ?? []).map(aCompetenciaCalc);

      const { periodos: scores, calificacionActual } = calcCalificacion(
        periodos,
        alumnoActs,
        alumnoComps,
      );

      // El redondeo es SOLO de presentación: la nota final se pondera con los
      // valores exactos, no con los periodos ya redondeados.
      return {
        alumnoId,
        periodos: scores.map((p) => round1(p.periodoScore)),
        final: round1(calificacionActual),
      };
    });

    // 6. Response
    const periodosInfo = periodos.map((p) => ({
      nombre: p.nombre,
      pesoFinal: p.pesoFinal,
    }));

    return res.json({ status: 'ok', periodos: periodosInfo, calificaciones });
  } catch (err: any) {
    console.error('Error getCalificacionesGrupo:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
