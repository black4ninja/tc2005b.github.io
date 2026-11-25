import { normalizarHora } from './agenda-staff.js';

/**
 * Hora y responsables de una actividad del calendario.
 *
 * Una actividad SIN hora usa la de la clase del grupo (`Grupo.horarioClase`) y
 * comparte el bloque de la sesión con las demás actividades sin hora. Con hora
 * propia es su propio evento en «Mi agenda» y en el `.ics`.
 *
 * Una actividad SIN responsables es de todos (o no se ha dicho): es el valor
 * por defecto, y así las actividades anteriores al campo siguen igual. Los ids
 * son de `AppUser` y tienen que estar en el staff del grupo (`Grupo.admins`).
 */

/**
 * `responsables` del body → lista limpia, o 'invalido' (400). `null` o `[]`
 * vuelven a «todos». Cualquier id fuera del staff del grupo invalida todo: no
 * se asigna una actividad a alguien que no da el grupo.
 */
export function normalizarResponsables(valor: unknown, staff: Set<string>): string[] | 'invalido' {
  if (valor === null) return [];
  if (!Array.isArray(valor)) return 'invalido';
  const unicos = [...new Set(valor)];
  if (unicos.some((id) => typeof id !== 'string' || !staff.has(id))) return 'invalido';
  return unicos as string[];
}

/**
 * `horaInicio` + `horaFin` del body → franja limpia, `null` (sin hora propia)
 * o 'invalido'. Van las dos o ninguna; vacías o `null` borran la hora. El
 * inicio tiene que ser anterior al fin.
 */
export function normalizarFranjaActividad(
  inicio: unknown,
  fin: unknown,
): { inicio: string; fin: string } | null | 'invalido' {
  const vacio = (v: unknown) => v === null || v === '';
  if (vacio(inicio) && vacio(fin)) return null;
  const i = normalizarHora(inicio);
  const f = normalizarHora(fin);
  if (!i || !f || i >= f) return 'invalido';
  return { inicio: i, fin: f };
}

/** Ids del staff (Grupo.admins) de un grupo. */
export function staffDelGrupo(grupo: { get(attr: string): unknown } | undefined): Set<string> {
  const admins = (grupo?.get('admins') ?? []) as ({ id?: string } | null)[];
  return new Set(admins.map((a) => a?.id).filter((x): x is string => !!x));
}
