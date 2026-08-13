/**
 * Mover en el árbol del editor: a qué padre cae lo que se arrastra.
 *
 * El gesto es el de un explorador de archivos: se arrastra en vertical para
 * reordenar y en HORIZONTAL para cambiar de nivel. Toda la decisión vive en
 * `proyectar`, y sin ella el arrastre solo reordenaría dentro del mismo nivel.
 *
 * Los dos casos que importan de verdad —y que no son evidentes leyendo el
 * código— son meter algo en una carpeta VACÍA y volver a sacarlo.
 */
import { describe, it, expect } from 'vitest';
import { aplanar, idsDeSubarbol, pasoTeclado, proyectar, type NodoPlano } from './arbol-dnd';

const SANGRIA = 14;

function nodo(over: Partial<NodoPlano> & { id: string }): NodoPlano {
  return {
    titulo: over.id,
    slug: over.id,
    tipo: 'md',
    publicado: true,
    oculto: false,
    ancestroOculto: false,
    padreId: null,
    profundidad: 0,
    esCategoria: false,
    tieneHijos: false,
    ...over,
  };
}

describe('proyectar — meter en una carpeta', () => {
  it('mete la página en una carpeta VACÍA al arrastrarla a la derecha', () => {
    // El caso que parecía imposible: la carpeta no tiene hijos, así que no hay
    // ningún hermano debajo del que "colgarse".
    const items = [
      nodo({ id: 'carpeta', esCategoria: true, profundidad: 0 }),
      nodo({ id: 'pagina', profundidad: 0 }),
    ];
    const p = proyectar(items, 'pagina', 'pagina', SANGRIA, SANGRIA);
    expect(p).toEqual({ profundidad: 1, padreId: 'carpeta' });
  });

  it('la SACA de la carpeta al arrastrarla a la izquierda', () => {
    const items = [
      nodo({ id: 'carpeta', esCategoria: true, profundidad: 0, tieneHijos: true }),
      nodo({ id: 'pagina', profundidad: 1, padreId: 'carpeta' }),
    ];
    const p = proyectar(items, 'pagina', 'pagina', -SANGRIA, SANGRIA);
    expect(p).toEqual({ profundidad: 0, padreId: null });
  });

  it('sin desplazamiento horizontal se queda donde está', () => {
    const items = [
      nodo({ id: 'carpeta', esCategoria: true, profundidad: 0, tieneHijos: true }),
      nodo({ id: 'pagina', profundidad: 1, padreId: 'carpeta' }),
    ];
    expect(proyectar(items, 'pagina', 'pagina', 0, SANGRIA).padreId).toBe('carpeta');
  });

  it('no deja anidar bajo una PÁGINA: solo las carpetas admiten hijos', () => {
    // Arrastrar a la derecha sobre una página no puede convertirla en carpeta.
    const items = [
      nodo({ id: 'otra-pagina', profundidad: 0 }),
      nodo({ id: 'pagina', profundidad: 0 }),
    ];
    const p = proyectar(items, 'pagina', 'pagina', SANGRIA * 3, SANGRIA);
    expect(p).toEqual({ profundidad: 0, padreId: null });
  });

  it('no pasa del nivel que permite el vecino de arriba, por mucho que se arrastre', () => {
    const items = [
      nodo({ id: 'carpeta', esCategoria: true, profundidad: 0 }),
      nodo({ id: 'pagina', profundidad: 0 }),
    ];
    // Diez sangrías a la derecha: sigue siendo un solo nivel de anidación.
    const p = proyectar(items, 'pagina', 'pagina', SANGRIA * 10, SANGRIA);
    expect(p.profundidad).toBe(1);
  });

  it('anida dos niveles cuando el de arriba ya está dentro de otra carpeta', () => {
    const items = [
      nodo({ id: 'externa', esCategoria: true, profundidad: 0, tieneHijos: true }),
      nodo({ id: 'interna', esCategoria: true, profundidad: 1, padreId: 'externa' }),
      nodo({ id: 'pagina', profundidad: 0 }),
    ];
    const p = proyectar(items, 'pagina', 'pagina', SANGRIA * 2, SANGRIA);
    expect(p).toEqual({ profundidad: 2, padreId: 'interna' });
  });

  it('no deja huérfano al de abajo: no se puede subir por encima de su nivel', () => {
    // Si «pagina» saliera al nivel 0, «hija» quedaría colgando de la nada.
    const items = [
      nodo({ id: 'carpeta', esCategoria: true, profundidad: 0, tieneHijos: true }),
      nodo({ id: 'pagina', esCategoria: true, profundidad: 1, padreId: 'carpeta', tieneHijos: true }),
      nodo({ id: 'hija', profundidad: 2, padreId: 'pagina' }),
    ];
    const p = proyectar(items, 'pagina', 'pagina', -SANGRIA * 5, SANGRIA);
    expect(p.profundidad).toBeGreaterThanOrEqual(2);
  });
});

