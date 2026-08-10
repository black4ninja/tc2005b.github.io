import type { Request, Response } from 'express';
import Parse from 'parse/node';
import bcrypt from 'bcryptjs';
import { ActividadEvaluacionAlumno } from '../models/ActividadEvaluacionAlumno.js';
import { CompetenciaAlumno } from '../models/CompetenciaAlumno.js';
import { IndicacionMalla } from '../models/IndicacionMalla.js';
import { PlanEvaluacion } from '../models/PlanEvaluacion.js';
import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';
import { GrupoAlumno } from '../models/GrupoAlumno.js';
import { validarPerfil } from '../models/campos-perfil.js';
import { BaseModel } from '../models/BaseModel.js';
import { registrarLog } from '../models/AuditLog.js';

/**
 * Campos del perfil que este grupo NO pide. El pointer que devuelve
 * `validateAlumnoInGrupo` viene sin datos, así que hay que traerlo.
 */
async function camposApagadosDelGrupo(grupoId: string): Promise<string[]> {
  const q = new Parse.Query<Grupo>('Grupo');
  const grupo = await q.get(grupoId, { useMasterKey: true });
  return grupo.getCamposPerfilDeshabilitados();
}

/* ------------------------------------------------------------------ */
/*  Helper: validate alumno belongs to grupo                           */
/* ------------------------------------------------------------------ */

async function validateAlumnoInGrupo(
  req: Request,
  res: Response,
): Promise<Grupo | null> {
  const { grupoId } = req.params;
  const alumnoId = (req as any).appUser?.id;

  if (!alumnoId || !grupoId) {
    res.status(400).json({ status: 'error', message: 'Datos incompletos' });
    return null;
  }

  const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId) as AppUser;
  const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

  const query = new Parse.Query<GrupoAlumno>('GrupoAlumno');
  query.equalTo('exists' as any, true as any);
  query.equalTo('active' as any, true as any);
  query.equalTo('alumno' as any, alumnoPointer as any);
  query.equalTo('grupo' as any, grupoPointer as any);
  const link = await query.first({ useMasterKey: true });

  if (!link) {
    res.status(403).json({ status: 'error', message: 'No perteneces a este grupo' });
    return null;
  }

  return grupoPointer;
}

/* ------------------------------------------------------------------ */
/*  GET /alumno/grupos/:grupoId/malla                                  */
/* ------------------------------------------------------------------ */

export async function getMyMalla(req: Request, res: Response): Promise<void> {
  try {
    const grupoPointer = await validateAlumnoInGrupo(req, res);
    if (!grupoPointer) return;

    const alumnoId = (req as any).appUser.id;
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
    res.status(500).json({ status: 'error', message: 'Error al obtener malla' });
  }
}

/* ------------------------------------------------------------------ */
/*  GET /alumno/grupos/:grupoId/plan-evaluacion                        */
/* ------------------------------------------------------------------ */

