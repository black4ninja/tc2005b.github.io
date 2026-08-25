import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { renderMarkdown } from '@tc2005b/contenido-pipeline';
import { Coleccion } from '../models/Coleccion.js';
import { Competencia } from '../models/Competencia.js';
import { Pregunta } from '../models/Pregunta.js';
import { PreguntaAsignacion } from '../models/PreguntaAsignacion.js';
import type { AppUser } from '../models/AppUser.js';
import { getColeccionActiva } from './cms-documentos.controller.js';
import { normalizarEtiquetas } from '../services/preguntas.service.js';
import { usoDePreguntas } from '../services/preguntas-uso.service.js';

/**
 * CRUD del banco del módulo "Preguntas" (entrevistas personales).
 *
 * Sigue el contrato de `ejercicios-diagrama.controller.ts` —mismos códigos de
 * estado, misma colección en la ruta, mismo soft-delete— porque es el mismo tipo
 * de pantalla y desviarse solo obligaría a recordar dos convenciones.
 *
 * Es de admin. Los profesores lo CONSUMEN desde su grupo
 * (`preguntas-asignacion.controller`), donde basta con ser staff del grupo.
 */

async function buscarPregunta(id: string): Promise<Pregunta | null> {
  try {
    const q = new Parse.Query<Pregunta>('Pregunta');
    q.equalTo('exists' as any, true as any);
    q.include('competencia' as any);
    return await q.get(id, { useMasterKey: true });
  } catch {
    return null;
  }
}

/**
 * Resuelve la competencia enlazada.
 *
 * A propósito NO se comprueba que sea del catálogo de la colección de la
 * pregunta: hoy solo una materia usa el módulo, pero una competencia transversal
 * puede vivir en otra y querer explorarse desde aquí. Lo único que se exige es
 * que exista. `''`/`null` = quitar el enlace.
 */
async function resolverCompetencia(
  competenciaId: unknown,
): Promise<Competencia | null | 'invalido'> {
  if (competenciaId === null || competenciaId === undefined || competenciaId === '') return null;
  if (typeof competenciaId !== 'string') return 'invalido';
  const q = new Parse.Query<Competencia>('Competencia');
  q.equalTo('exists' as any, true as any);
  q.include('coleccion' as any);
  const competencia = await q.get(competenciaId, { useMasterKey: true }).catch(() => null);
  return competencia ?? 'invalido';
}

/**
 * GET /admin/colecciones/:id/preguntas
 *
 * Sin paginar y con el enunciado dentro: es el banco de una materia, del orden
 * de decenas, y el editor y el selector del roster lo quieren entero para poder
 * filtrar en cliente sin ir y volver por cada tecla.
 */
export async function listPreguntas(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const coleccion = await getColeccionActiva(id);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }
    const incluirArchivadas = req.query.archivadas === 'true';
    const q = new Parse.Query<Pregunta>('Pregunta');
    q.equalTo('coleccion' as any, Coleccion.createWithoutData(id) as any);
    q.equalTo('exists' as any, true as any);
    if (!incluirArchivadas) q.notEqualTo('archivada' as any, true as any);
    q.include('competencia' as any);
    // Sin título por el que ordenar, manda la antigüedad: el banco crece por el
    // final y así lo último escrito no se pierde en medio de la tabla.
    q.ascending('createdAt');
    q.limit(1000);
    const preguntas = await q.find({ useMasterKey: true });
    // Quién tiene tomada cada una. El banco lo muestra porque una pregunta
    // asignada no se puede volver a repartir, y sin decirlo aquí el autor no
    // tiene forma de saber cuánto banco libre le queda.
    const uso = await usoDePreguntas(preguntas.map((p) => p.id!));
    res.json({
      status: 'ok',
      preguntas: preguntas.map((p) => ({ ...p.toSafeJSON(), uso: uso.get(p.id!) ?? null })),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener el banco de preguntas' });
  }
}

