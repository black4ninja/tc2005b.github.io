import { describe, it, expect } from 'vitest';
import { formatearDuracion, parsearEtiquetas, repartirPreguntas } from './preguntas';

describe('formatearDuracion', () => {
  it('escribe minutos y segundos a dos cifras', () => {
    expect(formatearDuracion(95)).toBe('1:35');
    expect(formatearDuracion(60)).toBe('1:00');
    expect(formatearDuracion(9)).toBe('0:09');
    expect(formatearDuracion(0)).toBe('0:00');
  });

  it('no pinta tiempos negativos', () => {
    expect(formatearDuracion(-5)).toBe('0:00');
  });
});

describe('parsearEtiquetas', () => {
  it('separa por comas y normaliza', () => {
    expect(parsearEtiquetas('Ética, Trabajo  en EQUIPO ')).toEqual(['ética', 'trabajo en equipo']);
  });

  it('ignora vacías y repetidas', () => {
    expect(parsearEtiquetas('ética,,ÉTICA,  ')).toEqual(['ética']);
    expect(parsearEtiquetas('')).toEqual([]);
  });
});

describe('repartirPreguntas', () => {
  // Siempre la primera de la bolsa: hace el reparto determinista y deja ver el
  // orden en que se agota cada vuelta.
  const primera = () => 0;

  it('agota el banco antes de repetir', () => {
    const salida = repartirPreguntas(['a1', 'a2', 'a3', 'a4'], ['p1', 'p2'], primera);
    expect(salida.map((s) => s.preguntaId)).toEqual(['p1', 'p2', 'p1', 'p2']);
  });

  it('le toca a todos los alumnos, una sola vez', () => {
    const salida = repartirPreguntas(['a1', 'a2', 'a3'], ['p1', 'p2', 'p3', 'p4'], primera);
    expect(salida.map((s) => s.alumnoId)).toEqual(['a1', 'a2', 'a3']);
    expect(new Set(salida.map((s) => s.preguntaId)).size).toBe(3);
  });

  it('sin alumnos o sin preguntas no reparte nada', () => {
    expect(repartirPreguntas([], ['p1'])).toEqual([]);
    expect(repartirPreguntas(['a1'], [])).toEqual([]);
  });

  it('aguanta un generador que se sale del rango', () => {
    // Con `() => 1` el índice caería fuera de la bolsa y `splice` no devolvería
    // nada: el alumno se quedaría con `undefined` como pregunta.
    const salida = repartirPreguntas(['a1', 'a2'], ['p1', 'p2'], () => 1);
    expect(salida).toHaveLength(2);
    for (const s of salida) expect(s.preguntaId).toBeDefined();
  });
});
