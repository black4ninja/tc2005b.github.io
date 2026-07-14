import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Competencia } from '../models/Competencia.js';
import { coleccionesDeGrupo } from '../services/competencias.service.js';

/** Resuelve un coleccionId a un pointer VALIDADO. `null` si no existe. */
async function resolverColeccion(coleccionId: string): Promise<Parse.Object | null> {
  const q = new Parse.Query('Coleccion');
  q.equalTo('exists' as any, true as any);
  try {
    return await q.get(coleccionId, { useMasterKey: true });
  } catch {
    return null;
  }
}

/**
 * Comprueba que las dependencias de una calculada estén en la MISMA colección.
 *
 * Si una calculada de TC2005B dependiera de una directa de TC2007B, el alumno de
 * un grupo de TC2005B no tendría celda para esa dependencia: `recalcularCalculadas`
 * la vería como "sin evaluar" y dejaría la calculada vacía **para siempre, sin
 * error ni log**. Es la clase de fallo que hay que hacer imposible, no depurar.
 *
 * Devuelve el mensaje de error, o null si todo cuadra.
 */
async function validarDependencias(
  ids: string[],
  coleccionId: string | null,
  propioId?: string,
): Promise<string | null> {
  if (ids.length === 0) return null;
  if (ids.some((d) => d === propioId)) return 'Una competencia no puede depender de sí misma';

  const q = new Parse.Query('Competencia');
  q.equalTo('exists' as any, true as any);
  q.containedIn('objectId' as any, ids as any);
  q.include('coleccion' as any);
  const deps = await q.find({ useMasterKey: true });

  if (deps.length !== new Set(ids).size) return 'Alguna dependencia indicada no existe';

  const fuera = deps.filter((d) => (d.get('coleccion')?.id ?? null) !== coleccionId);
  if (fuera.length > 0) {
    const nombres = fuera.map((d) => d.get('competencia')).join(', ');
    return `Las dependencias deben pertenecer a la misma colección. Fuera de la colección: ${nombres}`;
  }
  return null;
}

/**
 * Lista competencias.
 *
 * - `?coleccionId=` → las de esa colección (`sin-coleccion` = las huérfanas).
 * - `?grupoId=`     → las de las colecciones del grupo. Es lo que deben usar el
 *   plan de evaluación y las entrevistas: ofrecer competencias que no le tocan al
 *   grupo lleva a mallas incoherentes.
 * - sin parámetros  → todas (la vista global del admin).
 */
