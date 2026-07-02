import type { Request, Response } from 'express';
import { Readable } from 'stream';
import Parse from 'parse/node';
import { Coleccion } from '../models/Coleccion.js';
import { Documento } from '../models/Documento.js';
import { Recurso } from '../models/Recurso.js';
import type { AppUser } from '../models/AppUser.js';
import { getSlugsPermitidos } from '../services/contenidos.service.js';
import { FILES_INTERNAL_KEY, FILES_INTERNAL_HEADER } from '../middlewares/files-gate.middleware.js';

/** Límite de subida (decisión #7 del diseño: cubre los ZIP/PDF actuales). */
export const RECURSO_MAX_BYTES = 50 * 1024 * 1024;

/**
 * Mimes que pueden servirse INLINE sin riesgo de ejecutar script en el
 * origen de la app. El mime lo declara el cliente al subir (no es
 * confiable): todo lo demás baja como attachment octet-stream.
 * SVG excluido a propósito: puede contener <script>.
 */
const MIME_INLINE_SEGURO = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'text/plain',
]);

/**
 * Nombre de archivo seguro y "markdown-friendly": minúsculas, sin espacios
 * ni caracteres raros, conservando la extensión. Las referencias
 * `recurso:<id>/<nombre>` viajan dentro de Markdown — sin espacios.
 */
function sanitizarNombre(original: string): string {
  const punto = original.lastIndexOf('.');
  const base = (punto > 0 ? original.slice(0, punto) : original)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'archivo';
  const ext = punto > 0 ? original.slice(punto + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) : '';
  return ext ? `${base}.${ext}` : base;
}

async function getColeccionActiva(id: string): Promise<Coleccion | null> {
  try {
    const q = new Parse.Query<Coleccion>('Coleccion');
    q.equalTo('exists' as any, true as any);
    return await q.get(id, { useMasterKey: true });
  } catch {
    return null;
  }
}

/**
 * POST /admin/recursos — multipart { archivo, coleccionId, documentoId? }.
 * Guarda el binario como Parse.File (adapter actual: GridFS; S3 en US-8) y
 * registra el Recurso. Devuelve la referencia `recurso:` lista para pegar.
 */
export async function uploadRecurso(req: Request, res: Response): Promise<void> {
  const archivo = req.file;
  const { coleccionId, documentoId } = req.body ?? {};

  if (!archivo) {
    res.status(400).json({ status: 'error', message: 'Falta el archivo (campo "archivo")' });
    return;
  }
  if (!coleccionId || typeof coleccionId !== 'string') {
    res.status(400).json({ status: 'error', message: 'coleccionId es requerido' });
    return;
  }

  try {
    const coleccion = await getColeccionActiva(coleccionId);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }

    let documento: Documento | null = null;
    if (documentoId) {
      const dq = new Parse.Query<Documento>('Documento');
      dq.equalTo('exists' as any, true as any);
      dq.equalTo('coleccion' as any, coleccion as any);
      documento = await dq.get(documentoId, { useMasterKey: true }).catch(() => null);
      if (!documento) {
        res.status(400).json({ status: 'error', message: 'El documento indicado no existe en esta colección' });
        return;
      }
    }

    const nombre = sanitizarNombre(archivo.originalname);
    const mime = archivo.mimetype || 'application/octet-stream';

    const parseFile = new Parse.File(nombre, { base64: archivo.buffer.toString('base64') }, mime);
    await parseFile.save({ useMasterKey: true });

    const recurso = new Recurso().initDefaults();
    recurso.setColeccion(coleccion);
    recurso.setDocumento(documento);
    recurso.setNombre(nombre);
    recurso.setArchivo(parseFile);
    recurso.setMime(mime);
    recurso.setBytes(archivo.size);
    const autor = req.appUser as AppUser | undefined;
    if (autor) recurso.setSubidoPor(autor);
    await recurso.save(null, { useMasterKey: true });

    res.status(201).json({
      status: 'ok',
      recurso: recurso.toSafeJSON(),
      // Referencia lista para el Markdown: el pipeline la reescribe al endpoint gated.
      referencia: `recurso:${recurso.id}/${nombre}`,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al subir el recurso' });
  }
}

/** GET /admin/colecciones/:id/recursos?documentoId= — recursos existentes. */
export async function listRecursos(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { documentoId } = req.query;

  try {
    const coleccion = await getColeccionActiva(id);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }

    const q = new Parse.Query<Recurso>('Recurso');
    q.equalTo('exists' as any, true as any);
    q.equalTo('coleccion' as any, coleccion as any);
    if (typeof documentoId === 'string' && documentoId) {
      const puntero = Parse.Object.extend('Documento').createWithoutData(documentoId);
      q.equalTo('documento' as any, puntero as any);
    }
    q.descending('createdAt');
    q.limit(1000);
    const recursos = await q.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      recursos: recursos.map((r) => ({
        ...r.toSafeJSON(),
        referencia: `recurso:${r.id}/${r.getNombre()}`,
      })),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener recursos' });
  }
}

/** DELETE /admin/recursos/:id — soft-delete (el binario queda en el adapter). */
export async function deleteRecurso(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const q = new Parse.Query<Recurso>('Recurso');
    q.equalTo('exists' as any, true as any);
    const recurso = await q.get(id, { useMasterKey: true });

    recurso.softDelete();
    await recurso.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Recurso eliminado' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Recurso no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar recurso' });
  }
}

/**
 * GET /contenidos/recursos/:id/:nombre — stream del asset SI la colección
 * dueña está permitida para el usuario (design §2: assets gated, sin URL
 * pública). 404 uniforme para inexistente/no permitido; el binario se lee
 * de Parse con la llave interna del proceso (files-gate bloquea el resto).
 */
export async function streamRecurso(req: Request, res: Response): Promise<void> {
  const user = req.appUser;
  const { id } = req.params;
  if (!user) {
    res.status(401).json({ status: 'error', message: 'Autenticación requerida' });
    return;
  }

  try {
    const q = new Parse.Query<Recurso>('Recurso');
    q.equalTo('exists' as any, true as any);
    q.include('coleccion' as any);
    const recurso = await q.get(id, { useMasterKey: true }).catch(() => null);
    const coleccion = recurso?.getColeccion();
    const archivo = recurso?.getArchivo();
    if (!recurso || !coleccion || coleccion.get('exists') === false || !archivo) {
      res.status(404).json({ status: 'error', message: 'No encontrado' });
      return;
    }

    const permitidos = await getSlugsPermitidos(user);
    if (!permitidos.has(coleccion.get('slug'))) {
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

    // El mime almacenado lo declaró el cliente: solo los tipos de la
    // allowlist se sirven inline con su mime real; el resto baja como
    // attachment octet-stream (un text/html inline sería XSS en el origen).
    // El nombre viene sanitizado desde la subida (sin comillas ni saltos).
    const inlineSeguro = MIME_INLINE_SEGURO.has(recurso.getMime());
    res.setHeader('Content-Type', inlineSeguro ? recurso.getMime() : 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `${inlineSeguro ? 'inline' : 'attachment'}; filename="${recurso.getNombre()}"`,
    );
    if (recurso.getBytes() > 0) res.setHeader('Content-Length', String(recurso.getBytes()));
    // Privado: puede cachearlo el navegador del usuario, jamás un proxy.
    res.setHeader('Cache-Control', 'private, max-age=3600');
    Readable.fromWeb(interna.body as any).pipe(res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ status: 'error', message: 'Error al servir el recurso' });
    } else {
      res.end();
    }
  }
}