/**
 * Mover con el teclado. Las mismas dos dimensiones que con el ratón: ↑↓ ordenan
 * y ←→ cambian de nivel, y el paso horizontal es literalmente el que haría el
 * ratón, para que `proyectar` no tenga que enterarse de quién movió el nodo.
 */
describe('pasoTeclado', () => {
  // Cuatro filas de 28 px, la primera arriba del todo.
  const TOPS = [100, 128, 156, 184];
  const ORIGEN = { x: 0, y: 0 };

  it('→ y ← valen una sangría: es el mismo gesto que arrastrar de lado', () => {
    expect(pasoTeclado('ArrowRight', ORIGEN, 100, TOPS, SANGRIA)).toEqual({ x: SANGRIA, y: 0 });
    expect(pasoTeclado('ArrowLeft', ORIGEN, 100, TOPS, SANGRIA)).toEqual({ x: -SANGRIA, y: 0 });
  });

  it('↓ y ↑ saltan UNA fila, con el alto medido de las propias filas', () => {
    // 28 px salen de los `tops`; cablearlos se rompería al cambiar el CSS.
    expect(pasoTeclado('ArrowDown', ORIGEN, 100, TOPS, SANGRIA)).toEqual({ x: 0, y: 28 });
    expect(pasoTeclado('ArrowUp', ORIGEN, 128, TOPS, SANGRIA)).toEqual({ x: 0, y: -28 });
  });

  it('no se sale de la lista por ninguno de los dos extremos', () => {
    // Salirse pierde el `over`, y entonces el árbol deja de saber dónde caería.
    expect(pasoTeclado('ArrowUp', ORIGEN, 100, TOPS, SANGRIA)).toBeNull();
    expect(pasoTeclado('ArrowDown', ORIGEN, 184, TOPS, SANGRIA)).toBeNull();
  });

  it('ignora las teclas que no son suyas, para no comerse el scroll', () => {
    expect(pasoTeclado('Space', ORIGEN, 100, TOPS, SANGRIA)).toBeNull();
    expect(pasoTeclado('PageDown', ORIGEN, 100, TOPS, SANGRIA)).toBeNull();
  });

  it('con una sola fila no hay a dónde ordenar, pero sí a dónde anidar', () => {
    expect(pasoTeclado('ArrowDown', ORIGEN, 100, [100], SANGRIA)).toBeNull();
    expect(pasoTeclado('ArrowRight', ORIGEN, 100, [100], SANGRIA)).toEqual({ x: SANGRIA, y: 0 });
  });

  it('acumula sobre las coordenadas que ya llevaba, no las reinicia', () => {
    expect(pasoTeclado('ArrowRight', { x: SANGRIA, y: 28 }, 128, TOPS, SANGRIA))
      .toEqual({ x: SANGRIA * 2, y: 28 });
  });
});

describe('idsDeSubarbol', () => {
  it('incluye al nodo y a toda su descendencia', () => {
    // Es lo que impide soltar una carpeta dentro de sí misma.
    const items = [
      nodo({ id: 'carpeta', esCategoria: true, profundidad: 0 }),
      nodo({ id: 'hija', profundidad: 1 }),
      nodo({ id: 'nieta', profundidad: 2 }),
      nodo({ id: 'vecina', profundidad: 0 }),
    ];
    expect([...idsDeSubarbol(items, 'carpeta')]).toEqual(['carpeta', 'hija', 'nieta']);
  });

  it('una hoja es su propio subárbol', () => {
    expect([...idsDeSubarbol([nodo({ id: 'sola' })], 'sola')]).toEqual(['sola']);
  });
});

describe('aplanar', () => {
  it('solo baja por las carpetas expandidas', () => {
    const arbol = [
      {
        id: 'c', titulo: 'c', slug: 'c', tipo: 'categoria', publicado: true, oculto: false,
        hijos: [{ id: 'h', titulo: 'h', slug: 'h', tipo: 'md', publicado: true, oculto: false, hijos: [] }],
      },
    ] as any;

    expect(aplanar(arbol, new Set()).map((n) => n.id)).toEqual(['c']);
    expect(aplanar(arbol, new Set(['c'])).map((n) => n.id)).toEqual(['c', 'h']);
  });

  it('propaga el candado de la carpeta a lo que cuelga de ella', () => {
    const arbol = [
      {
        id: 'c', titulo: 'c', slug: 'c', tipo: 'categoria', publicado: true, oculto: true,
        hijos: [{ id: 'h', titulo: 'h', slug: 'h', tipo: 'md', publicado: true, oculto: false, hijos: [] }],
      },
    ] as any;
    const plano = aplanar(arbol, new Set(['c']));
    // La página está publicada, pero su carpeta está candada: el alumno no la ve.
    expect(plano.find((n) => n.id === 'h')?.ancestroOculto).toBe(true);
  });
});
