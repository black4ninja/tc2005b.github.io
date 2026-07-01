import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Competencia } from '../models/Competencia.js';

export async function listCompetencias(_req: Request, res: Response): Promise<void> {
  try {
    const query = new Parse.Query<Competencia>('Competencia');
    query.equalTo('exists' as any, true as any);
    query.ascending('orden');
    query.include('dependencias' as any);
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
  const { competencia, nivel, descripcionNivel, guiaEvidencias, incipienteB, incipienteA, basico, solido, destacado, fechaIdealEvaluacion, orden, esCalculada, dependencias } = req.body;

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
    const comp = new Competencia().initDefaults();
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
    const saved = await fetchQuery.get(comp.id, { useMasterKey: true });

    res.status(201).json({ status: 'ok', competencia: saved.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear competencia' });
  }
}

export async function updateCompetencia(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { competencia, nivel, descripcionNivel, guiaEvidencias, incipienteB, incipienteA, basico, solido, destacado, fechaIdealEvaluacion, orden, esCalculada, dependencias } = req.body;

  try {
    const query = BaseModel.queryActive<Competencia>('Competencia');
    const comp = await query.get(id, { useMasterKey: true });

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
        const depPointers = dependencias.map((depId: string) =>
          Parse.Object.extend('Competencia').createWithoutData(depId),
        );
        comp.setDependencias(depPointers);
      } else {
        comp.setDependencias([]);
      }
    } else if (dependencias !== undefined) {
      // Update dependencias without changing esCalculada
      if (Array.isArray(dependencias)) {
        const depPointers = dependencias.map((depId: string) =>
          Parse.Object.extend('Competencia').createWithoutData(depId),
        );
        comp.setDependencias(depPointers);
      }
    }

    await comp.save(null, { useMasterKey: true });

    // Re-fetch with include to return full dependencias data
    const fetchQuery = new Parse.Query<Competencia>('Competencia');
    fetchQuery.include('dependencias' as any);
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
