import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { renderMarkdown } from '@tc2005b/contenido-pipeline';
import { Coleccion } from '../models/Coleccion.js';
import { Competencia } from '../models/Competencia.js';
import { Pregunta } from '../models/Pregunta.js';
import { PreguntaAsignacion } from '../models/PreguntaAsignacion.js';
import type { AppUser } from '../models/AppUser.js';
import { getColeccionActiva } from './cms-documentos.controller.js';
import { normalizarEtiquetas, normalizarEnunciado } from '../services/preguntas.service.js';

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
    // Sin `uso`: el banco ya no lo pinta, y calcularlo costaba una consulta
    // sobre TODAS las asignaciones en cada carga. El roster del grupo, que sí
    // lo enseña, lo sigue calculando por su cuenta.
    res.json({ status: 'ok', preguntas: preguntas.map((p) => p.toSafeJSON()) });
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

/** Tope de un lote. Un cuaderno de un semestre entero no pasa de dos centenares. */
const MAX_LOTE = 500;

/**
 * POST /admin/colecciones/:id/preguntas/lote
 *
 * Alta de varias preguntas de una vez, para el importador del cuaderno de
 * entrevistas.
 *
 * Lo que lo diferencia de llamar N veces a `createPregunta` no es la comodidad,
 * es el DE-DUPLICADO: aquí se conoce el banco entero y lo que entra en el mismo
 * lote, así que se puede garantizar que ningún enunciado quede dos veces. Hecho
 * pregunta a pregunta desde el cliente eso no se puede prometer, porque cada
 * alta cambia el banco contra el que se comparó la siguiente.
 *
 * Se comprueba aquí y no solo en la previsualización porque lo que el cliente
 * vio puede haber caducado: entre abrir el importador y pulsar guardar, otra
 * persona pudo dar de alta la misma pregunta.
 *
 * Nunca falla entera por una repetida: las que ya están se SALTAN y se dicen.
 * Reejecutar el mismo archivo es una operación válida que no cambia nada.
 */
export async function createPreguntasEnLote(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { preguntas } = req.body ?? {};

  if (!Array.isArray(preguntas) || preguntas.length === 0) {
    res.status(400).json({ status: 'error', message: 'No hay preguntas que importar' });
    return;
  }
  if (preguntas.length > MAX_LOTE) {
    res.status(400).json({
      status: 'error',
      message: `Son ${preguntas.length} preguntas y el máximo por lote es ${MAX_LOTE}`,
    });
    return;
  }

  try {
    const coleccion = await getColeccionActiva(id);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }

    // El banco tal como está AHORA. Una sola consulta: el banco de una materia
    // son decenas o centenares, no hace falta ir pregunta a pregunta.
    const q = new Parse.Query<Pregunta>('Pregunta');
    q.equalTo('coleccion' as any, Coleccion.createWithoutData(id) as any);
    q.equalTo('exists' as any, true as any);
    q.limit(2000);
    const existentes = await q.find({ useMasterKey: true });
    const yaEstan = new Set(existentes.map((p) => normalizarEnunciado(p.getTexto() ?? '')));

    const autor = req.appUser as AppUser | undefined;
    const creadas: Record<string, unknown>[] = [];
    let saltadas = 0;

    for (const entrada of preguntas) {
      const texto = typeof entrada?.texto === 'string' ? entrada.texto.trim() : '';
      if (!texto) { saltadas += 1; continue; }

      const clave = normalizarEnunciado(texto);
      // Cubre las dos cosas a la vez: lo que el banco ya tenía y lo que acaba de
      // entrar en este mismo lote, porque la clave se añade al crear.
      if (!clave || yaEstan.has(clave)) { saltadas += 1; continue; }

      const competencia = await resolverCompetencia(entrada?.competenciaId);
      if (competencia === 'invalido') {
        res.status(400).json({
          status: 'error',
          message: `La competencia de «${texto.slice(0, 40)}…» no existe`,
        });
        return;
      }
      const etiq = normalizarEtiquetas(entrada?.etiquetas);
      if (!Array.isArray(etiq)) {
        res.status(400).json({ status: 'error', message: etiq.error });
        return;
      }

      const pregunta = new Pregunta().initDefaults();
      pregunta.setColeccion(coleccion);
      pregunta.setCompetencia(competencia);
      pregunta.setTexto(texto);
      pregunta.setTextoHtml(await renderMarkdown(texto));
      pregunta.setEtiquetas(etiq);
      pregunta.setNotas(typeof entrada?.notas === 'string' ? entrada.notas : '');
      pregunta.setArchivada(false);
      if (autor) pregunta.setAutor(autor);
      await pregunta.save(null, { useMasterKey: true });

      yaEstan.add(clave);
      creadas.push(pregunta.toSafeJSON());
    }

    res.status(201).json({
      status: 'ok',
      creadas: creadas.length,
      saltadas,
      preguntas: creadas,
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al importar las preguntas' });
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
