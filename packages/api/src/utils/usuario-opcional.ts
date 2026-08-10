import type { Request } from 'express';
import type { AppUser } from '../models/AppUser.js';
import { authService } from '../services/auth.service.js';
import { getSessionToken } from './session-cookie.js';

/**
 * Usuario de la petición SIN exigir sesión: devuelve `undefined` en vez de
 * responder 401.
 *
 * `identifyUser` no sirve para esto porque corta con 401 cuando no hay token.
 * Aquí hace falta un endpoint que es público en general pero que endurece el
 * acceso en un caso concreto (el calendario de un grupo bloqueado).
 */
export async function usuarioOpcional(req: Request): Promise<AppUser | undefined> {
  const token = getSessionToken(req);
  if (!token) return undefined;
  try {
    const result = await authService.validateSession(token);
    return result?.user;
  } catch {
    return undefined;
  }
}
