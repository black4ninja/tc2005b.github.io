import Parse from 'parse/node';
import type { AppUser } from '../models/AppUser.js';
import { GrupoAlumno } from '../models/GrupoAlumno.js';
import { isStaffDeGrupo } from './grupo-admin.service.js';

/**
 * ¿Este usuario pertenece a este grupo? Es la regla de «lo que ve la clase»:
 *  - **admin**: sí, siempre (soporte y preview).
 *  - **profesor**: solo los grupos donde figura en `Grupo.admins`.
 *  - **alumno**: solo donde tiene un `GrupoAlumno` activo.
 *
 * Se usa para servir material del calendario (adjuntos de las presentaciones),
 * que es público de LISTA —el calendario se ve sin sesión— pero no de
 * CONTENIDO: el archivo solo lo abre quien está en el grupo.
 */
export async function perteneceAlGrupo(user: AppUser, grupoId: string): Promise<boolean> {
  const rol = user.getUserType();
  if (rol === 'admin') return true;
  if (rol === 'profesor') return isStaffDeGrupo(user.id, grupoId);

  const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(user.id);
  const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId);
  const q = new Parse.Query<GrupoAlumno>('GrupoAlumno');
  q.equalTo('exists' as any, true as any);
  q.equalTo('active' as any, true as any);
  q.equalTo('alumno' as any, alumnoPointer as any);
  q.equalTo('grupo' as any, grupoPointer as any);
  const count = await q.count({ useMasterKey: true });
  return count > 0;
}
