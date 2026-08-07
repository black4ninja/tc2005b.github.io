/**
 * Verificación de autoría: el instrumento que impide publicar un ejercicio cuyas
 * comprobaciones no dicen lo que el autor cree.
 *
 * Los dos casos que importan son simétricos y opuestos: una aserción DEMASIADO
 * ESTRICTA hace fallar a una referencia legítima, y una DEMASIADO LAXA deja
 * pasar al diagrama trampa. Un verificador que solo comprobara lo primero daría
 * por bueno un ejercicio sin ninguna comprobación.
 */
import { describe, it, expect } from 'vitest';
import './calentar.js';
import { verificarEjercicioDiagrama } from '../../src/services/diagramas-verificacion.service.js';
import type { EjercicioVerificable } from '../../src/services/diagramas-verificacion.service.js';

/** Dos formas legítimas de modelar lo mismo: cambia el orden y un atributo extra. */
const REFERENCIA_A = `classDiagram
  class Pedido {
    +String folio
    +total() Double
  }
  class Linea {
    +Int cantidad
  }
  Pedido "1" *-- "0..*" Linea : contiene`;

const REFERENCIA_B = `classDiagram
  class Linea {
    +Int cantidad
    +Double precio
  }
  class Pedido {
    +String folio
    +Date fecha
    +total() Double
  }
  Pedido "1" *-- "0..*" Linea`;

/** El error que el ejercicio quiere enseñar: agregación en vez de composición. */
const TRAMPA = `classDiagram
  class Pedido {
    +String folio
    +total() Double
  }
  class Linea {
    +Int cantidad
  }
  Pedido "1" o-- "0..*" Linea : contiene`;

const BASE: EjercicioVerificable = {
  motor: 'mermaid',
  tipoDiagrama: 'clases',
  aserciones: [
    { tipo: 'relacion-es-composicion-no-agregacion', parametros: { todo: 'Pedido', parte: 'Linea' } },
    { tipo: 'clases-con-contenido' },
  ],
  diagramasReferencia: [REFERENCIA_A, REFERENCIA_B],
  diagramaTrampa: TRAMPA,
};

describe('un ejercicio bien construido', () => {
  it('pasa: las dos referencias cumplen y la trampa se detecta', async () => {
    const informe = await verificarEjercicioDiagrama(BASE);
    expect(informe.problemas).toEqual([]);
    expect(informe.ok).toBe(true);
    expect(informe.referencias.every((r) => r.veredicto === 'aceptado')).toBe(true);
    expect(informe.trampa?.detecta).toBe(true);
  });
});

describe('aserción SOBREAJUSTADA', () => {
  it('la delata la segunda referencia, que es igual de válida', async () => {
    // Exigir el atributo `precio` es un detalle accidental de la referencia B:
    // la A modela lo mismo sin él y es una solución legítima.
    const informe = await verificarEjercicioDiagrama({
      ...BASE,
      aserciones: [
        ...BASE.aserciones,
        { tipo: 'clase-tiene-atributo', parametros: { clase: 'Linea', atributo: 'precio' } },
      ],
    });
    expect(informe.ok).toBe(false);
    expect(informe.problemas.join(' ')).toContain('sobreajustada');
    // La referencia B sí la cumple: por eso hacen falta VARIAS referencias.
    expect(informe.referencias[0].veredicto).not.toBe('aceptado');
    expect(informe.referencias[1].veredicto).toBe('aceptado');
  });
});

describe('aserciones DEMASIADO LAXAS', () => {
  it('las delata la trampa, que pasa sin merecerlo', async () => {
    const informe = await verificarEjercicioDiagrama({
      ...BASE,
      // Solo se comprueba que las clases tengan contenido: la trampa también.
      aserciones: [{ tipo: 'clases-con-contenido' }],
    });
    expect(informe.ok).toBe(false);
    expect(informe.trampa?.detecta).toBe(false);
    expect(informe.problemas.join(' ')).toContain('se aprueba solo');
  });

  it('un ejercicio sin ninguna comprobación no puede darse por bueno', async () => {
    const informe = await verificarEjercicioDiagrama({ ...BASE, aserciones: [] });
    expect(informe.ok).toBe(false);
    expect(informe.problemas.join(' ')).toContain('ninguna comprobación');
  });
});

describe('defectos de autoría que se detectan sin evaluar nada', () => {
  it('una comprobación que no existe en el catálogo', async () => {
    const informe = await verificarEjercicioDiagrama({
      ...BASE,
      aserciones: [...BASE.aserciones, { tipo: 'inventada' }],
    });
    expect(informe.ok).toBe(false);
    expect(informe.problemas.join(' ')).toContain('no existe en el catálogo');
  });

  it('una cruzada que referencia un contexto no definido', async () => {
    const informe = await verificarEjercicioDiagrama({
      ...BASE,
      aserciones: [
        ...BASE.aserciones,
        { tipo: 'mensaje-existe-como-operacion', parametros: { contexto: 'clases' } },
      ],
    });
    expect(informe.ok).toBe(false);
    expect(informe.problemas.join(' ')).toContain('«clases»');
  });

  it('sin referencias no se puede saber si el ejercicio es resoluble', async () => {
    const informe = await verificarEjercicioDiagrama({ ...BASE, diagramasReferencia: [] });
    expect(informe.ok).toBe(false);
    expect(informe.problemas.join(' ')).toContain('Sin diagramas de referencia');
  });

  it('sin trampa no se puede saber si las comprobaciones son laxas', async () => {
    const informe = await verificarEjercicioDiagrama({ ...BASE, diagramaTrampa: '' });
    expect(informe.ok).toBe(false);
    expect(informe.problemas.join(' ')).toContain('Sin diagrama trampa');
  });

  it('una referencia con sintaxis inválida se reporta como defecto del ejercicio', async () => {
    const informe = await verificarEjercicioDiagrama({
      ...BASE,
      diagramasReferencia: [REFERENCIA_A, 'classDiagram\n  A <<<<-- B'],
    });
    expect(informe.ok).toBe(false);
    expect(informe.problemas.join(' ')).toContain('no es válido');
  });
});
