/**
 * Recorte de bloques y categorías al módulo que los pide.
 *
 * `BloqueEjercicios` y `CategoriaEjercicio` son tablas únicas por colección y
 * las comparten los dos módulos, sin campo que diga a cuál pertenecen. La
 * pertenencia se deduce de los ejercicios, y esa deducción es lo que decide qué
 * secciones ve cada árbol: se fija aquí en vez de comprobarse a ojo.
 */
import { describe, it, expect } from 'vitest';
import { recortarAlModulo } from '../src/services/agrupacion-modulo.js';

/** Doble de un ejercicio: solo hace falta su puntero a categoría. */
const ej = (categoriaId: string | null) => ({
  get: (_campo: 'categoria') => (categoriaId ? { id: categoriaId } : undefined),
});

/** Doble de una categoría, con la forma que expone el modelo real. */
const cat = (id: string, bloqueId: string | null) => ({
  id,
  getBloque: () => (bloqueId ? { id: bloqueId } : undefined),
  get: (_campo: 'bloque') => (bloqueId ? { id: bloqueId } : undefined),
});

const bloque = (id: string, nombre: string) => ({ id, nombre });

// La colección de TC2007B tal como está: bloques de programación y de diagramas
// conviviendo en la misma tabla.
const CATEGORIAS = [
  cat('c-kotlin', 'b-intro'),
  cat('c-mvvm', 'b-mvvm'),
  cat('c-estados', 'b-comportamiento'),
  cat('c-clases', 'b-estructura'),
  cat('c-suelta', null),
];
const BLOQUES = [
  bloque('b-intro', 'Introducción al lenguaje'),
  bloque('b-mvvm', 'Arquitectura MVVM'),
  bloque('b-comportamiento', 'Comportamiento'),
  bloque('b-estructura', 'Estructura'),
];

describe('recortarAlModulo', () => {
  it('el juez de programación no se queda con los bloques de Diagramas', () => {
    const { bloques } = recortarAlModulo([ej('c-kotlin'), ej('c-mvvm')], CATEGORIAS, BLOQUES);
    expect(bloques.map((b) => b.nombre)).toEqual([
      'Introducción al lenguaje',
      'Arquitectura MVVM',
    ]);
  });

  it('Diagramas no se queda con los bloques del juez de programación', () => {
    const { bloques } = recortarAlModulo([ej('c-estados'), ej('c-clases')], CATEGORIAS, BLOQUES);
    expect(bloques.map((b) => b.nombre)).toEqual(['Comportamiento', 'Estructura']);
  });

  it('recorta también las categorías, no solo los bloques', () => {
    const { categorias } = recortarAlModulo([ej('c-estados')], CATEGORIAS, BLOQUES);
    expect(categorias.map((c) => c.id)).toEqual(['c-estados']);
  });

  it('conserva el orden de entrada, que es el del árbol', () => {
    const { bloques } = recortarAlModulo(
      // Los ejercicios llegan en cualquier orden; manda el de las listas.
      [ej('c-clases'), ej('c-estados')],
      CATEGORIAS,
      BLOQUES,
    );
    expect(bloques.map((b) => b.id)).toEqual(['b-comportamiento', 'b-estructura']);
  });

  it('una categoría sin bloque sobrevive; simplemente no arrastra ninguno', () => {
    const { categorias, bloques } = recortarAlModulo([ej('c-suelta')], CATEGORIAS, BLOQUES);
    expect(categorias.map((c) => c.id)).toEqual(['c-suelta']);
    expect(bloques).toEqual([]);
  });

  it('un ejercicio sin categoría no arrastra nada', () => {
    const { categorias, bloques } = recortarAlModulo([ej(null)], CATEGORIAS, BLOQUES);
    expect(categorias).toEqual([]);
    expect(bloques).toEqual([]);
  });

  it('sin ejercicios no se devuelve ninguna sección', () => {
    const { categorias, bloques } = recortarAlModulo([], CATEGORIAS, BLOQUES);
    expect(categorias).toEqual([]);
    expect(bloques).toEqual([]);
  });

  it('un ejercicio en una categoría borrada no resucita su bloque', () => {
    const { categorias, bloques } = recortarAlModulo([ej('c-fantasma')], CATEGORIAS, BLOQUES);
    expect(categorias).toEqual([]);
    expect(bloques).toEqual([]);
  });
});
