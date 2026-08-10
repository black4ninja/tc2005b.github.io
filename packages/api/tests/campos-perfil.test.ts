/**
 * Campos del perfil que un grupo pide, y la validación que decide si el perfil
 * queda completo.
 *
 * Esa bandera no es cosmética: mientras `perfilCompleto` sea false, el alumno
 * tiene en gris Malla, Competencias, Documentación, Ejercicios y Agendar
 * Entrevistas. Un campo que se pida y el alumno no pueda rellenar (porque su
 * grupo no trabaja con repositorio, por ejemplo) le deja el panel bloqueado
 * entero, y el aviso de la pantalla solo habla de la malla.
 */
import { describe, it, expect } from 'vitest';
import {
  campoPerfilHabilitado,
  esCampoDesactivable,
  validarPerfil,
  CAMPOS_PERFIL,
} from '../src/models/campos-perfil.js';

const PERFIL_OK = {
  experiencia: 'He llevado dos cursos de programación orientada a objetos',
  expectativas: 'Aprender a modelar sistemas multiagentes',
  compromiso: 'Asistir a todas las sesiones y entregar a tiempo',
  repositorioIndividual: 'https://github.com/alguien/mi-repo',
  situacionesEspeciales: 'Ninguna',
};

describe('esCampoDesactivable', () => {
  it('solo el repositorio se puede apagar por grupo', () => {
    expect(esCampoDesactivable('repositorioIndividual')).toBe(true);
    for (const campo of ['experiencia', 'expectativas', 'compromiso', 'situacionesEspeciales']) {
      expect(esCampoDesactivable(campo)).toBe(false);
    }
  });

  it('rechaza lo que no es un campo del perfil', () => {
    expect(esCampoDesactivable('perfilCompleto')).toBe(false);
    expect(esCampoDesactivable('')).toBe(false);
    expect(esCampoDesactivable(null)).toBe(false);
  });
});

describe('campoPerfilHabilitado', () => {
  it('sin lista, el grupo pide todo (grupos de antes de esta función)', () => {
    for (const campo of CAMPOS_PERFIL) {
      expect(campoPerfilHabilitado(campo, undefined)).toBe(true);
      expect(campoPerfilHabilitado(campo, [])).toBe(true);
    }
  });

  it('un campo no desactivable se sigue pidiendo aunque esté en la lista', () => {
    // Defensa contra un dato viejo o un payload manipulado: el mínimo común no
    // se puede desactivar por mucho que la lista lo diga.
    expect(campoPerfilHabilitado('experiencia', ['experiencia'])).toBe(true);
    expect(campoPerfilHabilitado('compromiso', ['compromiso', 'repositorioIndividual'])).toBe(true);
  });

  it('el repositorio sí se apaga', () => {
    expect(campoPerfilHabilitado('repositorioIndividual', ['repositorioIndividual'])).toBe(false);
  });
});

describe('validarPerfil', () => {
  it('un perfil completo no da errores', () => {
    expect(validarPerfil(PERFIL_OK, [])).toEqual({});
  });

  it('sin repositorio falla… salvo que el grupo no lo pida', () => {
    const sinRepo = { ...PERFIL_OK, repositorioIndividual: '' };
    expect(Object.keys(validarPerfil(sinRepo, []))).toEqual(['repositorioIndividual']);
    expect(validarPerfil(sinRepo, ['repositorioIndividual'])).toEqual({});
  });

  it('apagar el repositorio no relaja los demás campos', () => {
    const flojo = { ...PERFIL_OK, experiencia: 'poco', repositorioIndividual: '' };
    const errores = validarPerfil(flojo, ['repositorioIndividual']);
    expect(errores.experiencia).toBeTruthy();
    expect(errores.repositorioIndividual).toBeUndefined();
  });

  it('exige una URL de GitHub de verdad cuando el campo está activo', () => {
    expect(validarPerfil({ ...PERFIL_OK, repositorioIndividual: 'github.com/sin-esquema' }, []))
      .toHaveProperty('repositorioIndividual');
    expect(validarPerfil({ ...PERFIL_OK, repositorioIndividual: 'https://gitlab.com/x/y' }, []))
      .toHaveProperty('repositorioIndividual');
  });

  it('respeta los mínimos de longitud', () => {
    const corto = {
      experiencia: '123456789',
      expectativas: '123456789',
      compromiso: '123456789',
      repositorioIndividual: 'https://github.com/a/b',
      situacionesEspeciales: '1234',
    };
    const errores = validarPerfil(corto, []);
    expect(Object.keys(errores).sort()).toEqual(
      ['compromiso', 'expectativas', 'experiencia', 'situacionesEspeciales'],
    );
  });

  it('un campo ausente o que no es texto cuenta como vacío, no revienta', () => {
    expect(validarPerfil({}, [])).toHaveProperty('experiencia');
    expect(validarPerfil({ ...PERFIL_OK, experiencia: 42 }, [])).toHaveProperty('experiencia');
    expect(validarPerfil({ ...PERFIL_OK, repositorioIndividual: null }, [])).toHaveProperty('repositorioIndividual');
  });

  it('no se puede vaciar el perfil apagando lo que no es desactivable', () => {
    // Mandando toda la lista, lo único que se cae es el repositorio.
    const errores = validarPerfil({}, [...CAMPOS_PERFIL]);
    expect(Object.keys(errores).sort()).toEqual(
      ['compromiso', 'expectativas', 'experiencia', 'situacionesEspeciales'],
    );
  });
});
