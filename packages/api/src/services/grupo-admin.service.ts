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
