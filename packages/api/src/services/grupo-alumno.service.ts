import Parse from 'parse/node';
import { GrupoAlumno } from '../models/GrupoAlumno.js';
import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';

export interface AlumnoConPerfil {
  alumno: AppUser;
  repositorioIndividual: string;
  experiencia: string;
  expectativas: string;
  compromiso: string;
  situacionesEspeciales: string;
  perfilCompleto: boolean;
}

/**
 * Obtiene los alumnos activos de un grupo vía GrupoAlumno,
 * incluyendo los campos de perfil del link GrupoAlumno.
 */
export async function getAlumnosDeGrupo(grupoId: string): Promise<AlumnoConPerfil[]> {
  const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

  const query = new Parse.Query<GrupoAlumno>('GrupoAlumno');
  query.equalTo('exists' as any, true as any);
  query.equalTo('active' as any, true as any);
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
