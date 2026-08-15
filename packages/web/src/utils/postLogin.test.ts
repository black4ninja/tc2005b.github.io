/**
 * A dónde entra cada quien al autenticarse.
 *
 * El caso que motivó estas pruebas: el alumno nuevo entraba al CALENDARIO con
 * medio menú en gris y sin forma de saber que lo que faltaba era rellenar el
 * perfil, que vive en el panel. El calendario no lo dice porque no está
 * bloqueado, y lo bloqueado no se puede pulsar para enterarse.
 */
import { describe, it, expect } from 'vitest';
import { grupoDeEntrada, rutaPostLogin } from './postLogin';

const alumno = (grupos: { id: string; perfilCompleto?: boolean }[], ultimoGrupoId?: string) => ({
  userType: 'alumno',
  grupos,
  ultimoGrupoId,
});

describe('rutaPostLogin — alumno', () => {
  it('con el perfil del grupo SIN rellenar, al panel: es donde está el formulario', () => {
    expect(rutaPostLogin(alumno([{ id: 'g1', perfilCompleto: false }]))).toBe('/alumno');
  });

  it('con el perfil ya rellenado, al calendario de su grupo', () => {
    expect(rutaPostLogin(alumno([{ id: 'g1', perfilCompleto: true }]))).toBe(
      '/alumno/grupos/g1/calendario',
    );
  });

  it('sin el dato del perfil se comporta como siempre: al calendario', () => {
    // Una respuesta vieja del servidor no debe mandar a todo el mundo al panel.
    expect(rutaPostLogin(alumno([{ id: 'g1' }]))).toBe('/alumno/grupos/g1/calendario');
  });

  it('mira el perfil del grupo con el que se le REABRE la sesión, no el del primero', () => {
    // Quien ya llevaba un semestre y entra a un grupo nuevo: el viejo lo tiene
    // completo, el nuevo no. Decide el que va a estar activo.
    const user = alumno(
      [{ id: 'viejo', perfilCompleto: true }, { id: 'nuevo', perfilCompleto: false }],
      'nuevo',
    );
    expect(rutaPostLogin(user)).toBe('/alumno');
  });

  it('y al revés: el recordado completo manda aunque el primero esté a medias', () => {
    const user = alumno(
      [{ id: 'nuevo', perfilCompleto: false }, { id: 'viejo', perfilCompleto: true }],
      'viejo',
    );
    expect(rutaPostLogin(user)).toBe('/alumno/grupos/viejo/calendario');
  });

  it('sin grupos, al panel', () => {
    expect(rutaPostLogin(alumno([]))).toBe('/alumno');
  });
});

describe('grupoDeEntrada', () => {
  it('el recordado, si sigue siendo suyo', () => {
    expect(grupoDeEntrada(alumno([{ id: 'a' }, { id: 'b' }], 'b'))?.id).toBe('b');
  });

  it('si el recordado ya no está en la lista, el primero', () => {
    // Le dieron de baja de ese grupo, o lo bloquearon: el id sigue guardado.
    expect(grupoDeEntrada(alumno([{ id: 'a' }, { id: 'b' }], 'fantasma'))?.id).toBe('a');
  });

  it('sin grupos, ninguno', () => {
    expect(grupoDeEntrada(alumno([]))).toBeNull();
  });
});

describe('rutaPostLogin — staff', () => {
  it('el profesor va al detalle de su grupo, sin mirar perfiles', () => {
    expect(rutaPostLogin({ userType: 'profesor', grupos: [{ id: 'g1' }] })).toBe('/admin/grupos/g1');
  });

  it('el profesor sin grupo, al panel admin', () => {
    expect(rutaPostLogin({ userType: 'profesor', grupos: [] })).toBe('/admin');
  });

  it('el admin, al panel admin', () => {
    expect(rutaPostLogin({ userType: 'admin' })).toBe('/admin');
  });
});
