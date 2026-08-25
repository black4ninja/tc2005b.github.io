import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Grupo } from '../models/Grupo.js';
import { AppUser } from '../models/AppUser.js';
import { Coleccion } from '../models/Coleccion.js';
import { Pregunta } from '../models/Pregunta.js';
import { PreguntaAsignacion } from '../models/PreguntaAsignacion.js';
import { getAlumnosDeGrupo } from '../services/grupo-alumno.service.js';
import { coleccionesDeGrupo } from '../services/grupo-colecciones.service.js';
import { normalizarDuracion } from '../services/preguntas.service.js';

/**
 * Asignación de preguntas a los alumnos de UN grupo.
 *
 * Va aparte del CRUD del banco porque cambia el actor: el banco lo mantiene el
 * admin dentro de la colección, y esto lo usa el PROFESOR en su grupo
 * (`requireGrupoAccess`). Por eso el listado sirve también el banco: el profesor
 * lo necesita para asignar y no tiene permiso sobre `/admin/colecciones/...`.
 *
 * Nada de esto tiene read-path de alumno. No es que esté oculto por permisos:
 * es que no existe el endpoint.
 */

/** Tope de una asignación en bloque. Un grupo grande ronda los 40 alumnos. */
const MAX_BULK = 500;

/**
 * Colecciones del grupo con el módulo "Preguntas" encendido. Lista vacía = para
 * este grupo la sección no existe.
 */
async function coleccionesConPreguntas(grupoId: string): Promise<Parse.Object[]> {
  return coleccionesDeGrupo(grupoId, 'preguntas');
}

/**
 * Guard de escritura: el grupo tiene que tener el módulo encendido en alguna
 * colección. Responde 404 y no 403 —para ese grupo la sección no existe—, igual
 * que hacen los otros módulos opt-in.
 */
async function exigirModulo(grupoId: string, res: Response): Promise<Parse.Object[] | null> {
  const colecciones = await coleccionesConPreguntas(grupoId);
  if (colecciones.length === 0) {
    res.status(404).json({
      status: 'error',
      message: 'El módulo Preguntas no está habilitado en ninguna materia de este grupo',
    });
    return null;
  }
  return colecciones;
}

/** Todas las asignaciones vivas del grupo, de la más reciente a la más antigua. */
async function asignacionesDelGrupo(grupoId: string): Promise<PreguntaAsignacion[]> {
  const q = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  q.equalTo('exists' as any, true as any);
  q.include('pregunta' as any);
  // La competencia de la pregunta se pinta en cada fila del roster; sin este
  // segundo nivel de include llegaría como un puntero sin nombre.
  q.include('pregunta.competencia' as any);
  q.descending('createdAt');
  q.limit(10000);
  return q.find({ useMasterKey: true });
}

/**
 * GET /admin/grupos/:grupoId/preguntas
 *
 * TODA la pantalla en una petición: el roster con su asignación vigente, cuántas
 * lleva cada alumno, y el banco de las materias del grupo. Son tres cosas que se
 * pintan juntas o no se pinta ninguna, y el selector filtra en cliente mientras
 * el profesor teclea.
 */
