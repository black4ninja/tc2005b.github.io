import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Gate de LECTURA de los archivos de Parse Server (design §2: los assets
 * NUNCA son públicos). Parse sirve GridFS en /parse/files/<appId>/<nombre>;
 * este middleware responde 404 a todo GET que no venga del propio API (el
 * stream gated de Recursos, que agrega la llave interna).
 *
 * Solo se gatea GET/HEAD: la SUBIDA del propio SDK (Parse.File.save hace un
 * POST real a /parse/files/<nombre>) debe pasar — la protege el propio
 * parse-server (masterKey/usuario autenticado; enableForPublic=false).
 */

/**
 * Llave interna compartida entre el gate y el stream. Configurable por env
 * (FILES_INTERNAL_KEY) para despliegues multi-proceso (pm2 cluster/replicas):
 * con llave aleatoria por proceso, el self-fetch podría aterrizar en otro
 * worker con otra llave. En un solo proceso, la aleatoria basta.
 */
export const FILES_INTERNAL_KEY =
  process.env.FILES_INTERNAL_KEY || crypto.randomBytes(32).toString('hex');
export const FILES_INTERNAL_HEADER = 'x-files-internal';

export function filesGate(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next();
    return;
  }
  if (req.get(FILES_INTERNAL_HEADER) === FILES_INTERNAL_KEY) {
    next();
    return;
  }
  res.status(404).json({ status: 'error', message: 'No encontrado' });
}
