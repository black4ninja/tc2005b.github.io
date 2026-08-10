import { describe, it, expect } from 'vitest';
import {
  CSP_PRESENTACION,
  sanitizarNombreArchivo,
  seSirveInline,
} from '../src/constants/presentaciones.js';
import { esTipoActividad } from '../src/constants/actividades.js';

describe('seSirveInline', () => {
  it('abre en el navegador solo el HTML', () => {
    expect(seSirveInline('clase-01.html')).toBe(true);
    expect(seSirveInline('CLASE-01.HTM')).toBe(true);
  });

  it('descarga cualquier otro formato', () => {
    for (const nombre of ['slides.pdf', 'clase.pptx', 'notas.docx', 'demo.zip']) {
      expect(seSirveInline(nombre)).toBe(false);
    }
  });

  it('no se deja engañar por la extensión en medio del nombre', () => {
    // El .html tiene que ser el final: si no, un .svg pasaría por presentación
    // y el SVG sí ejecuta script.
    expect(seSirveInline('trampa.html.svg')).toBe(false);
  });
});

describe('sanitizarNombreArchivo', () => {
  it('quita rutas, acentos y espacios pero conserva la extensión', () => {
    expect(sanitizarNombreArchivo('Clase 01 — Introducción.html')).toBe('clase-01-introduccion.html');
    expect(sanitizarNombreArchivo('../../etc/passwd')).toBe('passwd');
    expect(sanitizarNombreArchivo('C:\\Users\\yo\\slides.pdf')).toBe('slides.pdf');
  });

  it('no deja comillas ni saltos que rompan Content-Disposition', () => {
    const sucio = sanitizarNombreArchivo('mal"nombre\n.html');
    expect(sucio).not.toMatch(/["\r\n]/);
    expect(sucio.endsWith('.html')).toBe(true);
  });

  it('siempre devuelve algo utilizable', () => {
    expect(sanitizarNombreArchivo('***')).toBe('presentacion');
  });
});

describe('CSP_PRESENTACION', () => {
  it('aísla el HTML subido en un origen opaco', () => {
    // Sin esto, un HTML servido inline leería la cookie de sesión del sitio.
    expect(CSP_PRESENTACION).toContain('sandbox');
    expect(CSP_PRESENTACION).not.toContain('allow-same-origin');
  });

  it('deja correr el JS que necesita una presentación', () => {
    expect(CSP_PRESENTACION).toContain('allow-scripts');
  });
});

describe('esTipoActividad', () => {
  it('acepta presentacion junto a los tipos de siempre', () => {
    expect(esTipoActividad('presentacion')).toBe(true);
    expect(esTipoActividad('lab')).toBe(true);
  });

  it('rechaza lo que no es un tipo', () => {
    expect(esTipoActividad('presentaciones')).toBe(false);
    expect(esTipoActividad(undefined)).toBe(false);
  });
});