export async function getMyPlanEvaluacion(req: Request, res: Response): Promise<void> {
  try {
    const grupoPointer = await validateAlumnoInGrupo(req, res);
    if (!grupoPointer) return;

    const { grupoId } = req.params;

    const query = new Parse.Query<PlanEvaluacion>('PlanEvaluacion');
    query.equalTo('exists' as any, true as any);
    query.equalTo('grupo', Grupo.createWithoutData(grupoId) as any);
    const plan = await query.first({ useMasterKey: true });

    if (!plan) {
      res.json({ status: 'ok', plan: null });
      return;
    }

    res.json({ status: 'ok', plan: plan.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener plan de evaluación' });
  }
}

/* ------------------------------------------------------------------ */
/*  PUT /alumno/grupos/:grupoId/malla/:actividadId                     */
/* ------------------------------------------------------------------ */

export async function updateMyActividad(req: Request, res: Response): Promise<void> {
  try {
    const grupoPointer = await validateAlumnoInGrupo(req, res);
    if (!grupoPointer) return;

    const { actividadId } = req.params;
    const alumnoId = (req as any).appUser.id;
    const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId) as AppUser;

    const query = new Parse.Query<ActividadEvaluacionAlumno>('ActividadEvaluacionAlumno');
    query.equalTo('exists' as any, true as any);
    query.equalTo('alumno' as any, alumnoPointer as any);
    query.equalTo('objectId' as any, actividadId as any);
    query.include('actividadGrupo' as any);
    const registro = await query.first({ useMasterKey: true });

    if (!registro) {
      res.status(403).json({ status: 'error', message: 'No tienes acceso a este recurso' });
      return;
    }

    // Bloquear si la actividad está congelada por el profesor
    if (registro.getActividadGrupo()?.get('congelada') === true) {
      res.status(403).json({
        status: 'error',
        message: 'Esta actividad está congelada por el profesor y no puede modificarse.',
      });
      return;
    }

    // Solo permite actualizar semanaCompletada
    const { semanaCompletada } = req.body;
    const antesSemana = registro.getSemanaCompletada();

    if (typeof semanaCompletada === 'number') {
      registro.setSemanaCompletada(semanaCompletada);

      // Auto-asignar aprendizaje ganado (excepto proyectos)
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
    }

    await registro.save(null, { useMasterKey: true });

    // Audit log (fire-and-forget)
    const user = req.appUser;
    if (user && typeof semanaCompletada === 'number') {
      const { grupoId } = req.params;
      registrarLog({
        entidad: 'ActividadEvaluacionAlumno',
        entidadId: actividadId,
        grupoId: grupoId ?? '',
        alumnoId,
        usuarioId: user.id,
        usuarioNombre: user.get('name') ?? '',
        rol: 'alumno',
        accion: `Marcó semana completada: ${semanaCompletada} (antes: ${antesSemana})`,
        cambios: { semanaCompletada: { antes: antesSemana, despues: semanaCompletada } },
      }).catch(console.error);
    }

    res.json({ status: 'ok', actividad: registro.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al actualizar actividad' });
  }
}

/* ------------------------------------------------------------------ */
/*  GET /alumno/grupos/:grupoId/competencias                           */
/* ------------------------------------------------------------------ */

export async function getMyCompetencias(req: Request, res: Response): Promise<void> {
  try {
    const grupoPointer = await validateAlumnoInGrupo(req, res);
    if (!grupoPointer) return;

    const alumnoId = (req as any).appUser.id;
    const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId) as AppUser;

    // Fetch alumno data
    const alumnoQuery = new Parse.Query<AppUser>('AppUser');
    const alumno = await alumnoQuery.get(alumnoId, { useMasterKey: true });

    const query = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
    query.equalTo('exists' as any, true as any);
    query.equalTo('grupo' as any, grupoPointer as any);
    query.equalTo('alumno' as any, alumnoPointer as any);
    query.include('competencia' as any);
    query.ascending('orden');
    query.limit(1000);
    const competencias = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      competencias: competencias.map((c) => c.toSafeJSON()),
      alumno: {
        id: alumno.id,
        name: alumno.get('name') ?? '',
        email: alumno.get('email') ?? '',
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener competencias' });
  }
}

/* ------------------------------------------------------------------ */
/*  PUT /alumno/grupos/:grupoId/competencias/:compAlumnoId             */
/* ------------------------------------------------------------------ */

export async function updateMyCompetenciaEvidencias(req: Request, res: Response): Promise<void> {
  try {
    const grupoPointer = await validateAlumnoInGrupo(req, res);
    if (!grupoPointer) return;

    const { compAlumnoId } = req.params;
    const alumnoId = (req as any).appUser.id;
    const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId) as AppUser;

    const query = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
    query.equalTo('exists' as any, true as any);
    query.equalTo('alumno' as any, alumnoPointer as any);
    query.equalTo('objectId' as any, compAlumnoId as any);
    const registro = await query.first({ useMasterKey: true });

    if (!registro) {
      res.status(403).json({ status: 'error', message: 'No tienes acceso a este recurso' });
      return;
    }

    // Solo permite actualizar evidencias
    const { evidencias } = req.body;
    if (Array.isArray(evidencias)) {
      // Validate all items are strings
      const valid = evidencias.every((e: unknown) => typeof e === 'string');
      if (!valid) {
        res.status(400).json({ status: 'error', message: 'Todas las evidencias deben ser URLs válidas' });
        return;
      }
      registro.setEvidencias(evidencias);
    }

    await registro.save(null, { useMasterKey: true });

    // Re-fetch with include to return full data
    const fetchQuery = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
    fetchQuery.include('competencia' as any);
    const updated = await fetchQuery.get(registro.id, { useMasterKey: true });

    res.json({ status: 'ok', competencia: updated.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al actualizar evidencias' });
  }
}

/* ------------------------------------------------------------------ */
/*  GET /alumno/grupos/:grupoId/perfil                                 */
/* ------------------------------------------------------------------ */

export async function getMyPerfil(req: Request, res: Response): Promise<void> {
  try {
    const grupoPointer = await validateAlumnoInGrupo(req, res);
    if (!grupoPointer) return;

    const alumnoId = (req as any).appUser.id;
    const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId) as AppUser;

    const query = new Parse.Query<GrupoAlumno>('GrupoAlumno');
    query.equalTo('exists' as any, true as any);
    query.equalTo('active' as any, true as any);
    query.equalTo('alumno' as any, alumnoPointer as any);
    query.equalTo('grupo' as any, grupoPointer as any);
    const link = await query.first({ useMasterKey: true });

    if (!link) {
      res.status(404).json({ status: 'error', message: 'GrupoAlumno no encontrado' });
      return;
    }

    res.json({
      status: 'ok',
      perfil: {
        experiencia: link.getExperiencia(),
        expectativas: link.getExpectativas(),
        compromiso: link.getCompromiso(),
        repositorioIndividual: link.getRepositorioIndividual(),
        situacionesEspeciales: link.getSituacionesEspeciales(),
        perfilCompleto: link.getPerfilCompleto(),
        // Para que el formulario esconda lo que este grupo no pide (y no lo exija).
        camposDeshabilitados: await camposApagadosDelGrupo(grupoPointer.id),
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener perfil' });
  }
}

/* ------------------------------------------------------------------ */
/*  PUT /alumno/grupos/:grupoId/perfil                                 */
/* ------------------------------------------------------------------ */

export async function updateMyPerfil(req: Request, res: Response): Promise<void> {
  try {
    const grupoPointer = await validateAlumnoInGrupo(req, res);
    if (!grupoPointer) return;

    const alumnoId = (req as any).appUser.id;
    const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId) as AppUser;

    const query = new Parse.Query<GrupoAlumno>('GrupoAlumno');
    query.equalTo('exists' as any, true as any);
    query.equalTo('active' as any, true as any);
    query.equalTo('alumno' as any, alumnoPointer as any);
    query.equalTo('grupo' as any, grupoPointer as any);
    const link = await query.first({ useMasterKey: true });

    if (!link) {
      res.status(404).json({ status: 'error', message: 'GrupoAlumno no encontrado' });
      return;
    }

    const { experiencia, expectativas, compromiso, repositorioIndividual, situacionesEspeciales } = req.body;

    // La validación vive en `campos-perfil.ts` y se salta los campos que este
    // grupo tiene apagados: si no se piden, no pueden bloquear el perfil.
    const apagados = await camposApagadosDelGrupo(grupoPointer.id);
    const errors = validarPerfil(
      { experiencia, expectativas, compromiso, repositorioIndividual, situacionesEspeciales },
      apagados,
    );

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ status: 'error', message: 'Errores de validación', errors });
      return;
    }

    // Solo se guardan los campos que el grupo pide. Un campo apagado conserva lo
    // que ya tuviera (si el grupo vuelve a pedirlo, no se ha perdido nada).
    if (!apagados.includes('experiencia')) link.setExperiencia(experiencia.trim());
    if (!apagados.includes('expectativas')) link.setExpectativas(expectativas.trim());
    if (!apagados.includes('compromiso')) link.setCompromiso(compromiso.trim());
    if (!apagados.includes('repositorioIndividual')) link.setRepositorioIndividual(repositorioIndividual.trim());
    if (!apagados.includes('situacionesEspeciales')) link.setSituacionesEspeciales(situacionesEspeciales.trim());
    link.setPerfilCompleto(true);

    await link.save(null, { useMasterKey: true });

    res.json({
      status: 'ok',
      perfil: {
        experiencia: link.getExperiencia(),
        expectativas: link.getExpectativas(),
        compromiso: link.getCompromiso(),
        repositorioIndividual: link.getRepositorioIndividual(),
        situacionesEspeciales: link.getSituacionesEspeciales(),
        perfilCompleto: link.getPerfilCompleto(),
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al actualizar perfil' });
  }
}

/* ------------------------------------------------------------------ */
/*  PUT /alumno/grupos/:grupoId/cambiar-password                       */
/* ------------------------------------------------------------------ */

export async function changeMyPassword(req: Request, res: Response): Promise<void> {
  try {
    const grupoPointer = await validateAlumnoInGrupo(req, res);
    if (!grupoPointer) return;

    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string') {
      res.status(400).json({ status: 'error', message: 'La contraseña es requerida' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ status: 'error', message: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ status: 'error', message: 'Las contraseñas no coinciden' });
      return;
    }

    const alumnoId = (req as any).appUser.id;
    const alumnoQuery = new Parse.Query<AppUser>('AppUser');
    const alumno = await alumnoQuery.get(alumnoId, { useMasterKey: true });

    const hash = await bcrypt.hash(newPassword, 10);
    alumno.set('passwordHash', hash);
    // La eligió la persona: se levanta la marca de "contraseña de fábrica" para
    // no volver a exigirle el cambio al entrar a otro grupo.
    alumno.setPasswordAsignada(false);
    await alumno.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al cambiar contraseña' });
  }
}

/* ------------------------------------------------------------------ */
/*  GET /alumno/grupos/:grupoId/indicaciones-malla                     */
/* ------------------------------------------------------------------ */

export async function getIndicacionesMalla(_req: Request, res: Response): Promise<void> {
  try {
    const query = new Parse.Query<IndicacionMalla>('IndicacionMalla');
    query.equalTo('exists' as any, true as any);
    query.descending('createdAt');
    const indicaciones = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      indicaciones: indicaciones.map((i) => i.toSafeJSON()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener indicaciones' });
  }
}
