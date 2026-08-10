import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { GrupoAlumno } from '../models/GrupoAlumno.js';
import { Coleccion } from '../models/Coleccion.js';
import type { ModuloContenido } from '../models/modulos-contenido.js';
import { getGruposDeStaff } from './grupo-admin.service.js';
import { grupoDaAccesoAlumno } from './grupo-alumno.service.js';
import { getColeccionesPorSlug, coleccionVisiblePorModulo, type ColeccionInfo } from './contenidos.service.js';
import { TtlMap } from '../utils/ttl-cache.js';

/**
 * Acceso a un módulo OPT-IN de contenido, común a "Ejercicios" y "Diagramas".
 *
 * Regla base: se accede al contenido de una colección si está asignada a un
 * grupo con ese módulo ENCENDIDO y la colección publicada. Quién "tiene" el
 * grupo depende del rol:
 *  - **admin**: todas las colecciones (preview).
 *  - **profesor**: los grupos donde es staff (`Grupo.admins`) — así prueba el
 *    contenido tal como lo ve su alumno, sin ser alumno.
 *  - **alumno**: sus grupos activos (`GrupoAlumno`).
 * Denegado ⇒ el handler responde 404.
 *
 * Está parametrizado por módulo y no copiado por módulo A PROPÓSITO: es una
 * regla de permisos, y dos implementaciones de la misma regla divergen en cuanto
 * una de las dos se corrige. Lo único que cambia entre módulos es la key.
 */

export interface AccesoModulo {
  coleccion: ColeccionInfo;
  /** Grupo por el que se concede el acceso (para registrar el envío). */
  grupoId: string | null;
}

/**
 * Caché por usuario y por módulo (60 s), como el visor con `getSlugsPermitidos`:
 * el solver dispara varias peticiones seguidas y no hace falta rehacer la query
 * de grupos en cada una.
 *
 * Un mapa por módulo, no uno solo con la key compuesta, para que invalidar por
 * usuario siga siendo una operación directa sobre cada caché.
 */
const caches = new Map<string, TtlMap<Map<string, AccesoModulo>>>();

function cacheDe(modulo: ModuloContenido): TtlMap<Map<string, AccesoModulo>> {
  let c = caches.get(modulo);
  if (!c) {
    c = new TtlMap<Map<string, AccesoModulo>>(60 * 1000);
    caches.set(modulo, c);
  }
  return c;
}

/**
 * Invalida el acceso cacheado de TODOS los módulos.
 *
 * Lo que cambia cuando hay que invalidar —las asignaciones de un grupo o su
 * archivado— afecta a cualquier módulo por igual, así que invalidar por módulo
 * obligaría a acordarse de añadir una llamada por cada módulo nuevo. Es
 * exactamente el olvido que se produjo al añadir el segundo.
 */
export function invalidateAccesoModulos(userId?: string): void {
  for (const c of caches.values()) c.invalidate(userId);
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
  // Un grupo bloqueado (active=false) deja de dar acceso a sus módulos.
  return links.map((l) => l.get('grupo')).filter(grupoDaAccesoAlumno) as Parse.Object[];
}

/** Mapa slug→acceso de las colecciones con ese módulo habilitado para el user. */
export async function resolverAccesoModulo(
  user: AppUser,
  modulo: ModuloContenido,
): Promise<Map<string, AccesoModulo>> {
  const cache = cacheDe(modulo);
  const cached = cache.get(user.id);
  if (cached) return cached;

  const acceso = new Map<string, AccesoModulo>();

  if (user.get('userType') === 'admin') {
    // El admin puede previsualizar todas las colecciones existentes.
    const porSlug = await getColeccionesPorSlug();
    for (const c of porSlug.values()) {
      acceso.set(c.slug, {
        coleccion: { id: c.id, slug: c.slug, nombre: c.nombre, clave: c.clave },
        grupoId: null,
      });
    }
  } else {
    const grupos = await gruposDeAcceso(user);
    for (const grupo of grupos) {
      if (!grupo || grupo.get('exists') === false || grupo.get('active') === false) continue;
      const apagados = grupo.get('modulosDeshabilitados') as Record<string, string[]> | undefined;
      const colecciones: Parse.Object[] = grupo.get('colecciones') ?? [];
      for (const c of colecciones) {
        // Existe + publicada + módulo encendido (opt-in) — regla compartida.
        if (!coleccionVisiblePorModulo(c, apagados, modulo)) continue;
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

  cache.set(user.id, acceso);
  return acceso;
}

/**
 * Colecciones con el módulo habilitado Y con al menos un elemento PUBLICADO (no
 * oculto) de la clase dada. Es lo que decide si el alumno ve la sección: una
 * colección asignada pero sin contenido publicado no debe aparecer vacía.
 */
export async function coleccionesConContenidoPublicado(
  user: AppUser,
  modulo: ModuloContenido,
  claseParse: string,
): Promise<ColeccionInfo[]> {
  const acceso = await resolverAccesoModulo(user, modulo);
  if (acceso.size === 0) return [];

  const pointers = [...acceso.values()].map((a) => Coleccion.createWithoutData(a.coleccion.id));
  const q = new Parse.Query(claseParse);
  q.containedIn('coleccion' as any, pointers as any);
  q.equalTo('publicado' as any, true as any);
  q.notEqualTo('oculto' as any, true as any);
  q.equalTo('exists' as any, true as any);
  q.select('coleccion' as any);
  q.limit(10000);
  const elementos = await q.find({ useMasterKey: true });

  const conContenido = new Set<string>();
  for (const e of elementos) {
    const cid = e.get('coleccion')?.id;
    if (cid) conContenido.add(cid);
  }

  return [...acceso.values()]
    .filter((a) => conContenido.has(a.coleccion.id))
    .map((a) => a.coleccion)
    .sort((x, y) => x.nombre.localeCompare(y.nombre));
}

/**
 * De un conjunto de elementos, cuáles ya RESOLVIÓ el usuario: tiene al menos un
 * envío con veredicto 'aceptado'. Base de la completitud.
 *
 * NO se filtra por `estado`: los envíos del flujo síncrono anterior del juez de
 * código no guardaron ese campo y una igualdad los excluiría, borrando su
 * completitud. El módulo de diagramas no tiene estados, así que la misma regla
 * le sirve tal cual.
 */
export async function elementosResueltos(
  userId: string,
  claseEnvio: string,
  claseElemento: string,
  campoElemento: string,
  elementoIds: string[],
): Promise<Set<string>> {
  const resueltos = new Set<string>();
  if (elementoIds.length === 0) return resueltos;
  // Los punteros necesitan la clase REAL del objeto apuntado; por eso se pasa
  // `claseElemento` en vez de fabricarlos con un nombre genérico.
  const constructor = Parse.Object.extend(claseElemento);
  const q = new Parse.Query(claseEnvio);
  q.equalTo('alumno' as any, AppUser.createWithoutData(userId) as any);
  q.containedIn(
    campoElemento as any,
    elementoIds.map((id) => constructor.createWithoutData(id)) as any,
  );
  q.equalTo('veredicto' as any, 'aceptado' as any);
  q.equalTo('exists' as any, true as any);
  q.select(campoElemento as any);
  q.limit(10000);
  const envios = await q.find({ useMasterKey: true });
  for (const e of envios) {
    const eid = e.get(campoElemento)?.id;
    if (eid) resueltos.add(eid);
  }
  return resueltos;
}
