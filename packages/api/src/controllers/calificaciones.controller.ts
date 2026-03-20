import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { PlanEvaluacion, type PeriodoConfig } from '../models/PlanEvaluacion.js';
import { ActividadEvaluacionAlumno } from '../models/ActividadEvaluacionAlumno.js';
import { CompetenciaAlumno } from '../models/CompetenciaAlumno.js';
import { Grupo } from '../models/Grupo.js';
import { AppUser } from '../models/AppUser.js';
import { getAlumnosDeGrupo } from '../services/grupo-alumno.service.js';

function parseValorCompetencia(valor: string): number {
  if (!valor) return 0;
  const match = valor.match(/(\d+)%/);
  return match ? parseInt(match[1], 10) : 0;
}

function computeActividadesScore(
  records: Parse.Object[],
  actividadIds: Set<string>,
): number {
  let planeado = 0;
  let ganado = 0;
  for (const rec of records) {
    const actGrupo = rec.get('actividadGrupo');
    if (!actGrupo || !actividadIds.has(actGrupo.id)) continue;
    planeado += rec.get('aprendizajePlaneado') ?? 0;
    ganado += rec.get('aprendizajeGanado') ?? 0;
  }
  return planeado === 0 ? 0 : (ganado / planeado) * 100;
}

function computeCompetenciasScore(
  records: Parse.Object[],
  competenciaIds: Set<string>,
  periodoIndex: number,
): number {
  const field = periodoIndex === 0 ? 'valorPeriodo1' : 'valorPeriodo2';
  const values: number[] = [];
  for (const rec of records) {
    const comp = rec.get('competencia');
    if (!comp || !competenciaIds.has(comp.id)) continue;
    values.push(parseValorCompetencia(rec.get(field) ?? ''));
  }
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
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
      const alumno = item.alumno;
      const alumnoId = alumno.id;
      const alumnoActs = actByAlumno.get(alumnoId) ?? [];
      const alumnoComps = compByAlumno.get(alumnoId) ?? [];

      const periodoScores: number[] = [];

      for (let i = 0; i < periodos.length; i++) {
        const periodo = periodos[i];

        // Build activity IDs set (with acumulativo support)
        const actIdSet = new Set<string>();
        if (periodo.acumulativo) {
          for (let j = 0; j <= i; j++) {
            for (const aid of periodos[j].actividades) actIdSet.add(aid);
          }
        } else {
          for (const aid of periodo.actividades) actIdSet.add(aid);
        }

        const actScore = computeActividadesScore(alumnoActs, actIdSet);

        // Competencias
        const compIdSet = new Set<string>(periodo.competencias);
        const compScore = computeCompetenciasScore(alumnoComps, compIdSet, i);

        const calif =
          (compScore * periodo.pesoCompetencias) / 100 +
          (actScore * periodo.pesoActividades) / 100;

        periodoScores.push(Math.round(calif * 10) / 10);
      }

      // Final grade
      let final = 0;
      for (let i = 0; i < periodos.length; i++) {
        final += (periodoScores[i] * periodos[i].pesoFinal) / 100;
      }
      final = Math.round(final * 10) / 10;

      return { alumnoId, periodos: periodoScores, final };
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
