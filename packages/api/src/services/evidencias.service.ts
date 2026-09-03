import Parse from 'parse/node';
import { EvidenciaCompetencia } from '../models/EvidenciaCompetencia.js';
import { Grupo } from '../models/Grupo.js';

/**
 * Las evidencias que entrega el alumno.
 *
 * Vive aparte del controlador de la agenda porque no son de la agenda: son del
 * alumno y de la competencia, y la entrevista es solo la ocasión en la que las
 * entregó. Cuando la malla de evaluación las enseñe también, lee de aquí y no
 * escribe su propia consulta —que es exactamente como se acaban con dos reglas
 * distintas para lo mismo—.
 */

/** Tope por (alumno, competencia). Sin él, pegar enlaces no tiene fondo. */
export const MAX_EVIDENCIAS = 12;

/** Las de un grupo entero, con la competencia desplegada para poder nombrarla. */
export async function evidenciasDelGrupo(grupoId: string): Promise<EvidenciaCompetencia[]> {
  const q = new Parse.Query<EvidenciaCompetencia>('EvidenciaCompetencia');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  q.equalTo('exists' as any, true as any);
  // Sin el include, `competencia.nombre` sale vacío: el puntero llega sin datos.
  q.include('competencia');
  q.include('cita');
  q.ascending('createdAt');
  q.limit(2000);
  return q.find({ useMasterKey: true });
}

/**
 * Con qué llave se agrupan para enseñarlas: la CITA si la tienen, y si no, la
 * competencia a secas —son las que quedaron sueltas al cancelar—.
 */
export function llaveDeEvidencia(e: EvidenciaCompetencia): string {
  const cita = e.getCita()?.id;
  return cita ? `cita:${cita}` : `libre:${e.getCompetencia()?.id ?? 'sin-competencia'}`;
}

/**
 * Agrupa por esa llave, conservando el orden en que vienen.
 *
 * Pura para poder probarla: es la que decide qué evidencia se ve en qué
 * entrevista, y es justo donde un despiste las traslaparía.
 */
export function agruparEvidencias<T>(
  evidencias: T[],
  llave: (e: T) => string,
): Map<string, T[]> {
  const salida = new Map<string, T[]>();
  for (const e of evidencias) {
    const k = llave(e);
    const ya = salida.get(k);
    if (ya) ya.push(e);
    else salida.set(k, [e]);
  }
  return salida;
}

/**
 * Suelta las evidencias de una cita que se cancela, en vez de borrarlas.
 *
 * Quitarles la cita y no la fila es lo que hace que cancelar no cueste el
 * trabajo ya entregado: se quedan en su competencia, el alumno las sigue
 * viendo, y `engancharSueltas` las devuelve a la siguiente cita que reserve.
 */
export async function soltarEvidenciasDeCita(citaId: string): Promise<number> {
  const q = new Parse.Query<EvidenciaCompetencia>('EvidenciaCompetencia');
  q.equalTo('cita' as any, { __type: 'Pointer', className: 'CitaEntrevista', objectId: citaId } as any);
  q.equalTo('exists' as any, true as any);
  q.limit(500);
  const sueltas = await q.find({ useMasterKey: true });
  for (const e of sueltas) e.setCita(null);
  if (sueltas.length > 0) await Parse.Object.saveAll(sueltas, { useMasterKey: true });
  return sueltas.length;
}

/**
 * Engancha a una cita recién creada las evidencias sueltas de su competencia.
 *
 * El alumno que cancela y vuelve a reservar no tiene que pegar otra vez los
 * mismos enlaces. Solo se cogen las que no tienen cita: una evidencia nunca se
 * le quita a una entrevista viva para dársela a otra, que es el traslape que
 * hay que evitar.
 */
export async function engancharSueltas(
  grupoId: string,
  alumnoId: string,
  competenciaId: string,
  cita: Parse.Object,
): Promise<number> {
  const q = new Parse.Query<EvidenciaCompetencia>('EvidenciaCompetencia');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  q.equalTo('alumno' as any, { __type: 'Pointer', className: 'AppUser', objectId: alumnoId } as any);
  q.equalTo('competencia' as any, { __type: 'Pointer', className: 'Competencia', objectId: competenciaId } as any);
  q.doesNotExist('cita' as any);
  q.equalTo('exists' as any, true as any);
  q.limit(MAX_EVIDENCIAS);
  const sueltas = await q.find({ useMasterKey: true });
  for (const e of sueltas) e.setCita(cita as never);
  if (sueltas.length > 0) await Parse.Object.saveAll(sueltas, { useMasterKey: true });
  return sueltas.length;
}
