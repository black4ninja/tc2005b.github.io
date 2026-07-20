import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { GrupoAlumno } from '../models/GrupoAlumno.js';
import { EjercicioProgramacion } from '../models/EjercicioProgramacion.js';
import { EnvioEjercicio } from '../models/EnvioEjercicio.js';
import { Coleccion } from '../models/Coleccion.js';
import { getGruposDeStaff } from './grupo-admin.service.js';
import { getColeccionesPorSlug, coleccionVisiblePorModulo, type ColeccionInfo } from './contenidos.service.js';
import { TtlMap } from '../utils/ttl-cache.js';

/**
 * Acceso al módulo "Ejercicios" (opt-in). Regla base: se accede a los ejercicios
 * de una colección si está asignada a un grupo con el módulo 'ejercicios'
 * ENCENDIDO y la colección publicada. Quién "tiene" el grupo depende del rol:
 *  - **admin**: todas las colecciones (preview).
 *  - **profesor**: los grupos donde es staff (`Grupo.admins`) — así prueba los
 *    ejercicios tal como los ve su alumno, sin ser alumno.
 *  - **alumno**: sus grupos activos (`GrupoAlumno`).
 * Denegado ⇒ el handler responde 404.
 */

export interface AccesoEjercicios {
  coleccion: ColeccionInfo;
  /** Grupo por el que se concede el acceso (para registrar el envío). */
  grupoId: string | null;
}

/* Caché por-usuario del acceso (60 s), como el visor con getSlugsPermitidos: el
 * solver dispara varias peticiones (get/ejecutar/enviar) y no hace falta rehacer
 * la query de grupos en cada una. Se invalida al cambiar asignaciones. */
const accesoCache = new TtlMap<Map<string, AccesoEjercicios>>(60 * 1000);

export function invalidateAccesoEjercicios(userId?: string): void {
  accesoCache.invalidate(userId);
}

/** Grupos (objetos Parse con `colecciones`) que dan acceso según el rol. */
async function gruposDeAcceso(user: AppUser): Promise<Parse.Object[]> {
  if (user.get('userType') === 'profesor') {
    return getGruposDeStaff(user.id);
  }
  // Alumno: sus grupos vía GrupoAlumno activo.
  const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(user.id);
  const q = new Parse.Query<GrupoAlumno>('GrupoAlumno');
  q.equalTo('exists' as any, true as any);
  q.equalTo('active' as any, true as any);
  q.equalTo('alumno' as any, alumnoPointer as any);
  q.include('grupo.colecciones' as any);
  q.limit(1000);
  const links = await q.find({ useMasterKey: true });
  return links.map((l) => l.get('grupo')).filter(Boolean) as Parse.Object[];
}

/** Mapa slug→acceso de las colecciones con ejercicios habilitados para el user. */
export async function resolverAccesoEjercicios(user: AppUser): Promise<Map<string, AccesoEjercicios>> {
  const cached = accesoCache.get(user.id);
  if (cached) return cached;

  const acceso = new Map<string, AccesoEjercicios>();

  if (user.get('userType') === 'admin') {
    // El admin puede previsualizar todas las colecciones existentes.
    const porSlug = await getColeccionesPorSlug();
    for (const c of porSlug.values()) {
      acceso.set(c.slug, { coleccion: { id: c.id, slug: c.slug, nombre: c.nombre, clave: c.clave }, grupoId: null });
    }
  } else {
    const grupos = await gruposDeAcceso(user);
    for (const grupo of grupos) {
      if (!grupo || grupo.get('exists') === false || grupo.get('active') === false) continue;
      const apagados = grupo.get('modulosDeshabilitados') as Record<string, string[]> | undefined;
      const colecciones: Parse.Object[] = grupo.get('colecciones') ?? [];
      for (const c of colecciones) {
        // Existe + publicada + 'ejercicios' encendido (opt-in) — regla compartida.
        if (!coleccionVisiblePorModulo(c, apagados, 'ejercicios')) continue;
        const slug = c.get('slug');
        if (slug && !acceso.has(slug)) {
          acceso.set(slug, {
            coleccion: { id: c.id, slug, nombre: c.get('nombre') ?? slug, clave: c.get('clave') ?? null },
            grupoId: grupo.id ?? null,
          });
        }
      }
    }
  }

  accesoCache.set(user.id, acceso);
  return acceso;
}

/**
 * Colecciones con ejercicios habilitados Y con al menos un ejercicio PUBLICADO
 * (no oculto). Es lo que decide si el alumno ve la sección "Ejercicios": una
 * colección asignada pero sin ejercicios publicados no debe aparecer vacía.
 */
export async function coleccionesConEjerciciosPublicados(user: AppUser): Promise<ColeccionInfo[]> {
  const acceso = await resolverAccesoEjercicios(user);
  if (acceso.size === 0) return [];

  const pointers = [...acceso.values()].map((a) => Coleccion.createWithoutData(a.coleccion.id));
  const q = new Parse.Query<EjercicioProgramacion>('EjercicioProgramacion');
  q.containedIn('coleccion' as any, pointers as any);
  q.equalTo('publicado' as any, true as any);
  q.notEqualTo('oculto' as any, true as any);
  q.equalTo('exists' as any, true as any);
  q.select('coleccion' as any);
  q.limit(10000);
  const ejercicios = await q.find({ useMasterKey: true });

  const conEjercicios = new Set<string>();
  for (const e of ejercicios) {
    const cid = e.get('coleccion')?.id;
    if (cid) conEjercicios.add(cid);
  }

  return [...acceso.values()]
    .filter((a) => conEjercicios.has(a.coleccion.id))
    .map((a) => a.coleccion)
    .sort((x, y) => x.nombre.localeCompare(y.nombre));
}

/**
 * De un conjunto de ejercicios, cuáles ya RESOLVIÓ el usuario: tiene al menos un
 * envío con veredicto 'aceptado' y estado 'listo'. Base de la completitud.
 */
export async function ejerciciosResueltos(userId: string, ejercicioIds: string[]): Promise<Set<string>> {
  const resueltos = new Set<string>();
  if (ejercicioIds.length === 0) return resueltos;
  const pointers = ejercicioIds.map((id) => EjercicioProgramacion.createWithoutData(id));
  const q = new Parse.Query<EnvioEjercicio>('EnvioEjercicio');
  q.equalTo('alumno' as any, AppUser.createWithoutData(userId) as any);
  q.containedIn('ejercicio' as any, pointers as any);
  // Un veredicto 'aceptado' implica que ya se evaluó (estado listo). NO se filtra
  // por `estado`: los envíos del flujo síncrono anterior no guardaron ese campo y
  // una igualdad los excluiría, borrando su completitud (retrocompat).
  q.equalTo('veredicto' as any, 'aceptado' as any);
  q.equalTo('exists' as any, true as any);
  q.select('ejercicio' as any);
  q.limit(10000);
  const envios = await q.find({ useMasterKey: true });
  for (const e of envios) {
    const eid = e.get('ejercicio')?.id;
    if (eid) resueltos.add(eid);
  }
  return resueltos;
}
