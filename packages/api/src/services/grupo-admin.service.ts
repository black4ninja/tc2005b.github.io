import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Grupo } from '../models/Grupo.js';

/**
 * Relación staff↔grupo: un admin o profesor asignado a un grupo figura en
 * `Grupo.admins` (array de pointers a AppUser). No hay tabla-enlace; la
 * asignación es la misma para admin y profesor. La diferencia de PODER está en
 * los guards (un admin ve todo; un profesor, solo estos grupos).
 */

/** Grupos ACTIVOS donde el usuario figura en `admins`. */
export async function getGruposDeStaff(userId: string): Promise<Grupo[]> {
  const userPointer = Parse.Object.extend('AppUser').createWithoutData(userId);
  const query = BaseModel.queryActive<Grupo>('Grupo');
  query.equalTo('admins' as any, userPointer as any);
  query.include('colecciones' as any);
  query.include('admins' as any);
  query.descending('createdAt');
  query.limit(1000);
  return query.find({ useMasterKey: true });
}

/** True si el usuario figura en `admins` del grupo indicado (grupo activo). */
export async function isStaffDeGrupo(userId: string, grupoId: string): Promise<boolean> {
  const userPointer = Parse.Object.extend('AppUser').createWithoutData(userId);
  const query = BaseModel.queryActive<Grupo>('Grupo');
  query.equalTo('objectId' as any, grupoId as any);
  query.equalTo('admins' as any, userPointer as any);
  const count = await query.count({ useMasterKey: true });
  return count > 0;
}

/**
 * Restringe una query de un sub-recurso a los que pertenecen al grupo dado.
 * Se aplica ANTES de `.get(subId)`: Parse respeta los constraints en `.get`, así
 * que un sub-recurso de OTRO grupo lanza OBJECT_NOT_FOUND (→ 404) en vez de
 * cargarse. Cierra el hueco de cruzar ids de grupos: un profesor con acceso al
 * grupo A no puede tocar la entrevista/equipo/… de B pasando su id en la URL.
 */
export function scopeGrupo<T extends Parse.Object>(query: Parse.Query<T>, grupoId: string): void {
  const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId);
  query.equalTo('grupo' as any, grupoPointer as any);
}

/**
 * True si existe un objeto activo `className` con ese id Y perteneciente al
 * grupo. Para validar ids que llegan en el BODY (p. ej. el equipoId de una
 * entrevista): que no se referencie un recurso de otro grupo.
 */
export async function existeEnGrupo(className: string, id: string, grupoId: string): Promise<boolean> {
  const query = BaseModel.queryActive(className);
  query.equalTo('objectId' as any, id as any);
  scopeGrupo(query, grupoId);
  const count = await query.count({ useMasterKey: true });
  return count > 0;
}
