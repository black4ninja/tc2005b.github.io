/**
 * Catálogo de MÓDULOS DE GRUPO: los que se encienden por grupo y NO cuelgan de
 * una colección.
 *
 * Es el hermano de `modulos-contenido.ts` y existe porque aquel no sirve para
 * esto. Allí la key se guarda POR COLECCIÓN (`Grupo.modulosDeshabilitados` es un
 * mapa `coleccionId → keys`) porque lo que se enciende es una parte del
 * contenido de esa materia. "Escenarios" no tiene materia: su banco de preguntas
 * es global y se comparte entre asignaturas, así que la única pregunta que tiene
 * sentido hacerle a un grupo es «¿lo usa o no?».
 *
 * Todos nacen APAGADOS y la lista guardada (`Grupo.modulosGrupo`) enumera lo
 * ENCENDIDO. Cero migración: un grupo sin el campo no tiene ninguno.
 */
export const MODULOS_GRUPO = ['escenarios'] as const;

export type ModuloGrupo = (typeof MODULOS_GRUPO)[number];

export function esModuloGrupoValido(v: unknown): v is ModuloGrupo {
  return typeof v === 'string' && (MODULOS_GRUPO as readonly string[]).includes(v);
}

/**
 * ¿Está encendido `modulo` en este grupo? Puro (recibe la lista, no el Grupo)
 * para poder probarlo sin Parse, igual que `moduloHabilitado`.
 */
export function moduloGrupoHabilitado(
  modulosGrupo: readonly string[] | undefined,
  modulo: ModuloGrupo,
): boolean {
  return !!modulosGrupo && modulosGrupo.includes(modulo);
}

/** Normaliza una lista recibida del cliente: solo keys válidas, sin repetidos. */
export function normalizarModulosGrupo(valor: unknown): ModuloGrupo[] | null {
  if (!Array.isArray(valor)) return null;
  if (valor.some((k) => !esModuloGrupoValido(k))) return null;
  return [...new Set(valor as ModuloGrupo[])];
}
