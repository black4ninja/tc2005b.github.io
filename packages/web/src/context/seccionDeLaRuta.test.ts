/**
 * Al cambiar de grupo, al alumno se le lleva a la MISMA sección del grupo nuevo.
 * Esta función decide si hay sección que conservar; equivocarse aquí manda al
 * alumno a una URL rota o le deja mirando los datos del grupo anterior.
 */
import { describe, it, expect } from 'vitest';
import { seccionDeLaRuta, grupoDeLaRuta } from './GrupoActivoContext';

describe('seccionDeLaRuta', () => {
  it('reconoce las secciones del grupo', () => {
    expect(seccionDeLaRuta('/alumno/grupos/abc123/malla')).toBe('malla');
    expect(seccionDeLaRuta('/alumno/grupos/abc123/competencias')).toBe('competencias');
    expect(seccionDeLaRuta('/alumno/grupos/abc123/calendario')).toBe('calendario');
  });

  it('conserva las subrutas enteras, no solo el primer tramo', () => {
    expect(seccionDeLaRuta('/alumno/grupos/abc123/equipos/xyz/avances')).toBe('equipos/xyz/avances');
  });

  it('el panel no cuelga de un grupo: no hay sección que conservar', () => {
    expect(seccionDeLaRuta('/alumno')).toBeNull();
    expect(seccionDeLaRuta('/')).toBeNull();
  });

  it('la ruta del grupo sin sección tampoco cuenta', () => {
    expect(seccionDeLaRuta('/alumno/grupos/abc123')).toBeNull();
    // Con la barra final no hay nada detrás que conservar.
    expect(seccionDeLaRuta('/alumno/grupos/abc123/')).toBeNull();
  });

  it('no se confunde con rutas de otras zonas', () => {
    expect(seccionDeLaRuta('/admin/grupos/abc123/alumnos')).toBeNull();
    expect(seccionDeLaRuta('/contenidos/tc2005b/git')).toBeNull();
  });
});

/**
 * Si la URL apunta a un grupo que ya no está disponible (baja del alumno o
 * grupo bloqueado), hay que sacarlo de ahí. Fallar aquí deja al alumno en una
 * pantalla que responde 403 a todo.
 */
describe('grupoDeLaRuta', () => {
  it('saca el id del grupo de las rutas del alumno', () => {
    expect(grupoDeLaRuta('/alumno/grupos/abc123/malla')).toBe('abc123');
    expect(grupoDeLaRuta('/alumno/grupos/abc123/equipos/xyz/avances')).toBe('abc123');
  });

  it('reconoce la ruta del grupo sin sección', () => {
    expect(grupoDeLaRuta('/alumno/grupos/abc123')).toBe('abc123');
    expect(grupoDeLaRuta('/alumno/grupos/abc123/')).toBe('abc123');
  });

  it('devuelve null donde no hay grupo que comprobar', () => {
    expect(grupoDeLaRuta('/alumno')).toBeNull();
    expect(grupoDeLaRuta('/alumno/grupos')).toBeNull();
    expect(grupoDeLaRuta('/')).toBeNull();
  });

  it('no se confunde con las rutas del admin', () => {
    expect(grupoDeLaRuta('/admin/grupos/abc123/alumnos')).toBeNull();
  });
});