export async function listCompetencias(req: Request, res: Response): Promise<void> {
  const { coleccionId, grupoId } = req.query;

  try {
    const query = new Parse.Query<Competencia>('Competencia');
    query.equalTo('exists' as any, true as any);
    query.ascending('orden');
    query.include('dependencias' as any);
    query.include('coleccion' as any);
    query.limit(1000);

    if (typeof grupoId === 'string' && grupoId) {
      const colecciones = await coleccionesDeGrupo(grupoId);
      if (colecciones.length === 0) {
        // Sin colecciones no hay competencias que le toquen: lista vacía, y se
        // avisa para que la UI pueda explicar por qué en vez de mostrar un hueco.
        res.json({ status: 'ok', competencias: [], sinColecciones: true });
        return;
      }
      query.containedIn('coleccion' as any, colecciones as any);
    } else if (typeof coleccionId === 'string' && coleccionId) {
      if (coleccionId === 'sin-coleccion') {
        query.doesNotExist('coleccion' as any);
      } else {
        const coleccion = await resolverColeccion(coleccionId);
        if (!coleccion) {
          res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
          return;
        }
        query.equalTo('coleccion' as any, coleccion as any);
      }
    }

    const competencias = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      competencias: competencias.map((c) => c.toSafeJSON()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener competencias' });
  }
}

export async function createCompetencia(req: Request, res: Response): Promise<void> {
  const { competencia, nivel, descripcionNivel, guiaEvidencias, incipienteB, incipienteA, basico, solido, destacado, fechaIdealEvaluacion, orden, esCalculada, dependencias, coleccionId } = req.body;

  if (!competencia || typeof competencia !== 'string' || competencia.trim() === '') {
    res.status(400).json({ status: 'error', message: 'La competencia es requerida' });
    return;
  }
  if (!nivel || typeof nivel !== 'string' || nivel.trim() === '') {
    res.status(400).json({ status: 'error', message: 'El nivel es requerido' });
    return;
  }

  const isCalculada = esCalculada === true;
  if (isCalculada && (!Array.isArray(dependencias) || dependencias.length === 0)) {
    res.status(400).json({ status: 'error', message: 'Una competencia calculada debe tener al menos 1 dependencia' });
    return;
  }
  if (!isCalculada && Array.isArray(dependencias) && dependencias.length > 0) {
    res.status(400).json({ status: 'error', message: 'Una competencia directa no puede tener dependencias' });
    return;
  }

  try {
    // Sin colección la competencia no le llega a ningún alumno (la malla se
    // materializa desde `Grupo.colecciones`), así que se exige.
    if (!coleccionId || typeof coleccionId !== 'string') {
      res.status(400).json({ status: 'error', message: 'La colección es requerida: sin ella la competencia no aparece en ninguna malla' });
      return;
    }
    const coleccion = await resolverColeccion(coleccionId);
    if (!coleccion) {
      res.status(400).json({ status: 'error', message: 'La colección indicada no existe' });
      return;
    }

    if (isCalculada) {
      const err = await validarDependencias(dependencias as string[], coleccion.id!);
      if (err) {
        res.status(400).json({ status: 'error', message: err });
        return;
      }
    }

    const comp = new Competencia().initDefaults();
    comp.setColeccion(coleccion);
    comp.setCompetencia(competencia.trim());
    comp.setNivel(nivel.trim());
    if (descripcionNivel) comp.setDescripcionNivel(descripcionNivel.trim());
    if (guiaEvidencias) comp.setGuiaEvidencias(guiaEvidencias.trim());
    if (incipienteB) comp.setIncipienteB(incipienteB.trim());
    if (incipienteA) comp.setIncipienteA(incipienteA.trim());
    if (basico) comp.setBasico(basico.trim());
    if (solido) comp.setSolido(solido.trim());
    if (destacado) comp.setDestacado(destacado.trim());
    if (fechaIdealEvaluacion) comp.setFechaIdealEvaluacion(fechaIdealEvaluacion.trim());
    if (orden !== undefined) comp.setOrden(Number(orden));

    comp.setEsCalculada(isCalculada);
    if (isCalculada && Array.isArray(dependencias)) {
      const depPointers = dependencias.map((id: string) =>
        Parse.Object.extend('Competencia').createWithoutData(id),
      );
      comp.setDependencias(depPointers);
    } else {
      comp.setDependencias([]);
    }

    await comp.save(null, { useMasterKey: true });

    // Re-fetch with include to return full dependencias data
    const fetchQuery = new Parse.Query<Competencia>('Competencia');
    fetchQuery.include('dependencias' as any);
    fetchQuery.include('coleccion' as any);
    const saved = await fetchQuery.get(comp.id, { useMasterKey: true });

    res.status(201).json({ status: 'ok', competencia: saved.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear competencia' });
  }
}

export async function updateCompetencia(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { competencia, nivel, descripcionNivel, guiaEvidencias, incipienteB, incipienteA, basico, solido, destacado, fechaIdealEvaluacion, orden, esCalculada, dependencias, coleccionId } = req.body;

  try {
    const query = BaseModel.queryActive<Competencia>('Competencia');
    query.include('coleccion' as any);
    const comp = await query.get(id, { useMasterKey: true });

    // La colección efectiva tras este update: se valida contra ella, no contra
    // la que tenía antes (si se mueve de colección, sus dependencias también
    // tienen que estar en la nueva).
    let coleccionFinalId = comp.getColeccion()?.id ?? null;
    if (coleccionId !== undefined) {
      if (!coleccionId || typeof coleccionId !== 'string') {
        res.status(400).json({ status: 'error', message: 'La colección es requerida' });
        return;
      }
      const coleccion = await resolverColeccion(coleccionId);
      if (!coleccion) {
        res.status(400).json({ status: 'error', message: 'La colección indicada no existe' });
        return;
      }
      comp.setColeccion(coleccion);
      coleccionFinalId = coleccion.id!;
    }

    if (competencia !== undefined) {
      if (typeof competencia !== 'string' || competencia.trim() === '') {
        res.status(400).json({ status: 'error', message: 'La competencia no puede estar vacía' });
        return;
      }
      comp.setCompetencia(competencia.trim());
    }
    if (nivel !== undefined) {
      if (typeof nivel !== 'string' || nivel.trim() === '') {
        res.status(400).json({ status: 'error', message: 'El nivel no puede estar vacío' });
        return;
      }
      comp.setNivel(nivel.trim());
    }
    if (descripcionNivel !== undefined) comp.setDescripcionNivel((descripcionNivel ?? '').trim());
    if (guiaEvidencias !== undefined) comp.setGuiaEvidencias((guiaEvidencias ?? '').trim());
    if (incipienteB !== undefined) comp.setIncipienteB((incipienteB ?? '').trim());
    if (incipienteA !== undefined) comp.setIncipienteA((incipienteA ?? '').trim());
    if (basico !== undefined) comp.setBasico((basico ?? '').trim());
    if (solido !== undefined) comp.setSolido((solido ?? '').trim());
    if (destacado !== undefined) comp.setDestacado((destacado ?? '').trim());
    if (fechaIdealEvaluacion !== undefined) comp.setFechaIdealEvaluacion((fechaIdealEvaluacion ?? '').trim());
    if (orden !== undefined) comp.setOrden(Number(orden));

    if (esCalculada !== undefined) {
      const isCalculada = esCalculada === true;
      comp.setEsCalculada(isCalculada);

      if (isCalculada) {
        if (!Array.isArray(dependencias) || dependencias.length === 0) {
          res.status(400).json({ status: 'error', message: 'Una competencia calculada debe tener al menos 1 dependencia' });
          return;
        }
        const err = await validarDependencias(dependencias as string[], coleccionFinalId, id);
        if (err) {
          res.status(400).json({ status: 'error', message: err });
          return;
        }
        const depPointers = dependencias.map((depId: string) =>
          Parse.Object.extend('Competencia').createWithoutData(depId),
        );
        comp.setDependencias(depPointers);
      } else {
        comp.setDependencias([]);
      }
    } else if (dependencias !== undefined && Array.isArray(dependencias)) {
      // Cambiar dependencias sin tocar esCalculada.
      const err = await validarDependencias(dependencias as string[], coleccionFinalId, id);
      if (err) {
        res.status(400).json({ status: 'error', message: err });
        return;
      }
      const depPointers = dependencias.map((depId: string) =>
        Parse.Object.extend('Competencia').createWithoutData(depId),
      );
      comp.setDependencias(depPointers);
    } else if (coleccionId !== undefined && comp.getEsCalculada()) {
      // Se movió de colección sin tocar dependencias: las que tenía podrían
      // haber quedado fuera. Se revalidan contra la colección nueva.
      const depsActuales = comp.getDependencias().map((d) => d.id!);
      const err = await validarDependencias(depsActuales, coleccionFinalId, id);
      if (err) {
        res.status(400).json({ status: 'error', message: `${err} — mueve también sus dependencias, o cámbialas.` });
        return;
      }
    }

    await comp.save(null, { useMasterKey: true });

    // Re-fetch with include to return full dependencias data
    const fetchQuery = new Parse.Query<Competencia>('Competencia');
    fetchQuery.include('dependencias' as any);
    fetchQuery.include('coleccion' as any);
    const saved = await fetchQuery.get(comp.id, { useMasterKey: true });

    res.json({ status: 'ok', competencia: saved.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Competencia no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar competencia' });
  }
}

export async function deleteCompetencia(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = new Parse.Query<Competencia>('Competencia');
    query.equalTo('exists' as any, true as any);
    const comp = await query.get(id, { useMasterKey: true });

    comp.softDelete();
    await comp.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Competencia eliminada' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Competencia no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar competencia' });
  }
}
