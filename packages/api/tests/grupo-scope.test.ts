/**
 * Decisión pura del guard de acceso por grupo (rol "profesor").
 * Es código de seguridad: el profesor solo debe tocar SU grupo, y nada que no
 * sea staff debe pasar. Corre sin servidor.
 */
import { describe, it, expect } from 'vitest';
import { evaluarAccesoGrupo } from '../src/middlewares/grupo-scope.middleware.js';

describe('evaluarAccesoGrupo (candado por grupo)', () => {
  it('admin pasa siempre, con o sin id de grupo', () => {
    expect(evaluarAccesoGrupo('admin', true)).toBe('permitir');
    expect(evaluarAccesoGrupo('admin', false)).toBe('permitir');
  });

  it('profesor con id de grupo → hay que verificar pertenencia', () => {
    expect(evaluarAccesoGrupo('profesor', true)).toBe('verificar');
  });

  it('profesor SIN id de grupo → denegar (ruta mal montada, no pasar por omisión)', () => {
    expect(evaluarAccesoGrupo('profesor', false)).toBe('denegar');
  });

  it('alumno y roles desconocidos → denegar siempre', () => {
    expect(evaluarAccesoGrupo('alumno', true)).toBe('denegar');
    expect(evaluarAccesoGrupo('alumno', false)).toBe('denegar');
    expect(evaluarAccesoGrupo(undefined, true)).toBe('denegar');
    expect(evaluarAccesoGrupo('', true)).toBe('denegar');
  });
});
