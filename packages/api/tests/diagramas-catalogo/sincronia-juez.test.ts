import { describe, expect, it } from 'vitest';
import { KEYS_JUZGABLES, TIPOS, esJuzgable } from '@tc2005b/diagramas-catalogo';
import {
  SOPORTADOS_JERARQUIA,
  SOPORTADOS_MERMAID,
  SOPORTADOS_PLANTUML,
  TIPOS_DIAGRAMA,
} from '../../src/services/juez-diagramas/index.js';

/**
 * Todo lo que un motor sabe leer. La familia «jerarquía» tiene normalizador
 * propio —cuatro dibujos que se reducen al mismo árbol— y también corre sobre
 * Mermaid, así que cuenta aquí: sin sumarla, este guardián declararía sin
 * normalizador a tipos que sí lo tienen.
 */
const POR_MERMAID = [...SOPORTADOS_MERMAID, ...SOPORTADOS_JERARQUIA];

/**
 * La actividad tiene parser propio —es la única sintaxis imperativa del
 * temario— y no está en `SOPORTADOS_PLANTUML`, así que se suma aparte.
 */
const POR_PLANTUML = [...SOPORTADOS_PLANTUML, 'actividad'];

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
    // La comparación NO es contra `TIPOS_DIAGRAMA`, que es el dominio del juez
    // —los tipos que su unión admite, incluidos los que aún no sabe leer—, sino
    // contra lo que algún normalizador maneja de verdad. Compararlo con el
    // dominio dejaba la prueba en rojo en cuanto se declaraba un tipo antes de
    // escribir su parser, que es el orden natural de trabajo.
    const conNormalizador = [...new Set([...POR_MERMAID, ...POR_PLANTUML])];
    expect([...KEYS_JUZGABLES].sort()).toEqual(conNormalizador.sort());
  });

  it('reparte los motores como los reparten los normalizadores', () => {
    for (const key of TIPOS_DIAGRAMA) {
      expect(esJuzgable(key, 'mermaid'), `${key} en Mermaid`).toBe(POR_MERMAID.includes(key));
      expect(esJuzgable(key, 'plantuml'), `${key} en PlantUML`).toBe(
        POR_PLANTUML.includes(key),
      );
    }
  });

  it('no declara evaluable nada que no sepa leer', () => {
    for (const key of KEYS_JUZGABLES) {
      expect(
        POR_MERMAID.includes(key) || POR_PLANTUML.includes(key),
        `${key} se declara evaluable pero ningún normalizador lo lee`,
      ).toBe(true);
    }
  });

  it('mantiene evaluable todo el temario del curso', () => {
    // Al revés que antes: la comprobación era «ningún tipo del catálogo es
    // juzgable», y dejó de valer en cuanto la familia «jerarquía» le dio
    // normalizador a cuatro de ellos. Lo que sí tiene que seguir siendo cierto
    // es que ningún tipo DEL CURSO se quede sin poder evaluarse.
    const delCurso = TIPOS.filter((t) => t.ambito === 'curso');
    const sinJuez = delCurso.filter((t) => t.motoresJuez.length === 0).map((t) => t.key);
    // `timing` es lo único que queda: su gramática (`robust`/`concise`, `@0`,
    // `X is Estado`) no se parece a ninguna de las tres que ya hay.
    expect(sinJuez, 'tipos del temario todavía sin normalizador').toEqual(['timing']);
  });
});
