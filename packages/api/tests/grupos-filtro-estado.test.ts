/**
 * Filtro de estado del listado de grupos (`GET /admin/grupos?estado=`).
 *
 * El borrado de un grupo es LÓGICO: `softDelete()` pone `active` y `exists` a
 * false. Por eso "inactivo" y "eliminado" comparten `active: false` y solo se
 * distinguen por `exists` — una constraint de más o de menos aquí no rompe nada
 * visible, simplemente mezcla los grupos borrados con los vivos (o al revés,
 * esconde grupos que sí existen).
 *
 * Estos tests fijan el mapeo estado → constraints, incluido el caso sin
 * parámetro, que NO es "activos": es el comportamiento histórico (todo lo no
 * eliminado) del que dependen el sidebar y la página de detalle.
 */
import { describe, it, expect } from 'vitest';
import type Parse from 'parse/node';
import { aplicarFiltroEstado } from '../src/controllers/grupos.controller.js';
import type { Grupo } from '../src/models/Grupo.js';

type Constraint = [operador: string, campo: string, valor: unknown];

/** Query de mentira que solo apunta las constraints que le piden. */
function queryEspia() {
  const constraints: Constraint[] = [];
  const query = {
    equalTo(campo: string, valor: unknown) {
      constraints.push(['equalTo', campo, valor]);
      return query;
    },
    notEqualTo(campo: string, valor: unknown) {
      constraints.push(['notEqualTo', campo, valor]);
      return query;
    },
  };
  return { query: query as unknown as Parse.Query<Grupo>, constraints };
}

describe('aplicarFiltroEstado', () => {
  it('activos: vivos y encendidos', () => {
    const { query, constraints } = queryEspia();
    aplicarFiltroEstado(query, 'activos');
    expect(constraints).toEqual([
      ['equalTo', 'exists', true],
      ['equalTo', 'active', true],
    ]);
  });

  it('inactivos: vivos pero apagados — notEqualTo para alcanzar los registros sin el campo', () => {
    const { query, constraints } = queryEspia();
    aplicarFiltroEstado(query, 'inactivos');
    expect(constraints).toEqual([
      ['equalTo', 'exists', true],
      ['notEqualTo', 'active', true],
    ]);
  });

  it('eliminados: exige exists === false, no basta con que falte el campo', () => {
    const { query, constraints } = queryEspia();
    aplicarFiltroEstado(query, 'eliminados');
    expect(constraints).toEqual([['equalTo', 'exists', false]]);
  });

  it('todos: sin constraints', () => {
    const { query, constraints } = queryEspia();
    aplicarFiltroEstado(query, 'todos');
    expect(constraints).toEqual([]);
  });

  it('sin parámetro: los no eliminados (activos + inactivos), como antes del filtro', () => {
    const { query, constraints } = queryEspia();
    aplicarFiltroEstado(query, undefined);
    expect(constraints).toEqual([['equalTo', 'exists', true]]);
  });

  it('activos + inactivos cubren exactamente lo que devuelve el listado sin parámetro', () => {
    const activos = queryEspia();
    aplicarFiltroEstado(activos.query, 'activos');
    const inactivos = queryEspia();
    aplicarFiltroEstado(inactivos.query, 'inactivos');

    // Ambos parten de `exists: true` y se reparten `active` sin solaparse ni
    // dejar huecos: ningún grupo vivo queda fuera de los dos filtros.
    expect(activos.constraints[0]).toEqual(['equalTo', 'exists', true]);
    expect(inactivos.constraints[0]).toEqual(['equalTo', 'exists', true]);
    expect(activos.constraints[1]).toEqual(['equalTo', 'active', true]);
    expect(inactivos.constraints[1]).toEqual(['notEqualTo', 'active', true]);
  });
});
