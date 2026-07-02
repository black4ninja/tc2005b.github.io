import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Gate de los archivos de Parse Server (design §2: los assets NUNCA son
 * públicos). Parse sirve GridFS en /parse/files/<appId>/<nombre> con URLs
 * adivinables por listado; este middleware responde 404 a todo acceso que
 * no venga del propio API (el stream gated de Recursos, que agrega la
 * llave interna por proceso).
 */

/** Llave efímera por proceso: solo este servidor puede leerse a sí mismo. */
export const FILES_INTERNAL_KEY = crypto.randomBytes(32).toString('hex');
export const FILES_INTERNAL_HEADER = 'x-files-internal';

export function filesGate(req: Request, res: Response, next: NextFunction): void {
  if (req.get(FILES_INTERNAL_HEADER) === FILES_INTERNAL_KEY) {
    next();
    return;
  }
  res.status(404).json({ status: 'error', message: 'No encontrado' });
}
