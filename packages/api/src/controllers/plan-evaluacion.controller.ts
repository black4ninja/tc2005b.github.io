import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { PlanEvaluacion } from '../models/PlanEvaluacion.js';
import { Grupo } from '../models/Grupo.js';
import { Competencia } from '../models/Competencia.js';
import { competenciasDeGrupo } from '../services/grupo-colecciones.service.js';
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

    // Validar que las competencias existan Y que le toquen a ESTE grupo.
    //
    // `PlanEvaluacion.periodos[].competencias` son ids sueltos en un array JSON,
    // sin FK. Si un periodo referenciara una competencia de otra materia, el
    // alumno no tendría celda para ella: `computeCompetenciasScore` simplemente
    // no la encontraría y la omitiría del promedio — la nota cambiaría sin que
    // nadie tocara nada. Por eso se valida la pertenencia, no solo la existencia.
    const allCompIds = [...new Set(periodos.flatMap((p: PeriodoConfig) => p.competencias))];
    if (allCompIds.length > 0) {
      const { competencias: permitidas, sinColecciones } = await competenciasDeGrupo(grupoId);
      if (sinColecciones) {
        res.status(400).json({
          status: 'error',
          message: 'El grupo no tiene colecciones asignadas: no puede tener competencias en su plan.',
        });
        return;
      }
      const permitidasIds = new Set(permitidas.map((c) => c.id!));
      const fuera = allCompIds.filter((id: string) => !permitidasIds.has(id));
      if (fuera.length > 0) {
        res.status(400).json({
          status: 'error',
          message: `${fuera.length} competencia(s) del plan no pertenecen a las colecciones de este grupo.`,
        });
        return;
      }
    }

    // Validar que las actividades existan Y que sean DE ESTE GRUPO.
    //
    // Antes solo se comprobaba la existencia: un plan podía referenciar la
    // actividad de OTRO grupo y `computeActividadesScore` la omitiría del
    // denominador — la nota cambiaría sin error ni log. Es el mismo agujero que
    // ya se tapó arriba para las competencias; a las actividades no se les había
    // aplicado el mismo razonamiento.
    const allActIds = [...new Set(periodos.flatMap((p: PeriodoConfig) => p.actividades))];
    if (allActIds.length > 0) {
      const actQuery = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
      actQuery.equalTo('exists' as any, true as any);
      actQuery.equalTo('grupo' as any, grupo as any);
      actQuery.containedIn('objectId' as any, allActIds as any);
      actQuery.limit(1000);
      const found = await actQuery.find({ useMasterKey: true });
      if (found.length !== allActIds.length) {
        const encontrados = new Set(found.map((a) => a.id));
        const fuera = allActIds.filter((id: string) => !encontrados.has(id));
        res.status(400).json({
          status: 'error',
          message: `${fuera.length} actividad(es) del plan no existen o no son de este grupo.`,
        });
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
