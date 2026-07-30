/**
 * Registro de lenguajes de diagrama-como-código.
 *
 * El pipeline del CMS no necesita ningún cambio para esto: un fence ```` ```mermaid ````
 * llega al DOM como `<pre><code class="language-mermaid">` —la clase sobrevive al
 * sanitizador porque casa con `/^language-/`— y el código fuente queda intacto.
 * Aquí solo se sustituye ese bloque por el SVG, ya en el cliente.
 *
 * **Por qué en el cliente y no al renderizar el Markdown:** el HTML se cachea en
 * BD (`cuerpoHtml`, `enunciadoHtml`). Si el SVG se incrustara ahí, cada
 * actualización de la librería de diagramas obligaría a re-renderizar todas las
 * versiones ya publicadas. Renderizando en el cliente, el HTML guardado sigue
 * siendo el código fuente del diagrama y nunca caduca.
 *
 * Cada motor se carga con `import()` dinámico: quien no use diagramas no paga su
 * peso, y quien use solo uno no descarga el otro.
 */

export interface Renderizador {
  /**
   * Pinta el diagrama DENTRO de `contenedor`, o lanza si el código no es válido.
   *
   * Pinta sobre el elemento en vez de devolver una cadena porque la API de
   * PlantUML escribe directamente en el DOM; Mermaid, que sí devuelve texto, se
   * adapta trivialmente. Al revés no.
   */
  pintar(codigo: string, contenedor: HTMLElement, oscuro: boolean): Promise<void>;
}

type Cargador = () => Promise<Renderizador>;

const REGISTRO: Record<string, Cargador> = {
  mermaid: async () => (await import('./mermaid')).renderizador,
  plantuml: async () => (await import('./plantuml')).renderizador,
};

/**
 * Qué motor le toca a un bloque de código, o `null` si no es un diagrama.
 *
 * Además del lenguaje del fence mira el CONTENIDO para detectar PlantUML: los
 * diagramas que ya existen en el wiki están en fences **sin etiquetar**, y un
 * bloque que empieza por `@startuml` no puede ser otra cosa. Así se encienden
 * sin tener que reescribir el contenido publicado.
 */
export function motorDe(lenguaje: string | null, codigo: string): string | null {
  if (lenguaje && REGISTRO[lenguaje]) return lenguaje;
  if (/^\s*@start[a-z]+/i.test(codigo)) return 'plantuml';
  return null;
}

const cache = new Map<string, Promise<Renderizador>>();

/**
 * Carga el motor pedido, una sola vez por sesión.
 *
 * Si la carga FALLA se saca de la caché. Cachear la promesa rechazada dejaba el
 * motor muerto para el resto de la sesión: un chunk que no llega —red inestable,
 * un deploy a medias, una dependencia sin instalar— condenaba a que ningún
 * diagrama volviera a dibujarse hasta recargar la página entera, aunque el
 * problema ya estuviera resuelto.
 */
export function cargarMotor(motor: string): Promise<Renderizador> {
  const cacheado = cache.get(motor);
  if (cacheado) return cacheado;

  const cargador = REGISTRO[motor];
  if (!cargador) return Promise.reject(new Error(`Motor de diagramas desconocido: ${motor}`));

  const p = cargador().catch((e: unknown) => {
    cache.delete(motor);
    throw e;
  });
  cache.set(motor, p);
  return p;
}
