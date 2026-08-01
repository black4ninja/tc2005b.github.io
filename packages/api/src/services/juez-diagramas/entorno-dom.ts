/**
 * DOM mínimo para poder correr Mermaid en el servidor.
 *
 * Mermaid parsea perfectamente en Node, pero arrastra DOMPurify, que necesita un
 * `window` para instalarse. Con jsdom basta: NO se renderiza nada, solo se
 * construye el modelo, así que no hacen falta ni canvas ni medición de texto.
 *
 * Se instala UNA vez por proceso y de forma perezosa: quien no evalúe diagramas
 * no paga el arranque de jsdom.
 */
import { JSDOM } from 'jsdom';

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
  const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true });
  const w = dom.window as unknown as Record<string, unknown>;
  for (const clave of GLOBALES) {
    const valor = clave === 'window' ? dom.window : w[clave];
    if (valor === undefined) continue;
    Object.defineProperty(globalThis, clave, { value: valor, writable: true, configurable: true });
  }
  instalado = true;
}
