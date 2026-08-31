import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  tomarBloqueo, soltarBloqueo, ocupadoPor, bloqueosVigentes, soltarTodoDe,
} from '../src/services/scrum-bloqueos.js';

/**
 * El semáforo de edición. Sin él, dos personas del mismo equipo abren la misma
 * historia, cada una guarda lo suyo y gana la última: el trabajo de la otra
 * desaparece sin que nadie se entere.
 */

afterEach(() => { vi.useRealTimers(); });

describe('semáforo de edición', () => {
  it('el primero se lo queda y el segundo se entera de quién lo tiene', () => {
    const d = `d-${Math.random()}`;
    expect(tomarBloqueo(d, 'historia:1', 'ana', 'Ana Karen')).toBeNull();
    const ajeno = tomarBloqueo(d, 'historia:1', 'diego', 'Diego Montoya');
    expect(ajeno?.nombre).toBe('Ana Karen');
  });

  it('refrescar el propio candado es gratis: el cliente late mientras edita', () => {
    const d = `d-${Math.random()}`;
    tomarBloqueo(d, 'historia:1', 'ana', 'Ana');
    expect(tomarBloqueo(d, 'historia:1', 'ana', 'Ana')).toBeNull();
  });

  it('cada recurso va por su cuenta', () => {
    const d = `d-${Math.random()}`;
    tomarBloqueo(d, 'historia:1', 'ana', 'Ana');
    expect(tomarBloqueo(d, 'historia:2', 'diego', 'Diego')).toBeNull();
  });

  it('soltar solo vale si es tuyo', () => {
    const d = `d-${Math.random()}`;
    tomarBloqueo(d, 'historia:1', 'ana', 'Ana');
    soltarBloqueo(d, 'historia:1', 'diego');
    expect(ocupadoPor(d, 'historia:1', 'diego')).not.toBeNull();
    soltarBloqueo(d, 'historia:1', 'ana');
    expect(ocupadoPor(d, 'historia:1', 'diego')).toBeNull();
  });

  it('caduca solo: es lo que salva a la tarjeta de quien cerró la pestaña', () => {
    vi.useFakeTimers();
    const d = `d-${Math.random()}`;
    tomarBloqueo(d, 'historia:1', 'ana', 'Ana');
    vi.advanceTimersByTime(31000);
    // Sin caducidad esa historia quedaría bloqueada para el resto de la sesión.
    expect(tomarBloqueo(d, 'historia:1', 'diego', 'Diego')).toBeNull();
  });

  it('salir del tablero suelta todo lo de esa persona y nada más', () => {
    const d = `d-${Math.random()}`;
    tomarBloqueo(d, 'historia:1', 'ana', 'Ana');
    tomarBloqueo(d, 'objetivo:e1', 'ana', 'Ana');
    tomarBloqueo(d, 'historia:2', 'diego', 'Diego');
    soltarTodoDe(d, 'ana');
    expect(bloqueosVigentes(d).map((b) => b.recurso)).toEqual(['historia:2']);
  });

  it('dos dinámicas no se pisan los candados', () => {
    const a = `d-${Math.random()}`;
    const b = `d-${Math.random()}`;
    tomarBloqueo(a, 'historia:1', 'ana', 'Ana');
    expect(tomarBloqueo(b, 'historia:1', 'diego', 'Diego')).toBeNull();
  });

  it('lo tuyo nunca sale como ocupado para ti', () => {
    const d = `d-${Math.random()}`;
    tomarBloqueo(d, 'historia:1', 'ana', 'Ana');
    expect(ocupadoPor(d, 'historia:1', 'ana')).toBeNull();
  });
});
