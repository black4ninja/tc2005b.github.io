import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { ActividadEvaluacionGrupo } from '../models/ActividadEvaluacionGrupo.js';
import { ActividadEvaluacionAlumno } from '../models/ActividadEvaluacionAlumno.js';
import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';
import { getAlumnosDeGrupo } from '../services/grupo-alumno.service.js';

export async function crearMallasEvaluacion(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    // Fetch actividades del grupo
    const actQuery = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
    actQuery.equalTo('exists' as any, true as any);
    actQuery.equalTo('grupo' as any, grupoPointer as any);
    actQuery.ascending('orden');
    actQuery.limit(1000);
    const actividades = await actQuery.find({ useMasterKey: true });

    if (actividades.length === 0) {
      res.status(404).json({ status: 'error', message: 'No hay actividades de evaluación en el grupo' });
      return;
    }

    // Fetch alumnos activos del grupo vía GrupoAlumno
    const alumnos = await getAlumnosDeGrupo(grupoId);

    if (alumnos.length === 0) {
      res.status(404).json({ status: 'error', message: 'No hay alumnos activos en el grupo' });
      return;
    }

    // For each alumno, check if they already have malla
    let created = 0;
    let skipped = 0;
    const toSave: ActividadEvaluacionAlumno[] = [];

    for (const item of alumnos) {
      const alumno = item.alumno;
      const countQuery = new Parse.Query<ActividadEvaluacionAlumno>('ActividadEvaluacionAlumno');
      countQuery.equalTo('exists' as any, true as any);
      countQuery.equalTo('alumno' as any, alumno as any);
      countQuery.equalTo('grupo' as any, grupoPointer as any);
      const count = await countQuery.count({ useMasterKey: true });

      if (count > 0) {
        skipped++;
        continue;
      }

      for (const act of actividades) {
        const registro = new ActividadEvaluacionAlumno().initDefaults();
        registro.setGrupo(grupoPointer);
        registro.setAlumno(alumno);
        registro.setActividadGrupo(act);
        registro.setAprendizajePlaneado(act.getAprendizajePlaneado());
        toSave.push(registro);
      }
      created++;
    }

    if (toSave.length > 0) {
      await Parse.Object.saveAll(toSave, { useMasterKey: true });
    }

    res.status(201).json({ status: 'ok', created, skipped });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear mallas de evaluación' });
  }
}

export async function getMallasStatus(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    // Fetch alumnos activos del grupo vía GrupoAlumno
    const alumnos = await getAlumnosDeGrupo(grupoId);

    let alumnosConMalla = 0;
    let alumnosSinMalla = 0;

    for (const item of alumnos) {
      const alumno = item.alumno;
      const countQuery = new Parse.Query<ActividadEvaluacionAlumno>('ActividadEvaluacionAlumno');
      countQuery.equalTo('exists' as any, true as any);
      countQuery.equalTo('alumno' as any, alumno as any);
      countQuery.equalTo('grupo' as any, grupoPointer as any);
      const count = await countQuery.count({ useMasterKey: true });

      if (count > 0) {
        alumnosConMalla++;
      } else {
        alumnosSinMalla++;
      }
    }

    res.json({
      status: 'ok',
      totalAlumnos: alumnos.length,
      alumnosConMalla,
      alumnosSinMalla,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener estado de mallas' });
  }
}

export async function getMallaAlumno(req: Request, res: Response): Promise<void> {
  const { grupoId, alumnoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
    const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId) as AppUser;

    // Fetch alumno data
    const alumnoQuery = new Parse.Query<AppUser>('AppUser');
    const alumno = await alumnoQuery.get(alumnoId, { useMasterKey: true });

    // Fetch actividades del alumno en este grupo
    const actQuery = new Parse.Query<ActividadEvaluacionAlumno>('ActividadEvaluacionAlumno');
    actQuery.equalTo('exists' as any, true as any);
    actQuery.equalTo('grupo' as any, grupoPointer as any);
    actQuery.equalTo('alumno' as any, alumnoPointer as any);
    actQuery.include('actividadGrupo' as any);
    actQuery.ascending('orden');
    actQuery.limit(1000);
    const actividades = await actQuery.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      actividades: actividades.map((a) => a.toSafeJSON()),
      alumno: {
        id: alumno.id,
        name: alumno.get('name') ?? '',
        email: alumno.get('email') ?? '',
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener malla del alumno' });
  }
}

export async function updateActividadAlumno(req: Request, res: Response): Promise<void> {
  const { actividadId } = req.params;

  try {
    const query = new Parse.Query<ActividadEvaluacionAlumno>('ActividadEvaluacionAlumno');
    query.equalTo('exists' as any, true as any);
    query.include('actividadGrupo' as any);
    const registro = await query.get(actividadId, { useMasterKey: true });

    const { observaciones, aprendizajePlaneado, semanaCompletada } = req.body;
    if (typeof observaciones === 'string') {
      registro.setObservaciones(observaciones);
    }
    if (typeof aprendizajePlaneado === 'number') {
      registro.setAprendizajePlaneado(aprendizajePlaneado);
    }
    if (typeof semanaCompletada === 'number') {
      registro.setSemanaCompletada(semanaCompletada);
      const tipo = registro.getActividadGrupo()?.get('tipo');
      if (tipo !== 'proyecto') {
        registro.setAprendizajeGanado(
          semanaCompletada > 0 ? registro.getAprendizajePlaneado() : 0
        );
      }
    }

    await registro.save(null, { useMasterKey: true });

    res.json({ status: 'ok', actividad: registro.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al actualizar actividad del alumno' });
  }
}

export async function syncMallasEvaluacion(_req: Request, res: Response): Promise<void> {
  res.json({ status: 'ok', message: 'Sync no necesario — los campos se leen del pointer actividadGrupo' });
}
