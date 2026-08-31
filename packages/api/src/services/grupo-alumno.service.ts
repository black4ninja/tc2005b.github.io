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
 * ¿Este grupo sigue dando acceso a sus alumnos?
 *
 * Un grupo con `active: false` está BLOQUEADO: para el alumno es como si no
 * existiera (no aparece en su selector, sus secciones responden 403 y su
 * contenido deja de verse), pero sigue en la BD para el staff. Es la misma
 * regla que el CMS ya aplicaba a las colecciones en `contenidos.service.ts`;
 * aquí se usa en todos los caminos del alumno para que no diverjan.
 */
export function grupoDaAccesoAlumno(grupo: Parse.Object | undefined): boolean {
  if (!grupo) return false;
  return grupo.get('exists') !== false && grupo.get('active') !== false;
}

/**
 * True si el alumno tiene al menos un grupo que le dé acceso: vínculo activo Y
 * grupo sin bloquear. Usado por el login — a quien solo le quedan grupos
 * bloqueados se le trata como al que no tiene ninguno.
 */
export async function hasAnyActiveGrupoForAlumno(alumnoId: string): Promise<boolean> {
  const grupos = await getGruposDeAlumno(alumnoId);
  return grupos.length > 0;
}

/**
 * ¿Este alumno tiene acceso a ESTE grupo?
 *
 * Se responde con la lista de grupos que ya se acaba de leer para validar la
 * sesión, en vez de con una consulta propia. Quien solo necesita el sí o el no
 * —y es casi todo el mundo— se ahorra así un viaje entero.
 */
export async function alumnoTieneAccesoAGrupo(
  alumnoId: string,
  grupoId: string,
): Promise<boolean> {
  return (await getGruposDeAlumno(alumnoId)).some((g) => g.id === grupoId);
}

/**
 * Vínculo del alumno con un grupo que le dé acceso, o `null`. Reúne las dos
 * condiciones que antes se comprobaban por separado —vínculo activo y grupo no
 * bloqueado— para que ningún endpoint del alumno se deje una.
 */
export async function getVinculoConGrupoActivo(
  alumnoId: string,
  grupoId: string,
): Promise<GrupoAlumno | null> {
  const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId) as AppUser;
  const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

  const query = new Parse.Query<GrupoAlumno>('GrupoAlumno');
  query.equalTo('exists' as any, true as any);
  query.equalTo('active' as any, true as any);
  query.equalTo('alumno' as any, alumnoPointer as any);
  query.equalTo('grupo' as any, grupoPointer as any);
  query.include('grupo' as any);
  const link = await query.first({ useMasterKey: true });

  if (!link || !grupoDaAccesoAlumno(link.getGrupo())) return null;
  return link;
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
 * Grupos que el alumno puede usar: vínculo activo y grupo sin bloquear. Un
 * grupo bloqueado desaparece de aquí, y con ello del selector del alumno: al
 * recargar, `GrupoActivoContext` ve que su grupo recordado ya no está en la
 * lista y salta al primero disponible.
 */
export async function getGruposDeAlumno(alumnoId: string): Promise<Grupo[]> {
  return (await getGruposDeAlumnoConPerfil(alumnoId)).map((g) => g.grupo);
}

/**
 * Lo mismo, pero diciendo además si el alumno YA rellenó el perfil de cada uno.
 *
 * El perfil es POR GRUPO: quien lleva un semestre en la plataforma y entra a un
 * grupo nuevo vuelve a tenerlo incompleto, y con él a medias el menú le deja en
 * gris casi todo. Ese dato lo trae el mismo vínculo que ya se está leyendo, así
 * que sale gratis; sin él, quien decide a dónde mandar al alumno al entrar no
 * puede saber si tiene algo que rellenar.
 */
/**
 * Los grupos de un alumno, recién leídos, guardados un instante.
 *
 * Esta consulta lleva DOS niveles de include y contra una base remota sale por
 * medio segundo. Cada petición de un alumno la hacía dos veces —una al validar
 * la sesión y otra al evaluar el permiso—, así que antes de empezar a trabajar
 * ya se había ido un segundo. El grano es de segundos, no de minutos: lo justo
 * para que las dos de la MISMA petición sean una, sin que dar de alta o de baja
 * a alguien tarde en notarse. Y cuando la plataforma toca un vínculo, lo olvida
 * a mano.
 */
const VIGENCIA_GRUPOS_MS = 3000;
const cacheGrupos = new Map<string, { hasta: number; valor: { grupo: Grupo; perfilCompleto: boolean }[] }>();

/** Olvida lo que se sepa de un alumno. Al dar de alta, de baja o tocar su perfil. */
export function olvidarGruposDeAlumno(alumnoId: string): void {
  cacheGrupos.delete(alumnoId);
}

export async function getGruposDeAlumnoConPerfil(
  alumnoId: string,
): Promise<{ grupo: Grupo; perfilCompleto: boolean }[]> {
  const guardado = cacheGrupos.get(alumnoId);
  if (guardado && guardado.hasta > Date.now()) return guardado.valor;

  const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId) as AppUser;

  const query = new Parse.Query<GrupoAlumno>('GrupoAlumno');
  query.equalTo('exists' as any, true as any);
  query.equalTo('active' as any, true as any);
  query.equalTo('alumno' as any, alumnoPointer as any);
  query.include('grupo' as any);
  // Dos niveles: el color del selector vive en la categoría del grupo, y sin
  // esto llegaría como pointer sin desplegar (y el selector, en gris).
  query.include('grupo.categoria' as any);
  query.limit(1000);
  const links = await query.find({ useMasterKey: true });

  const grupos: { grupo: Grupo; perfilCompleto: boolean }[] = [];
  for (const link of links) {
    const grupo = link.getGrupo() as Grupo | undefined;
    if (grupoDaAccesoAlumno(grupo)) {
      grupos.push({ grupo: grupo!, perfilCompleto: link.getPerfilCompleto() });
    }
  }
  cacheGrupos.set(alumnoId, { hasta: Date.now() + VIGENCIA_GRUPOS_MS, valor: grupos });
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
  olvidarGruposDeAlumno(alumno.id!);

  return link;
}
