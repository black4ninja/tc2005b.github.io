/** Tipos de admonition soportados (paridad Docusaurus). */
export declare const ADMONITION_TIPOS: string[];

/** Entrada del TOC de una página (h2/h3 con ancla). */
export interface TocEntry {
  id: string;
  titulo: string;
  nivel: number;
}

/**
 * Renderiza Markdown (GFM + admonitions) a HTML sanitizado con highlight
 * e ids en headings. Mismo pipeline en el API (publicar) y el editor (preview).
 */
export declare function renderMarkdown(cuerpo: string): Promise<string>;

/** Extrae el TOC (h2/h3) del HTML renderizado por este pipeline. */
export declare function extraerToc(html: string): TocEntry[];

/** Prefijo del endpoint gated que sirve los Recursos (US-4). */
export declare const RECURSOS_ENDPOINT: string;
