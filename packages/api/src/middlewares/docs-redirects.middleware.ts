import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Redirects 301 /docs/* → /contenidos/* (US-7: Docusaurus retirado).
 *
 * SIEMPRE activos: /docs ya no sirve nada — los marcadores y enlaces viejos
 * aterrizan en el CMS, cuyo gate responde 404 a quien no tiene acceso (el
 * contenido en sí nunca viaja en el redirect).
 *
 * Mapa exacto: data/redirects-docs.json (raíz del paquete, fuera de src/ —
 * tsc no copia .json a dist y el runtime de producción es dist/), generado
 * por scripts/importar-docusaurus.ts. Fallback heurístico para lo que no
 * esté en el mapa.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// src/middlewares → ../../data  |  dist/middlewares → ../../data (misma raíz)
const RUTA_MAPA = path.resolve(__dirname, '../../data/redirects-docs.json');

let mapa: Record<string, string> = {};
try {
  if (fs.existsSync(RUTA_MAPA)) {
    mapa = JSON.parse(fs.readFileSync(RUTA_MAPA, 'utf8'));
  }
} catch {
  mapa = {}; // sin mapa: solo heurística
}

/**
 * Heurística viejo→nuevo por segmento (mismas reglas de slug que el
 * importador). Recibe el path SIN el prefijo /docs (montado en '/docs',
 * express lo quita de req.path) — el primer segmento es el slug de la
 * colección y se conserva.
 */
function heuristica(pathSinDocs: string): string {
  const segmentos = pathSinDocs
    .split('/')
    .filter(Boolean)
    .map((s) =>
      decodeURIComponent(s)
        .replace(/^[\d.]+[-_]/, '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean);
  return `/contenidos/${segmentos.join('/')}`;
}

export function docsRedirects(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET') {
    next();
    return;
  }
  // Montado en '/docs': req.path NO incluye el prefijo; el mapa sí lo lleva.
  const pathSinDocs = req.path.replace(/\/+$/, '');
  const exacto = mapa[`/docs${pathSinDocs}`];
  res.redirect(301, exacto ?? heuristica(pathSinDocs));
}
