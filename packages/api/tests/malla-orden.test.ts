/**
 * La malla se ordena como la tabla de competencias de la materia.
 *
 * `CompetenciaAlumno.orden` existe pero nadie lo escribe, así que ordenar por
 * él dejaba la malla barajada respecto del catálogo. El orden bueno es
 * `Competencia.orden`, el que se edita en Contenidos, y Parse no sabe ordenar
 * por el campo de un puntero: hay que hacerlo en memoria, y eso es lo que se
 * fija aquí.
 */
import { describe, it, expect } from 'vitest';
import { ordenarComoElCatalogo } from '../src/models/CompetenciaAlumno.js';

/** Doble de una fila de la malla: solo hace falta su competencia. */
function fila(nombre: string, orden?: number) {
  const competencia = { get: (k: string) => (k === 'orden' ? orden : k === 'competencia' ? nombre : undefined) };
  return { getCompetencia: () => competencia, nombre } as any;
}

const nombres = (filas: any[]) => filas.map((f) => f.nombre);

describe('ordenarComoElCatalogo', () => {
  it('manda el orden del catálogo, no el de llegada', () => {
    const barajadas = [fila('STC0203', 1), fila('SICT0203', 0), fila('STC0205', 3), fila('STC0204', 2)];
    expect(nombres(ordenarComoElCatalogo(barajadas))).toEqual(['SICT0203', 'STC0203', 'STC0204', 'STC0205']);
  });

  it('el orden 0 es un orden, no un «sin poner»', () => {
    // Con `?? 0` una competencia sin orden empataría con la primera de verdad.
    expect(nombres(ordenarComoElCatalogo([fila('sin orden'), fila('la primera', 0)])))
      .toEqual(['la primera', 'sin orden']);
  });

  it('las que no lo tienen van al final, entre ellas por nombre', () => {
    expect(nombres(ordenarComoElCatalogo([fila('Zeta'), fila('Alfa'), fila('Con orden', 5)])))
      .toEqual(['Con orden', 'Alfa', 'Zeta']);
  });

  it('empata por nombre para no bailar entre recargas', () => {
    const a = ordenarComoElCatalogo([fila('Beta', 2), fila('Alfa', 2)]);
    const b = ordenarComoElCatalogo([fila('Alfa', 2), fila('Beta', 2)]);
    expect(nombres(a)).toEqual(['Alfa', 'Beta']);
    expect(nombres(a)).toEqual(nombres(b));
  });

  it('no toca la lista que le dan', () => {
    const original = [fila('B', 1), fila('A', 0)];
    ordenarComoElCatalogo(original);
    expect(nombres(original)).toEqual(['B', 'A']);
  });
});
