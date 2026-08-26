import { describe, it, expect } from 'vitest';
import { describirError } from './errores';

describe('describirError', () => {
  it('saca el mensaje y la traza de un Error', () => {
    const e = new Error('algo se rompió');
    const { mensaje, detalle } = describirError(e);
    expect(mensaje).toBe('algo se rompió');
    expect(detalle).toContain('algo se rompió');
  });

  it('con un Error sin mensaje usa el nombre en vez de quedarse en blanco', () => {
    expect(describirError(new TypeError()).mensaje).toBe('TypeError');
  });

  it('acepta que se lance una cadena', () => {
    expect(describirError('fallo de red')).toEqual({ mensaje: 'fallo de red', detalle: '' });
  });

  it('serializa un objeto suelto en el detalle', () => {
    const d = describirError({ code: 42, causa: 'x' });
    expect(d.mensaje).toBe('Error inesperado');
    expect(d.detalle).toContain('42');
  });

  it('no se cae con referencias circulares', () => {
    // Serializar aquí lanzaría, y lanzar dentro del manejador de errores deja
    // otra vez la pantalla en blanco: justo lo que esto viene a evitar.
    const circular: Record<string, unknown> = { a: 1 };
    circular.yo = circular;
    expect(() => describirError(circular)).not.toThrow();
    expect(describirError(circular).mensaje).toBe('Error inesperado');
  });

  it('aguanta null, undefined y un objeto vacío', () => {
    for (const v of [null, undefined, {}]) {
      expect(describirError(v).mensaje).toBe('Error inesperado');
    }
  });
});
