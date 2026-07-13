/**
 * Tests de `sanitizarUrlHref`. Código de seguridad: el valor acaba en un
 * `<a href>` del menú, así que un esquema ejecutable aquí es XSS en la sesión de
 * quien pulse el enlace (admin o alumno).
 * Corre sin servidor: `npx vitest run packages/api/tests/url.test.ts`
 */
import { describe, it, expect } from 'vitest';
import { sanitizarUrlHref } from '../src/utils/url.js';

describe('sanitizarUrlHref', () => {
  describe('rechaza (null) lo que podría ejecutar código', () => {
    const peligrosas = [
      'javascript:alert(document.cookie)',
      'JavaScript:alert(1)',            // el esquema no distingue mayúsculas
      '  javascript:alert(1)  ',        // espacios alrededor
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
    ];
    for (const url of peligrosas) {
      it(`rechaza ${JSON.stringify(url)}`, () => {
        expect(sanitizarUrlHref(url)).toBeNull();
      });
    }
  });

  describe('rechaza (null) lo que no es una URL absoluta', () => {
    const invalidas = [
      'no-es-una-url',
      '/politicas',                     // relativa: este campo es para externos
      'docs.google.com/spreadsheets',   // sin esquema
      123,
      {},
      [],
      true,
    ];
    for (const valor of invalidas) {
      it(`rechaza ${JSON.stringify(valor)}`, () => {
        expect(sanitizarUrlHref(valor)).toBeNull();
      });
    }
  });

  describe('acepta http/https', () => {
    it('acepta una hoja de cálculo con query y fragmento', () => {
      const url =
        'https://docs.google.com/spreadsheets/d/1U1fbfaB/edit?gid=32307462#gid=32307462';
      expect(sanitizarUrlHref(url)).toBe(url);
    });

    it('acepta http (no solo https)', () => {
      expect(sanitizarUrlHref('http://example.com/agenda')).toBe('http://example.com/agenda');
    });

    it('normaliza: recorta espacios', () => {
      expect(sanitizarUrlHref('  https://example.com/x  ')).toBe('https://example.com/x');
    });
  });

  describe('vacío = quitar el enlace, no error', () => {
    it.each([undefined, null, '', '   '])('%p → cadena vacía', (valor) => {
      expect(sanitizarUrlHref(valor)).toBe('');
    });
  });
});
