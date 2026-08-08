/**
 * DOM mínimo para poder correr Mermaid en el servidor.
 *
 * Mermaid parsea perfectamente en Node, pero arrastra DOMPurify, que necesita un
 * `window` para instalarse. NO se renderiza nada —solo se construye el modelo—,
 * así que no hacen falta ni canvas, ni medición de texto, ni cascada de estilos.
 *
 * Por eso el DOM lo pone `linkedom` y no `jsdom`: para este uso sobra, pesa una
 * fracción y, sobre todo, no arrastra `undici` ni exige un Node reciente. jsdom
 * 30 declara `engines: ^22.22.2 || ^24.15.0 || >=26.0.0`, un requisito que el
 * juez no necesita para nada y que se le imponía al servidor entero por instalar
 * un DOM completo para parsear texto. `linkedom` pide `>=16`.
 *
 * Se instala UNA vez por proceso y de forma perezosa: quien no evalúe diagramas
 * no paga el arranque.
 */
import { parseHTML } from 'linkedom';

/** Globales que Mermaid y DOMPurify esperan encontrar. */
const GLOBALES = [
  'window', 'document', 'navigator', 'Element', 'SVGElement', 'Node',
  'DOMParser', 'HTMLElement', 'getComputedStyle', 'XMLSerializer',
] as const;

let instalado = false;

/**
 * Deja el DOM disponible en `globalThis`. Idempotente.
 *
 * `Object.defineProperty` en vez de asignación directa porque en Node 26
 * `globalThis.navigator` es un getter de solo lectura y una asignación normal
 * revienta con `Cannot set property navigator`.
 */
export function instalarDom(): void {
  if (instalado) return;
  const dom = parseHTML('<!doctype html><body></body>') as unknown as Record<string, unknown>;
  for (const clave of GLOBALES) {
    const valor = dom[clave];
    // `getComputedStyle` y `XMLSerializer` no existen en linkedom. No se
    // sustituyen por un doble: los usa el RENDER, y aquí no se renderiza. Si
    // alguna vez hicieran falta, el fallo sería un `is not a function` claro y no
    // un resultado silenciosamente distinto, que es lo que daría un doble vacío.
    if (valor === undefined) continue;
    Object.defineProperty(globalThis, clave, { value: valor, writable: true, configurable: true });
  }
  instalado = true;
}
