/**
 * Tests del pipeline compartido (sanitización = código de seguridad).
 * Corre sin servidor: `npx vitest run packages/contenido-pipeline/index.test.js`
 */
import { describe, it, expect } from 'vitest';
import { renderMarkdown, extraerToc } from './index.js';

describe('sanitización (allowlist)', () => {
  it('elimina scripts, handlers e iframes del HTML inline', async () => {
    const html = await renderMarkdown(
      '# T\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n<iframe src="https://evil"></iframe>',
    );
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<iframe');
  });

  it('conserva GFM (tablas) y highlight (clases hljs)', async () => {
    const html = await renderMarkdown('| a |\n| - |\n| 1 |\n\n```js\nconst x = 1;\n```');
    expect(html).toContain('<table>');
    expect(html).toContain('hljs');
  });
});

describe('admonitions (paridad Docusaurus)', () => {
  it('soporta :::note Título (estilo Docusaurus), corchetes y sin título', async () => {
    expect(await renderMarkdown(':::note Antes\ncuerpo\n:::')).toContain('admonition-note');
    expect(await renderMarkdown(':::warning[Ojo]\ncuerpo\n:::')).toContain('admonition-warning');
    expect(await renderMarkdown(':::tip\ncuerpo\n:::')).toContain('admonition-tip');
  });

  it('conserva formato inline en el título', async () => {
    const html = await renderMarkdown(':::note **Importante**\ncuerpo\n:::');
    expect(html).toContain('<strong>Importante</strong>');
  });

  it('NO reescribe la sintaxis dentro de bloques de código cercados', async () => {
    const html = await renderMarkdown('```\n:::note Ejemplo\ntexto\n:::\n```');
    expect(html).toContain(':::note Ejemplo');
    expect(html).not.toContain('admonition');
  });

  it('NO toca código indentado (4+ espacios)', async () => {
    const html = await renderMarkdown('    :::note hola\n');
    expect(html).not.toContain('admonition');
  });
});

describe('recursos (referencias recurso:)', () => {
  it('reescribe imágenes y enlaces recurso: al endpoint gated', async () => {
    const img = await renderMarkdown('![diagrama](recurso:abc123/diagrama.png)');
    expect(img).toContain('src="/api/contenidos/recursos/abc123/diagrama.png"');
    const link = await renderMarkdown('[starter](recurso:xyz/starter.zip)');
    expect(link).toContain('href="/api/contenidos/recursos/xyz/starter.zip"');
  });

  it('sigue bloqueando protocolos peligrosos', async () => {
    const html = await renderMarkdown('![x](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });
});

describe('TOC', () => {
  it('extrae h2/h3 con sus ids (anclas)', async () => {
    const html = await renderMarkdown('# T\n\n## Objetivo\n\n### Detalle\n\n## Entrega');
    expect(extraerToc(html)).toEqual([
      { id: 'objetivo', titulo: 'Objetivo', nivel: 2 },
      { id: 'detalle', titulo: 'Detalle', nivel: 3 },
      { id: 'entrega', titulo: 'Entrega', nivel: 2 },
    ]);
  });

  it('decodifica entidades HTML en los títulos (&, <, >, comillas)', async () => {
    const html = await renderMarkdown('## Preguntas & Respuestas\n\n## Uso de `<div>`');
    const toc = extraerToc(html);
    expect(toc[0].titulo).toBe('Preguntas & Respuestas');
    expect(toc[1].titulo).toBe('Uso de <div>');
  });
});
