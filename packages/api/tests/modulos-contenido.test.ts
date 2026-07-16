/**
 * Lógica pura de los módulos de contenido por grupo×colección.
 * Se guarda lo DESHABILITADO; ausente = todo habilitado (compatibilidad y
 * módulos nuevos nacen on). Corre sin servidor.
 */
import { describe, it, expect } from 'vitest';
import { moduloHabilitado, esModuloValido } from '../src/models/modulos-contenido.js';

describe('moduloHabilitado (default todo on, se guarda lo apagado)', () => {
  it('sin mapa → todo habilitado (grupos existentes, compatibilidad)', () => {
    expect(moduloHabilitado(undefined, 'colA', 'documentacion')).toBe(true);
    expect(moduloHabilitado({}, 'colA', 'paginas')).toBe(true);
  });

  it('colección sin entrada → todo habilitado', () => {
    expect(moduloHabilitado({ colB: ['paginas'] }, 'colA', 'paginas')).toBe(true);
  });

  it('módulo en la lista de apagados → deshabilitado; los demás siguen on', () => {
    const mapa = { colA: ['paginas', 'actividades'] };
    expect(moduloHabilitado(mapa, 'colA', 'paginas')).toBe(false);
    expect(moduloHabilitado(mapa, 'colA', 'actividades')).toBe(false);
    expect(moduloHabilitado(mapa, 'colA', 'documentacion')).toBe(true);
    expect(moduloHabilitado(mapa, 'colA', 'competencias')).toBe(true);
  });

  it('un módulo NUEVO (no presente en ninguna lista) nace habilitado en todos', () => {
    // Simula: se agrega un módulo futuro; ningún grupo lo tiene en su lista apagada.
    const mapa = { colA: ['paginas'] };
    expect(moduloHabilitado(mapa, 'colA', 'competencias')).toBe(true);
  });
});

describe('esModuloValido', () => {
  it('acepta las keys del catálogo y rechaza el resto', () => {
    expect(esModuloValido('documentacion')).toBe(true);
    expect(esModuloValido('actividades')).toBe(true);
    expect(esModuloValido('otro')).toBe(false);
    expect(esModuloValido(3)).toBe(false);
    expect(esModuloValido(undefined)).toBe(false);
  });
});
