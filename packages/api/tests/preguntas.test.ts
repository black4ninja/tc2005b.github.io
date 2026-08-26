import { describe, it, expect } from 'vitest';
import {
  MODULOS_CONTENIDO,
  moduloEsOptIn,
  moduloHabilitado,
} from '../src/models/modulos-contenido.js';
import { normalizarEtiquetas, normalizarDuracion } from '../src/services/preguntas.service.js';

describe('el módulo Preguntas en el catálogo de contenido', () => {
  it('está en el catálogo y es opt-in', () => {
    expect(MODULOS_CONTENIDO as readonly string[]).toContain('preguntas');
    expect(moduloEsOptIn('preguntas')).toBe(true);
  });

  it('nace apagado: asignar la colección no lo enciende', () => {
    // Es lo que separa este módulo de Wiki o Competencias: una materia con
    // Preguntas encendida sin querer le pondría al profesor una sección vacía
    // en el menú de su grupo.
    expect(moduloHabilitado(undefined, 'col-1', 'preguntas')).toBe(false);
    expect(moduloHabilitado({}, 'col-1', 'preguntas')).toBe(false);
    expect(moduloHabilitado({ 'col-1': [] }, 'col-1', 'preguntas')).toBe(false);
  });

  it('para los opt-in, la lista guardada enumera lo ENCENDIDO', () => {
    expect(moduloHabilitado({ 'col-1': ['preguntas'] }, 'col-1', 'preguntas')).toBe(true);
    // …y solo para esa colección.
    expect(moduloHabilitado({ 'col-1': ['preguntas'] }, 'col-2', 'preguntas')).toBe(false);
  });

  it('no altera el default de los módulos que ya existían', () => {
    expect(moduloHabilitado({ 'col-1': ['preguntas'] }, 'col-1', 'documentacion')).toBe(true);
    expect(moduloHabilitado({ 'col-1': ['preguntas'] }, 'col-1', 'competencias')).toBe(true);
    expect(moduloHabilitado({ 'col-1': ['preguntas'] }, 'col-1', 'diagramas')).toBe(false);
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
