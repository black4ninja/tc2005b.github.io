/**
 * Permisos individuales de wiki: qué crear, reactivar y revocar.
 *
 * El endpoint recibe el CONJUNTO entero de colecciones que el alumno debe
 * tener, no un «añade esta». Eso lo hace idempotente, pero también significa
 * que un payload mal calculado revoca accesos que nadie pidió quitar: esta
 * función es la que lo decide, y por eso está aparte y probada.
 *
 * Detalle que importa: un permiso revocado NO se borra, se da de baja. Volver a
 * otorgarlo lo REACTIVA en vez de crear otro, para no perder quién lo otorgó la
 * primera vez y cuándo.
 */
import { describe, it, expect } from 'vitest';
import { planificarPermisos } from '../src/controllers/acceso-wiki.controller.js';

describe('planificarPermisos', () => {
  it('crea el permiso que no existía de ninguna forma', () => {
    expect(planificarPermisos(['tc2005b'], [], [])).toEqual({
      crear: ['tc2005b'],
      reactivar: [],
      revocar: [],
    });
  });

  it('reactiva el que estaba dado de baja en vez de crear otro', () => {
    // Conserva el rastro original: quién lo otorgó y cuándo.
    expect(planificarPermisos(['tc2005b'], [], ['tc2005b'])).toEqual({
      crear: [],
      reactivar: ['tc2005b'],
      revocar: [],
    });
  });

  it('no toca lo que ya está vigente', () => {
    expect(planificarPermisos(['tc2005b'], ['tc2005b'], [])).toEqual({
      crear: [],
      reactivar: [],
      revocar: [],
    });
  });

  it('revoca lo que desaparece de la lista', () => {
    expect(planificarPermisos([], ['tc2005b'], [])).toEqual({
      crear: [],
      reactivar: [],
      revocar: ['tc2005b'],
    });
  });

  it('resuelve altas y bajas en la misma llamada', () => {
    expect(planificarPermisos(['tc2007b'], ['tc2005b'], [])).toEqual({
      crear: ['tc2007b'],
      reactivar: [],
      revocar: ['tc2005b'],
    });
  });

  it('con la misma lista dos veces no hace nada la segunda (idempotente)', () => {
    const primera = planificarPermisos(['a', 'b'], [], []);
    expect(primera.crear).toEqual(['a', 'b']);

    // Tras aplicar la primera, esas dos están vigentes.
    const segunda = planificarPermisos(['a', 'b'], ['a', 'b'], []);
    expect(segunda).toEqual({ crear: [], reactivar: [], revocar: [] });
  });

  it('no revoca nada cuando la lista pedida contiene a las vigentes', () => {
    // El caso que más duele si se equivoca: añadir una no puede quitar la otra.
    const plan = planificarPermisos(['a', 'b'], ['a'], []);
    expect(plan.revocar).toEqual([]);
    expect(plan.crear).toEqual(['b']);
  });

  it('mezcla vigentes, revocados y nuevos a la vez', () => {
    const plan = planificarPermisos(['a', 'b', 'c'], ['a', 'd'], ['b']);
    expect(plan).toEqual({
      crear: ['c'],
      reactivar: ['b'],
      revocar: ['d'],
    });
  });

  it('vaciar la lista revoca todo lo vigente y no resucita lo revocado', () => {
    const plan = planificarPermisos([], ['a', 'b'], ['c']);
    expect(plan).toEqual({ crear: [], reactivar: [], revocar: ['a', 'b'] });
  });
});
