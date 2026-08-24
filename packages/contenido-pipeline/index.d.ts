/** Tipos de admonition soportados (paridad Docusaurus). */
export declare const ADMONITION_TIPOS: string[];

/** Entrada del TOC de una página (h2/h3 con ancla). */
export interface TocEntry {
  id: string;
  titulo: string;
  nivel: number;
}

/** Opciones de render. */
export interface RenderOpciones {
  /**
   * Estampa `data-linea` (1-based) en cada bloque con la línea del Markdown de
   * la que sale. Es andamiaje del editor —sincronizar scroll y resaltar el
   * bloque bajo el cursor—: lo que se publica se renderiza SIN esta opción.
   */
  lineas?: boolean;
}

/**
 * Renderiza Markdown (GFM + admonitions) a HTML sanitizado con highlight
 * e ids en headings. Mismo pipeline en el API (publicar) y el editor (preview).
 */
export declare function renderMarkdown(cuerpo: string, opciones?: RenderOpciones): Promise<string>;

/** Extrae el TOC (h2/h3) del HTML renderizado por este pipeline. */
export declare function extraerToc(html: string): TocEntry[];

/** Prefijo del endpoint gated que sirve los Recursos (US-4). */
export declare const RECURSOS_ENDPOINT: string;
