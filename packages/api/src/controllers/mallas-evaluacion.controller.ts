import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { ActividadEvaluacionGrupo } from '../models/ActividadEvaluacionGrupo.js';
import { ActividadEvaluacionAlumno } from '../models/ActividadEvaluacionAlumno.js';
import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';
import { getAlumnosDeGrupo } from '../services/grupo-alumno.service.js';
import { registrarLog } from '../models/AuditLog.js';

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
  const { grupoId, alumnoId, actividadId } = req.params;

  try {
    const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId);

    const query = new Parse.Query<ActividadEvaluacionAlumno>('ActividadEvaluacionAlumno');
    query.equalTo('exists' as any, true as any);
    query.equalTo('objectId' as any, actividadId as any);
    query.equalTo('alumno' as any, alumnoPointer as any);
    query.include('actividadGrupo' as any);
    const registro = await query.first({ useMasterKey: true });

    if (!registro) {
      res.status(404).json({ status: 'error', message: 'Actividad no encontrada para este alumno' });
      return;
    }

    // Capture before values for audit log
    const antes = {
      observaciones: registro.getObservaciones(),
      aprendizajePlaneado: registro.getAprendizajePlaneado(),
      aprendizajeGanado: registro.getAprendizajeGanado(),
      semanaCompletada: registro.getSemanaCompletada(),
    };

    const { observaciones, aprendizajePlaneado, semanaCompletada, calificacion } = req.body;
    const acciones: string[] = [];
    const cambios: Record<string, { antes: any; despues: any }> = {};

    if (typeof observaciones === 'string') {
      registro.setObservaciones(observaciones);
      acciones.push('Actualizó observaciones');
      cambios.observaciones = { antes: antes.observaciones, despues: observaciones };
    }
    if (typeof aprendizajePlaneado === 'number') {
      registro.setAprendizajePlaneado(aprendizajePlaneado);
      acciones.push(`Cambió aprendizaje planeado de ${antes.aprendizajePlaneado} a ${aprendizajePlaneado}`);
      cambios.aprendizajePlaneado = { antes: antes.aprendizajePlaneado, despues: aprendizajePlaneado };
    }
    if (typeof semanaCompletada === 'number') {
      registro.setSemanaCompletada(semanaCompletada);
      // Si el admin ya asignó una calificación parcial (ganado > 0), no sobrescribir
      const tipo = registro.getActividadGrupo()?.get('tipo');
      const currentGanado = registro.getAprendizajeGanado();
      if (tipo !== 'proyecto') {
        if (semanaCompletada > 0 && currentGanado === 0) {
          registro.setAprendizajeGanado(registro.getAprendizajePlaneado());
        } else if (semanaCompletada === 0) {
          registro.setAprendizajeGanado(0);
        }
      }
      acciones.push(`Cambió semana completada de ${antes.semanaCompletada} a ${semanaCompletada}`);
      cambios.semanaCompletada = { antes: antes.semanaCompletada, despues: semanaCompletada };
    }
    if (typeof calificacion === 'number') {
      const clamped = Math.max(0, Math.min(100, calificacion));
      const planeado = registro.getAprendizajePlaneado();
      const nuevoGanado = Math.round(planeado * (clamped / 100) * 100) / 100;
      registro.setAprendizajeGanado(nuevoGanado);
      acciones.push(`Asignó calificación ${clamped}% (ganado: ${nuevoGanado})`);
      cambios.calificacion = { antes: antes.aprendizajeGanado, despues: nuevoGanado };
    }

    await registro.save(null, { useMasterKey: true });

    // Audit log (fire-and-forget)
    const user = req.appUser;
    if (user && acciones.length > 0) {
      registrarLog({
        entidad: 'ActividadEvaluacionAlumno',
        entidadId: actividadId,
        grupoId: grupoId ?? '',
        alumnoId,
        usuarioId: user.id,
        usuarioNombre: user.get('name') ?? '',
        rol: 'admin',
        accion: acciones.join('; '),
        cambios,
      }).catch(console.error);
    }

    res.json({ status: 'ok', actividad: registro.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al actualizar actividad del alumno' });
  }
}

export async function syncMallasEvaluacion(_req: Request, res: Response): Promise<void> {
  res.json({ status: 'ok', message: 'Sync no necesario — los campos se leen del pointer actividadGrupo' });
}