export async function getPreguntasGrupo(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  try {
    const colecciones = await coleccionesConPreguntas(grupoId);
    // Aquí SÍ se responde 200 con `habilitado: false`: esta es la pantalla que
    // tiene que explicar por qué está vacía y dónde se enciende el módulo.
    if (colecciones.length === 0) {
      res.json({ status: 'ok', habilitado: false, alumnos: [], preguntas: [], competencias: [] });
      return;
    }

    const [alumnos, asignaciones, preguntas] = await Promise.all([
      getAlumnosDeGrupo(grupoId),
      asignacionesDelGrupo(grupoId),
      (() => {
        const q = new Parse.Query<Pregunta>('Pregunta');
        q.containedIn(
          'coleccion' as any,
          colecciones.map((c) => Coleccion.createWithoutData(c.id!)) as any,
        );
        q.equalTo('exists' as any, true as any);
        q.notEqualTo('archivada' as any, true as any);
        q.include('competencia' as any);
        q.ascending('titulo');
        q.limit(1000);
        return q.find({ useMasterKey: true });
      })(),
    ]);

    // Vienen ordenadas de más reciente a más antigua: la primera de cada alumno
    // es la vigente y el resto es su historial.
    const vigentePorAlumno = new Map<string, PreguntaAsignacion>();
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
      const pregunta = a.getPregunta() as Pregunta | undefined;
      if (pregunta?.id && !porIdPregunta.has(pregunta.id)) porIdPregunta.set(pregunta.id, pregunta);
    }

    // Las competencias que aparecen en el banco, para las píldoras de filtro.
    // Se derivan de las preguntas y no del catálogo de la materia a propósito:
    // filtrar por una competencia sin preguntas solo puede vaciar la pantalla, y
    // una pregunta puede apuntar a la competencia de otra materia.
    const competencias = new Map<string, { id: string; nombre: string }>();
    for (const p of porIdPregunta.values()) {
      const c = p.getCompetencia();
      if (c?.id && !competencias.has(c.id)) {
        competencias.set(c.id, { id: c.id, nombre: c.get('competencia') ?? '' });
      }
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
      competencias: [...competencias.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener las preguntas del grupo' });
  }
}

/** GET /admin/grupos/:grupoId/preguntas/alumnos/:alumnoId — historial completo. */
export async function getHistorialAlumno(req: Request, res: Response): Promise<void> {
  const { grupoId, alumnoId } = req.params;
  if (!(await exigirModulo(grupoId, res))) return;
  try {
    const q = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
    q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
    q.equalTo('alumno' as any, AppUser.createWithoutData(alumnoId) as any);
    q.equalTo('exists' as any, true as any);
    q.include('pregunta' as any);
    q.include('pregunta.competencia' as any);
    q.descending('createdAt');
    q.limit(1000);
    const historial = await q.find({ useMasterKey: true });
    res.json({ status: 'ok', historial: historial.map((a) => a.toSafeJSON()) });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener el historial' });
  }
}

/**
 * POST /admin/grupos/:grupoId/preguntas/asignaciones
 * Body: `{ asignaciones: [{ alumnoId, preguntaId, nota?, duracionSegundos? }] }`
 *
 * SIEMPRE en bloque, aunque sea de uno. Los tres gestos de la pantalla —marcar a
 * un alumno, sellar a varios con la misma pregunta y rellenar de golpe a los que
 * faltan— son la misma operación con una lista de distinta longitud, y con un
 * endpoint por gesto habría tres sitios donde arreglar la misma validación.
 */
export async function crearAsignaciones(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const colecciones = await exigirModulo(grupoId, res);
  if (!colecciones) return;

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
    // Los ids se comprueban contra el grupo y contra el banco de SUS materias:
    // sin esto, un cliente podría asignarle a un alumno una pregunta de una
    // colección que su grupo no tiene.
    const alumnosDelGrupo = new Set((await getAlumnosDeGrupo(grupoId)).map((a) => a.alumno.id));
    if (normalizadas.some((n) => !alumnosDelGrupo.has(n.alumnoId))) {
      res.status(400).json({ status: 'error', message: 'Hay alumnos que no pertenecen a este grupo' });
      return;
    }

    const preguntaIds = [...new Set(normalizadas.map((n) => n.preguntaId))];
    const qp = new Parse.Query<Pregunta>('Pregunta');
    qp.containedIn('objectId' as any, preguntaIds as any);
    qp.containedIn(
      'coleccion' as any,
      colecciones.map((c) => Coleccion.createWithoutData(c.id!)) as any,
    );
    qp.equalTo('exists' as any, true as any);
    qp.limit(1000);
    const preguntas = await qp.find({ useMasterKey: true });
    const porId = new Map(preguntas.map((p) => [p.id!, p]));
    if (porId.size !== preguntaIds.length) {
      res.status(400).json({
        status: 'error',
        message: 'Alguna pregunta indicada ya no existe o no es de una materia de este grupo',
      });
      return;
    }

    const autor = req.appUser as AppUser | undefined;
    const nuevas = normalizadas.map((n) => {
      const asignacion = new PreguntaAsignacion().initDefaults();
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
    res.status(500).json({ status: 'error', message: 'Error al asignar las preguntas' });
  }
}

/** PUT /admin/grupos/:grupoId/preguntas/asignaciones/:id — nota, duración o «ya la hice». */
export async function actualizarAsignacion(req: Request, res: Response): Promise<void> {
  const { grupoId, id } = req.params;
  if (!(await exigirModulo(grupoId, res))) return;

  try {
    const q = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
    q.equalTo('exists' as any, true as any);
    q.include('pregunta' as any);
    q.include('pregunta.competencia' as any);
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

/** DELETE /admin/grupos/:grupoId/preguntas/asignaciones/:id */
export async function borrarAsignacion(req: Request, res: Response): Promise<void> {
  const { grupoId, id } = req.params;
  if (!(await exigirModulo(grupoId, res))) return;

  try {
    const q = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
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
