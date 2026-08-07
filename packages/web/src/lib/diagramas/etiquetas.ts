import type { MotorDiagrama, TipoDiagrama } from '../../types/contenidos';

/**
 * Nombres visibles de tipos y motores de diagrama.
 *
 * Viven aquí, y no dentro de una página, porque el listado y el editor del
 * módulo tienen que pintar exactamente las mismas etiquetas: si una lista dijera
 * "Casos de uso" y la otra "casos-de-uso", el mismo ejercicio parecería de dos
 * clases distintas según desde dónde se mire.
 */

export const TIPOS_DIAGRAMA: { key: TipoDiagrama; label: string }[] = [
  { key: 'clases', label: 'Clases' },
  { key: 'secuencia', label: 'Secuencia' },
  { key: 'estados', label: 'Estados' },
  { key: 'er', label: 'Entidad-relación' },
  { key: 'flujo', label: 'Flujo' },
  { key: 'casos-de-uso', label: 'Casos de uso' },
  { key: 'componentes', label: 'Componentes' },
  { key: 'paquetes', label: 'Paquetes' },
];

export const MOTORES_DIAGRAMA: { key: MotorDiagrama; label: string }[] = [
  { key: 'mermaid', label: 'Mermaid' },
  { key: 'plantuml', label: 'PlantUML' },
];

const ETIQUETA_TIPO = new Map(TIPOS_DIAGRAMA.map((t) => [t.key as string, t.label]));
const ETIQUETA_MOTOR = new Map(MOTORES_DIAGRAMA.map((m) => [m.key as string, m.label]));

/** Cae al valor crudo si el API sirve un tipo que este cliente aún no conoce. */
export function etiquetaTipoDiagrama(tipo: string): string {
  return ETIQUETA_TIPO.get(tipo) ?? tipo;
}

export function etiquetaMotorDiagrama(motor: string): string {
  return ETIQUETA_MOTOR.get(motor) ?? motor;
}
