/**
 * La poda de la selección de filtros.
 *
 * El caso que importa es el de identidad: el efecto que llama a esto se dispara
 * en cada carga del calendario, así que devolver un `Set` nuevo cuando no hay
 * nada que podar volvería a renderizar el calendario entero cada vez.
 */
import { describe, it, expect } from 'vitest';
import { podarFiltros } from './useCalendarFilter';
import type { ActividadTipo } from '@/types/calendario';

const conj = (...t: ActividadTipo[]) => new Set<ActividadTipo>(t);

describe('podarFiltros', () => {
  it('quita los tipos que ya no están en el calendario', () => {
    expect([...podarFiltros(conj('lab', 'lectura'), conj('lectura'))]).toEqual(['lectura']);
  });

  it('devuelve el MISMO conjunto si no hay nada que quitar', () => {
    const activos = conj('lab', 'lectura');
    expect(podarFiltros(activos, conj('lab', 'lectura', 'break'))).toBe(activos);
  });

  it('una selección vacía se queda vacía y es el mismo conjunto', () => {
    const vacio = conj();
    expect(podarFiltros(vacio, conj('lab'))).toBe(vacio);
  });

  it('si desaparecen todos los tipos, la selección se vacía', () => {
    expect(podarFiltros(conj('lab'), conj()).size).toBe(0);
  });
});
