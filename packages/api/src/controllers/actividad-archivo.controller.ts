import type { Request, Response } from 'express';
import { Readable } from 'stream';
import Parse from 'parse/node';
import { Actividad } from '../models/Actividad.js';
import { Semana } from '../models/Semana.js';
import { perteneceAlGrupo } from '../services/pertenencia-grupo.service.js';
import { FILES_INTERNAL_KEY, FILES_INTERNAL_HEADER } from '../middlewares/files-gate.middleware.js';
import {
  CSP_PRESENTACION,
  sanitizarNombreArchivo,
  seSirveInline,
} from '../constants/presentaciones.js';

/** Carga la actividad activa o responde 404. */
async function getActividadActiva(actividadId: string): Promise<Actividad | null> {
  const act = await new Parse.Query<Actividad>('Actividad')
    .get(actividadId, { useMasterKey: true })
    .catch(() => null);
  return act && act.isActive() ? act : null;
}

/** Grupo dueño de la actividad (vía su semana). */
async function getGrupoIdDeActividad(act: Actividad): Promise<string | null> {
  const semanaId = act.getSemana()?.id;
  if (!semanaId) return null;
  const semana = await new Parse.Query<Semana>('Semana')
    .get(semanaId, { useMasterKey: true })
    .catch(() => null);
  return semana?.getGrupo()?.id ?? null;
}

/**
 * POST /admin/calendario/actividad/:actividadId/archivo — multipart { archivo }.
 * Sustituye el adjunto si ya había uno.
 */
export async function uploadArchivoActividad(req: Request, res: Response): Promise<void> {
  const { actividadId } = req.params;
  const archivo = req.file;

  if (!archivo) {
    res.status(400).json({ status: 'error', message: 'Falta el archivo (campo "archivo")' });
    return;
  }

  try {
    const act = await getActividadActiva(actividadId);
    if (!act) {
      res.status(404).json({ status: 'error', message: 'Actividad no encontrada' });
      return;
    }

    const nombre = sanitizarNombreArchivo(archivo.originalname);
    const mime = archivo.mimetype || 'application/octet-stream';

    const parseFile = new Parse.File(nombre, { base64: archivo.buffer.toString('base64') }, mime);
    await parseFile.save({ useMasterKey: true });

    act.setArchivo(parseFile);
    act.setArchivoNombre(nombre);
    act.setArchivoMime(mime);
    act.setArchivoBytes(archivo.size);
    await act.save(null, { useMasterKey: true });

    res.status(201).json({ status: 'ok', actividad: act.toSafeJSON() });
  } catch (error) {
    console.error('Error subiendo archivo de actividad:', error);
    res.status(500).json({ status: 'error', message: 'Error al subir el archivo' });
  }
}

/** DELETE /admin/calendario/actividad/:actividadId/archivo — quita el adjunto. */
export async function deleteArchivoActividad(req: Request, res: Response): Promise<void> {
  const { actividadId } = req.params;

  try {
    const act = await getActividadActiva(actividadId);
    if (!act) {
      res.status(404).json({ status: 'error', message: 'Actividad no encontrada' });
      return;
    }

    act.quitarArchivo();
    await act.save(null, { useMasterKey: true });

    res.json({ status: 'ok', actividad: act.toSafeJSON() });
  } catch (error) {
    console.error('Error quitando archivo de actividad:', error);
    res.status(500).json({ status: 'error', message: 'Error al quitar el archivo' });
  }
}

/**
 * GET /calendario/actividad/:actividadId/archivo — abre o descarga el adjunto.
 *
 * El calendario se lista sin sesión, pero el material NO: solo lo abre quien
 * pertenece al grupo dueño de la actividad. La sesión puede llegar por header
 * (SPA) o por cookie (navegación top-level al hacer clic en el enlace).
 *
 * El HTML se sirve inline con `Content-Security-Policy: sandbox`, que lo mete
 * en un origen opaco: la presentación se ve, pero no puede leer la cookie de
 * sesión ni llamar al API en nombre de quien la abre. Todo lo demás baja como
 * attachment octet-stream.
 */
export async function streamArchivoActividad(req: Request, res: Response): Promise<void> {
  const user = req.appUser;
  const { actividadId } = req.params;

  if (!user) {
    res.status(401).json({ status: 'error', message: 'Autenticación requerida' });
    return;
  }

  try {
    const act = await getActividadActiva(actividadId);
    const archivo = act?.getArchivo();
    if (!act || !archivo) {
      res.status(404).json({ status: 'error', message: 'No encontrado' });
      return;
    }

    const grupoId = await getGrupoIdDeActividad(act);
    // 404 y no 403: quien no está en el grupo tampoco averigua si el archivo existe.
    if (!grupoId || !(await perteneceAlGrupo(user, grupoId))) {
      res.status(404).json({ status: 'error', message: 'No encontrado' });
      return;
    }

    const interna = await fetch(archivo.url(), {
      headers: { [FILES_INTERNAL_HEADER]: FILES_INTERNAL_KEY },
    });
    if (!interna.ok || !interna.body) {
      res.status(502).json({ status: 'error', message: 'No se pudo leer el archivo' });
      return;
    }

    const nombre = act.getArchivoNombre() ?? 'presentacion';
    const inline = seSirveInline(nombre);

    if (inline) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', CSP_PRESENTACION);
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${nombre}"`);
    const bytes = act.getArchivoBytes();
    if (bytes > 0) res.setHeader('Content-Length', String(bytes));
    // Privado: puede cachearlo el navegador del usuario, jamás un proxy.
    res.setHeader('Cache-Control', 'private, max-age=3600');

    Readable.fromWeb(interna.body as any).pipe(res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ status: 'error', message: 'Error al servir el archivo' });
    } else {
      res.end();
    }
  }
}