/** POST /admin/colecciones/:id/preguntas */
export async function createPregunta(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { texto, etiquetas, notas, competenciaId } = req.body ?? {};

  if (typeof texto !== 'string' || !texto.trim()) {
    res.status(400).json({ status: 'error', message: 'La pregunta no puede estar vacía' });
    return;
  }
  const etiq = normalizarEtiquetas(etiquetas);
  if (!Array.isArray(etiq)) {
    res.status(400).json({ status: 'error', message: etiq.error });
    return;
  }
  try {
    const coleccion = await getColeccionActiva(id);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }
    const competencia = await resolverCompetencia(competenciaId);
    if (competencia === 'invalido') {
      res.status(400).json({ status: 'error', message: 'La competencia indicada no existe' });
      return;
    }

    const pregunta = new Pregunta().initDefaults();
    pregunta.setColeccion(coleccion);
    pregunta.setCompetencia(competencia);
    pregunta.setTexto(texto);
    pregunta.setTextoHtml(await renderMarkdown(texto));
    pregunta.setEtiquetas(etiq);
    pregunta.setNotas(typeof notas === 'string' ? notas : '');
    pregunta.setArchivada(false);
    const autor = req.appUser as AppUser | undefined;
    if (autor) pregunta.setAutor(autor);
    await pregunta.save(null, { useMasterKey: true });
    res.status(201).json({ status: 'ok', pregunta: pregunta.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al crear la pregunta' });
  }
}

/** PUT /admin/preguntas/:id */
export async function updatePregunta(req: Request, res: Response): Promise<void> {
  const pregunta = await buscarPregunta(req.params.id);
  if (!pregunta) {
    res.status(404).json({ status: 'error', message: 'Pregunta no encontrada' });
    return;
  }
  const { texto, etiquetas, notas, archivada, competenciaId } = req.body ?? {};

  if (texto !== undefined) {
    if (typeof texto !== 'string' || !texto.trim()) {
      res.status(400).json({ status: 'error', message: 'La pregunta no puede estar vacía' });
      return;
    }
    pregunta.setTexto(texto);
    pregunta.setTextoHtml(await renderMarkdown(texto));
  }
  if (etiquetas !== undefined) {
    const etiq = normalizarEtiquetas(etiquetas);
    if (!Array.isArray(etiq)) {
      res.status(400).json({ status: 'error', message: etiq.error });
      return;
    }
    pregunta.setEtiquetas(etiq);
  }
  if (competenciaId !== undefined) {
    const competencia = await resolverCompetencia(competenciaId);
    if (competencia === 'invalido') {
      res.status(400).json({ status: 'error', message: 'La competencia indicada no existe' });
      return;
    }
    pregunta.setCompetencia(competencia);
  }
  if (notas !== undefined) pregunta.setNotas(typeof notas === 'string' ? notas : '');
  if (archivada !== undefined) pregunta.setArchivada(archivada === true);

  try {
    await pregunta.save(null, { useMasterKey: true });
    res.json({ status: 'ok', pregunta: pregunta.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al actualizar la pregunta' });
  }
}

/**
 * DELETE /admin/preguntas/:id
 *
 * Se niega si la pregunta ya está asignada a alguien: el historial guarda un
 * puntero, y borrarla dejaría al roster mostrando filas sin pregunta sin que
 * nadie entienda por qué. Para eso está archivar, y la respuesta lo dice.
 */
export async function deletePregunta(req: Request, res: Response): Promise<void> {
  const pregunta = await buscarPregunta(req.params.id);
  if (!pregunta) {
    res.status(404).json({ status: 'error', message: 'Pregunta no encontrada' });
    return;
  }
  try {
    const q = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
    q.equalTo('pregunta' as any, Pregunta.createWithoutData(pregunta.id!) as any);
    q.equalTo('exists' as any, true as any);
    const usos = await q.count({ useMasterKey: true });
    if (usos > 0) {
      res.status(409).json({
        status: 'error',
        message: `Esta pregunta ya está asignada a ${usos} alumno(s): archívala en vez de borrarla para no dejar huecos en el historial.`,
      });
      return;
    }
    pregunta.softDelete();
    await pregunta.save(null, { useMasterKey: true });
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al eliminar la pregunta' });
  }
}
