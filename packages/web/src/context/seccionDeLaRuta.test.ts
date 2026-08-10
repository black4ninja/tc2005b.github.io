/**
 * Al cambiar de grupo, al alumno se le lleva a la MISMA sección del grupo nuevo.
 * Esta función decide si hay sección que conservar; equivocarse aquí manda al
 * alumno a una URL rota o le deja mirando los datos del grupo anterior.
 */
import { describe, it, expect } from 'vitest';
import { seccionDeLaRuta } from './GrupoActivoContext';

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
