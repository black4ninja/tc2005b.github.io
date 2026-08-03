import { AppUser } from '../models/AppUser.js';
import {
  coleccionesConContenidoPublicado,
  elementosResueltos,
  resolverAccesoModulo,
  type AccesoModulo,
} from './acceso-modulos.service.js';
import type { ColeccionInfo } from './contenidos.service.js';

/**
 * Acceso al módulo "Ejercicios" (opt-in).
 *
 * La regla en sí vive en `acceso-modulos.service.ts`, parametrizada por módulo:
 * "Diagramas" aplica exactamente la misma y mantener dos copias de una regla de
 * permisos garantiza que diverjan en cuanto se corrija una. Aquí solo queda la
 * especialización de este módulo —su key y sus clases de Parse— y los nombres
 * que ya usaban sus llamadores.
 */

export type AccesoEjercicios = AccesoModulo;

/** Mapa slug→acceso de las colecciones con ejercicios habilitados para el user. */
export function resolverAccesoEjercicios(user: AppUser): Promise<Map<string, AccesoEjercicios>> {
  return resolverAccesoModulo(user, 'ejercicios');
}

/**
 * Colecciones con ejercicios habilitados Y con al menos un ejercicio PUBLICADO
 * (no oculto). Es lo que decide si el alumno ve la sección "Ejercicios": una
 * colección asignada pero sin ejercicios publicados no debe aparecer vacía.
 */
export function coleccionesConEjerciciosPublicados(user: AppUser): Promise<ColeccionInfo[]> {
  return coleccionesConContenidoPublicado(user, 'ejercicios', 'EjercicioProgramacion');
}

/**
 * De un conjunto de ejercicios, cuáles ya RESOLVIÓ el usuario: tiene al menos un
 * envío con veredicto 'aceptado'. Base de la completitud.
 */
export function ejerciciosResueltos(userId: string, ejercicioIds: string[]): Promise<Set<string>> {
  return elementosResueltos(userId, 'EnvioEjercicio', 'EjercicioProgramacion', 'ejercicio', ejercicioIds);
}
