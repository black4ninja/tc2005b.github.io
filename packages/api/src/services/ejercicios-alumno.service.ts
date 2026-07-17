import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { GrupoAlumno } from '../models/GrupoAlumno.js';
import { EjercicioProgramacion } from '../models/EjercicioProgramacion.js';
import { Coleccion } from '../models/Coleccion.js';
import { moduloHabilitado } from '../models/modulos-contenido.js';
import { getGruposDeStaff } from './grupo-admin.service.js';
import { getColeccionesPorSlug, type ColeccionInfo } from './contenidos.service.js';

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
  const acceso = new Map<string, AccesoEjercicios>();

  if (user.get('userType') === 'admin') {
    // El admin puede previsualizar todas las colecciones existentes.
    const porSlug = await getColeccionesPorSlug();
    for (const c of porSlug.values()) {
      acceso.set(c.slug, { coleccion: { id: c.id, slug: c.slug, nombre: c.nombre, clave: c.clave }, grupoId: null });
    }
    return acceso;
  }

  const grupos = await gruposDeAcceso(user);
  for (const grupo of grupos) {
    if (!grupo || grupo.get('exists') === false || grupo.get('active') === false) continue;
    const apagados = grupo.get('modulosDeshabilitados') as Record<string, string[]> | undefined;
    const colecciones: Parse.Object[] = grupo.get('colecciones') ?? [];
    for (const c of colecciones) {
      if (!c || c.get('exists') === false || c.get('publicada') !== true) continue;
      // 'ejercicios' es opt-in: solo si el grupo lo ENCENDIÓ para esta colección.
      if (!moduloHabilitado(apagados, c.id!, 'ejercicios')) continue;
      const slug = c.get('slug');
      if (slug && !acceso.has(slug)) {
        acceso.set(slug, {
          coleccion: { id: c.id, slug, nombre: c.get('nombre') ?? slug, clave: c.get('clave') ?? null },
          grupoId: grupo.id ?? null,
        });
      }
    }
  }
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
