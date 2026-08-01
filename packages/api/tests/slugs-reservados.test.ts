/**
 * Slugs reservados en la raíz de una colección.
 *
 * Bajo la raíz cuelgan las rutas literales de los módulos del visor
 * (`/contenidos/:slug/ejercicios`, `/contenidos/:slug/diagramas`). Un documento
 * que tome uno de esos slugs queda inalcanzable, y el sitio no da ninguna pista
 * de por qué.
 *
 * La comprobación existía solo en la creación, así que renombrar bastaba para
 * saltársela. Estos tests fijan las dos puertas y el hecho de que la reserva es
 * SOLO a nivel raíz: anidado no hay colisión posible.
 */
import { describe, it, expect } from 'vitest';
import { slugReservadoEnRaiz, SLUGS_RESERVADOS_RAIZ } from '../src/controllers/cms-documentos.controller.js';
import type { Documento } from '../src/models/Documento.js';

/** No hace falta un Documento real: solo importa si hay padre o no. */
const UN_PADRE = {} as Documento;

describe('slugReservadoEnRaiz', () => {
  it('rechaza los slugs de módulo en la raíz', () => {
    expect(slugReservadoEnRaiz(null, 'ejercicios')).toContain('reservada');
    expect(slugReservadoEnRaiz(null, 'diagramas')).toContain('reservada');
  });

  it('los permite anidados, porque ahí no colisionan con ninguna ruta', () => {
    expect(slugReservadoEnRaiz(UN_PADRE, 'ejercicios')).toBeNull();
    expect(slugReservadoEnRaiz(UN_PADRE, 'diagramas')).toBeNull();
  });

  it('no molesta a cualquier otro slug', () => {
    expect(slugReservadoEnRaiz(null, 'introduccion')).toBeNull();
    expect(slugReservadoEnRaiz(null, 'diagrama')).toBeNull(); // singular: no es el módulo
  });

  it('el mensaje nombra el slug concreto, para que el autor sepa cuál cambiar', () => {
    expect(slugReservadoEnRaiz(null, 'diagramas')).toContain('"diagramas"');
  });

  it('cada módulo con ruta literal está en la lista', () => {
    // Si mañana se añade un módulo del visor con ruta literal y no se suma aquí,
    // este test no lo detectará: lo que fija es que los dos actuales están.
    expect([...SLUGS_RESERVADOS_RAIZ].sort()).toEqual(['diagramas', 'ejercicios']);
  });
});
