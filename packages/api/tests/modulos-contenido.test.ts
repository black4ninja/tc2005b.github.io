/**
 * Lógica pura de los módulos de contenido por grupo×colección.
 * Se guarda solo lo que DIFIERE del default de cada módulo (ausente = default).
 * Los módulos default-on nacen habilitados; los opt-in (ejercicios) nacen
 * apagados. Corre sin servidor.
 */
import { describe, it, expect } from 'vitest';
import { moduloHabilitado, esModuloValido, moduloEsOptIn } from '../src/models/modulos-contenido.js';

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
    expect(esModuloValido('ejercicios')).toBe(true);
    expect(esModuloValido('otro')).toBe(false);
    expect(esModuloValido(3)).toBe(false);
    expect(esModuloValido(undefined)).toBe(false);
  });
});

describe('módulos opt-in (default apagado, la lista guarda lo ENCENDIDO)', () => {
  it('ejercicios es opt-in; los otros no', () => {
    expect(moduloEsOptIn('ejercicios')).toBe(true);
    expect(moduloEsOptIn('documentacion')).toBe(false);
    expect(moduloEsOptIn('actividades')).toBe(false);
  });

  it('sin mapa / sin entrada → APAGADO (nace opt-in, sin migración)', () => {
    expect(moduloHabilitado(undefined, 'colA', 'ejercicios')).toBe(false);
    expect(moduloHabilitado({}, 'colA', 'ejercicios')).toBe(false);
    expect(moduloHabilitado({ colA: ['paginas'] }, 'colA', 'ejercicios')).toBe(false);
  });

  it('la key en la lista → ENCENDIDO (inverso al de los default-on)', () => {
    expect(moduloHabilitado({ colA: ['ejercicios'] }, 'colA', 'ejercicios')).toBe(true);
  });

  it('coexisten en la misma lista: un default-on apagado y ejercicios encendido', () => {
    // La misma colección apaga Páginas (default-on) y enciende Ejercicios (opt-in).
    const mapa = { colA: ['paginas', 'ejercicios'] };
    expect(moduloHabilitado(mapa, 'colA', 'paginas')).toBe(false); // apagado
    expect(moduloHabilitado(mapa, 'colA', 'ejercicios')).toBe(true); // encendido
    expect(moduloHabilitado(mapa, 'colA', 'documentacion')).toBe(true); // default on intacto
  });
});
