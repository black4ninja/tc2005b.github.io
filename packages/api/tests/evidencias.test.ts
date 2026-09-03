import { describe, it, expect } from 'vitest';
import { agruparEvidencias, urlDeEvidencia } from '../src/services/evidencias.service.js';

/** Una evidencia de mentira, con lo justo para agrupar. */
function ev(id: string, citaId: string | null, competenciaId: string) {
  return { id, citaId, competenciaId };
}

/** La misma llave que usa el servicio, sobre el objeto plano de la prueba. */
const llave = (e: ReturnType<typeof ev>) => (e.citaId ? `cita:${e.citaId}` : `libre:${e.competenciaId}`);

describe('agruparEvidencias', () => {
  it('cada cita se queda con las suyas', () => {
    const grupos = agruparEvidencias(
      [ev('1', 'c1', 'k1'), ev('2', 'c2', 'k1'), ev('3', 'c1', 'k1')],
      llave,
    );
    expect([...grupos.keys()]).toEqual(['cita:c1', 'cita:c2']);
    expect(grupos.get('cita:c1')!.map((e) => e.id)).toEqual(['1', '3']);
    expect(grupos.get('cita:c2')!.map((e) => e.id)).toEqual(['2']);
  });

  it('dos citas de la MISMA competencia no se mezclan', () => {
    // Es el traslape que hay que evitar: el 1.º y el 2.º intento de la misma
    // competencia son dos citas, y cada una enseña lo suyo.
    const grupos = agruparEvidencias([ev('1', 'c1', 'k1'), ev('2', 'c2', 'k1')], llave);
    expect(grupos.get('cita:c1')!).toHaveLength(1);
    expect(grupos.get('cita:c2')!).toHaveLength(1);
  });

  it('las sueltas van juntas por competencia, no con las de una cita', () => {
    const grupos = agruparEvidencias(
      [ev('1', 'c1', 'k1'), ev('2', null, 'k1'), ev('3', null, 'k2')],
      llave,
    );
    expect(grupos.get('cita:c1')!.map((e) => e.id)).toEqual(['1']);
    expect(grupos.get('libre:k1')!.map((e) => e.id)).toEqual(['2']);
    expect(grupos.get('libre:k2')!.map((e) => e.id)).toEqual(['3']);
  });

  it('sin evidencias no hay grupos', () => {
    expect(agruparEvidencias([], llave).size).toBe(0);
  });
});

describe('urlDeEvidencia', () => {
  it('acepta http y https', () => {
    expect(urlDeEvidencia('https://github.com/quien/repo')).toBe('https://github.com/quien/repo');
    expect(urlDeEvidencia('http://ejemplo.mx/doc.pdf')).toBe('http://ejemplo.mx/doc.pdf');
  });

  it('quita los espacios de los lados', () => {
    expect(urlDeEvidencia('  https://ejemplo.mx  ')).toBe('https://ejemplo.mx');
  });

  it('rechaza lo que no es una URL', () => {
    expect(urlDeEvidencia('mi repo')).toBe(null);
    expect(urlDeEvidencia('')).toBe(null);
    expect(urlDeEvidencia('   ')).toBe(null);
    expect(urlDeEvidencia(null)).toBe(null);
    expect(urlDeEvidencia(42)).toBe(null);
  });

  it('rechaza los esquemas que ejecutan algo', () => {
    // El profesor las abre desde su panel: un `javascript:` ahí no es una
    // evidencia, es un agujero.
    expect(urlDeEvidencia('javascript:alert(1)')).toBe(null);
    expect(urlDeEvidencia('data:text/html,<script>alert(1)</script>')).toBe(null);
    expect(urlDeEvidencia('file:///etc/passwd')).toBe(null);
  });

  it('rechaza una URL absurdamente larga', () => {
    expect(urlDeEvidencia(`https://ejemplo.mx/${'a'.repeat(2100)}`)).toBe(null);
  });
});
