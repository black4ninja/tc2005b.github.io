/**
 * Tests de las utilidades puras de la búsqueda del CMS (US-5).
 * El SCOPE por permisos se verifica en el controller (usa getSlugsPermitidos,
 * el mismo gate probado del visor); aquí la extracción de snippets.
 */
import { describe, it, expect } from 'vitest';
import { aTextoPlano, extraerSnippet } from '../src/services/contenidos-busqueda.js';

describe('aTextoPlano', () => {
  it('quita el ruido de Markdown', () => {
    expect(aTextoPlano('# Título\n\n**negritas** y `código` [link](recurso:x/y.png)')).toBe(
      'Título negritas y código link recurso x/y.png',
    );
  });
});

describe('extraerSnippet', () => {
  const cuerpo = `# Lab 1\n\n${'relleno '.repeat(40)}la palabra flexbox aparece aquí${' relleno'.repeat(40)}`;

  it('centra el snippet en la primera aparición del término (case-insensitive)', () => {
    const s = extraerSnippet(cuerpo, 'FLEXBOX');
    expect(s).toContain('flexbox');
    expect(s.startsWith('…')).toBe(true);
    expect(s.endsWith('…')).toBe(true);
    expect(s.length).toBeLessThan(220);
  });

  it('sin aparición devuelve el inicio del texto', () => {
    const s = extraerSnippet(cuerpo, 'inexistente-xyz');
    expect(s.startsWith('Lab 1')).toBe(true);
  });

  it('cuerpo vacío devuelve vacío', () => {
    expect(extraerSnippet('', 'algo')).toBe('');
  });
});
