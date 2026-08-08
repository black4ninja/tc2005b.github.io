import type { Motor } from './catalogo.js';

export declare const PLANTILLAS: Record<string, Partial<Record<Motor, string>>>;

/** Motores que saben DIBUJAR ese tipo, es decir, en los que tiene plantilla. */
export declare function motoresDe(key: string): Motor[];

/** Esqueleto de arranque, o cadena vacía si esa combinación no se dibuja. */
export declare function plantilla(key: string, motor: string): string;

/**
 * Motor que hay que elegir para un tipo cuando no viene uno válido: el del juez
 * si lo tiene, y si no el primero que lo dibuja. Nunca `motoresDe(...)[0]`.
 */
export declare function motorPorOmision(key: string): Motor;
