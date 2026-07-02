/** Tipos de admonition soportados (paridad Docusaurus). */
export declare const ADMONITION_TIPOS: string[];

/**
 * Renderiza Markdown (GFM + admonitions) a HTML sanitizado con highlight.
 * Mismo pipeline en el API (publicar) y en el editor web (preview).
 */
export declare function renderMarkdown(cuerpo: string): Promise<string>;
