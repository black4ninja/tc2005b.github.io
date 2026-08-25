/**
 * Catálogo de módulos que se encienden POR GRUPO y no cuelgan de una colección.
 * Espejo de `packages/api/src/models/modulos-grupo.ts`.
 *
 * Se separan de `modulosContenido` porque lo que se guarda es distinto: aquellos
 * son un mapa por colección con overrides al default de cada módulo; estos, una
 * lista plana de lo ENCENDIDO (todos nacen apagados).
 */
export interface ModuloGrupo {
  key: string;
  label: string;
  icon: string;
  /** Frase corta que explica qué enciende. El módulo no se explica solo. */
  ayuda: string;
}

export const MODULOS_GRUPO: ModuloGrupo[] = [
  {
    key: 'escenarios',
    label: 'Escenarios',
    icon: 'quiz',
    ayuda: 'Banco de preguntas para entrevistas personales. Solo lo ve el profesor.',
  },
];

export function moduloGrupoHabilitado(
  modulosGrupo: readonly string[] | undefined,
  key: string,
): boolean {
  return !!modulosGrupo && modulosGrupo.includes(key);
}
