/**
 * Calentamiento de la frontera con Mermaid, compartido por las suites que la usan.
 *
 * Cargar Mermaid y levantar el DOM que necesita DOMPurify cuesta segundos, y
 * ese coste se paga UNA vez por fichero de test: lo cobra la primera prueba que
 * llega. Con las suites corriendo en paralelo, esa primera prueba pasaba de ~2 s
 * en una máquina ociosa a ~13 s en una cargada y reventaba el timeout de 5 s de
 * vitest —cinco rojos en cinco ficheros distintos, todos en su primer caso—.
 *
 * Subir el timeout de todas las pruebas taparía a la vez un cuelgue de verdad.
 * Aquí el arranque se paga en un `beforeAll` con su propio margen, y cada prueba
 * conserva el timeout normal midiendo lo que de verdad tarda en evaluar.
 */
import { beforeAll } from 'vitest';
import { normalizarMermaid } from '../../src/services/juez-diagramas/normalizar-mermaid.js';

beforeAll(async () => {
  await normalizarMermaid('clases', 'classDiagram\n  class Calentamiento');
}, 120_000);
