import { describe, it, expect } from 'vitest';
import { repartirEnEquipos } from '../src/controllers/scrum.controller.js';
import {
  esColumna, esPrioridad, esPuntos, COLUMNAS, COLUMNAS_DEL_SPRINT, MAX_EQUIPOS,
} from '../src/constants/scrum.js';

/**
 * Las reglas del módulo "Actividad de Scrum" que se pueden probar sin Parse.
 *
 * El reparto es la que más importa: se ejecuta con la clase esperando y su
 * defecto clásico —dejar un último equipo de una sola persona— no se ve hasta
 * que le toca a alguien.
 */

describe('repartirEnEquipos', () => {
  it('reparte en rueda para no dejar un equipo cojo al final', () => {
    // 13 en equipos de 5: por bloques saldría 5-5-3; en rueda, 5-4-4.
    const equipos = repartirEnEquipos([...Array(13).keys()], 5);
    expect(equipos.map((e) => e.length)).toEqual([5, 4, 4]);
  });

  it('no pierde ni duplica a nadie', () => {
    const gente = [...Array(23).keys()];
    const equipos = repartirEnEquipos(gente, 4);
    const repartidos = equipos.flat();
    expect(repartidos.sort((a, b) => a - b)).toEqual(gente);
  });

  it('redondea al número de equipos más cercano', () => {
    // 12 entre 5 son 2,4 equipos → 2 de seis, no 3 (uno de dos).
    expect(repartirEnEquipos([...Array(12).keys()], 5)).toHaveLength(2);
    // 13 entre 5 son 2,6 → 3.
    expect(repartirEnEquipos([...Array(13).keys()], 5)).toHaveLength(3);
  });

  it('con menos gente que el tamaño pedido hace un solo equipo', () => {
    expect(repartirEnEquipos([1, 2], 5)).toEqual([[1, 2]]);
  });

  it('sin nadie que repartir no inventa equipos vacíos', () => {
    expect(repartirEnEquipos([], 5)).toEqual([]);
  });
});

describe('columnas del tablero', () => {
  it('el sprint backlog son las cuatro de después del backlog', () => {
    // Es la frontera que dibuja el recuadro punteado: el producto queda fuera
    // del compromiso del sprint.
    expect(COLUMNAS_DEL_SPRINT).toEqual(['planned', 'doing', 'review', 'done']);
    expect(COLUMNAS[0]).toBe('backlog');
    expect(COLUMNAS_DEL_SPRINT).not.toContain('backlog');
  });

  it('reconoce las columnas válidas y rechaza el resto', () => {
    expect(esColumna('doing')).toBe(true);
    expect(esColumna('blocked')).toBe(false);
    expect(esColumna(3)).toBe(false);
  });
});

describe('validación de la historia', () => {
  it('acepta las cuatro prioridades MoSCoW y nada más', () => {
    expect(esPrioridad('must')).toBe(true);
    expect(esPrioridad('wont')).toBe(true);
    expect(esPrioridad("won't")).toBe(false);
    expect(esPrioridad('urgente')).toBe(false);
  });

  it('los puntos son Fibonacci recortado, con 0 para lo no estimado', () => {
    expect(esPuntos(0)).toBe(true);
    expect(esPuntos(8)).toBe(true);
    // 4 y 6 no están a propósito: la serie crece para que estimar grande sea
    // impreciso y obligue a partir la historia.
    expect(esPuntos(4)).toBe(false);
    expect(esPuntos(6)).toBe(false);
    expect(esPuntos('5' as unknown as number)).toBe(false);
  });
});

describe('tope de equipos', () => {
  it('son nueve: lo que cabe legible en una rejilla de 3 × 3', () => {
    expect(MAX_EQUIPOS).toBe(9);
  });
});
