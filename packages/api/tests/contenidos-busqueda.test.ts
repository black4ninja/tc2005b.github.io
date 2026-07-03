/**
 * Tests de las utilidades puras de la búsqueda del CMS (US-5).
 * El SCOPE por permisos se verifica en el controller (usa getSlugsPermitidos,
 * el mismo gate probado del visor); aquí la extracción de snippets.
 */
import { describe, it, expect } from 'vitest';
import { aTextoPlano, extraerSnippet } from '../src/services/contenidos-busqueda.js';

describe('aTextoPlano', () => {
  it('quita el ruido de Markdown (sin comerse guiones/dos-puntos internos)', () => {
    expect(aTextoPlano('# Título\n\n**negritas** y `código` [link](recurso:x/y.png)')).toBe(
      'Título negritas y código link recurso:x/y.png',
    );
  });

  it('quita tags de HTML crudo (las páginas tipo html no muestran sopa de etiquetas)', () => {
    expect(aTextoPlano('<!doctype html><html><body><h1>Demo Flexbox</h1><p>Un ejemplo</p></body></html>')).toBe(
      'Demo Flexbox Un ejemplo',
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

  it('centra correctamente términos con guion (no los parte al limpiar)', () => {
    const conGuion = `# Título\n\n${'x '.repeat(50)}el término flexbox-magico va aquí${' y'.repeat(50)}`;
    const s = extraerSnippet(conGuion, 'flexbox-magico');
    expect(s).toContain('flexbox-magico');
  });

  it('sin aparición devuelve el inicio del texto', () => {
    const s = extraerSnippet(cuerpo, 'inexistente-xyz');
    expect(s.startsWith('Lab 1')).toBe(true);
  });

  it('cuerpo vacío devuelve vacío', () => {
    expect(extraerSnippet('', 'algo')).toBe('');
  });
});
