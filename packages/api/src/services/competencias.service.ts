import Parse from 'parse/node';

/**
 * Resolución de "qué competencias le tocan a un grupo".
 *
 * La cadena es: `Grupo.colecciones[]` → `Competencia.coleccion`. Vive aquí y no
 * en un controller porque la necesitan varios (crear la malla del alumno,
 * validar el plan de evaluación, poblar los selectores del admin) y si cada uno
 * la reimplementa, divergen — que es exactamente lo que ya pasó con
 * `recalcularCalculadas`, duplicada en dos archivos.
 */

/** Colecciones (pointers) asignadas al grupo. Vacío si no tiene o no existe. */
export async function coleccionesDeGrupo(grupoId: string): Promise<Parse.Object[]> {
  const query = new Parse.Query('Grupo');
  query.equalTo('exists' as any, true as any);
  query.include('colecciones' as any);
  try {
    const grupo = await query.get(grupoId, { useMasterKey: true });
    const cols = (grupo.get('colecciones') ?? []) as Parse.Object[];
    return cols.filter((c) => c && c.get('exists') !== false);
  } catch {
    return [];
  }
}

export interface CompetenciasDeGrupo {
  competencias: Parse.Object[];
  /**
   * El grupo no tiene ninguna colección asignada. Se distingue de "tiene
   * colecciones pero están vacías de competencias" a propósito: son problemas
   * distintos y el mensaje de error debe decir cuál es.
   */
  sinColecciones: boolean;
}

/**
 * Competencias ACTIVAS de las colecciones del grupo, ordenadas.
 *
 * Ojo: filtra por `active`, igual que hacía el query global que sustituye. La
 * lista del admin (`listCompetencias`) NO filtra `active` — esa asimetría ya
 * existía y no la toco aquí, pero es la razón de que una competencia inactiva se
 * vea en el admin y nunca aparezca en la malla de nadie.
 */
export async function competenciasDeGrupo(grupoId: string): Promise<CompetenciasDeGrupo> {
  const colecciones = await coleccionesDeGrupo(grupoId);
  if (colecciones.length === 0) {
    return { competencias: [], sinColecciones: true };
  }

  const query = new Parse.Query('Competencia');
  query.equalTo('exists' as any, true as any);
  query.equalTo('active' as any, true as any);
  query.containedIn('coleccion' as any, colecciones as any);
  query.ascending('orden');
  query.include('dependencias' as any);
  query.limit(1000);
  const competencias = await query.find({ useMasterKey: true });

  return { competencias, sinColecciones: false };
}
