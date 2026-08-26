import { describe, it, expect } from 'vitest';
import { buscarColecciones, normalizar } from './buscarColecciones';
import type { ColeccionData } from '../types/contenidos';

const col = (clave: string | null, nombre: string, slug: string): ColeccionData => ({
  id: slug, nombre, slug, clave, descripcion: null, icono: 'menu_book', publicada: true, active: true,
});

const catalogo = [
  col('TC2005B', 'Construcción de software y toma de decisiones', 'tc2005b'),
  col('TC2007B', 'Integración de seguridad informática en redes y sistemas de software', 'tc2007b'),
  col('TC3009C', 'Inteligencia artificial avanzada para la ciencia de datos', 'tc3009c'),
  col(null, 'Materia sin clave', 'sin-clave'),
];

describe('normalizar', () => {
  it('quita acentos y mayúsculas', () => {
    expect(normalizar('  Informática  ')).toBe('informatica');
    expect(normalizar('CONSTRUCCIÓN')).toBe('construccion');
  });
});

describe('buscarColecciones', () => {
  it('sin consulta devuelve todo', () => {
    expect(buscarColecciones(catalogo, '   ')).toHaveLength(4);
  });

  it('encuentra por clave, sin importar mayúsculas', () => {
    expect(buscarColecciones(catalogo, 'tc2007').map((c) => c.slug)).toEqual(['tc2007b']);
  });

  it('encuentra aunque falte la tilde: es como se teclea', () => {
    expect(buscarColecciones(catalogo, 'informatica').map((c) => c.slug)).toEqual(['tc2007b']);
    expect(buscarColecciones(catalogo, 'construccion').map((c) => c.slug)).toEqual(['tc2005b']);
  });

  it('cruza palabras sueltas en cualquier orden', () => {
    // «datos artificial» no es una frase del nombre, pero ambas están.
    expect(buscarColecciones(catalogo, 'datos artificial').map((c) => c.slug)).toEqual(['tc3009c']);
  });

  it('no se cae con una colección sin clave', () => {
    expect(buscarColecciones(catalogo, 'sin clave').map((c) => c.slug)).toEqual(['sin-clave']);
  });

  it('sin coincidencias devuelve vacío', () => {
    expect(buscarColecciones(catalogo, 'astrofisica')).toEqual([]);
  });
});
