import type { Request, Response } from 'express';
import { config } from '../config/index.js';

/**
 * Helpers de la cookie de sesión.
 *
 * La cookie existe para que las navegaciones top-level del navegador (que NO
 * mandan el header `x-session-token`) lleven la sesión y el servidor pueda
 * identificar al usuario — p. ej. al descargar un recurso del CMS desde
 * `/api/contenidos/recursos/…`. El SPA sigue usando localStorage + header para
 * sus llamadas al API; la cookie es aditiva.
 */

const MAX_AGE_MS = config.auth.sessionExpiryDays * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
    path: '/',
  };
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(config.cookies.name, token, { ...cookieOptions(), maxAge: MAX_AGE_MS });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.cookies.name, cookieOptions());
}

/** Token de sesión: header gana, cookie es fallback (para navegaciones top-level). */
export function getSessionToken(req: Request): string | undefined {
  const header = req.headers['x-session-token'] as string | undefined;
  return header ?? req.cookies?.[config.cookies.name];
}
