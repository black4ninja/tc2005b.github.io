import { esDiaValido, type DiaSemana } from '../constants/dias.js';

/**
 * Quién imparte cada día de clase de una semana: `{ lunes: [idProfesor, …] }`.
 *
 * Un día SIN entrada lo imparten todos (o no se ha dicho): es el valor por
 * defecto, y así las semanas anteriores al campo siguen igual. Los ids son de
 * `AppUser` y tienen que estar en el staff del grupo (`Grupo.admins`).
 */
export type Imparten = Partial<Record<DiaSemana, string[]>>;

/**
 * `imparten` del body → limpio, o 'invalido' (400). `null` lo borra entero; un
 * día con lista vacía vuelve a «todos». Cualquier id fuera del staff del grupo
 * invalida todo: no se asigna una sesión a alguien que no da el grupo.
 */
export function normalizarImparten(valor: unknown, staff: Set<string>): Imparten | 'invalido' {
  if (valor === null) return {};
  if (typeof valor !== 'object' || Array.isArray(valor)) return 'invalido';
  const limpio: Imparten = {};
  for (const [dia, ids] of Object.entries(valor as Record<string, unknown>)) {
    if (!esDiaValido(dia)) return 'invalido';
    if (ids === null || ids === undefined) continue;
    if (!Array.isArray(ids)) return 'invalido';
    const unicos = [...new Set(ids)];
    if (unicos.some((id) => typeof id !== 'string' || !staff.has(id))) return 'invalido';
    if (unicos.length > 0) limpio[dia] = unicos as string[];
  }
  return limpio;
}

/** ¿Le toca a esta persona? Un día sin asignar le toca a todos. */
export function leTocaImpartir(imparten: string[] | undefined, userId: string): boolean {
  return !imparten || imparten.length === 0 || imparten.includes(userId);
}
