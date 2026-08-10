import type { AppUser } from '../models/AppUser.js';
import { isStaffDeGrupo } from './grupo-admin.service.js';
import { getVinculoConGrupoActivo } from './grupo-alumno.service.js';

/**
 * ¿Este usuario pertenece a este grupo? Es la regla de «lo que ve la clase»:
 *  - **admin**: sí, siempre (soporte y preview).
 *  - **profesor**: solo los grupos donde figura en `Grupo.admins`.
 *  - **alumno**: solo donde tiene vínculo activo Y el grupo no está bloqueado.
 *
 * El staff conserva el acceso a los grupos bloqueados a propósito: bloquear es
 * para cerrarle la puerta a la clase, no para que el profesor pierda su
 * material del semestre pasado.
 *
 * Se usa para servir material del calendario (adjuntos de las presentaciones),
 * que es público de LISTA —el calendario se ve sin sesión— pero no de
 * CONTENIDO: el archivo solo lo abre quien está en el grupo.
 */
export async function perteneceAlGrupo(user: AppUser, grupoId: string): Promise<boolean> {
  const rol = user.getUserType();
  if (rol === 'admin') return true;
  if (rol === 'profesor') return isStaffDeGrupo(user.id, grupoId);

  return (await getVinculoConGrupoActivo(user.id, grupoId)) !== null;
}
