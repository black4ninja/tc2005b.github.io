import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { renderMarkdown } from '@tc2005b/contenido-pipeline';
import { EscenarioPregunta } from '../models/EscenarioPregunta.js';
import { DURACION_POR_DEFECTO } from '../constants/escenarios.js';
import { EscenarioAsignacion } from '../models/EscenarioAsignacion.js';
import type { AppUser } from '../models/AppUser.js';
import { normalizarEtiquetas, normalizarDuracion } from '../services/escenarios.service.js';

/**
 * CRUD del banco de ESCENARIOS (preguntas de entrevista).
 *
 * Es global y solo de admin: el banco no cuelga de una colección ni de un grupo,
 * y lo mantiene quien diseña el curso. Los profesores lo CONSUMEN desde su grupo
 * (`escenarios-asignacion.controller`), donde basta con ser staff.
 */

async function buscarPregunta(id: string): Promise<EscenarioPregunta | null> {
  try {
    const q = new Parse.Query<EscenarioPregunta>('EscenarioPregunta');
    q.equalTo('exists' as any, true as any);
    return await q.get(id, { useMasterKey: true });
  } catch {
    return null;
  }
}

/**
 * GET /admin/escenarios — banco completo.
 *
 * Sin paginar y con el enunciado dentro: es el banco de preguntas de un curso,
 * del orden de decenas, y el editor y el selector del roster lo quieren entero
 * para poder filtrar en cliente sin ir y volver por cada tecla.
 */
export async function listEscenarios(req: Request, res: Response): Promise<void> {
  try {
    const incluirArchivadas = req.query.archivadas === 'true';
    const q = new Parse.Query<EscenarioPregunta>('EscenarioPregunta');
    q.equalTo('exists' as any, true as any);
    if (!incluirArchivadas) q.notEqualTo('archivada' as any, true as any);
    q.ascending('titulo');
    q.limit(1000);
    const preguntas = await q.find({ useMasterKey: true });
    res.json({ status: 'ok', preguntas: preguntas.map((p) => p.toSafeJSON()) });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener el banco de escenarios' });
  }
}

/** POST /admin/escenarios */
export async function createEscenario(req: Request, res: Response): Promise<void> {
  const { titulo, texto, etiquetas, duracionSegundos, notas } = req.body ?? {};

  if (typeof titulo !== 'string' || !titulo.trim()) {
    res.status(400).json({ status: 'error', message: 'El título es requerido' });
    return;
  }
  if (typeof texto !== 'string' || !texto.trim()) {
    res.status(400).json({ status: 'error', message: 'La pregunta no puede estar vacía' });
    return;
  }
  const etiq = normalizarEtiquetas(etiquetas);
  if (!Array.isArray(etiq)) {
    res.status(400).json({ status: 'error', message: etiq.error });
    return;
  }
  const dur = normalizarDuracion(duracionSegundos, DURACION_POR_DEFECTO);
  if (typeof dur === 'object') {
    res.status(400).json({ status: 'error', message: dur.error });
    return;
  }

  try {
    const pregunta = new EscenarioPregunta().initDefaults();
    pregunta.setTitulo(titulo.trim());
    pregunta.setTexto(texto);
    pregunta.setTextoHtml(await renderMarkdown(texto));
    pregunta.setEtiquetas(etiq);
    pregunta.setDuracionSegundos(dur ?? DURACION_POR_DEFECTO);
    pregunta.setNotas(typeof notas === 'string' ? notas : '');
    pregunta.setArchivada(false);
    const autor = req.appUser as AppUser | undefined;
    if (autor) pregunta.setAutor(autor);
    await pregunta.save(null, { useMasterKey: true });
    res.status(201).json({ status: 'ok', pregunta: pregunta.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al crear el escenario' });
  }
}

/** PUT /admin/escenarios/:id */
export async function updateEscenario(req: Request, res: Response): Promise<void> {
  const pregunta = await buscarPregunta(req.params.id);
  if (!pregunta) {
    res.status(404).json({ status: 'error', message: 'Escenario no encontrado' });
    return;
  }
  const { titulo, texto, etiquetas, duracionSegundos, notas, archivada } = req.body ?? {};

  if (titulo !== undefined) {
    if (typeof titulo !== 'string' || !titulo.trim()) {
      res.status(400).json({ status: 'error', message: 'El título es requerido' });
      return;
    }
    pregunta.setTitulo(titulo.trim());
  }
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
  if (duracionSegundos !== undefined) {
    const dur = normalizarDuracion(duracionSegundos, undefined);
    if (typeof dur === 'object') {
      res.status(400).json({ status: 'error', message: dur.error });
      return;
    }
    if (dur !== undefined) pregunta.setDuracionSegundos(dur);
  }
  if (notas !== undefined) pregunta.setNotas(typeof notas === 'string' ? notas : '');
  if (archivada !== undefined) pregunta.setArchivada(archivada === true);

  try {
    await pregunta.save(null, { useMasterKey: true });
    res.json({ status: 'ok', pregunta: pregunta.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al actualizar el escenario' });
  }
}

/**
 * DELETE /admin/escenarios/:id
 *
 * Se niega si la pregunta ya está asignada a alguien: el historial guarda un
 * puntero, y borrarla dejaría al roster mostrando filas sin pregunta sin que
 * nadie entienda por qué. Para eso está archivar, y la respuesta lo dice.
 */
export async function deleteEscenario(req: Request, res: Response): Promise<void> {
  const pregunta = await buscarPregunta(req.params.id);
  if (!pregunta) {
    res.status(404).json({ status: 'error', message: 'Escenario no encontrado' });
    return;
  }
  try {
    const q = new Parse.Query<EscenarioAsignacion>('EscenarioAsignacion');
    q.equalTo('pregunta' as any, EscenarioPregunta.createWithoutData(pregunta.id) as any);
    q.equalTo('exists' as any, true as any);
    const usos = await q.count({ useMasterKey: true });
    if (usos > 0) {
      res.status(409).json({
        status: 'error',
        message: `Este escenario ya está asignado a ${usos} alumno(s): archívalo en vez de borrarlo para no dejar huecos en el historial.`,
      });
      return;
    }
    pregunta.softDelete();
    await pregunta.save(null, { useMasterKey: true });
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al eliminar el escenario' });
  }
}
