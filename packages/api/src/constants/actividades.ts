/** Tipos de actividad admitidos en el calendario. */
export const TIPOS_ACTIVIDAD = [
  'lab', 'lectura', 'ejercicio', 'proyecto',
  'evaluacion', 'break', 'asueto', 'trabajo',
  'discusion', 'info', 'presentacion',
] as const;

export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

export function esTipoActividad(valor: unknown): valor is TipoActividad {
  return typeof valor === 'string' && (TIPOS_ACTIVIDAD as readonly string[]).includes(valor);
}
