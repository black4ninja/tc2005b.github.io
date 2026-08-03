import { AppUser } from '../models/AppUser.js';
import {
  coleccionesConContenidoPublicado,
  elementosResueltos,
  resolverAccesoModulo,
  type AccesoModulo,
} from './acceso-modulos.service.js';
import type { ColeccionInfo } from './contenidos.service.js';

/**
 * Acceso al módulo "Diagramas" (opt-in).
 *
 * La regla vive en `acceso-modulos.service.ts` y es la MISMA que la de
 * Ejercicios; aquí solo se fija la key del módulo y las clases de Parse. Si
 * mañana cambia quién puede ver qué, se cambia en un sitio y los dos módulos
 * quedan iguales.
 */

export type AccesoDiagramas = AccesoModulo;

/** Mapa slug→acceso de las colecciones con diagramas habilitados para el user. */
export function resolverAccesoDiagramas(user: AppUser): Promise<Map<string, AccesoDiagramas>> {
  return resolverAccesoModulo(user, 'diagramas');
}

/**
 * Colecciones con diagramas habilitados Y con al menos un ejercicio PUBLICADO.
 * Decide si el alumno ve la sección: una colección sin ejercicios publicados no
 * debe aparecer vacía.
 */
export function coleccionesConDiagramasPublicados(user: AppUser): Promise<ColeccionInfo[]> {
  return coleccionesConContenidoPublicado(user, 'diagramas', 'EjercicioDiagrama');
}

/** De un conjunto de ejercicios de diagrama, cuáles ya resolvió el usuario. */
export function diagramasResueltos(userId: string, ejercicioIds: string[]): Promise<Set<string>> {
  return elementosResueltos(userId, 'EnvioDiagrama', 'EjercicioDiagrama', 'ejercicio', ejercicioIds);
}
