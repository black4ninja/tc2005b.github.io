import { describe, expect, it } from 'vitest';
import {
  bloquesVisibles,
  escribirSeccion,
  indiceDeBloques,
  leerSeccion,
  progresoDe,
  progresoDeBloque,
} from './navegacionDiagramas';
import type { BloqueRef, CategoriaRef, EjercicioLista } from './agruparEjercicios';

const bloques: BloqueRef[] = [
  { id: 'b1', nombre: 'Estructura', orden: 1 },
  { id: 'b2', nombre: 'Interacción', orden: 2 },
];

const categorias: CategoriaRef[] = [
  { id: 'c1', nombre: 'Clases', orden: 1, bloqueId: 'b1' },
  { id: 'c2', nombre: 'Entidad-relación', orden: 2, bloqueId: 'b1' },
  { id: 'c3', nombre: 'Secuencia', orden: 3, bloqueId: 'b2' },
  { id: 'c4', nombre: 'Suelta', orden: 4, bloqueId: null },
];

function ej(id: string, categoriaId: string | null, extra: Partial<EjercicioLista> = {}): EjercicioLista {
  return { id, titulo: id, slug: id, orden: 1, categoriaId, resuelto: false, ...extra };
}

describe('leerSeccion', () => {
  it('lee las dos clases', () => {
    expect(leerSeccion('curso:Estructura')).toEqual({ clase: 'curso', nombre: 'Estructura' });
    expect(leerSeccion('cat:Datos y gráficos')).toEqual({ clase: 'cat', nombre: 'Datos y gráficos' });
  });

  it('conserva los dos puntos que haya DENTRO del nombre', () => {
    // Los nombres de bloque los escribe un autor. Partir por todos los `:`
    // dejaría un bloque así permanentemente inalcanzable desde la URL.
    expect(leerSeccion('curso:Modelado: avanzado')).toEqual({
      clase: 'curso',
      nombre: 'Modelado: avanzado',
    });
  });

  it('descarta lo que no reconoce en vez de inventar una sección', () => {
    for (const malo of [null, '', 'Estructura', 'otra:Cosa', 'curso:', ':Estructura']) {
      expect(leerSeccion(malo), String(malo)).toBeNull();
    }
  });

  it('va y vuelve', () => {
    const s = { clase: 'cat' as const, nombre: 'Texto y formatos' };
    expect(leerSeccion(escribirSeccion(s))).toEqual(s);
    expect(escribirSeccion(null)).toBeNull();
  });
});

describe('progreso', () => {
  it('no cuenta los ejemplos resueltos', () => {
    // Un ejemplo abre con el diagrama ya hecho y se aprueba con solo enviarlo:
    // contarlo inflaría el avance sin que el alumno resuelva nada.
    const lista = [
      ej('a', 'c1', { esEjemplo: true, resuelto: true }),
      ej('b', 'c1', { resuelto: true }),
      ej('c', 'c1'),
    ];
    expect(progresoDe(lista)).toEqual({ resueltos: 1, total: 2 });
  });

  it('da 0/0 sin ejercicios', () => {
    expect(progresoDe([])).toEqual({ resueltos: 0, total: 0 });
  });

  it('acota el avance de un bloque a SUS categorías', () => {
    const lista = [
      ej('a', 'c1', { resuelto: true }),
      ej('b', 'c2'),
      ej('c', 'c3', { resuelto: true }),
      ej('d', null, { resuelto: true }),
    ];
    expect(progresoDeBloque(bloques, categorias, lista, 'b1')).toEqual({ resueltos: 1, total: 2 });
    expect(progresoDeBloque(bloques, categorias, lista, 'b2')).toEqual({ resueltos: 1, total: 1 });
  });

  it('deja en cero un bloque sin ejercicios en vez de fallar', () => {
    expect(progresoDeBloque(bloques, categorias, [], 'b1')).toEqual({ resueltos: 0, total: 0 });
    expect(progresoDeBloque(bloques, categorias, [], 'inexistente')).toEqual({
      resueltos: 0,
      total: 0,
    });
  });
});

describe('indiceDeBloques', () => {
  const bloqueDe = indiceDeBloques(bloques, categorias);

  it('resuelve el bloque a través de la categoría', () => {
    expect(bloqueDe(ej('a', 'c1'))).toBe('Estructura');
    expect(bloqueDe(ej('b', 'c3'))).toBe('Interacción');
  });

  it('devuelve null en los tres casos en que no encaja en ninguna sección', () => {
    expect(bloqueDe(ej('sin categoría', null)), 'sin categoría').toBeNull();
    expect(bloqueDe(ej('categoría borrada', 'fantasma')), 'categoría inexistente').toBeNull();
    expect(bloqueDe(ej('categoría sin bloque', 'c4')), 'categoría sin bloque').toBeNull();
  });
});

describe('bloquesVisibles', () => {
  const conEjercicios: BloqueRef = { id: 'b1', nombre: 'Comportamiento', orden: 1 };
  const vacio: BloqueRef = { id: 'b2', nombre: 'Arquitectura MVVM', orden: 2 };
  const todos = [conEjercicios, vacio];
  const total = (id: string) => (id === 'b1' ? 9 : 0);

  it('quita los bloques que ahora mismo no tienen nada dentro', () => {
    expect(bloquesVisibles(todos, total)).toEqual([conEjercicios]);
  });

  it('no depende del rol: un «0/0» engaña igual al admin que al alumno', () => {
    expect(bloquesVisibles(todos, () => 0)).toEqual([]);
  });

  it('conserva el orden de los que sobreviven', () => {
    const otro: BloqueRef = { id: 'b3', nombre: 'Interacción', orden: 3 };
    const lista = [conEjercicios, vacio, otro];
    const conDos = (id: string) => (id === 'b2' ? 0 : 6);
    expect(bloquesVisibles(lista, conDos).map((b) => b.nombre)).toEqual([
      'Comportamiento',
      'Interacción',
    ]);
  });

  it('sin bloques devuelve una lista vacía, no revienta', () => {
    expect(bloquesVisibles([], total)).toEqual([]);
  });
});
