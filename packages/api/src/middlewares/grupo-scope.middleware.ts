import type { Request, Response, NextFunction } from 'express';
import { isStaffDeGrupo } from '../services/grupo-admin.service.js';

/**
 * Guards del rol "profesor" (acceso restringido a su grupo).
 *
 * Contexto: `requireAdmin` (abac.middleware) solo deja pasar a userType='admin'.
 * El profesor gestiona SU grupo con los mismos endpoints que el admin, pero solo
 * los grupos donde está asignado (figura en `Grupo.admins`). Estos guards son el
 * candado real: el front no protege rutas por rol.
 *
 * Ambos asumen que `identifyUser` ya corrió (pobló `req.appUser`).
 */

/**
 * Decisión PURA del acceso a un grupo (sin Parse ni Express, para poder
 * probarla): qué debe hacer el guard según el rol y si hay id de grupo.
 * 'verificar' = hay que consultar la pertenencia del profesor en BD.
 */
export type DecisionAcceso = 'permitir' | 'denegar' | 'verificar';

export function evaluarAccesoGrupo(
  rol: string | undefined,
  hayGrupoId: boolean,
): DecisionAcceso {
  if (rol === 'admin') return 'permitir';
  if (rol !== 'profesor') return 'denegar';
  // Profesor sin id de grupo en la ruta = wiring mal montado: negar.
  return hayGrupoId ? 'verificar' : 'denegar';
}

/** Personal del panel: admin o profesor. Bloquea alumno y anónimo. */
export function requireStaff(req: Request, res: Response, next: NextFunction): void {
  const user = req.appUser;
  if (!user) {
    res.status(401).json({ status: 'error', message: 'Autenticación requerida' });
    return;
  }
  if (!user.isStaff()) {
    res.status(403).json({ status: 'error', message: 'Acceso denegado' });
    return;
  }
  next();
}

/**
 * Acceso a un grupo concreto: el admin pasa siempre; el profesor solo si figura
 * en `Grupo.admins` del grupo de la URL. El id del grupo va SIEMPRE en la ruta
 * como `:grupoId` (o `:id` en grupos.routes.ts) — no hay endpoint de grupo que
 * lo derive de otro recurso.
 */
export function requireGrupoAccess(req: Request, res: Response, next: NextFunction): void {
  const user = req.appUser;
  if (!user) {
    res.status(401).json({ status: 'error', message: 'Autenticación requerida' });
    return;
  }

  const grupoId = req.params.grupoId ?? req.params.id;
  const decision = evaluarAccesoGrupo(user.getUserType(), !!grupoId);

  if (decision === 'permitir') {
    next();
    return;
  }
  if (decision === 'denegar') {
    res.status(403).json({ status: 'error', message: 'Acceso denegado' });
    return;
  }

  // 'verificar': el profesor pasa solo si figura en Grupo.admins del grupo.
  isStaffDeGrupo(user.id, grupoId!)
    .then((permitido) => {
      if (permitido) next();
      else res.status(403).json({ status: 'error', message: 'No tienes acceso a este grupo' });
    })
    .catch(() => {
      res.status(500).json({ status: 'error', message: 'Error al verificar acceso al grupo' });
    });
}
