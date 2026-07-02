import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Grupo } from '../models/Grupo.js';
import { invalidateAllowedCache } from '../services/materia.service.js';

export async function listGrupos(_req: Request, res: Response): Promise<void> {
  try {
    const query = new Parse.Query<Grupo>('Grupo');
    query.equalTo('exists' as any, true as any);
    query.include('materia' as any);
    query.descending('createdAt');
    const grupos = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      grupos: grupos.map((g) => g.toSafeJSON()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener grupos' });
  }
}

function normalizeSlugs(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const slugs = value
    .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
    .map((s) => s.trim());
  return [...new Set(slugs)];
}

export async function createGrupo(req: Request, res: Response): Promise<void> {
  const { name, fechaInicio, fechaFin, materiaId, docusaurus } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
    return;
  }

  try {
    const grupo = new Grupo().initDefaults();
    grupo.setName(name.trim());
    if (fechaInicio) grupo.setFechaInicio(new Date(fechaInicio));
    if (fechaFin) grupo.setFechaFin(new Date(fechaFin));
    if (materiaId) {
      const materia = await BaseModel.queryActive('Materia')
        .get(materiaId, { useMasterKey: true })
        .catch(() => null);
      if (!materia) {
        res.status(400).json({ status: 'error', message: 'Materia no encontrada' });
        return;
      }
      grupo.setMateria(materia);
    }
    const docusSlugs = normalizeSlugs(docusaurus);
    if (docusSlugs) grupo.setDocusaurus(docusSlugs);

    await grupo.save(null, { useMasterKey: true });

    res.status(201).json({ status: 'ok', grupo: grupo.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear grupo' });
  }
}

export async function updateGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, fechaInicio, fechaFin, materiaId, docusaurus } = req.body;

  try {
    const query = BaseModel.queryActive<Grupo>('Grupo');
    query.include('materia' as any);
    const grupo = await query.get(id, { useMasterKey: true });

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ status: 'error', message: 'El nombre no puede estar vacío' });
        return;
      }
      grupo.setName(name.trim());
    }
    if (fechaInicio !== undefined) {
      grupo.setFechaInicio(fechaInicio ? new Date(fechaInicio) : undefined!);
    }
    if (fechaFin !== undefined) {
      grupo.setFechaFin(fechaFin ? new Date(fechaFin) : undefined!);
    }
    if (materiaId !== undefined) {
      if (materiaId === null || materiaId === '') {
        grupo.unset('materia');
      } else {
        grupo.setMateria(Parse.Object.extend('Materia').createWithoutData(materiaId));
      }
    }
    // Solo se aplica si es un array válido (incl. [] para limpiar); un valor
    // no-array se ignora para no borrar las asignaciones existentes por error.
    const docusSlugs = docusaurus !== undefined ? normalizeSlugs(docusaurus) : null;
    if (docusSlugs) grupo.setDocusaurus(docusSlugs);

    await grupo.save(null, { useMasterKey: true });
    // Si cambió la materia o los docusaurus del grupo, cambió el acceso de sus alumnos.
    if (materiaId !== undefined || docusSlugs) invalidateAllowedCache();

    res.json({ status: 'ok', grupo: grupo.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar grupo' });
  }
}

export async function archiveGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = new Parse.Query<Grupo>('Grupo');
    query.equalTo('exists' as any, true as any);
    const grupo = await query.get(id, { useMasterKey: true });

    if (grupo.get('active')) {
      grupo.deactivate();
    } else {
      grupo.activate();
    }
    await grupo.save(null, { useMasterKey: true });

    res.json({ status: 'ok', grupo: grupo.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al cambiar estado del grupo' });
  }
}

export async function deleteGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = new Parse.Query<Grupo>('Grupo');
    query.equalTo('exists' as any, true as any);
    const grupo = await query.get(id, { useMasterKey: true });

    grupo.softDelete();
    await grupo.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Grupo eliminado' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar grupo' });
  }
}
