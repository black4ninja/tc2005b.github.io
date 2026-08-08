import { describe, expect, it } from 'vitest';
import { KEYS_JUZGABLES, esJuzgable, tipoDiagrama } from '@tc2005b/diagramas-catalogo';
import { TIPOS_DIAGRAMA } from '../../src/services/juez-diagramas/index.js';

/**
 * El juez tiene su propia unión de tipos (`juez-diagramas/tipos.ts`) porque es
 * su dominio: lo que sabe normalizar. El catálogo declara lo mismo en
 * `motoresJuez`. Son dos listas y podrían separarse.
 *
 * Unificarlas no sale: el juez necesita una UNIÓN de TypeScript para que sus
 * `switch` sean exhaustivos, y el catálogo es un paquete de datos en JavaScript
 * plano —igual que `contenido-pipeline`— sin compilación. En vez de acoplarlos,
 * esta prueba comprueba que no divergen, que es la propiedad que de verdad
 * importa: un tipo declarado juzgable sin normalizador crea ejercicios que
 * fallan siempre, y uno normalizado pero no declarado queda inalcanzable desde
 * el editor.
 */
describe('el catálogo y el juez declaran los mismos tipos evaluables', () => {
  it('coinciden como conjunto', () => {
    expect([...KEYS_JUZGABLES].sort()).toEqual([...TIPOS_DIAGRAMA].sort());
  });

  it('reparte los motores como los reparten los normalizadores', () => {
    // Mermaid lee los cinco de `normalizar-mermaid.ts`; PlantUML, los tres de
    // `normalizar-plantuml.ts`. Ningún tipo se evalúa hoy en los dos.
    const porMermaid = ['clases', 'secuencia', 'estados', 'er', 'flujo'];
    const porPlantuml = ['casos-de-uso', 'componentes', 'paquetes'];

    for (const key of porMermaid) {
      expect(esJuzgable(key, 'mermaid'), key).toBe(true);
      expect(esJuzgable(key, 'plantuml'), key).toBe(false);
    }
    for (const key of porPlantuml) {
      expect(esJuzgable(key, 'plantuml'), key).toBe(true);
      expect(esJuzgable(key, 'mermaid'), key).toBe(false);
    }
  });

  it('no declara juzgable ningún tipo del catálogo adicional', () => {
    for (const key of KEYS_JUZGABLES) {
      expect(tipoDiagrama(key)?.ambito, key).toBe('curso');
    }
  });
});
