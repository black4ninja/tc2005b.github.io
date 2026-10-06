import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { coleccionesDeGrupo } from '../services/grupo-colecciones.service.js';
import {
  buscarPregunta, consultarBanco, createPregunta, createPreguntasEnLote, deletePregunta, updatePregunta,
} from './preguntas.controller.js';

/**
 * El banco de preguntas visto DESDE UN GRUPO.
 *
 * El banco cuelga de la colección y sus rutas son solo de administrador. El
 * profesor de un grupo tiene que poder mantener las preguntas de SU materia sin
 * pasar por Contenidos, y sin ver las de otras. Estas rutas reutilizan los
 * mismos controladores, pero antes comprueban que la colección —o la pregunta—
 * es de una materia del grupo con el módulo Preguntas encendido.
 *
 * El acceso al grupo ya lo comprobó `requireGrupoAccess`.
 */

/** Las colecciones del grupo con Preguntas encendido, por id. */
async function coleccionesDelGrupo(grupoId: string): Promise<Map<string, Parse.Object>> {
  const cols = await coleccionesDeGrupo(grupoId, 'preguntas');
  return new Map(cols.map((c) => [c.id!, c]));
}

/**
 * Una competencia solo se puede enlazar si es de una materia del grupo. El
 * administrador puede enlazar las de cualquier materia desde Contenidos; aquí
 * no, para que el profesor no toque bancos que no son suyos.
 */
async function competenciaPermitida(competenciaId: unknown, cols: Map<string, Parse.Object>): Promise<boolean> {
  if (competenciaId === undefined || competenciaId === null || competenciaId === '') return true;
  if (typeof competenciaId !== 'string') return false;
  const q = new Parse.Query('Competencia');
  q.equalTo('exists' as any, true as any);
  const c = await q.get(competenciaId, { useMasterKey: true }).catch(() => null);
  return !!c && cols.has(c.get('coleccion')?.id);
}

function noEsDelGrupo(res: Response, que: string): void {
  res.status(404).json({ status: 'error', message: `${que} no es de una materia de este grupo` });
}

/** Valida la colección de la URL y la deja en `req.params.id`, como la espera el banco. */
async function conColeccion(
  req: Request, res: Response, siguiente: (req: Request, res: Response) => Promise<void>,
): Promise<void> {
  const { grupoId, coleccionId } = req.params;
  const cols = await coleccionesDelGrupo(grupoId);
  if (!cols.has(coleccionId)) return noEsDelGrupo(res, 'Esa colección');
  if (!(await competenciaPermitida(req.body?.competenciaId, cols))) {
    res.status(400).json({ status: 'error', message: 'La competencia no es de una materia de este grupo' });
    return;
  }
  req.params.id = coleccionId;
  return siguiente(req, res);
}

/** Valida que la pregunta de la URL sea del banco de una materia del grupo. */
async function conPregunta(
  req: Request, res: Response, siguiente: (req: Request, res: Response) => Promise<void>,
): Promise<void> {
  const { grupoId, id } = req.params;
  const [cols, pregunta] = await Promise.all([coleccionesDelGrupo(grupoId), buscarPregunta(id)]);
  if (!pregunta || !cols.has(pregunta.getColeccion()?.id ?? '')) return noEsDelGrupo(res, 'Esa pregunta');
  // La que ya tenía puede ser de otra materia —la enlazó un administrador—, y
  // el formulario la reenvía al guardar: solo se valida si CAMBIA.
  const competenciaId = req.body?.competenciaId;
  const cambia = competenciaId !== undefined && competenciaId !== (pregunta.getCompetencia()?.id ?? '');
  if (cambia && !(await competenciaPermitida(competenciaId, cols))) {
    res.status(400).json({ status: 'error', message: 'La competencia no es de una materia de este grupo' });
    return;
  }
  return siguiente(req, res);
}

/**
 * GET /admin/grupos/:grupoId/banco/:coleccionId/preguntas
 *
 * Como el del banco, más el nombre de la materia: la ruta de Contenidos que lo
 * da es de administrador.
 */
export async function listBancoGrupo(req: Request, res: Response): Promise<void> {
  const { grupoId, coleccionId } = req.params;
  try {
    const col = (await coleccionesDelGrupo(grupoId)).get(coleccionId);
    if (!col) return noEsDelGrupo(res, 'Esa colección');
    const preguntas = await consultarBanco(coleccionId, req.query.archivadas === 'true');
    res.json({
      status: 'ok',
      coleccion: { id: col.id, clave: col.get('clave') ?? null, nombre: col.get('nombre') ?? '' },
      preguntas: preguntas.map((p) => p.toSafeJSON()),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener el banco de preguntas' });
  }
}

/** POST /admin/grupos/:grupoId/banco/:coleccionId/preguntas */
export function createBancoGrupo(req: Request, res: Response): Promise<void> {
  return conColeccion(req, res, createPregunta);
}

/** POST /admin/grupos/:grupoId/banco/:coleccionId/preguntas/lote */
export async function createLoteBancoGrupo(req: Request, res: Response): Promise<void> {
  // En el lote la competencia va en CADA entrada, no en la raíz del cuerpo: hay
  // que validarlas una por una o el archivo colaría las de otra materia.
  const entradas: unknown[] = Array.isArray(req.body?.preguntas) ? req.body.preguntas : [];
  const ids = [...new Set(entradas
    .map((e) => (e as { competenciaId?: unknown } | null)?.competenciaId)
    .filter((id) => id !== undefined && id !== null && id !== ''))];
  if (ids.length > 0) {
    const cols = await coleccionesDelGrupo(req.params.grupoId);
    for (const id of ids) {
      if (!(await competenciaPermitida(id, cols))) {
        res.status(400).json({ status: 'error', message: 'El archivo trae una competencia que no es de una materia de este grupo' });
        return;
      }
    }
  }
  return conColeccion(req, res, createPreguntasEnLote);
}

/** PUT /admin/grupos/:grupoId/banco/preguntas/:id */
export function updateBancoGrupo(req: Request, res: Response): Promise<void> {
  return conPregunta(req, res, updatePregunta);
}

/** DELETE /admin/grupos/:grupoId/banco/preguntas/:id */
export function deleteBancoGrupo(req: Request, res: Response): Promise<void> {
  return conPregunta(req, res, deletePregunta);
}
