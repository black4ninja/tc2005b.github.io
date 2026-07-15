/** A dónde mandar a un usuario recién autenticado, según su rol. */
interface UsuarioMin {
  userType: string;
  grupos?: { id: string }[];
}

/**
 * Destino post-login:
 * - alumno con grupo → el calendario de su primer grupo (su área directa).
 * - profesor con grupo → el detalle de su primer grupo (gestiona SU grupo, no ve
 *   el panel admin global).
 * - admin → el panel admin.
 * - profesor sin grupo → /admin como último recurso (verá un estado vacío; no
 *   tiene grupo que gestionar). alumno sin grupo → /alumno.
 */
export function rutaPostLogin(user: UsuarioMin): string {
  const grupoId = user.grupos?.[0]?.id;
  if (user.userType === 'alumno') {
    return grupoId ? `/alumno/grupos/${grupoId}/calendario` : '/alumno';
  }
  if (user.userType === 'profesor') {
    return grupoId ? `/admin/grupos/${grupoId}` : '/admin';
  }
  return user.userType === 'admin' ? '/admin' : '/alumno';
}
