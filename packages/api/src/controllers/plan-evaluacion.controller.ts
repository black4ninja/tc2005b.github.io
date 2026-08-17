import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { PlanEvaluacion } from '../models/PlanEvaluacion.js';
import { Grupo } from '../models/Grupo.js';
import { Competencia } from '../models/Competencia.js';
import { competenciasDeGrupo } from '../services/grupo-colecciones.service.js';
import { ActividadEvaluacionGrupo } from '../models/ActividadEvaluacionGrupo.js';
import { BaseModel } from '../models/BaseModel.js';
import type { PeriodoConfig } from '../models/PlanEvaluacion.js';
import { adaptarPlanAGrupo } from '../services/plan-evaluacion-copia.js';
import { isStaffDeGrupo } from '../services/grupo-admin.service.js';

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

/**
 * POST /admin/grupos/:grupoId/plan-evaluacion/copiar — { desdeGrupoId }
 *
 * Replica el plan de otro grupo, para no armar de cero un modelo ya probado.
 * Sustituye el plan del destino: es destructivo, y quien llama debe confirmarlo.
 *
 * Traducir los ids es todo el trabajo: las competencias son del catálogo de la
 * materia (misma colección = mismos ids) y las actividades son de cada grupo y
 * solo se pueden casar por nombre. Copiar hacia otra materia no falla: deja la
 * forma con las listas vacías, y se informa de lo que no pudo mapearse.
 */
export async function copiarPlanEvaluacion(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { desdeGrupoId } = req.body ?? {};

  if (typeof desdeGrupoId !== 'string' || !desdeGrupoId.trim()) {
    res.status(400).json({ status: 'error', message: 'Falta el grupo del que copiar' });
    return;
  }
  if (desdeGrupoId === grupoId) {
    res.status(400).json({ status: 'error', message: 'El grupo de origen y el de destino son el mismo' });
    return;
  }

  try {
    const grupoQuery = BaseModel.queryActive<Grupo>('Grupo');
    const destino = await grupoQuery.get(grupoId, { useMasterKey: true });

    // El middleware solo mira el grupo DESTINO (`:grupoId`). El origen se
    // comprueba aquí, o un profesor podría leer el plan de un grupo ajeno
    // pasando su id en el cuerpo.
    //
    // `isStaffDeGrupo` solo mira grupos vivos, así que el profesor no puede
    // copiar de uno cerrado aunque fuera suyo. Es la limitación conocida: para
    // eso está el admin, que sí puede.
    const usuario = req.appUser;
    if (usuario && usuario.getUserType() !== 'admin') {
      if (!(await isStaffDeGrupo(usuario.id, desdeGrupoId))) {
        res.status(403).json({ status: 'error', message: 'No tienes acceso al grupo de origen' });
        return;
      }
    }

    // El origen se busca SIN filtro de estado, a propósito. Los modelos que uno
    // quiere replicar están en los grupos del semestre pasado, y al cerrarlos se
    // borran (`active` y `exists` en false): los tres planes que existen hoy en
    // producción están justamente ahí. Filtrar por `exists` dejaría esta función
    // sin ningún origen útil. Solo se LEE de él: su plan y los nombres de sus
    // actividades.
    const origenQuery = new Parse.Query<Grupo>('Grupo');
    const origen = await origenQuery.get(desdeGrupoId, { useMasterKey: true });

    const planOrigenQuery = new Parse.Query<PlanEvaluacion>('PlanEvaluacion');
    planOrigenQuery.equalTo('exists' as any, true as any);
    planOrigenQuery.equalTo('grupo', origen as any);
    const planOrigen = await planOrigenQuery.first({ useMasterKey: true });
    if (!planOrigen || planOrigen.getPeriodos().length === 0) {
      res.status(400).json({
        status: 'error',
        message: `"${origen.get('name') ?? 'El grupo de origen'}" no tiene plan de evaluación que copiar.`,
      });
      return;
    }

    // Competencias que el DESTINO puede evaluar (las de sus colecciones).
    const { competencias: permitidas } = await competenciasDeGrupo(grupoId);
    const competenciasDestino = new Set(permitidas.map((c) => c.id!));

    // Actividades de los dos grupos. El puente es el nombre, que es la misma
    // identidad que usa `copiarPlantilla` para no estampar dos veces.
    const actividadesDe = async (grupo: Grupo) => {
      const q = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
      q.equalTo('exists' as any, true as any);
      q.equalTo('grupo' as any, grupo as any);
      q.limit(1000);
      return q.find({ useMasterKey: true });
    };
    const [actOrigen, actDestino] = await Promise.all([
      actividadesDe(origen),
      actividadesDe(destino),
    ]);
    const nombrePorActividadOrigen = new Map(actOrigen.map((a) => [a.id!, a.get('nombre') ?? '']));
    const actividadDestinoPorNombre = new Map(actDestino.map((a) => [a.get('nombre') ?? '', a.id!]));

    const adaptado = adaptarPlanAGrupo(
      planOrigen.getPeriodos(),
      competenciasDestino,
      nombrePorActividadOrigen,
      actividadDestinoPorNombre,
    );

    const planDestinoQuery = new Parse.Query<PlanEvaluacion>('PlanEvaluacion');
    planDestinoQuery.equalTo('exists' as any, true as any);
    planDestinoQuery.equalTo('grupo', Grupo.createWithoutData(grupoId) as any);
    let plan = await planDestinoQuery.first({ useMasterKey: true });
    const reemplazado = !!plan;
    if (!plan) {
      plan = new PlanEvaluacion().initDefaults() as PlanEvaluacion;
      plan.setGrupo(destino);
    }
    plan.setPeriodos(adaptado.periodos);
    await plan.save(null, { useMasterKey: true });

    res.json({
      status: 'ok',
      plan: plan.toSafeJSON(),
      copiadoDe: origen.get('name') ?? '',
      reemplazado,
      periodos: adaptado.periodos.length,
      competenciasDescartadas: adaptado.competenciasDescartadas,
      actividadesMapeadas: adaptado.actividadesMapeadas,
      actividadesDescartadas: adaptado.actividadesDescartadas,
    });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al copiar el plan de evaluación' });
  }
}
