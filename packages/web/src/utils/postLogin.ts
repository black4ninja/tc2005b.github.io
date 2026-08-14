/** A dónde mandar a un usuario recién autenticado, según su rol. */
interface GrupoMin {
  id: string;
  /**
   * ¿Ya rellenó el perfil de ESTE grupo? Solo viene para alumnos. `undefined`
   * = no se sabe (profesor, o una respuesta vieja): se trata como completo, que
   * es el comportamiento de siempre.
   */
  perfilCompleto?: boolean;
}

interface UsuarioMin {
  userType: string;
  grupos?: GrupoMin[];
  /** Último grupo que tenía abierto; el mismo que elegirá `GrupoActivoContext`. */
  ultimoGrupoId?: string;
}

/**
 * Con qué grupo se le reabre la sesión al alumno.
 *
 * Tiene que coincidir con lo que hace `GrupoActivoContext`, o el destino y el
 * grupo activo saldrían distintos: el menú diría un grupo y la página abierta
 * estaría enseñando otro.
 */
export function grupoDeEntrada(user: UsuarioMin): GrupoMin | null {
  const grupos = user.grupos ?? [];
  if (grupos.length === 0) return null;
  const recordado = grupos.find((g) => g.id === user.ultimoGrupoId);
  return recordado ?? grupos[0];
}

/**
 * Destino post-login:
 * - alumno con el perfil del grupo SIN rellenar → su panel.
 * - alumno con grupo → el calendario de ese grupo (su área directa).
 * - profesor con grupo → el detalle de su primer grupo (gestiona SU grupo, no ve
 *   el panel admin global).
 * - admin → el panel admin.
 * - profesor sin grupo → /admin como último recurso (verá un estado vacío; no
 *   tiene grupo que gestionar). alumno sin grupo → /alumno.
 *
 * Lo del perfil incompleto es lo que reportaron los alumnos: entrar al
 * calendario con casi todo el menú en gris y sin ninguna pista de que lo que
 * falta es rellenar el formulario del panel. El calendario no lo dice porque no
 * está bloqueado, y los ítems bloqueados no se pueden pulsar para enterarse.
 */
export function rutaPostLogin(user: UsuarioMin): string {
  if (user.userType === 'alumno') {
    const grupo = grupoDeEntrada(user);
    if (!grupo) return '/alumno';
    // Solo con un `false` explícito: si el dato no viene, no se cambia nada.
    if (grupo.perfilCompleto === false) return '/alumno';
    return `/alumno/grupos/${grupo.id}/calendario`;
  }
  if (user.userType === 'profesor') {
    const grupoId = user.grupos?.[0]?.id;
    return grupoId ? `/admin/grupos/${grupoId}` : '/admin';
  }
  return user.userType === 'admin' ? '/admin' : '/alumno';
}
