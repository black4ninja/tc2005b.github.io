/**
 * Tests de la lógica PURA del árbol visible del visor (US-3).
 * Código de seguridad: lo no publicado NO debe existir para el visor
 * (ni en el árbol, ni por URL directa, ni revelando estructura).
 * Corre sin servidor: `npx vitest run packages/api/tests/contenidos-arbol.test.ts`
 */
import { describe, it, expect } from 'vitest';
import {
  construirArbolVisible,
  paginasEnOrden,
  resolverPath,
  type DocPlano,
} from '../src/services/contenidos-arbol.js';

function doc(parcial: Partial<DocPlano> & { id: string; slug: string }): DocPlano {
  return {
    titulo: parcial.slug,
    tipo: 'md',
    orden: 0,
    padreId: null,
    publicado: true,
    ...parcial,
  } as DocPlano;
}

describe('construirArbolVisible (poda de seguridad)', () => {
  it('excluye páginas no publicadas', () => {
    const arbol = construirArbolVisible([
      doc({ id: 'a', slug: 'publica', publicado: true }),
      doc({ id: 'b', slug: 'borrador', publicado: false }),
    ]);
    expect(arbol.map((n) => n.slug)).toEqual(['publica']);
  });

  it('poda categorías sin ninguna página publicada (no revelan estructura)', () => {
    const arbol = construirArbolVisible([
      doc({ id: 'cat', slug: 'secreta', tipo: 'categoria', publicado: false }),
      doc({ id: 'p', slug: 'wip', padreId: 'cat', publicado: false }),
    ]);
    expect(arbol).toEqual([]);
  });

  it('conserva la categoría si tiene al menos una página publicada, anidada incluso', () => {
    const arbol = construirArbolVisible([
      doc({ id: 'cat', slug: 'modulo', tipo: 'categoria', publicado: false }),
      doc({ id: 'sub', slug: 'tema', tipo: 'categoria', publicado: false, padreId: 'cat' }),
      doc({ id: 'p', slug: 'lab1', padreId: 'sub', publicado: true }),
      doc({ id: 'q', slug: 'wip', padreId: 'sub', publicado: false }),
    ]);
    expect(arbol).toHaveLength(1);
    expect(arbol[0].hijos[0].hijos.map((n) => n.slug)).toEqual(['lab1']);
  });

  it('respeta el orden de hermanos', () => {
    const arbol = construirArbolVisible([
      doc({ id: 'b', slug: 'segundo', orden: 1 }),
      doc({ id: 'a', slug: 'primero', orden: 0 }),
      doc({ id: 'c', slug: 'tercero', orden: 2 }),
    ]);
    expect(arbol.map((n) => n.slug)).toEqual(['primero', 'segundo', 'tercero']);
  });
});

describe('paginasEnOrden (prev/next)', () => {
  it('recorre en profundidad solo páginas, con paths completos', () => {
    const arbol = construirArbolVisible([
      doc({ id: 'intro', slug: 'intro', orden: 0 }),
      doc({ id: 'cat', slug: 'backend', tipo: 'categoria', orden: 1 }),
      doc({ id: 'lab1', slug: 'lab1', padreId: 'cat', orden: 0 }),
      doc({ id: 'lab2', slug: 'lab2', padreId: 'cat', orden: 1 }),
    ]);
    expect(paginasEnOrden(arbol).map((p) => p.path)).toEqual([
      'intro',
      'backend/lab1',
      'backend/lab2',
    ]);
  });
});

describe('resolverPath (404 del visor)', () => {
  const arbol = construirArbolVisible([
    doc({ id: 'cat', slug: 'backend', tipo: 'categoria' }),
    doc({ id: 'lab1', slug: 'lab1', padreId: 'cat', publicado: true }),
    doc({ id: 'wip', slug: 'wip', padreId: 'cat', publicado: false }),
  ]);

  it('resuelve una página publicada con su breadcrumb', () => {
    const r = resolverPath(arbol, ['backend', 'lab1']);
    expect(r?.nodo.id).toBe('lab1');
    expect(r?.breadcrumb.map((b) => b.slug)).toEqual(['backend', 'lab1']);
  });

  it('devuelve null para una página NO publicada (misma respuesta que inexistente)', () => {
    expect(resolverPath(arbol, ['backend', 'wip'])).toBeNull();
    expect(resolverPath(arbol, ['backend', 'no-existe'])).toBeNull();
  });

  it('devuelve null para una categoría (no es página navegable) y para path vacío', () => {
    expect(resolverPath(arbol, ['backend'])).toBeNull();
    expect(resolverPath(arbol, [])).toBeNull();
  });
});
