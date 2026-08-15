import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';
import { getGruposDeAlumnoConPerfil } from './grupo-alumno.service.js';
import { getGruposDeStaff } from './grupo-admin.service.js';

export interface GrupoDeSesion {
  id: string;
  name: string;
  urlAgendaEntrevistas: string | null;
  categoria: { id: string; nombre: string; color: string } | null;
  /** Solo para alumnos: ausente ≠ incompleto. */
  perfilCompleto?: boolean;
}

/**
 * Los grupos que acompañan al usuario en su sesión.
 *
 * Vive en un servicio, y no en el controlador de `auth`, porque hay DOS entradas
 * a la aplicación —enlace mágico y contraseña— y cada una se había construido su
 * propia versión de esta lista. La de contraseña, que es por la que entran los
 * alumnos, mandaba solo `{id, name}`: sin la URL de la agenda, sin el color del
 * selector y, para el profesor, sin grupos (así que al entrar acababa en el
 * panel global en vez de en su grupo). Teniéndolo en un sitio, las dos puertas
 * dan lo mismo.
 */
export async function construirGruposDeSesion(user: AppUser): Promise<GrupoDeSesion[]> {
  // Alumno: sus grupos vía GrupoAlumno. Profesor: los grupos donde está asignado
  // (Grupo.admins) — el front lo manda directo a su grupo al loguear, igual que
  // al alumno. Admin: sin grupos aquí (entra al panel global).
  let grupos: Grupo[];
  // Solo el alumno tiene perfil que rellenar; para el profesor se queda vacío y
  // el campo no aparece, que es distinto de «lo tiene incompleto».
  const perfilPorGrupo = new Map<string, boolean>();
  if (user.isAlumno()) {
    const conPerfil = await getGruposDeAlumnoConPerfil(user.id);
    for (const { grupo, perfilCompleto } of conPerfil) perfilPorGrupo.set(grupo.id, perfilCompleto);
    grupos = conPerfil.map((g) => g.grupo);
  } else if (user.isProfesor()) {
    grupos = await getGruposDeStaff(user.id);
  } else {
    return [];
  }

  return grupos.map((g) => ({
    id: g.id,
    name: g.get('name') ?? '',
    // Lo consume `rutaPostLogin`: con el perfil a medias, el alumno entra al
    // panel (donde está el formulario) y no al calendario.
    ...(perfilPorGrupo.has(g.id) ? { perfilCompleto: perfilPorGrupo.get(g.id) } : {}),
    // El menú enlaza a la agenda de SU grupo; sin URL, el ítem no se muestra
    // (mismo criterio que "Documentación" sin colecciones).
    urlAgendaEntrevistas: g.get('urlAgendaEntrevistas') ?? null,
    // El color del selector de grupo. Se reusa el serializador del grupo para
    // no repetir aquí el filtro de categorías borradas.
    categoria: (g.toSafeJSON().categoria ?? null) as
      | { id: string; nombre: string; color: string }
      | null,
  }));
}
