import Parse from 'parse/node';
import { Pregunta } from '../models/Pregunta.js';
import type { PreguntaAsignacion } from '../models/PreguntaAsignacion.js';

/**
 * Qué preguntas están TOMADAS y por quién.
 *
 * La regla del módulo es que una pregunta no se repite: ni dentro de un grupo ni
 * entre grupos activos. No es una manía de unicidad, es el motivo entero de que
 * el banco exista: si a dos alumnos les toca la misma, el segundo la sabe antes
 * de entrar.
 *
 * "Tomada" se DERIVA, no se guarda: una pregunta lo está mientras tenga una
 * asignación viva en un grupo **activo**. Por eso desactivar el grupo al cerrar
 * el semestre devuelve todo su banco al fondo común sin migrar nada ni tener que
 * acordarse de liberarlo a mano.
 */

export interface UsoPregunta {
  grupoId: string;
  grupoNombre: string;
  alumnoId: string;
  alumnoNombre: string;
  /** Ya se le planteó en la entrevista. */
  usada: boolean;
}

/** ¿Este grupo sigue bloqueando las preguntas que tiene asignadas? */
function grupoEnCurso(grupo: Parse.Object | undefined): boolean {
  return !!grupo && grupo.get('exists') !== false && grupo.get('active') !== false;
}

/**
 * Mapa `preguntaId → quién la tiene`, mirando solo grupos en curso.
 *
 * `preguntaIds` acota la consulta cuando ya se sabe qué preguntas interesan (el
 * banco de una materia); sin él mira todas, que es lo que necesita el guard al
 * validar una asignación contra el sistema entero.
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
    // Si hubiera varias, gana la que ya se planteó: es la que de verdad quema la
    // pregunta, y es el dato útil de cara a quien mira por qué está bloqueada.
    const previo = uso.get(preguntaId);
    if (previo && previo.usada) continue;
    uso.set(preguntaId, {
      grupoId: grupo!.id!,
      grupoNombre: grupo!.get('name') ?? '',
      alumnoId: alumno.id,
      alumnoNombre: alumno.get('name') ?? '',
      usada: a.get('usada') === true,
    });
  }
  return uso;
}
