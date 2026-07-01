import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { getSessionToken } from '../utils/session-cookie.js';
import { getMateriaSlugs, getAllowedMateriaSlugs } from '../services/materia.service.js';

/**
 * Gate de acceso a `/docs/*` (multi-instancia por materia).
 *
 * Solo gatea las rutas cuyo primer segmento es un slug de materia conocido
 * (p. ej. `/tc2005b/...`). Los assets compartidos de Docusaurus (`/assets`,
 * `/img`, favicon, sitemap) y la landing `/docs/` pasan sin costo — ese
 * pre-filtro en memoria cubre el ~99% del tráfico sin tocar BD.
 *
 * Para una materia gated: admin ⇒ acceso total; alumno ⇒ solo las materias de
 * sus grupos. Cualquier denegación (sin sesión, sesión inválida, sin acceso)
 * responde 404 para ocultar la existencia de la materia.
 *
 * Se monta antes de `express.static('/docs')` y solo en producción (donde
 * Express sirve el estático).
 */
function firstSegment(pathname: string): string {
  const raw = pathname.split('?')[0].replace(/^\/+/, '');
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  return decoded.split('/')[0] ?? '';
}

function sendNotFound(res: Response): void {
  res
    .status(404)
    .type('html')
    .send('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>404</title></head><body><h1>404</h1></body></html>');
}

export async function docsGate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const segment = firstSegment(req.path);

    // Landing (/docs/) o assets/paths que no son una materia → no se gatean.
    if (!segment) {
      next();
      return;
    }
    const slugs = await getMateriaSlugs();
    if (!slugs.has(segment)) {
      next();
      return;
    }

    // El primer segmento ES una materia con acceso controlado.
    const token = getSessionToken(req);
    if (!token) {
      sendNotFound(res);
      return;
    }
    const result = await authService.validateSession(token);
    if (!result) {
      sendNotFound(res);
      return;
    }
    const allowed = await getAllowedMateriaSlugs(result.user);
    if (!allowed.has(segment)) {
      sendNotFound(res);
      return;
    }

    next();
  } catch {
    sendNotFound(res);
  }
}
