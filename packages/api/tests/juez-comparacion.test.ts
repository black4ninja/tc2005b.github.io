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

describe('la ñ y demás no-ASCII', () => {
  // «años» de las dos maneras que existen. En pantalla son idénticas.
  const COMPUESTA = 'a\u00f1os';       // ñ en un solo punto de código (NFC)
  const DESCOMPUESTA = 'an\u0303os';   // n + tilde combinante (NFD)

  it('las dos formas de escribir «ñ» comparan igual', () => {
    // Un alumno en macOS podía mandar la descompuesta sin saberlo y ver
    // «respuesta incorrecta» contra una salida que se VE idéntica.
    expect(COMPUESTA).not.toBe(DESCOMPUESTA);
    expect(normalizarSalida(DESCOMPUESTA)).toBe(normalizarSalida(COMPUESTA));
  });

  it('el veredicto acepta la descompuesta contra la compuesta', () => {
    const v = veredictoDeCorrida(corrida({ salida: `2 ${DESCOMPUESTA}\n` }), `2 ${COMPUESTA}`, false);
    expect(v.paso).toBe(true);
    expect(v.veredicto).toBe('aceptado');
  });

  it('la salida obtenida se guarda tal cual, sin normalizar', () => {
    // Lo que se le enseña al alumno es lo que su programa escribió de verdad;
    // normalizar solo sirve para COMPARAR.
    const v = veredictoDeCorrida(corrida({ salida: `2 ${DESCOMPUESTA}\n` }), `2 ${COMPUESTA}`, false);
    expect(v.salidaObtenida).toBe(`2 ${DESCOMPUESTA}\n`);
  });

  it('NO acepta la ñ sustituida por «?»', () => {
    // Es el síntoma de una JVM escribiendo en ASCII. Eso se arregla en el
    // sandbox (ver UTF8_JVM en lenguajes.ts), no aflojando la comparación:
    // «a?os» y «años» son salidas distintas y deben seguir siéndolo.
    const v = veredictoDeCorrida(corrida({ salida: '2 a?os\n' }), `2 ${COMPUESTA}`, false);
    expect(v.paso).toBe(false);
    expect(v.veredicto).toBe('respuesta_incorrecta');
  });

  it('no toca los acentos ni las mayúsculas', () => {
    expect(normalizarSalida('Año')).not.toBe(normalizarSalida('ano'));
    expect(normalizarSalida('AÑO')).not.toBe(normalizarSalida('año'));
  });
});
