import Parse from 'parse/node';
import { Pregunta } from '../models/Pregunta.js';
import type { PreguntaAsignacion } from '../models/PreguntaAsignacion.js';

/**
 * A cuántos alumnos se les ha puesto ya cada pregunta.
 *
 * Es INFORMACIÓN, no un candado. Una pregunta se puede repetir cuantas veces
 * haga falta —dentro del grupo y entre grupos—; lo que hace falta es que el
 * profesor vea de un vistazo cuáles ya ha usado, para poder variar cuando quiera
 * sin que el sistema decida por él.
 *
 * Solo se cuentan las asignaciones vivas de grupos EN CURSO: cerrar el semestre
 * (desactivar el grupo) deja el banco como nuevo, que es lo que uno espera al
 * volver a empezar.
 */

/** Cuántos nombres se enumeran antes de resumir. Es una pista, no un listado. */
const MAX_NOMBRES = 6;

export interface UsoPregunta {
  /** A cuántos alumnos se les ha asignado. */
  veces: number;
  /** «Nombre · Grupo», hasta `MAX_NOMBRES`. */
  quienes: string[];
  /** Alguna de esas veces ya se planteó en la entrevista. */
  algunaUsada: boolean;
}

/** ¿Este grupo sigue contando para el uso de sus preguntas? */
function grupoEnCurso(grupo: Parse.Object | undefined): boolean {
  return !!grupo && grupo.get('exists') !== false && grupo.get('active') !== false;
}

/**
 * Mapa `preguntaId → uso`, mirando solo grupos en curso.
 *
 * `preguntaIds` acota la consulta cuando ya se sabe qué preguntas interesan (el
 * banco de una materia); sin él mira todas.
 */
export async function usoDePreguntas(preguntaIds?: string[]): Promise<Map<string, UsoPregunta>> {
  const q = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
  q.equalTo('exists' as any, true as any);
  if (preguntaIds) {
    if (preguntaIds.length === 0) return new Map();
    q.containedIn(
      'pregunta' as any,
      preguntaIds.map((id) => Pregunta.createWithoutData(id)) as any,
    );
  }
  q.include('grupo' as any);
  q.include('alumno' as any);
  q.select('pregunta' as any, 'grupo' as any, 'alumno' as any, 'usada' as any);
  q.limit(10000);
  const asignaciones = await q.find({ useMasterKey: true });

  const uso = new Map<string, UsoPregunta>();
  for (const a of asignaciones) {
    const grupo = a.get('grupo') as Parse.Object | undefined;
    if (!grupoEnCurso(grupo)) continue;
    const preguntaId = a.get('pregunta')?.id;
    const alumno = a.get('alumno') as Parse.Object | undefined;
    if (!preguntaId || !alumno?.id) continue;
    const entrada = uso.get(preguntaId) ?? { veces: 0, quienes: [], algunaUsada: false };
    entrada.veces += 1;
    if (entrada.quienes.length < MAX_NOMBRES) {
      entrada.quienes.push(`${alumno.get('name') ?? ''} · ${grupo!.get('name') ?? ''}`);
    }
    if (a.get('usada') === true) entrada.algunaUsada = true;
    uso.set(preguntaId, entrada);
  }
  return uso;
}
