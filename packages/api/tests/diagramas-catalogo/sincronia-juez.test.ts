import { describe, expect, it } from 'vitest';
import { KEYS_JUZGABLES, esJuzgable, tipoDiagrama } from '@tc2005b/diagramas-catalogo';
import {
  SOPORTADOS_MERMAID,
  SOPORTADOS_PLANTUML,
  TIPOS_DIAGRAMA,
} from '../../src/services/juez-diagramas/index.js';

/**
 * El juez tiene su propia unión de tipos (`juez-diagramas/tipos.ts`) porque es
 * su dominio: lo que sabe normalizar. El catálogo declara lo mismo en
 * `motoresJuez`. Son dos listas y podrían separarse.
 *
 * Unificarlas no sale: el juez necesita una UNIÓN de TypeScript para que sus
 * `switch` sean exhaustivos, y el catálogo es un paquete de datos en JavaScript
 * plano —igual que `contenido-pipeline`— sin compilación. En vez de acoplarlos,
 * esta prueba comprueba que no divergen, que es la propiedad que de verdad
 * importa: un tipo declarado juzgable sin normalizador crea ejercicios cuyos
 * envíos responden 500, y uno normalizado pero no declarado queda inalcanzable
 * desde el editor.
 *
 * Las listas por motor se DERIVAN de los propios normalizadores y no se escriben
 * a mano: copiarlas aquí sería una cuarta lista paralela dentro de la prueba que
 * existe para evitarlas, y al añadir un motor a un tipo la prueba fallaría
 * señalando al catálogo en vez de a sí misma.
 */
describe('el catálogo y el juez declaran los mismos tipos evaluables', () => {
  it('coinciden como conjunto', () => {
    expect([...KEYS_JUZGABLES].sort()).toEqual([...TIPOS_DIAGRAMA].sort());
  });

  it('reparte los motores como los reparten los normalizadores', () => {
    for (const key of TIPOS_DIAGRAMA) {
      expect(esJuzgable(key, 'mermaid'), `${key} en Mermaid`).toBe(SOPORTADOS_MERMAID.includes(key));
      expect(esJuzgable(key, 'plantuml'), `${key} en PlantUML`).toBe(
        SOPORTADOS_PLANTUML.includes(key),
      );
    }
  });

  it('no deja ningún tipo evaluable sin normalizador', () => {
    // El caso que la comprobación anterior no cubre por sí sola: un tipo cuyo
    // `motoresJuez` esté vacío coincidiría en ambos lados con `false` y pasaría.
    for (const key of TIPOS_DIAGRAMA) {
      expect(
        SOPORTADOS_MERMAID.includes(key) || SOPORTADOS_PLANTUML.includes(key),
        `${key} se declara evaluable pero ningún normalizador lo lee`,
      ).toBe(true);
    }
  });

  it('no declara juzgable ningún tipo del catálogo adicional', () => {
    for (const key of KEYS_JUZGABLES) {
      expect(tipoDiagrama(key)?.ambito, key).toBe('curso');
    }
  });
});
