/**
 * Reglas puras del Happiness Door: qué se acepta al crear y al editar una
 * entrada, y qué cuenta como día válido para el tablero.
 */
import { describe, it, expect } from 'vitest';
import { esDiaValido, validarEntrada, TEXTO_HAPPINESS_MAX } from '../src/services/happiness-door.js';
import { moduloHabilitado } from '../src/models/modulos-contenido.js';

describe('validarEntrada al crear', () => {
  it('acepta estado y texto, y recorta espacios', () => {
    expect(validarEntrada({ estado: 'positivo', texto: '  Buen día  ' }, true)).toEqual({ ok: true, estado: 'positivo', texto: 'Buen día' });
  });

  it('exige los dos campos', () => {
    expect(validarEntrada({ texto: 'hola' }, true).ok).toBe(false);
    expect(validarEntrada({ estado: 'neutral' }, true).ok).toBe(false);
    expect(validarEntrada(undefined, true).ok).toBe(false);
  });

  it('rechaza estados desconocidos y texto vacío o demasiado largo', () => {
    expect(validarEntrada({ estado: 'feliz', texto: 'x' }, true).ok).toBe(false);
    expect(validarEntrada({ estado: 'negativo', texto: '   ' }, true).ok).toBe(false);
    expect(validarEntrada({ estado: 'negativo', texto: 'x'.repeat(TEXTO_HAPPINESS_MAX + 1) }, true).ok).toBe(false);
    expect(validarEntrada({ estado: 'negativo', texto: 'x'.repeat(TEXTO_HAPPINESS_MAX) }, true).ok).toBe(true);
  });
});

describe('validarEntrada al editar', () => {
  it('basta con uno de los dos campos', () => {
    expect(validarEntrada({ estado: 'neutral' }, false)).toEqual({ ok: true, estado: 'neutral' });
    expect(validarEntrada({ texto: 'otro' }, false)).toEqual({ ok: true, texto: 'otro' });
  });

  it('sin ningún campo no hay nada que cambiar', () => {
    expect(validarEntrada({}, false).ok).toBe(false);
  });
});

describe('esDiaValido', () => {
  it('acepta fechas reales en AAAA-MM-DD', () => {
    expect(esDiaValido('2026-11-19')).toBe(true);
    expect(esDiaValido('2028-02-29')).toBe(true);
  });

  it('rechaza formatos y fechas imposibles', () => {
    expect(esDiaValido('2026-02-30')).toBe(false);
    expect(esDiaValido('19/11/2026')).toBe(false);
    expect(esDiaValido('2026-11-19T00:00')).toBe(false);
    expect(esDiaValido(undefined)).toBe(false);
  });
});

describe('módulo happiness', () => {
  it('nace apagado y se enciende por colección', () => {
    expect(moduloHabilitado(undefined, 'c1', 'happiness')).toBe(false);
    expect(moduloHabilitado({ c1: ['happiness'] }, 'c1', 'happiness')).toBe(true);
  });
});
