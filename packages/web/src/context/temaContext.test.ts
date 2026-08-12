/**
 * Resolución del tema.
 *
 * La regla que importa: la elección del usuario GANA al sistema operativo. Solo
 * «auto» delega. Si se implementara con `@media (prefers-color-scheme)` en la
 * hoja de estilos, elegir «claro» a mano no podría ganarle al sistema — por eso
 * se resuelve en código y estos tests lo fijan.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { esPreferenciaValida, resolverTema } from './TemaContext';

/** Finge el ajuste del sistema operativo. */
function conSistema(oscuro: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: consulta.includes('dark') ? oscuro : !oscuro,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolverTema', () => {
  it('«claro» manda aunque el sistema pida oscuro', () => {
    conSistema(true);
    expect(resolverTema('claro')).toBe('claro');
  });

  it('«oscuro» manda aunque el sistema pida claro', () => {
    conSistema(false);
    expect(resolverTema('oscuro')).toBe('oscuro');
  });

  it('«auto» sigue al sistema en oscuro', () => {
    conSistema(true);
    expect(resolverTema('auto')).toBe('oscuro');
  });

  it('«auto» sigue al sistema en claro', () => {
    conSistema(false);
    expect(resolverTema('auto')).toBe('claro');
  });

  it('sin matchMedia, «auto» cae a claro en vez de reventar', () => {
    // Navegadores viejos, o el entorno de pruebas sin DOM.
    vi.stubGlobal('matchMedia', undefined);
    expect(resolverTema('auto')).toBe('claro');
    expect(resolverTema('oscuro')).toBe('oscuro');
  });
});

describe('esPreferenciaValida', () => {
  it('acepta las tres preferencias', () => {
    expect(esPreferenciaValida('claro')).toBe(true);
    expect(esPreferenciaValida('oscuro')).toBe(true);
    expect(esPreferenciaValida('auto')).toBe(true);
  });

  it('rechaza cualquier otra cosa', () => {
    // Es lo que protege de un localStorage manipulado o de un valor viejo.
    expect(esPreferenciaValida('dark')).toBe(false);
    expect(esPreferenciaValida('')).toBe(false);
    expect(esPreferenciaValida(null)).toBe(false);
    expect(esPreferenciaValida(undefined)).toBe(false);
    expect(esPreferenciaValida(1)).toBe(false);
  });
});
