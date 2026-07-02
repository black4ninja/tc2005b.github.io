import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { GrupoAlumno } from '../models/GrupoAlumno.js';

export interface MateriaInfo {
  slug: string;
  nombre: string;
}

/* ── Cache del set de TODOS los slugs (pre-filtro del gate de /docs) ── */
let slugsCache: { value: Set<string>; expires: number } | null = null;
const SLUGS_TTL_MS = 5 * 60 * 1000;

export function invalidateMateriaSlugsCache(): void {
  slugsCache = null;
}

export async function getMateriaSlugs(): Promise<Set<string>> {
  const now = Date.now();
  if (slugsCache && slugsCache.expires > now) return slugsCache.value;

  const q = new Parse.Query('Materia');
  q.equalTo('exists' as any, true as any);
  q.select('slug' as any);
  q.limit(10000);
  const materias = await q.find({ useMasterKey: true });

  const set = new Set<string>();
  for (const m of materias) {
    const slug = m.get('slug');
    if (slug) set.add(slug);
  }
  slugsCache = { value: set, expires: now + SLUGS_TTL_MS };
  return set;
}

/* ── Materias permitidas por usuario: admin ⇒ todas; alumno ⇒ las de sus grupos ── */
export async function getAllowedMaterias(user: AppUser): Promise<MateriaInfo[]> {
  if (user.get('userType') === 'admin') {
    const q = new Parse.Query('Materia');
    q.equalTo('exists' as any, true as any);
    q.ascending('nombre');
    q.limit(10000);
    const materias = await q.find({ useMasterKey: true });
    return materias
      .map((m) => ({ slug: m.get('slug') as string, nombre: (m.get('nombre') as string) ?? m.get('slug') }))
      .filter((m) => !!m.slug);
  }

  // Alumno: acceso = unión de (materia del grupo) + (docusaurus[] del grupo),
  // sobre todos sus GrupoAlumno activos.
  const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(user.id);
  const q = new Parse.Query<GrupoAlumno>('GrupoAlumno');
  q.equalTo('exists' as any, true as any);
  q.equalTo('active' as any, true as any);
  q.equalTo('alumno' as any, alumnoPointer as any);
  q.include('grupo.materia' as any);
  q.limit(1000);
  const links = await q.find({ useMasterKey: true });

  const slugSet = new Set<string>();
  for (const link of links) {
    const grupo = link.get('grupo');
    if (!grupo || grupo.get('exists') === false) continue;
    // Materia asignada (compatibilidad).
    const materia = grupo.get('materia');
    if (materia && materia.get('exists') !== false && materia.get('slug')) {
      slugSet.add(materia.get('slug'));
    }
    // Docusaurus asignados directamente al grupo.
    const docs = grupo.get('docusaurus');
    if (Array.isArray(docs)) {
      for (const s of docs) if (typeof s === 'string' && s) slugSet.add(s);
    }
  }
  if (slugSet.size === 0) return [];

  // Resolver nombres desde Materia; solo los slugs con Materia existente cuentan
  // (son los que el gate reconoce como protegidos).
  const mq = new Parse.Query('Materia');
  mq.containedIn('slug' as any, [...slugSet] as any);
  mq.equalTo('exists' as any, true as any);
  mq.limit(10000);
  const materias = await mq.find({ useMasterKey: true });
  return materias
    .map((m) => ({ slug: m.get('slug') as string, nombre: (m.get('nombre') as string) ?? m.get('slug') }))
    .filter((m) => !!m.slug);
}

/* ── Cache corto por-usuario de slugs permitidos (evita re-query por cada asset) ── */
const allowedCache = new Map<string, { value: Set<string>; expires: number }>();
const ALLOWED_TTL_MS = 60 * 1000;

export async function getAllowedMateriaSlugs(user: AppUser): Promise<Set<string>> {
  const now = Date.now();
  const cached = allowedCache.get(user.id);
  if (cached && cached.expires > now) return cached.value;

  const materias = await getAllowedMaterias(user);
  const set = new Set(materias.map((m) => m.slug));
  allowedCache.set(user.id, { value: set, expires: now + ALLOWED_TTL_MS });
  return set;
}

export function invalidateAllowedCache(userId?: string): void {
  if (userId) allowedCache.delete(userId);
  else allowedCache.clear();
}
