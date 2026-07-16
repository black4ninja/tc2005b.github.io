import Parse from 'parse/node';
import { GrupoAlumno } from '../models/GrupoAlumno.js';
import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';

export interface AlumnoConPerfil {
  alumno: AppUser;
  active: boolean;
  repositorioIndividual: string;
  experiencia: string;
  expectativas: string;
  compromiso: string;
  situacionesEspeciales: string;
  perfilCompleto: boolean;
}

/**
 * Obtiene los alumnos de un grupo vía GrupoAlumno.
 * Por defecto solo activos. Pasar { includeInactive: true } para incluir alumnos
 * dados de baja del grupo (soft-delete via active=false). El campo `active` del
 * resultado refleja el estado del LINK GrupoAlumno (no de AppUser).
 */
export async function getAlumnosDeGrupo(
  grupoId: string,
  options: { includeInactive?: boolean } = {},
): Promise<AlumnoConPerfil[]> {
  const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

  const query = new Parse.Query<GrupoAlumno>('GrupoAlumno');
  query.equalTo('exists' as any, true as any);
  if (!options.includeInactive) {
    query.equalTo('active' as any, true as any);
  }
  query.equalTo('grupo' as any, grupoPointer as any);
  query.include('alumno' as any);
  query.limit(1000);
  const links = await query.find({ useMasterKey: true });

  const result: AlumnoConPerfil[] = [];
  for (const link of links) {
    const alumno = link.getAlumno() as AppUser | undefined;
    if (alumno && alumno.get('exists') === true) {
      result.push({
        alumno,
        active: link.get('active') === true,
        repositorioIndividual: link.getRepositorioIndividual(),
        experiencia: link.getExperiencia(),
        expectativas: link.getExpectativas(),
        compromiso: link.getCompromiso(),
        situacionesEspeciales: link.getSituacionesEspeciales(),
        perfilCompleto: link.getPerfilCompleto(),
      });
    }
  }
  return result;
}

/**
 * True si el alumno tiene al menos un GrupoAlumno activo (i.e. NO ha sido dado de
 * baja de todos sus grupos). Usado por el flujo de login para bloquear el acceso
 * de alumnos sin grupos activos.
 */
export async function hasAnyActiveGrupoForAlumno(alumnoId: string): Promise<boolean> {
  const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId) as AppUser;

  const query = new Parse.Query<GrupoAlumno>('GrupoAlumno');
  query.equalTo('exists' as any, true as any);
  query.equalTo('active' as any, true as any);
  query.equalTo('alumno' as any, alumnoPointer as any);
  query.limit(1);
  const count = await query.count({ useMasterKey: true });
  return count > 0;
}

/**
 * Conjunto de ids de alumnos del grupo (incluye dados de baja: un equipo puede
 * conservar a un alumno inactivo). Sirve para validar que los `miembros` que
 * llegan en el body sean del grupo — que no se cuele un alumno de OTRO grupo.
 */
export async function alumnoIdsDeGrupo(grupoId: string): Promise<Set<string>> {
  const alumnos = await getAlumnosDeGrupo(grupoId, { includeInactive: true });
  return new Set(alumnos.map((a) => a.alumno.id));
}

/**
 * Busca un link GrupoAlumno existente (incluye inactivos/soft-deleted).
 */
export async function findGrupoAlumnoLink(
  alumnoId: string,
  grupoId: string,
): Promise<GrupoAlumno | undefined> {
  const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId) as AppUser;
  const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

  const query = new Parse.Query<GrupoAlumno>('GrupoAlumno');
  query.equalTo('alumno' as any, alumnoPointer as any);
  query.equalTo('grupo' as any, grupoPointer as any);
  const link = await query.first({ useMasterKey: true });
  return link ?? undefined;
}

/**
 * Obtiene los grupos activos de un alumno vía GrupoAlumno.
 */
export async function getGruposDeAlumno(alumnoId: string): Promise<Grupo[]> {
  const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId) as AppUser;

  const query = new Parse.Query<GrupoAlumno>('GrupoAlumno');
  query.equalTo('exists' as any, true as any);
  query.equalTo('active' as any, true as any);
  query.equalTo('alumno' as any, alumnoPointer as any);
  query.include('grupo' as any);
  query.limit(1000);
  const links = await query.find({ useMasterKey: true });

  const grupos: Grupo[] = [];
  for (const link of links) {
    const grupo = link.getGrupo() as Grupo | undefined;
    if (grupo && grupo.get('exists') === true) {
      grupos.push(grupo);
    }
  }
  return grupos;
}

/**
 * Crea un link GrupoAlumno entre alumno y grupo.
 */
export async function createGrupoAlumnoLink(
  alumno: AppUser,
  grupoPointer: Grupo,
): Promise<GrupoAlumno> {
  const link = new GrupoAlumno().initDefaults();
  link.setAlumno(alumno);
  link.setGrupo(grupoPointer);
  await link.save(null, { useMasterKey: true });

  return link;
}
