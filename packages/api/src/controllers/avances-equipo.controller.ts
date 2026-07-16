import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Equipo } from '../models/Equipo.js';
import { ActividadEvaluacionGrupo } from '../models/ActividadEvaluacionGrupo.js';
import { ActividadEvaluacionAlumno } from '../models/ActividadEvaluacionAlumno.js';
import { Grupo } from '../models/Grupo.js';
import { scopeGrupo } from '../services/grupo-admin.service.js';
import { AppUser } from '../models/AppUser.js';
import { registrarLog } from '../models/AuditLog.js';

export async function getAvancesEquipo(req: Request, res: Response): Promise<void> {
  const { grupoId, equipoId } = req.params;

  try {
    // Fetch equipo with miembros — DEBE ser de este grupo (candado profesor): si
    // no, un id de equipo ajeno filtraría su roster (nombres/emails) por este GET.
    const equipoQuery = new Parse.Query<Equipo>('Equipo');
    equipoQuery.equalTo('exists' as any, true as any);
    scopeGrupo(equipoQuery, grupoId);
    equipoQuery.include('miembros' as any);
    const equipo = await equipoQuery.get(equipoId, { useMasterKey: true });

    const miembros = equipo.getMiembros();
    if (!miembros.length) {
      res.json({ status: 'ok', equipo: equipo.toSafeJSON(), actividades: [], evaluaciones: {} });
      return;
    }

    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    // Fetch actividades tipo "proyecto" del grupo
    const actQuery = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
    actQuery.equalTo('exists' as any, true as any);
    actQuery.equalTo('grupo' as any, grupoPointer as any);
    actQuery.equalTo('tipo' as any, 'proyecto' as any);
    actQuery.ascending('orden');
    actQuery.limit(1000);
    const actividades = await actQuery.find({ useMasterKey: true });

    if (!actividades.length) {
      res.json({ status: 'ok', equipo: equipo.toSafeJSON(), actividades: [], evaluaciones: {} });
      return;
    }

    // Fetch evaluaciones de los miembros para estas actividades
    const miembroIds = miembros.map((m) => m.id);
    const miembroPointers = miembroIds.map(
      (id) => Parse.Object.extend('AppUser').createWithoutData(id) as AppUser,
    );

    const evalQuery = new Parse.Query<ActividadEvaluacionAlumno>('ActividadEvaluacionAlumno');
    evalQuery.equalTo('exists' as any, true as any);
    evalQuery.equalTo('grupo' as any, grupoPointer as any);
    evalQuery.containedIn('alumno' as any, miembroPointers as any);
    evalQuery.containedIn('actividadGrupo' as any, actividades as any);
    evalQuery.include('actividadGrupo' as any);
    evalQuery.include('alumno' as any);
    evalQuery.limit(10000);
    const evaluaciones = await evalQuery.find({ useMasterKey: true });

    // Agrupar por actividadGrupoId
    const evaluacionesMap: Record<string, Array<Record<string, unknown>>> = {};
    for (const act of actividades) {
      evaluacionesMap[act.id] = [];
    }

    for (const ev of evaluaciones) {
      const actGrupo = ev.getActividadGrupo();
      const alumno = ev.getAlumno();
      if (!actGrupo || !alumno) continue;

      const actGrupoId = actGrupo.id;
      if (!evaluacionesMap[actGrupoId]) {
        evaluacionesMap[actGrupoId] = [];
      }

      evaluacionesMap[actGrupoId].push({
        alumnoId: alumno.id,
        alumnoName: alumno.get('name') ?? '',
        actividadAlumnoId: ev.id,
        aprendizajePlaneado: ev.getAprendizajePlaneado(),
        aprendizajeGanado: ev.getAprendizajeGanado(),
        observaciones: ev.getObservaciones(),
      });
    }

    res.json({
      status: 'ok',
      equipo: equipo.toSafeJSON(),
      actividades: actividades.map((a) => a.toSafeJSON()),
      evaluaciones: evaluacionesMap,
    });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Equipo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al obtener avances del equipo' });
  }
}

export async function calificarAvance(req: Request, res: Response): Promise<void> {
  const { grupoId, actividadAlumnoId } = req.params;

  try {
    const query = new Parse.Query<ActividadEvaluacionAlumno>('ActividadEvaluacionAlumno');
    query.equalTo('exists' as any, true as any);
    scopeGrupo(query, grupoId); // el registro debe ser DE este grupo (candado profesor)
    query.include('actividadGrupo' as any);
    query.include('alumno' as any);
    const registro = await query.get(actividadAlumnoId, { useMasterKey: true });

    const antesGanado = registro.getAprendizajeGanado();
    const antesObs = registro.getObservaciones();
    const { calificacion, observaciones } = req.body;
    const acciones: string[] = [];
    const cambios: Record<string, { antes: any; despues: any }> = {};

    if (typeof calificacion === 'number') {
      const clamped = Math.max(0, Math.min(100, calificacion));
      const aprendizajePlaneado = registro.getAprendizajePlaneado();
      const aprendizajeGanado = aprendizajePlaneado * (clamped / 100);
      const nuevoGanado = Math.round(aprendizajeGanado * 100) / 100;
      registro.setAprendizajeGanado(nuevoGanado);
      acciones.push(`Asignó calificación ${clamped}% (ganado: ${nuevoGanado})`);
      cambios.calificacion = { antes: antesGanado, despues: nuevoGanado };
    }

    if (typeof observaciones === 'string') {
      registro.setObservaciones(observaciones);
      acciones.push('Actualizó observaciones');
      cambios.observaciones = { antes: antesObs, despues: observaciones };
    }

    await registro.save(null, { useMasterKey: true });

    // Audit log (fire-and-forget)
    const user = req.appUser;
    const alumnoId = registro.get('alumno')?.id;
    if (user && acciones.length > 0 && alumnoId) {
      registrarLog({
        entidad: 'ActividadEvaluacionAlumno',
        entidadId: actividadAlumnoId,
        grupoId: grupoId ?? '',
        alumnoId,
        usuarioId: user.id,
        usuarioNombre: user.get('name') ?? '',
        rol: 'admin',
        accion: acciones.join('; '),
        cambios,
      }).catch(console.error);
    }

    res.json({
      status: 'ok',
      evaluacion: {
        actividadAlumnoId: registro.id,
        aprendizajePlaneado: registro.getAprendizajePlaneado(),
        aprendizajeGanado: registro.getAprendizajeGanado(),
        observaciones: registro.getObservaciones(),
      },
    });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Evaluación no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al calificar avance' });
  }
}
