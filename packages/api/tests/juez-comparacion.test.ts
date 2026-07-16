/**
 * Lógica pura del juez: normalización de salida y mapeo a veredicto. Corre sin
 * compiladores ni sandbox (patrón modulos-contenido.test).
 */
import { describe, it, expect } from 'vitest';
import { normalizarSalida, veredictoDeCorrida } from '../src/services/judge/comparacion.js';
import type { ResultadoCorrida } from '../src/services/judge/tipos.js';

function corrida(over: Partial<ResultadoCorrida>): ResultadoCorrida {
  return {
    salida: '',
    error: '',
    exitCode: 0,
    agotoTiempo: false,
    senal: null,
    duracionMs: 1,
    truncado: false,
    ...over,
  };
}

describe('normalizarSalida', () => {
  it('unifica CRLF/CR a LF', () => {
    expect(normalizarSalida('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('quita espacios/tabs al final de cada línea', () => {
    expect(normalizarSalida('hola  \nmundo\t')).toBe('hola\nmundo');
  });

  it('colapsa saltos de línea finales', () => {
    expect(normalizarSalida('5\n\n\n')).toBe('5');
    expect(normalizarSalida('5')).toBe('5');
  });

  it('no toca espacios internos (el formato del ejercicio manda)', () => {
    expect(normalizarSalida('a  b')).toBe('a  b');
  });
});

describe('veredictoDeCorrida', () => {
  it('salida correcta (con espacios/saltos sobrantes) → aceptado', () => {
    const v = veredictoDeCorrida(corrida({ salida: '5\n' }), '5', false);
    expect(v).toEqual({ paso: true, veredicto: 'aceptado', salidaObtenida: '5\n' });
  });

  it('salida distinta → respuesta_incorrecta', () => {
    const v = veredictoDeCorrida(corrida({ salida: '4\n' }), '5', false);
    expect(v.paso).toBe(false);
    expect(v.veredicto).toBe('respuesta_incorrecta');
  });

  it('reloj de pared agotado → tiempo_excedido (aunque la salida coincida)', () => {
    const v = veredictoDeCorrida(corrida({ salida: '5', agotoTiempo: true }), '5', false);
    expect(v.veredicto).toBe('tiempo_excedido');
  });

  it('salida truncada → respuesta_incorrecta', () => {
    const v = veredictoDeCorrida(corrida({ salida: '5', truncado: true }), '5', false);
    expect(v.veredicto).toBe('respuesta_incorrecta');
  });

  it('heurística de OOM → limite_memoria', () => {
    const v = veredictoDeCorrida(corrida({ exitCode: 1, error: 'OutOfMemoryError' }), '5', true);
    expect(v.veredicto).toBe('limite_memoria');
  });

  it('terminado por señal (sin OOM) → error_ejecucion', () => {
    const v = veredictoDeCorrida(corrida({ exitCode: null, senal: 'SIGSEGV' }), '5', false);
    expect(v.veredicto).toBe('error_ejecucion');
  });

  it('exit code ≠ 0 (sin OOM) → error_ejecucion', () => {
    const v = veredictoDeCorrida(corrida({ exitCode: 1, error: 'boom' }), '5', false);
    expect(v.veredicto).toBe('error_ejecucion');
  });
});
