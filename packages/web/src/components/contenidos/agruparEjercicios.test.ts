/**
 * Agrupado del listado de ejercicios en dos niveles. Lógica pura, corre sin
 * servidor. El test que más importa es el primero: con CERO bloques el
 * resultado debe ser el agrupado de siempre, porque de eso depende que
 * introducir bloques no cambie nada para quien no los use.
 */
import { describe, it, expect } from 'vitest';
import {
  agrupar,
  agruparEnBloques,
  type BloqueRef,
  type CategoriaRef,
  type EjercicioLista,
} from './agruparEjercicios';

function ej(id: string, categoriaId: string | null, resuelto = false): EjercicioLista {
  return { id, titulo: id, slug: id, lenguajes: ['kotlin'], orden: 0, categoriaId, resuelto };
}
const cat = (id: string, nombre: string, orden: number, bloqueId?: string | null): CategoriaRef =>
  ({ id, nombre, orden, bloqueId });
const bloque = (id: string, nombre: string, orden: number): BloqueRef => ({ id, nombre, orden });

describe('agrupar (un nivel)', () => {
  it('agrupa por categoría respetando el orden recibido', () => {
    const g = agrupar([cat('c1', 'Uno', 0), cat('c2', 'Dos', 1)], [ej('a', 'c2'), ej('b', 'c1')]);
    expect(g.map((x) => x.titulo)).toEqual(['Uno', 'Dos']);
    expect(g[0].items.map((i) => i.id)).toEqual(['b']);
  });

  it('omite las categorías sin ejercicios', () => {
    const g = agrupar([cat('c1', 'Uno', 0), cat('c2', 'Vacía', 1)], [ej('a', 'c1')]);
    expect(g).toHaveLength(1);
  });

  it('recoge los huérfanos, incluida la categoría fantasma', () => {
    const g = agrupar([cat('c1', 'Uno', 0)], [ej('a', 'c1'), ej('b', null), ej('c', 'borrada')]);
    const otros = g.find((x) => x.clave === '__otros')!;
    expect(otros.items.map((i) => i.id)).toEqual(['b', 'c']);
    expect(otros.titulo).toBe('Otros');
  });

  it('sin ninguna categoría, el grupo único va sin título', () => {
    const g = agrupar([], [ej('a', null)]);
    expect(g).toEqual([{ clave: '__otros', titulo: null, items: [ej('a', null)] }]);
  });
});

describe('agruparEnBloques', () => {
  it('SIN bloques devuelve el agrupado de siempre, sin cabecera', () => {
    const categorias = [cat('c1', 'Uno', 0), cat('c2', 'Dos', 1)];
    const ejercicios = [ej('a', 'c1'), ej('b', 'c2'), ej('c', null)];
    const b = agruparEnBloques([], categorias, ejercicios);
    expect(b).toHaveLength(1);
    expect(b[0].titulo).toBeNull();
    // Idéntico a lo que producía el agrupado de un solo nivel.
    expect(b[0].grupos).toEqual(agrupar(categorias, ejercicios));
  });

  it('reparte las categorías en sus bloques, en el orden de los bloques', () => {
    const b = agruparEnBloques(
      [bloque('b1', 'Intro', 0), bloque('b2', 'MVVM', 1)],
      [cat('c1', 'Sintaxis', 0, 'b1'), cat('c2', 'Capas', 1, 'b2')],
      [ej('a', 'c1'), ej('x', 'c2')],
    );
    expect(b.map((x) => x.titulo)).toEqual(['Intro', 'MVVM']);
    expect(b[0].grupos[0].items.map((i) => i.id)).toEqual(['a']);
    expect(b[1].grupos[0].items.map((i) => i.id)).toEqual(['x']);
  });

  it('NO duplica: un ejercicio ya colocado no reaparece en el residual', () => {
    const b = agruparEnBloques(
      [bloque('b1', 'Intro', 0)],
      [cat('c1', 'Sintaxis', 0, 'b1'), cat('c2', 'Suelta', 1)],
      [ej('a', 'c1'), ej('s', 'c2'), ej('n', null)],
    );
    const ids = b.flatMap((x) => x.grupos.flatMap((g) => g.items.map((i) => i.id)));
    expect(ids).toHaveLength(3);
    expect([...new Set(ids)]).toHaveLength(3);
  });

  it('las categorías sin bloque caen a un residual al final', () => {
    const b = agruparEnBloques(
      [bloque('b1', 'Intro', 0)],
      [cat('c1', 'Sintaxis', 0, 'b1'), cat('c2', 'Suelta', 1)],
      [ej('a', 'c1'), ej('s', 'c2')],
    );
    expect(b.map((x) => x.titulo)).toEqual(['Intro', 'Otros']);
    expect(b[1].grupos[0].titulo).toBe('Suelta');
  });

  it('una categoría con bloque inexistente no desaparece: cae al residual', () => {
    const b = agruparEnBloques(
      [bloque('b1', 'Intro', 0)],
      [cat('c1', 'Sintaxis', 0, 'b1'), cat('cz', 'Fantasma', 1, 'borrado')],
      [ej('a', 'c1'), ej('z', 'cz')],
    );
    const ids = b.flatMap((x) => x.grupos.flatMap((g) => g.items.map((i) => i.id)));
    expect(ids).toContain('z');
  });

  it('un bloque cuyas categorías quedan vacías (p. ej. al filtrar) no se muestra', () => {
    // Simula el filtro de lenguaje: al listado ya solo llegan los de 'b1'.
    const b = agruparEnBloques(
      [bloque('b1', 'Intro', 0), bloque('b2', 'MVVM', 1)],
      [cat('c1', 'Sintaxis', 0, 'b1'), cat('c2', 'Capas', 1, 'b2')],
      [ej('a', 'c1')],
    );
    expect(b.map((x) => x.titulo)).toEqual(['Intro']);
  });

  it('las categorías conservan su orden dentro del bloque aunque el orden sea global', () => {
    // c3 (orden 2) va antes que c1 (orden 5) porque así llegan ordenadas del
    // servidor; el filtrado por bloque no debe alterarlo.
    const b = agruparEnBloques(
      [bloque('b1', 'Uno', 0)],
      [cat('c3', 'Primera', 2, 'b1'), cat('c9', 'De otro', 3, 'b9'), cat('c1', 'Segunda', 5, 'b1')],
      [ej('a', 'c3'), ej('b', 'c1')],
    );
    expect(b[0].grupos.map((g) => g.titulo)).toEqual(['Primera', 'Segunda']);
  });
});
