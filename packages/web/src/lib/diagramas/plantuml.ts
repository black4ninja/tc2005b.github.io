import type { Renderizador } from './registro';
import { insertarSvg } from './svgSeguro';
// `?url` en vez de importarlo: `viz-global.js` (Graphviz compilado a wasm) es un
// script CLÁSICO que define el global `Viz`, no un módulo ESM. Vite nos da su
// URL y emite el archivo en el build; lo cargamos con un <script> normal.
import vizUrl from '@plantuml/core/viz-global.js?url';

/**
 * Motor PlantUML, compilado a JavaScript con TeaVM: corre entero en el
 * navegador, sin JVM ni servidor.
 *
 * Existe sobre todo por el material que YA está escrito: el wiki de Android
 * tiene 16 diagramas en sintaxis PlantUML (paquete, componente, secuencia,
 * estado) que Mermaid no puede representar —no tiene diagramas de paquete ni de
 * componente— y que aquí se encienden sin reescribir una línea.
 *
 * Pesa bastante más que Mermaid (~1.9 MB gzip contra ~245 KB), y por eso el
 * registro lo carga con `import()` dinámico: solo lo descarga quien abra una
 * página que tenga un diagrama PlantUML.
 *
 * Graphviz es OBLIGATORIO para todo menos secuencia; sin él, esos diagramas
 * fallan al renderizar.
 */

declare global {
  // eslint-disable-next-line no-var
  var Viz: unknown;
}

let vizCargado: Promise<void> | null = null;

/** Carga `viz-global.js` como script clásico, una sola vez. */
function cargarViz(): Promise<void> {
  if (vizCargado) return vizCargado;
  vizCargado = new Promise<void>((resolve, reject) => {
    if (typeof globalThis.Viz !== 'undefined') return resolve();
    const s = document.createElement('script');
    s.src = vizUrl;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar Graphviz (viz-global.js).'));
    document.head.appendChild(s);
  });
  return vizCargado;
}

let n = 0;

export const renderizador: Renderizador = {
  async pintar(codigo, contenedor, oscuro) {
    await cargarViz();
    const { renderToString } = await import('@plantuml/core');

    // La API recibe el diagrama como ARRAY DE LÍNEAS, no como texto.
    const lineas = codigo.replace(/\r\n/g, '\n').split('\n');

    const svg = await new Promise<string>((resolve, reject) => {
      let resuelto = false;
      // Si el motor nunca llama a ninguno de los dos callbacks, esto se quedaría
      // colgado y el bloque no volvería a mostrarse jamás. Con tope, falla y el
      // hook restaura el código fuente.
      const tope = window.setTimeout(() => {
        if (!resuelto) { resuelto = true; reject(new Error('PlantUML tardó demasiado en responder.')); }
      }, 20000);
      const fin = (fn: (v: never) => void) => (v: never) => {
        if (resuelto) return;
        resuelto = true;
        window.clearTimeout(tope);
        fn(v);
      };
      try {
        (renderToString as (l: string[], ok: unknown, err: unknown, o?: unknown) => void)(
          lineas,
          fin(resolve as never),
          fin(reject as never),
          { dark: oscuro },
        );
      } catch (e) {
        window.clearTimeout(tope);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });

    insertarSvg(contenedor, svg);
    void n;
  },
};
