import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Grupo } from '../models/Grupo.js';
import { AppUser } from '../models/AppUser.js';
import { EscenarioPregunta } from '../models/EscenarioPregunta.js';
import { EscenarioAsignacion } from '../models/EscenarioAsignacion.js';
import { moduloGrupoHabilitado } from '../models/modulos-grupo.js';
import { getAlumnosDeGrupo } from '../services/grupo-alumno.service.js';
import { normalizarDuracion } from '../services/escenarios.service.js';

/**
 * Asignación de escenarios a los alumnos de UN grupo.
 *
 * Va aparte del CRUD del banco porque cambia el actor: el banco lo mantiene el
 * admin, y esto lo usa el PROFESOR en su grupo (`requireGrupoAccess`). Por eso
 * el listado sirve también el banco de preguntas: el profesor lo necesita para
 * asignar y no tiene permiso sobre `/admin/escenarios`.
 *
 * Nada de esto tiene read-path de alumno. No es que esté oculto por permisos:
 * es que no existe el endpoint.
 */

/** Tope de una asignación en bloque. Un grupo grande ronda los 40 alumnos. */
const MAX_BULK = 500;

async function cargarGrupo(grupoId: string): Promise<Grupo | null> {
  try {
    const q = new Parse.Query<Grupo>('Grupo');
    q.equalTo('exists' as any, true as any);
    return await q.get(grupoId, { useMasterKey: true });
  } catch {
    return null;
  }
}

/**
 * Grupo existente Y con el módulo encendido. Con el módulo apagado responde 404
 * y no 403: para ese grupo la sección no existe, igual que hacen los módulos de
 * contenido opt-in.
 */
async function grupoConEscenarios(
  grupoId: string,
  res: Response,
): Promise<Grupo | null> {
  const grupo = await cargarGrupo(grupoId);
  if (!grupo) {
    res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
    return null;
  }
  if (!moduloGrupoHabilitado(grupo.getModulosGrupo(), 'escenarios')) {
    res.status(404).json({
      status: 'error',
      message: 'El módulo Escenarios no está habilitado en este grupo',
    });
    return null;
  }
  return grupo;
}

/** Todas las asignaciones vivas del grupo, de la más reciente a la más antigua. */
async function asignacionesDelGrupo(grupoId: string): Promise<EscenarioAsignacion[]> {
  const q = new Parse.Query<EscenarioAsignacion>('EscenarioAsignacion');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  q.equalTo('exists' as any, true as any);
  q.include('pregunta' as any);
  q.descending('createdAt');
  q.limit(10000);
  return q.find({ useMasterKey: true });
}

/**
 * GET /admin/grupos/:grupoId/escenarios
 *
 * TODA la pantalla en una petición: el roster con su asignación vigente, cuántas
 * lleva cada alumno, y el banco de preguntas. Son tres cosas que se pintan
 * juntas o no se pinta ninguna, y el selector de preguntas filtra en cliente
 * mientras el profesor teclea.
 */
