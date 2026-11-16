import type { Request, Response, NextFunction } from 'express';
import Parse from 'parse/node';
import { evaluarAccesoGrupo } from './grupo-scope.middleware.js';
import { getGruposDeStaff } from '../services/grupo-admin.service.js';

/**
 * Candado de las rutas que EDITAN el calendario (`/admin/calendario/*`).
 *
 * El profesor ve el calendario de su grupo con los controles de edición, igual
 * que el admin, pero estas rutas eran `soloAdmin`: cada cambio le respondía 403.
 * No sirve `requireGrupoAccess` porque aquí el grupo casi nunca viaja en la URL:
 * llega como `semanaId`, `actividadId`, una lista de ids en el body… Cada ruta
 * declara cómo se llega de su petición a los grupos que toca, y el profesor pasa
 * solo si figura en `Grupo.admins` de TODOS ellos.
 *
 * Que sean todos importa: un reordenamiento con ids mezclados de su grupo y de
 * otro no debe colar el ajeno.
 */

/** Grupos que toca la petición. Vacío = no se pudo resolver (id inexistente o ausente). */
export type ResolverGrupos = (req: Request) => Promise<string[]>;

/**
 * Decisión PURA (sin Parse ni Express, para poder probarla).
 * `gruposDelStaff` solo se consulta para el profesor.
 */
export function decidirAccesoCalendario(
  rol: string | undefined,
  gruposTocados: readonly string[],
  gruposDelStaff: ReadonlySet<string>,
): boolean {
  const decision = evaluarAccesoGrupo(rol, gruposTocados.length > 0);
  if (decision === 'permitir') return true;
  if (decision === 'denegar') return false;
  return gruposTocados.every((id) => gruposDelStaff.has(id));
}

export function requireCalendarioDeGrupo(resolver: ResolverGrupos) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.appUser;
    if (!user) {
      res.status(401).json({ status: 'error', message: 'Autenticación requerida' });
      return;
    }
    const rol = user.getUserType();
    // El admin no necesita resolver nada: se ahorra las consultas.
    if (rol === 'admin') {
      next();
      return;
    }
    if (rol !== 'profesor') {
      res.status(403).json({ status: 'error', message: 'Acceso denegado' });
      return;
    }
    try {
      const [tocados, propios] = await Promise.all([resolver(req), getGruposDeStaff(user.id!)]);
      const ids = new Set(propios.map((g) => g.id!));
      if (decidirAccesoCalendario(rol, [...new Set(tocados)], ids)) next();
      else res.status(403).json({ status: 'error', message: 'No tienes acceso a este grupo' });
    } catch {
      res.status(500).json({ status: 'error', message: 'Error al verificar acceso al grupo' });
    }
  };
}

// ── Resolvers ────────────────────────────────────────────────────────────────

const texto = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

async function gruposDeSemanas(ids: unknown[]): Promise<string[]> {
  const validos = ids.filter(texto);
  if (validos.length === 0 || validos.length !== ids.length) return [];
  const q = new Parse.Query('Semana');
  q.containedIn('objectId', validos);
  q.limit(validos.length);
  const semanas = await q.find({ useMasterKey: true });
  if (semanas.length !== new Set(validos).size) return [];
  return semanas.map((s) => s.get('grupo')?.id).filter(texto);
}

async function gruposDeActividades(ids: unknown[]): Promise<string[]> {
  const validos = ids.filter(texto);
  if (validos.length === 0 || validos.length !== ids.length) return [];
  const q = new Parse.Query('Actividad');
  q.containedIn('objectId', validos);
  q.limit(validos.length);
  const acts = await q.find({ useMasterKey: true });
  if (acts.length !== new Set(validos).size) return [];
  return gruposDeSemanas(acts.map((a) => a.get('semana')?.id));
}

/** `body.grupoId` (crear semana). */
export const grupoDelBody: ResolverGrupos = async (req) =>
  texto(req.body?.grupoId) ? [req.body.grupoId] : [];

/** `body.targetGrupoId` (copiar calendario). El origen se lee y el calendario ya es público. */
export const grupoDestinoDelBody: ResolverGrupos = async (req) =>
  texto(req.body?.targetGrupoId) ? [req.body.targetGrupoId] : [];

/** `params.semanaId` (editar / borrar semana). */
export const grupoDeSemanaParam: ResolverGrupos = (req) => gruposDeSemanas([req.params.semanaId]);

/** `body.semanaId` (crear actividad). */
export const grupoDeSemanaBody: ResolverGrupos = (req) => gruposDeSemanas([req.body?.semanaId]);

/** `params.actividadId` (editar / borrar actividad, su archivo). */
export const grupoDeActividadParam: ResolverGrupos = (req) => gruposDeActividades([req.params.actividadId]);

/** `body.updates[].actividadId` (reordenar actividades). */
export const gruposDeReorderActividades: ResolverGrupos = async (req) => {
  const updates = req.body?.updates;
  if (!Array.isArray(updates)) return [];
  return gruposDeActividades(updates.map((u: { actividadId?: unknown } | null) => u?.actividadId));
};

/** `body.grupoId` + el grupo de cada `body.orderedIds` (reordenar semanas). */
export const gruposDeReorderSemanas: ResolverGrupos = async (req) => {
  const { grupoId, orderedIds } = req.body ?? {};
  if (!texto(grupoId) || !Array.isArray(orderedIds)) return [];
  const deSemanas = await gruposDeSemanas(orderedIds);
  return deSemanas.length === 0 ? [] : [grupoId, ...deSemanas];
};
