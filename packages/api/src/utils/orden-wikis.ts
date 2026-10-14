/**
 * Ordena las wikis del alumno para que las del grupo que tiene abierto vayan
 * PRIMERO, en el orden en que el grupo las tiene asignadas; el resto (las de sus
 * otros grupos o las de un permiso individual) detrás, en el orden que traían.
 *
 * Es la causa del «se me abre la wiki que no es»: el menú enlazaba la primera
 * de `getColeccionesPermitidas`, que junta las de TODOS sus grupos sin mirar en
 * cuál está trabajando.
 */
export function ordenarWikisPorGrupo<T extends { id: string }>(
  wikis: readonly T[],
  idsDelGrupo: readonly string[],
): T[] {
  const posicion = new Map(idsDelGrupo.map((id, i) => [id, i]));
  const delGrupo = wikis
    .filter((w) => posicion.has(w.id))
    .sort((a, b) => posicion.get(a.id)! - posicion.get(b.id)!);
  const resto = wikis.filter((w) => !posicion.has(w.id));
  return [...delGrupo, ...resto];
}
