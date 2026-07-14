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

    /* ── Validación de las referencias del plan ──
     *
     * `periodos[].competencias` y `periodos[].actividades` son ids sueltos en un
     * array JSON, sin FK. Hay que distinguir DOS casos, y confundirlos rompe
     * cosas distintas:
     *
     *   1. El id apunta a algo VIVO que no le toca a este grupo (una competencia
     *      de otra materia, la actividad de otro grupo). Eso es un error real:
     *      el alumno no tendría celda para ella y el cálculo la omitiría del
     *      promedio — la nota cambiaría sin error ni log. → 400.
     *
     *   2. El id no apunta a nada vivo: la entidad se borró (soft-delete) y su id
     *      se quedó colgado en el plan. En producción ya había dos así en el plan
     *      de un grupo. NO es un error del que guarda: es basura previa, y
     *      rechazar el guardado lo dejaría ATASCADO —esos ids ni siquiera se
     *      pintan en la UI, así que no podría quitarlos—. → se podan en silencio.
     *
     * La poda deja el plan sano al guardarlo, que es justo lo que el borrado en
     * cascada debió hacer en su momento.
     */
    let podados = 0;

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
        // ¿Alguna de las que sobran sigue VIVA? Entonces es de otra materia (caso 1).
        const vivasQuery = new Parse.Query<Competencia>('Competencia');
        vivasQuery.equalTo('exists' as any, true as any);
        vivasQuery.equalTo('active' as any, true as any);
        vivasQuery.containedIn('objectId' as any, fuera as any);
        vivasQuery.limit(1000);
        const ajenas = await vivasQuery.find({ useMasterKey: true });
        if (ajenas.length > 0) {
          res.status(400).json({
            status: 'error',
            message: `${ajenas.length} competencia(s) del plan no pertenecen a las colecciones de este grupo.`,
          });
          return;
        }
        // Caso 2: ids muertos. Se podan.
        for (const p of periodos) {
          const antes = p.competencias.length;
          p.competencias = p.competencias.filter((id: string) => permitidasIds.has(id));
          podados += antes - p.competencias.length;
        }
      }
    }

    const allActIds = [...new Set(periodos.flatMap((p: PeriodoConfig) => p.actividades))];
    if (allActIds.length > 0) {
      const actQuery = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
      actQuery.equalTo('exists' as any, true as any);
      actQuery.equalTo('grupo' as any, grupo as any);
      actQuery.containedIn('objectId' as any, allActIds as any);
      actQuery.limit(1000);
      const propias = await actQuery.find({ useMasterKey: true });
      const propiasIds = new Set(propias.map((a) => a.id!));
      const fuera = allActIds.filter((id: string) => !propiasIds.has(id));

      if (fuera.length > 0) {
        // ¿Alguna sigue VIVA pero es de OTRO grupo? (caso 1)
        const ajenasQuery = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
        ajenasQuery.equalTo('exists' as any, true as any);
        ajenasQuery.containedIn('objectId' as any, fuera as any);
        ajenasQuery.limit(1000);
        const ajenas = await ajenasQuery.find({ useMasterKey: true });
        if (ajenas.length > 0) {
          res.status(400).json({
            status: 'error',
            message: `${ajenas.length} actividad(es) del plan son de otro grupo.`,
          });
          return;
        }
        // Caso 2: ids de actividades borradas. Se podan.
        for (const p of periodos) {
          const antes = p.actividades.length;
          p.actividades = p.actividades.filter((id: string) => propiasIds.has(id));
          podados += antes - p.actividades.length;
        }
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

    // `periodos` ya viene podado de los ids muertos, si los había.
    plan.setPeriodos(periodos);
    await plan.save(null, { useMasterKey: true });

    // `podados` se devuelve para que la UI pueda decirlo en vez de que el plan
    // cambie de contenido en silencio al guardarlo.
    res.json({ status: 'ok', plan: plan.toSafeJSON(), podados });
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
