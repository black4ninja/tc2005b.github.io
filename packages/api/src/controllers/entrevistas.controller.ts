import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Entrevista } from '../models/Entrevista.js';
import { Grupo } from '../models/Grupo.js';
import { Equipo } from '../models/Equipo.js';
import { AppUser } from '../models/AppUser.js';
import { Competencia } from '../models/Competencia.js';

function getWeekBounds(fecha: string): { monday: string; sunday: string } {
  const d = new Date(fecha + 'T12:00:00');
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  return { monday: fmt(monday), sunday: fmt(sunday) };
}

export async function listProfesores(_req: Request, res: Response): Promise<void> {
  try {
    const query = BaseModel.queryActive<AppUser>('AppUser');
    query.equalTo('userType' as any, 'admin' as any);
    query.ascending('name');
    const users = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      profesores: users.map((u) => ({
        id: u.id,
        name: u.get('name') ?? '',
        email: u.get('email') ?? '',
      })),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener profesores' });
  }
}

export async function listEntrevistas(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
    const query = BaseModel.queryActive<Entrevista>('Entrevista');
    query.equalTo('grupo' as any, grupoPointer as any);
    query.include('equipo');
    query.include('equipo.miembros');
    query.include('profesores');
    query.include('competencias');
    query.descending('fecha');
    const entrevistas = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      entrevistas: entrevistas.map((e) => e.toSafeJSON()),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener entrevistas' });
  }
}

export async function createEntrevista(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { equipoId, profesores, competencias, fecha } = req.body;

  if (!equipoId || !fecha || !Array.isArray(competencias) || competencias.length === 0) {
    res.status(400).json({ status: 'error', message: 'Equipo, fecha y al menos una competencia son requeridos' });
    return;
  }
  if (!Array.isArray(profesores) || profesores.length === 0) {
    res.status(400).json({ status: 'error', message: 'Al menos un profesor es requerido' });
    return;
  }

  try {
    // Weekly validation
    const conflicting = await checkWeeklyConflict(grupoId, fecha, competencias);
    if (conflicting.length > 0) {
      res.status(400).json({
        status: 'error',
        message: `Las siguientes competencias ya fueron evaluadas esta semana: ${conflicting.join(', ')}`,
      });
      return;
    }

    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
    const equipoPointer = Parse.Object.extend('Equipo').createWithoutData(equipoId) as Equipo;
    const profesorPointers = profesores.map(
      (id: string) => Parse.Object.extend('AppUser').createWithoutData(id) as AppUser,
    );
    const competenciaPointers = competencias.map(
      (id: string) => Parse.Object.extend('Competencia').createWithoutData(id) as Competencia,
    );

    const entrevista = new Entrevista().initDefaults();
    entrevista.setGrupo(grupoPointer);
    entrevista.setEquipo(equipoPointer);
    entrevista.setProfesores(profesorPointers);
    entrevista.setCompetencias(competenciaPointers);
    entrevista.setFecha(fecha);

    await entrevista.save(null, { useMasterKey: true });

    // Re-fetch with includes
    const saved = await refetchEntrevista(entrevista.id!);

    res.status(201).json({ status: 'ok', entrevista: saved.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al crear entrevista' });
  }
}

export async function updateEntrevista(req: Request, res: Response): Promise<void> {
  const { entrevistaId } = req.params;
  const { grupoId } = req.params;
  const { equipoId, profesores, competencias, fecha } = req.body;

  try {
    const query = BaseModel.queryActive<Entrevista>('Entrevista');
    const entrevista = await query.get(entrevistaId, { useMasterKey: true });

    // Weekly validation if competencias or fecha changed
    if (fecha && Array.isArray(competencias) && competencias.length > 0) {
      const conflicting = await checkWeeklyConflict(grupoId, fecha, competencias, entrevistaId);
      if (conflicting.length > 0) {
        res.status(400).json({
          status: 'error',
          message: `Las siguientes competencias ya fueron evaluadas esta semana: ${conflicting.join(', ')}`,
        });
        return;
      }
    }

    if (equipoId) {
      entrevista.setEquipo(Parse.Object.extend('Equipo').createWithoutData(equipoId) as Equipo);
    }
    if (Array.isArray(profesores)) {
      entrevista.setProfesores(
        profesores.map((id: string) => Parse.Object.extend('AppUser').createWithoutData(id) as AppUser),
      );
    }
    if (Array.isArray(competencias)) {
      entrevista.setCompetencias(
        competencias.map((id: string) => Parse.Object.extend('Competencia').createWithoutData(id) as Competencia),
      );
    }
    if (fecha) {
      entrevista.setFecha(fecha);
    }

    await entrevista.save(null, { useMasterKey: true });

    const saved = await refetchEntrevista(entrevista.id!);
    res.json({ status: 'ok', entrevista: saved.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Entrevista no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar entrevista' });
  }
}

export async function deleteEntrevista(req: Request, res: Response): Promise<void> {
  const { entrevistaId } = req.params;

  try {
    const query = new Parse.Query<Entrevista>('Entrevista');
    query.equalTo('exists' as any, true as any);
    const entrevista = await query.get(entrevistaId, { useMasterKey: true });

    entrevista.softDelete();
    await entrevista.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Entrevista eliminada' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Entrevista no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar entrevista' });
  }
}

async function checkWeeklyConflict(
  grupoId: string,
  fecha: string,
  competenciaIds: string[],
  excludeId?: string,
): Promise<string[]> {
  const { monday, sunday } = getWeekBounds(fecha);

  const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
  const query = BaseModel.queryActive<Entrevista>('Entrevista');
  query.equalTo('grupo' as any, grupoPointer as any);
  query.greaterThanOrEqualTo('fecha' as any, monday as any);
  query.lessThanOrEqualTo('fecha' as any, sunday as any);
  query.include('competencias');

  if (excludeId) {
    query.notEqualTo('objectId' as any, excludeId as any);
  }

  const existing = await query.find({ useMasterKey: true });

  const usedCompetenciaIds = new Set<string>();
  for (const e of existing) {
    for (const c of e.getCompetencias()) {
      usedCompetenciaIds.add(c.id);
    }
  }

  const conflicting: string[] = [];
  for (const id of competenciaIds) {
    if (usedCompetenciaIds.has(id)) {
      conflicting.push(id);
    }
  }

  // Resolve names for the error message
  if (conflicting.length > 0) {
    const names: string[] = [];
    for (const e of existing) {
      for (const c of e.getCompetencias()) {
        if (conflicting.includes(c.id)) {
          const name = c.get('competencia') ?? c.id;
          if (!names.includes(name)) names.push(name);
        }
      }
    }
    return names;
  }

  return [];
}

async function refetchEntrevista(id: string): Promise<Entrevista> {
  const query = new Parse.Query<Entrevista>('Entrevista');
  query.include('equipo');
  query.include('equipo.miembros');
  query.include('profesores');
  query.include('competencias');
  return query.get(id, { useMasterKey: true });
}
