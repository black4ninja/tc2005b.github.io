/**
 * Catálogo de módulos de contenido que una colección puede habilitar por grupo.
 * Espejo de `packages/api/src/models/modulos-contenido.ts`. Los iconos son los
 * mismos que usa el sidebar para cada sección, así el admin reconoce cada parte
 * 1:1 con lo que verá el grupo.
 *
 * Agregar un módulo futuro = una entrada aquí (y su equivalente + gate en el API).
 * El modal de Asignaciones y el sidebar iteran este arreglo, no casos hardcodeados.
 */
export interface ModuloContenido {
  key: string;
  label: string;
  icon: string;
}

export const MODULOS_CONTENIDO: ModuloContenido[] = [
  { key: 'documentacion', label: 'Documentación', icon: 'menu_book' },
  { key: 'paginas', label: 'Páginas', icon: 'article' },
  { key: 'competencias', label: 'Competencias', icon: 'emoji_events' },
  { key: 'actividades', label: 'Actividades', icon: 'assignment' },
];

/** True si el módulo está habilitado para esa colección (default: todo on). */
export function moduloHabilitado(
  modulosDeshabilitados: Record<string, string[]> | undefined,
  coleccionId: string,
  moduloKey: string,
): boolean {
  const off = modulosDeshabilitados?.[coleccionId];
  return !off || !off.includes(moduloKey);
}