export async function getEscenariosGrupo(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  try {
    const grupo = await cargarGrupo(grupoId);
    if (!grupo) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    // Aquí SÍ se responde 200 con `habilitado: false`: esta es la pantalla que
    // tiene que explicar por qué está vacía y dónde se enciende el módulo.
    if (!moduloGrupoHabilitado(grupo.getModulosGrupo(), 'escenarios')) {
      res.json({ status: 'ok', habilitado: false, alumnos: [], preguntas: [] });
      return;
    }

    const [alumnos, asignaciones, preguntas] = await Promise.all([
      getAlumnosDeGrupo(grupoId),
      asignacionesDelGrupo(grupoId),
      (() => {
        const q = new Parse.Query<EscenarioPregunta>('EscenarioPregunta');
        q.equalTo('exists' as any, true as any);
        q.notEqualTo('archivada' as any, true as any);
        q.ascending('titulo');
        q.limit(1000);
        return q.find({ useMasterKey: true });
      })(),
    ]);

    // Vienen ordenadas de más reciente a más antigua: la primera de cada alumno
    // es la vigente y el resto es su historial.
    const vigentePorAlumno = new Map<string, EscenarioAsignacion>();
    const totalPorAlumno = new Map<string, number>();
    for (const a of asignaciones) {
      const alumnoId = a.getAlumno()?.id;
      if (!alumnoId) continue;
      if (!vigentePorAlumno.has(alumnoId)) vigentePorAlumno.set(alumnoId, a);
      totalPorAlumno.set(alumnoId, (totalPorAlumno.get(alumnoId) ?? 0) + 1);
    }

    // El banco que se sirve es el vivo MÁS las archivadas que alguien tenga
    // todavía asignadas: si no, proyectar a ese alumno se quedaría sin texto que
    // pintar. Archivar saca una pregunta del selector, no de la entrevista que
    // ya estaba puesta.
    const porIdPregunta = new Map(preguntas.map((p) => [p.id!, p]));
    for (const a of asignaciones) {
      const pregunta = a.getPregunta() as EscenarioPregunta | undefined;
      if (pregunta?.id && !porIdPregunta.has(pregunta.id)) porIdPregunta.set(pregunta.id, pregunta);
    }

    res.json({
      status: 'ok',
      habilitado: true,
      alumnos: alumnos.map(({ alumno }) => ({
        id: alumno.id,
        name: alumno.get('name') ?? '',
        matricula: alumno.get('matricula') ?? '',
        email: alumno.get('email') ?? '',
        asignacion: vigentePorAlumno.get(alumno.id!)?.toSafeJSON() ?? null,
        totalAsignaciones: totalPorAlumno.get(alumno.id!) ?? 0,
      })),
      preguntas: [...porIdPregunta.values()].map((p) => p.toSafeJSON()),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener los escenarios del grupo' });
  }
}

/** GET /admin/grupos/:grupoId/escenarios/alumnos/:alumnoId — historial completo. */
export async function getHistorialAlumno(req: Request, res: Response): Promise<void> {
  const { grupoId, alumnoId } = req.params;
  const grupo = await grupoConEscenarios(grupoId, res);
  if (!grupo) return;
  try {
    const q = new Parse.Query<EscenarioAsignacion>('EscenarioAsignacion');
    q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
    q.equalTo('alumno' as any, AppUser.createWithoutData(alumnoId) as any);
    q.equalTo('exists' as any, true as any);
    q.include('pregunta' as any);
    q.descending('createdAt');
    q.limit(1000);
    const historial = await q.find({ useMasterKey: true });
    res.json({ status: 'ok', historial: historial.map((a) => a.toSafeJSON()) });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener el historial' });
  }
}

/**
 * POST /admin/grupos/:grupoId/escenarios/asignaciones
 * Body: `{ asignaciones: [{ alumnoId, preguntaId, nota?, duracionSegundos? }] }`
 *
 * SIEMPRE en bloque, aunque sea de uno. Los tres gestos de la pantalla —marcar a
 * un alumno, sellar a varios con la misma pregunta y rellenar de golpe a los que
 * faltan— son la misma operación con una lista de distinta longitud, y con un
 * endpoint por gesto habría tres sitios donde arreglar la misma validación.
 */
export async function crearAsignaciones(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const grupo = await grupoConEscenarios(grupoId, res);
  if (!grupo) return;

  const entradas = req.body?.asignaciones;
  if (!Array.isArray(entradas) || entradas.length === 0) {
    res.status(400).json({ status: 'error', message: 'No hay asignaciones que guardar' });
    return;
  }
  if (entradas.length > MAX_BULK) {
    res.status(400).json({ status: 'error', message: `Como mucho ${MAX_BULK} asignaciones por llamada` });
    return;
  }

  // Normalizar TODO antes de tocar la BD: una entrada mala a mitad de la lista
  // dejaría media asignación hecha y el profesor no sabría por dónde iba.
  const normalizadas: { alumnoId: string; preguntaId: string; nota: string; duracion?: number }[] = [];
  for (const e of entradas) {
    const alumnoId = typeof e?.alumnoId === 'string' ? e.alumnoId : '';
    const preguntaId = typeof e?.preguntaId === 'string' ? e.preguntaId : '';
    if (!alumnoId || !preguntaId) {
      res.status(400).json({ status: 'error', message: 'Cada asignación necesita alumno y pregunta' });
      return;
    }
    const dur = normalizarDuracion(e?.duracionSegundos, undefined);
    if (typeof dur === 'object') {
      res.status(400).json({ status: 'error', message: dur.error });
      return;
    }
    normalizadas.push({
      alumnoId,
      preguntaId,
      nota: typeof e?.nota === 'string' ? e.nota : '',
      duracion: dur,
    });
  }

  try {
    // Los ids se comprueban contra el grupo y el banco: sin esto, un cliente
    // podría asignarle una pregunta a un alumno de otro grupo.
    const alumnosDelGrupo = new Set((await getAlumnosDeGrupo(grupoId)).map((a) => a.alumno.id));
    const ajenos = normalizadas.filter((n) => !alumnosDelGrupo.has(n.alumnoId));
    if (ajenos.length > 0) {
      res.status(400).json({ status: 'error', message: 'Hay alumnos que no pertenecen a este grupo' });
      return;
    }

    const preguntaIds = [...new Set(normalizadas.map((n) => n.preguntaId))];
    const qp = new Parse.Query<EscenarioPregunta>('EscenarioPregunta');
    qp.containedIn('objectId' as any, preguntaIds as any);
    qp.equalTo('exists' as any, true as any);
    qp.limit(1000);
    const preguntas = await qp.find({ useMasterKey: true });
    const porId = new Map(preguntas.map((p) => [p.id!, p]));
    if (porId.size !== preguntaIds.length) {
      res.status(400).json({ status: 'error', message: 'Alguna pregunta indicada ya no existe' });
      return;
    }

    const autor = req.appUser as AppUser | undefined;
    const nuevas = normalizadas.map((n) => {
      const asignacion = new EscenarioAsignacion().initDefaults();
      asignacion.setGrupo(Grupo.createWithoutData(grupoId) as Grupo);
      asignacion.setAlumno(AppUser.createWithoutData(n.alumnoId) as AppUser);
      asignacion.setPregunta(porId.get(n.preguntaId)!);
      asignacion.setNota(n.nota);
      asignacion.setDuracionSegundos(n.duracion);
      asignacion.setUsada(false);
      if (autor) asignacion.setAsignadaPor(autor);
      return asignacion;
    });

    await Parse.Object.saveAll(nuevas, { useMasterKey: true });
    res.status(201).json({ status: 'ok', asignaciones: nuevas.map((a) => a.toSafeJSON()) });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al asignar los escenarios' });
  }
}

/** PUT /admin/grupos/:grupoId/escenarios/asignaciones/:id — nota, duración o «ya la hice». */
export async function actualizarAsignacion(req: Request, res: Response): Promise<void> {
  const { grupoId, id } = req.params;
  const grupo = await grupoConEscenarios(grupoId, res);
  if (!grupo) return;

  try {
    const q = new Parse.Query<EscenarioAsignacion>('EscenarioAsignacion');
    q.equalTo('exists' as any, true as any);
    q.include('pregunta' as any);
    const asignacion = await q.get(id, { useMasterKey: true }).catch(() => null);
    // El grupo de la ruta tiene que ser el de la asignación: si no, el guard de
    // acceso al grupo no protegería nada (bastaría pasar un grupo propio).
    if (!asignacion || asignacion.getGrupo()?.id !== grupoId) {
      res.status(404).json({ status: 'error', message: 'Asignación no encontrada' });
      return;
    }

    const { nota, duracionSegundos, usada } = req.body ?? {};
    if (nota !== undefined) asignacion.setNota(typeof nota === 'string' ? nota : '');
    if (duracionSegundos !== undefined) {
      // null explícito = volver a la duración de la pregunta.
      if (duracionSegundos === null || duracionSegundos === '') {
        asignacion.setDuracionSegundos(undefined);
      } else {
        const dur = normalizarDuracion(duracionSegundos, undefined);
        if (typeof dur === 'object') {
          res.status(400).json({ status: 'error', message: dur.error });
          return;
        }
        asignacion.setDuracionSegundos(dur);
      }
    }
    if (usada !== undefined) asignacion.setUsada(usada === true);

    await asignacion.save(null, { useMasterKey: true });
    res.json({ status: 'ok', asignacion: asignacion.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al actualizar la asignación' });
  }
}

/** DELETE /admin/grupos/:grupoId/escenarios/asignaciones/:id */
export async function borrarAsignacion(req: Request, res: Response): Promise<void> {
  const { grupoId, id } = req.params;
  const grupo = await grupoConEscenarios(grupoId, res);
  if (!grupo) return;

  try {
    const q = new Parse.Query<EscenarioAsignacion>('EscenarioAsignacion');
    q.equalTo('exists' as any, true as any);
    const asignacion = await q.get(id, { useMasterKey: true }).catch(() => null);
    if (!asignacion || asignacion.getGrupo()?.id !== grupoId) {
      res.status(404).json({ status: 'error', message: 'Asignación no encontrada' });
      return;
    }
    asignacion.softDelete();
    await asignacion.save(null, { useMasterKey: true });
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al quitar la asignación' });
  }
}
