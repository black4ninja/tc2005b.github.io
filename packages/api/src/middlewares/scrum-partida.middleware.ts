import type { Request, Response, NextFunction } from 'express';
import type { AppUser } from '../models/AppUser.js';
import { alumnoTieneAccesoAGrupo } from '../services/grupo-alumno.service.js';
import {
  cargarDinamica, equiposDeDinamica, esDeLaPartida,
} from '../services/scrum.service.js';

/**
 * El candado de las partidas de práctica.
 *
 * Detrás de él se montan los MISMOS controladores con los que el profesor
 * conduce una dinámica de clase: cambiar de etapa, abrir y cerrar sprints,
 * escribir las reglas, finalizar. Lo único que cambia entre los dos caminos es
 * quién puede llamarlos, y eso es exactamente lo que decide este guard. Escribir
 * otra versión de esos controladores habría sido tener dos sitios donde
 * arreglar cada regla que se ajuste en el futuro.
 *
 * Manda CUALQUIERA de los que están dentro, no solo quien la abrió: la partida
 * simula el equipo de la clase, y en un equipo el turno de conducir rota.
 * Borrarla es la excepción — ver `requireDuenoDePartida`.
 */

function denegar(res: Response, codigo: number, mensaje: string): void {
  res.status(codigo).json({ status: 'error', message: mensaje });
}

/** Lo que el guard deja resuelto para quien venga detrás. */
interface PartidaResuelta {
  dinamicaId: string;
  esDueno: boolean;
}

function yaResuelta(req: Request): PartidaResuelta | null {
  const guardada = (req as any).partida as PartidaResuelta | undefined;
  return guardada?.dinamicaId === req.params.dinamicaId ? guardada : null;
}

/**
 * Comprueba que la dinámica de la ruta sea una partida de práctica de este
 * grupo y que quien pide esté dentro.
 *
 * Que sea de PRÁCTICA es tan importante como que sea suya: sin esa
 * comprobación, un alumno podría llamar a los mandos del profesor sobre la
 * dinámica de clase con solo poner su id en la URL, y cambiarle la etapa a
 * treinta personas.
 */
async function resolver(
  req: Request,
  res: Response,
  soloDueno: boolean,
): Promise<boolean> {
  const { grupoId, dinamicaId } = req.params;
  const alumno = req.appUser as AppUser | undefined;
  if (!alumno?.id || !grupoId || !dinamicaId) {
    denegar(res, 400, 'Datos incompletos');
    return false;
  }

  const [enElGrupo, dinamica] = await Promise.all([
    alumnoTieneAccesoAGrupo(alumno.id, grupoId),
    cargarDinamica(dinamicaId, grupoId),
  ]);
  if (!enElGrupo) {
    denegar(res, 403, 'No perteneces a este grupo');
    return false;
  }
  if (!dinamica || !dinamica.esPractica()) {
    // El mismo mensaje que si no existiera: quien prueba ids ajenos no tiene
    // por qué enterarse de cuál sí existe.
    denegar(res, 404, 'Esa partida no existe');
    return false;
  }

  const propietarioId = dinamica.getPropietarioId();
  const esDueno = propietarioId === alumno.id;
  if (soloDueno) {
    if (!esDueno) {
      denegar(res, 403, 'Solo quien abrió la partida puede hacer esto');
      return false;
    }
    (req as any).partida = { dinamicaId, esDueno } satisfies PartidaResuelta;
    return true;
  }

  const equipos = await equiposDeDinamica(dinamicaId);
  const miembros = equipos.flatMap((e) => e.getMiembroIds());
  if (!esDeLaPartida(propietarioId, miembros, alumno.id)) {
    denegar(res, 404, 'Esa partida no existe');
    return false;
  }
  (req as any).partida = { dinamicaId, esDueno } satisfies PartidaResuelta;
  return true;
}

/** Quien esté dentro de la partida: el dueño o cualquier invitado. */
export function requireMiembroDePartida(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  void resolver(req, res, false)
    .then((ok) => { if (ok) next(); })
    .catch(() => denegar(res, 500, 'Error al comprobar la partida'));
}

/**
 * Solo quien la abrió. Para borrarla y para renombrarla: son gestos sobre la
 * partida entera y no sobre lo que se juega dentro.
 */
export function requireDuenoDePartida(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // El guard de miembro ya corrió por delante y dejó dicho quién es: repetir la
  // lectura para comparar el mismo id son dos viajes de más.
  const resuelta = yaResuelta(req);
  if (resuelta) {
    if (resuelta.esDueno) next();
    else denegar(res, 403, 'Solo quien abrió la partida puede hacer esto');
    return;
  }
  void resolver(req, res, true)
    .then((ok) => { if (ok) next(); })
    .catch(() => denegar(res, 500, 'Error al comprobar la partida'));
}
