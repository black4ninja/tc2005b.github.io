import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { randomBytes } from 'node:crypto';
import { Grupo } from '../models/Grupo.js';
import { Pregunta } from '../models/Pregunta.js';
import { VisorAsesoria } from '../models/VisorAsesoria.js';
import { BaseModel } from '../models/BaseModel.js';
import { coleccionesDeGrupo } from '../services/grupo-colecciones.service.js';
import { buscarPregunta } from './preguntas.controller.js';

/**
 * Visores de ASESORÍA: una pregunta marcada para asesoría, en una pantalla que
 * el alumno abre sin sesión para practicar. Sin reloj y sin alumno: no es una
 * entrevista, es práctica. Cada pregunta tiene su enlace, así que con varios
 * alumnos a la vez cada uno abre el suyo en paralelo.
 */

/** Los visores encendidos de un grupo, de una pregunta o de todas. */
async function visoresActivos(grupoId: string, preguntaId?: string): Promise<VisorAsesoria[]> {
  const q = BaseModel.queryActive<VisorAsesoria>('VisorAsesoria');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  if (preguntaId) q.equalTo('pregunta' as any, Pregunta.createWithoutData(preguntaId) as any);
  q.limit(1000);
  return q.find({ useMasterKey: true });
}

/** La pregunta, si es de una materia del grupo y está apartada para asesoría. */
async function preguntaDeAsesoria(grupoId: string, preguntaId: string): Promise<Pregunta | null> {
  const [cols, pregunta] = await Promise.all([coleccionesDeGrupo(grupoId, 'preguntas'), buscarPregunta(preguntaId)]);
  if (!pregunta || !cols.some((c) => c.id === pregunta.getColeccion()?.id)) return null;
  if (!pregunta.getParaAsesoria() || pregunta.getArchivada()) return null;
  return pregunta;
}

/** GET /admin/grupos/:grupoId/asesorias/visores — qué preguntas tienen visor encendido. */
export async function listVisores(req: Request, res: Response): Promise<void> {
  try {
    const visores = await visoresActivos(req.params.grupoId);
    res.json({
      status: 'ok',
      visores: visores.map((v) => ({ preguntaId: v.getPregunta()?.id ?? null, token: v.getToken() })),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al leer los visores de asesoría' });
  }
}

/**
 * POST /admin/grupos/:grupoId/asesorias/:preguntaId/visor
 *
 * Enciende el visor de una pregunta. Si ya estaba encendido devuelve el mismo
 * enlace: los alumnos que ya lo escanearon no se quedan fuera.
 */
export async function encenderVisor(req: Request, res: Response): Promise<void> {
  const { grupoId, preguntaId } = req.params;
  try {
    const pregunta = await preguntaDeAsesoria(grupoId, preguntaId);
    if (!pregunta) {
      res.status(404).json({ status: 'error', message: 'Esa pregunta no está apartada para asesoría en este grupo' });
      return;
    }
    const [existente] = await visoresActivos(grupoId, preguntaId);
    if (existente) {
      res.json({ status: 'ok', visor: { preguntaId, token: existente.getToken() } });
      return;
    }
    const visor = new VisorAsesoria().initDefaults();
    visor.setGrupo(Grupo.createWithoutData(grupoId) as Grupo);
    visor.setPregunta(pregunta);
    visor.setToken(randomBytes(18).toString('base64url'));
    if (req.appUser) visor.setCreadoPor(req.appUser);
    // Solo se lee con master key: el token no puede salir por la API de Parse.
    visor.setACL(new Parse.ACL());
    await visor.save(null, { useMasterKey: true });
    res.status(201).json({ status: 'ok', visor: { preguntaId, token: visor.getToken() } });
  } catch {
    res.status(500).json({ status: 'error', message: 'No se pudo encender el visor' });
  }
}

/** DELETE /admin/grupos/:grupoId/asesorias/:preguntaId/visor — el enlace deja de funcionar. */
export async function apagarVisor(req: Request, res: Response): Promise<void> {
  const { grupoId, preguntaId } = req.params;
  try {
    const visores = await visoresActivos(grupoId, preguntaId);
    for (const v of visores) v.softDelete();
    await Parse.Object.saveAll(visores, { useMasterKey: true });
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'error', message: 'No se pudo apagar el visor' });
  }
}

/** DELETE /admin/grupos/:grupoId/asesorias/visores — apaga TODOS los del grupo de golpe. */
export async function apagarTodos(req: Request, res: Response): Promise<void> {
  try {
    const visores = await visoresActivos(req.params.grupoId);
    for (const v of visores) v.softDelete();
    await Parse.Object.saveAll(visores, { useMasterKey: true });
    res.json({ status: 'ok', apagados: visores.length });
  } catch {
    res.status(500).json({ status: 'error', message: 'No se pudieron apagar los visores' });
  }
}

/**
 * GET /publico/asesoria/:token — lo que pinta el visor, SIN SESIÓN.
 *
 * Solo el enunciado y la competencia: ni las notas de la pregunta —son lo que
 * el profesor busca en la respuesta— ni nada del grupo. Responde 404 en cuanto
 * el visor se apaga o la pregunta deja de estar para asesoría.
 */
export async function verVisorPublico(req: Request, res: Response): Promise<void> {
  res.set('Cache-Control', 'no-store');
  const token = String(req.params.token ?? '');
  try {
    if (token.length < 16) throw new Error('token');
    const q = BaseModel.queryActive<VisorAsesoria>('VisorAsesoria');
    q.equalTo('token' as any, token as any);
    q.include('pregunta' as any);
    q.include('pregunta.competencia' as any);
    const visor = await q.first({ useMasterKey: true });
    const pregunta = visor?.getPregunta() as Pregunta | undefined;
    if (!pregunta || pregunta.get('exists') === false || !pregunta.getParaAsesoria() || pregunta.getArchivada()) {
      throw new Error('apagado');
    }
    res.json({
      status: 'ok',
      pregunta: {
        textoHtml: pregunta.getTextoHtml(),
        competencia: pregunta.getCompetencia()?.get('competencia') ?? null,
      },
    });
  } catch {
    res.status(404).json({ status: 'error', message: 'Este visor ya no está activo' });
  }
}
