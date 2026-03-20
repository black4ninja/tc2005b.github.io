import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { PlanEvaluacion } from '../models/PlanEvaluacion.js';
import { Grupo } from '../models/Grupo.js';
import { Competencia } from '../models/Competencia.js';
import { ActividadEvaluacionGrupo } from '../models/ActividadEvaluacionGrupo.js';
import { BaseModel } from '../models/BaseModel.js';
import type { PeriodoConfig } from '../models/PlanEvaluacion.js';

export async function getPlanEvaluacion(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoQuery = BaseModel.queryActive<Grupo>('Grupo');
    await grupoQuery.get(grupoId, { useMasterKey: true });

    const query = new Parse.Query<PlanEvaluacion>('PlanEvaluacion');
    query.equalTo('exists' as any, true as any);
    query.equalTo('grupo', Grupo.createWithoutData(grupoId) as any);
    const plan = await query.first({ useMasterKey: true });

    if (!plan) {
      res.json({ status: 'ok', plan: null });
      return;
    }

    res.json({ status: 'ok', plan: plan.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al obtener plan de evaluación' });
  }
}

export async function createOrUpdatePlanEvaluacion(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { periodos } = req.body;

  if (!Array.isArray(periodos) || periodos.length === 0) {
    res.status(400).json({ status: 'error', message: 'Se requiere al menos un periodo' });
    return;
  }

  const validationError = validatePeriodos(periodos);
  if (validationError) {
    res.status(400).json({ status: 'error', message: validationError });
    return;
  }

  try {
    const grupoQuery = BaseModel.queryActive<Grupo>('Grupo');
    const grupo = await grupoQuery.get(grupoId, { useMasterKey: true });

    // Validate competencia IDs exist
    const allCompIds = [...new Set(periodos.flatMap((p: PeriodoConfig) => p.competencias))];
    if (allCompIds.length > 0) {
      const compQuery = new Parse.Query<Competencia>('Competencia');
      compQuery.equalTo('exists' as any, true as any);
      compQuery.containedIn('objectId' as any, allCompIds as any);
      const found = await compQuery.find({ useMasterKey: true });
      if (found.length !== allCompIds.length) {
        res.status(400).json({ status: 'error', message: 'Algunas competencias no existen' });
        return;
      }
    }

    // Validate actividad IDs exist
    const allActIds = [...new Set(periodos.flatMap((p: PeriodoConfig) => p.actividades))];
    if (allActIds.length > 0) {
      const actQuery = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
      actQuery.equalTo('exists' as any, true as any);
      actQuery.containedIn('objectId' as any, allActIds as any);
      const found = await actQuery.find({ useMasterKey: true });
      if (found.length !== allActIds.length) {
        res.status(400).json({ status: 'error', message: 'Algunas actividades no existen' });
        return;
      }
    }

    // Upsert: find existing or create new
    const query = new Parse.Query<PlanEvaluacion>('PlanEvaluacion');
    query.equalTo('exists' as any, true as any);
    query.equalTo('grupo', Grupo.createWithoutData(grupoId) as any);
    let plan = await query.first({ useMasterKey: true });

    if (!plan) {
      plan = new PlanEvaluacion().initDefaults() as PlanEvaluacion;
      plan.setGrupo(grupo);
    }

    plan.setPeriodos(periodos);
    await plan.save(null, { useMasterKey: true });

    res.json({ status: 'ok', plan: plan.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al guardar plan de evaluación' });
  }
}

function validatePeriodos(periodos: PeriodoConfig[]): string | null {
  const totalPesoFinal = periodos.reduce((sum, p) => sum + (p.pesoFinal ?? 0), 0);
  if (totalPesoFinal !== 100) {
    return `Los pesos finales de los periodos deben sumar 100 (actualmente suman ${totalPesoFinal})`;
  }

  for (let i = 0; i < periodos.length; i++) {
    const p = periodos[i];
    if (!p.nombre || typeof p.nombre !== 'string' || p.nombre.trim() === '') {
      return `El periodo ${i + 1} requiere un nombre`;
    }
    if (typeof p.pesoFinal !== 'number' || p.pesoFinal < 0 || p.pesoFinal > 100) {
      return `El peso final del periodo ${i + 1} debe estar entre 0 y 100`;
    }
    if (typeof p.pesoCompetencias !== 'number' || p.pesoCompetencias < 0 || p.pesoCompetencias > 100) {
      return `El peso de competencias del periodo ${i + 1} debe estar entre 0 y 100`;
    }
    if (typeof p.pesoActividades !== 'number' || p.pesoActividades < 0 || p.pesoActividades > 100) {
      return `El peso de actividades del periodo ${i + 1} debe estar entre 0 y 100`;
    }
    if (p.pesoCompetencias + p.pesoActividades !== 100) {
      return `Los pesos de competencias y actividades del periodo ${i + 1} deben sumar 100`;
    }
    if (!Array.isArray(p.competencias)) {
      return `Las competencias del periodo ${i + 1} deben ser un arreglo`;
    }
    if (!Array.isArray(p.actividades)) {
      return `Las actividades del periodo ${i + 1} deben ser un arreglo`;
    }
  }

  return null;
}
