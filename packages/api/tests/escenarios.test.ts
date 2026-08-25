import { describe, it, expect } from 'vitest';
import {
  MODULOS_GRUPO,
  esModuloGrupoValido,
  moduloGrupoHabilitado,
  normalizarModulosGrupo,
} from '../src/models/modulos-grupo.js';
import { normalizarEtiquetas, normalizarDuracion } from '../src/services/escenarios.service.js';

describe('módulos de grupo', () => {
  it('todos nacen apagados: sin lista, nada está encendido', () => {
    expect(moduloGrupoHabilitado(undefined, 'escenarios')).toBe(false);
    expect(moduloGrupoHabilitado([], 'escenarios')).toBe(false);
  });

  it('la lista guardada enumera lo ENCENDIDO', () => {
    expect(moduloGrupoHabilitado(['escenarios'], 'escenarios')).toBe(true);
  });

  it('rechaza keys que no están en el catálogo', () => {
    expect(esModuloGrupoValido('escenarios')).toBe(true);
    expect(esModuloGrupoValido('competencias')).toBe(false);
    expect(esModuloGrupoValido(42)).toBe(false);
    expect(normalizarModulosGrupo(['escenarios', 'inventado'])).toBeNull();
    expect(normalizarModulosGrupo('escenarios')).toBeNull();
  });

  it('normaliza sin repetidos', () => {
    expect(normalizarModulosGrupo(['escenarios', 'escenarios'])).toEqual(['escenarios']);
    expect(normalizarModulosGrupo([])).toEqual([]);
  });

  it('el catálogo no se solapa con los módulos de contenido', async () => {
    // Las dos listas viven en mapas distintos del Grupo; una key repetida
    // significaría que el mismo nombre se enciende en dos sitios a la vez.
    const { MODULOS_CONTENIDO } = await import('../src/models/modulos-contenido.js');
    for (const key of MODULOS_GRUPO) {
      expect(MODULOS_CONTENIDO as readonly string[]).not.toContain(key);
    }
  });
});

describe('normalizarEtiquetas', () => {
  it('baja a minúsculas, recorta y colapsa espacios', () => {
    expect(normalizarEtiquetas([' Trabajo   EN equipo ', 'Ética'])).toEqual(['trabajo en equipo', 'ética']);
  });

  it('quita repetidas y vacías', () => {
    expect(normalizarEtiquetas(['ética', 'ÉTICA', '  ', ''])).toEqual(['ética']);
  });

  it('ausente = sin etiquetas', () => {
    expect(normalizarEtiquetas(undefined)).toEqual([]);
    expect(normalizarEtiquetas(null)).toEqual([]);
  });

  it('rechaza lo que no es una lista de textos', () => {
    expect(normalizarEtiquetas('ética')).toHaveProperty('error');
    expect(normalizarEtiquetas([1, 2])).toHaveProperty('error');
  });

  it('pone tope al número y al largo', () => {
    expect(normalizarEtiquetas(Array.from({ length: 13 }, (_, i) => `e${i}`))).toHaveProperty('error');
    expect(normalizarEtiquetas(['x'.repeat(41)])).toHaveProperty('error');
  });
});

describe('normalizarDuracion', () => {
  it('ausente devuelve el valor por defecto que se le pase', () => {
    expect(normalizarDuracion(undefined, 180)).toBe(180);
    expect(normalizarDuracion(null, 180)).toBe(180);
    expect(normalizarDuracion('', undefined)).toBeUndefined();
  });

  it('acepta enteros dentro del rango, también como texto', () => {
    expect(normalizarDuracion(90, undefined)).toBe(90);
    expect(normalizarDuracion('90', undefined)).toBe(90);
  });

  it('rechaza fuera de rango en vez de recortar', () => {
    // Recortar a 0 dejaría el temporizador en cero y el profesor se enteraría
    // proyectando, que es el peor momento posible.
    expect(normalizarDuracion(0, undefined)).toHaveProperty('error');
    expect(normalizarDuracion(-30, undefined)).toHaveProperty('error');
    expect(normalizarDuracion(99999, undefined)).toHaveProperty('error');
  });

  it('rechaza decimales y basura', () => {
    expect(normalizarDuracion(90.5, undefined)).toHaveProperty('error');
    expect(normalizarDuracion('dos minutos', undefined)).toHaveProperty('error');
  });
});
