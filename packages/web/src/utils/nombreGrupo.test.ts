/**
 * Partir el nombre de un grupo en prefijo + sección.
 *
 * Nace de un error real: dos alumnos acabaron en "AgoDic26 TC2008B 101" cuando
 * iban al 102. Los dos nombres comparten 17 de 20 caracteres y en una lista se
 * leen igual. Estos tests fijan qué se considera sección y, sobre todo, cuándo
 * NO hay que partir, que es donde una regla demasiado ansiosa haría daño.
 */
import { describe, it, expect } from 'vitest';
import { partirNombreGrupo } from './nombreGrupo';

describe('partirNombreGrupo', () => {
  it('separa el número de sección del prefijo compartido', () => {
    expect(partirNombreGrupo('AgoDic26 TC2008B 101')).toEqual({
      prefijo: 'AgoDic26 TC2008B',
      seccion: '101',
    });
  });

  it('distingue dos secciones de la misma materia', () => {
    const a = partirNombreGrupo('AgoDic26 TC2008B 101');
    const b = partirNombreGrupo('AgoDic26 TC2008B 102');
    expect(a.prefijo).toBe(b.prefijo);
    expect(a.seccion).not.toBe(b.seccion);
  });

  it('deja intacto el nombre que no acaba en número', () => {
    expect(partirNombreGrupo('Prueba TC2007B')).toEqual({
      prefijo: 'Prueba TC2007B',
      seccion: '',
    });
  });

  it('no parte un nombre de una sola palabra aunque lleve cifras', () => {
    // "FebJun26" es el nombre entero: separar el 26 dejaría "FebJun" + ⟦26⟧.
    expect(partirNombreGrupo('FebJun26')).toEqual({ prefijo: 'FebJun26', seccion: '' });
  });

  it('devuelve entero un nombre que es solo el número', () => {
    // Sin prefijo, la insignia sola no diría de qué grupo se trata.
    expect(partirNombreGrupo('501')).toEqual({ prefijo: '501', seccion: '' });
  });

  it('normaliza los espacios de sobra antes de partir', () => {
    expect(partirNombreGrupo('  AgoDic26   TC2008B   101 ')).toEqual({
      prefijo: 'AgoDic26 TC2008B',
      seccion: '101',
    });
  });

  it('no revienta con nombre vacío o ausente', () => {
    expect(partirNombreGrupo('')).toEqual({ prefijo: '', seccion: '' });
    expect(partirNombreGrupo(undefined)).toEqual({ prefijo: '', seccion: '' });
    expect(partirNombreGrupo(null)).toEqual({ prefijo: '', seccion: '' });
  });

  it('ignora una cifra suelta pegada a otra palabra', () => {
    // "6to" no son solo cifras: no es una sección.
    expect(partirNombreGrupo('Robótica 6to')).toEqual({ prefijo: 'Robótica 6to', seccion: '' });
  });
});
