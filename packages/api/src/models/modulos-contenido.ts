/**
 * Catálogo de MÓDULOS de contenido que una colección puede habilitar por grupo.
 *
 * Un grupo tiene colecciones asignadas (`Grupo.colecciones`) y, por colección,
 * puede APAGAR módulos (`Grupo.modulosDeshabilitados`). Un módulo está habilitado
 * si la colección está asignada y su key NO está en la lista de apagados — por eso
 * se guarda lo apagado, no lo encendido: un módulo NUEVO agregado aquí nace
 * habilitado en todos los grupos existentes (nadie lo tiene apagado) y se puede
 * apagar por grupo, sin migrar nada.
 *
 * Para agregar un módulo futuro: añade una entrada aquí y su gate en el read-path
 * correspondiente. El front espeja este catálogo (packages/web) para renderizar
 * los toggles y las secciones del sidebar.
 */
export const MODULOS_CONTENIDO = ['documentacion', 'paginas', 'competencias', 'actividades'] as const;

export type ModuloContenido = (typeof MODULOS_CONTENIDO)[number];

export function esModuloValido(v: unknown): v is ModuloContenido {
  return typeof v === 'string' && (MODULOS_CONTENIDO as readonly string[]).includes(v);
}

/**
 * ¿Está habilitado `modulo` para `coleccionId` en este grupo? Puro (recibe el
 * mapa `modulosDeshabilitados`, no el Grupo) para poder probarlo sin Parse.
 * Habilitado = la key NO está en la lista de apagados de esa colección. Ausente
 * o sin entrada = habilitado (default todo on).
 */
export function moduloHabilitado(
  modulosDeshabilitados: Record<string, string[]> | undefined,
  coleccionId: string,
  modulo: ModuloContenido,
): boolean {
  const apagados = modulosDeshabilitados?.[coleccionId];
  return !apagados || !apagados.includes(modulo);
}
