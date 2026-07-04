import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { Coleccion } from '../models/Coleccion.js';
import { GrupoAlumno } from '../models/GrupoAlumno.js';
import { TtlValue, TtlMap } from '../utils/ttl-cache.js';

/**
 * Permisos de lectura del CMS "Contenidos" (design §2) — patrón calcado de
 * cache global corto del mapa de slugs + cache por usuario
 * de colecciones permitidas, ambos con invalidación explícita.
 * Regla: admin ⇒ todas las colecciones; alumno ⇒ SOLO las publicadas
 * asignadas a sus grupos ACTIVOS (Grupo.colecciones). Denegado ⇒ 404.
 */

export interface ColeccionInfo {
  id: string;
  slug: string;
  nombre: string;
  clave: string | null;
}

/* ── Cache global: slug → info de TODAS las colecciones existentes (5 min) ── */
const slugsCache = new TtlValue<Map<string, ColeccionInfo & { publicada: boolean }>>(5 * 60 * 1000);

export function invalidateColeccionSlugsCache(): void {
  slugsCache.invalidate();
}

export async function getColeccionesPorSlug(): Promise<Map<string, ColeccionInfo & { publicada: boolean }>> {
  const cached = slugsCache.get();
  if (cached) return cached;

  const q = new Parse.Query<Coleccion>('Coleccion');
  q.equalTo('exists' as any, true as any);
  q.limit(10000);
  const colecciones = await q.find({ useMasterKey: true });

  const map = new Map<string, ColeccionInfo & { publicada: boolean }>();
  for (const c of colecciones) {
    const slug = c.getSlug();
    if (!slug) continue;
    map.set(slug, {
      id: c.id,
      slug,
      nombre: c.getNombre(),
      clave: c.getClave() ?? null,
      publicada: c.getPublicada(),
    });
  }
  slugsCache.set(map);
  return map;
}

/* ── Colecciones permitidas por usuario ── */
export async function getColeccionesPermitidas(user: AppUser): Promise<ColeccionInfo[]> {
  const porSlug = await getColeccionesPorSlug();

  if (user.get('userType') === 'admin') {
    // Admin ve todas (incluidas borradores) — matriz de permisos del diseño.
    return [...porSlug.values()]
      .map(({ publicada: _p, ...info }) => info)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  // Alumno: unión de Grupo.colecciones de sus grupos ACTIVOS, solo publicadas.
  const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(user.id);
  const q = new Parse.Query<GrupoAlumno>('GrupoAlumno');
  q.equalTo('exists' as any, true as any);
  q.equalTo('active' as any, true as any);
  q.equalTo('alumno' as any, alumnoPointer as any);
  q.include('grupo.colecciones' as any);
  q.limit(1000);
  const links = await q.find({ useMasterKey: true });

  const permitidas = new Map<string, ColeccionInfo>();
  for (const link of links) {
    const grupo = link.get('grupo');
    // Un grupo archivado (active=false) deja de dar acceso: fin de semestre.
    if (!grupo || grupo.get('exists') === false || grupo.get('active') === false) continue;
    const colecciones: Parse.Object[] = grupo.get('colecciones') ?? [];
    for (const c of colecciones) {
      if (!c || c.get('exists') === false) continue;
      if (c.get('publicada') !== true) continue; // borradores no son visibles
      const slug = c.get('slug');
      if (slug && !permitidas.has(slug)) {
        permitidas.set(slug, {
          id: c.id,
          slug,
          nombre: c.get('nombre') ?? slug,
          clave: c.get('clave') ?? null,
        });
      }
    }
  }
  return [...permitidas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/* ── Cache corto por-usuario de slugs permitidos (60 s) ── */
const allowedCache = new TtlMap<Set<string>>(60 * 1000);

export async function getSlugsPermitidos(user: AppUser): Promise<Set<string>> {
  const cached = allowedCache.get(user.id);
  if (cached) return cached;

  const colecciones = await getColeccionesPermitidas(user);
  const set = new Set(colecciones.map((c) => c.slug));
  allowedCache.set(user.id, set);
  return set;
}

export function invalidateColeccionesPermitidas(userId?: string): void {
  allowedCache.invalidate(userId);
}
