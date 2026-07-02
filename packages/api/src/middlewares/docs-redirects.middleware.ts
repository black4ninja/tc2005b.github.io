import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Redirects 301 /docs/* → /contenidos/* (US-6, design §6).
 *
 * APAGADO por defecto: Docusaurus sigue siendo el sistema operativo hasta el
 * corte de la US-7. Se enciende con REDIRECT_DOCS_A_CONTENIDOS=true en el
 * .env del servidor (fase 2 del plan de deprecación).
 *
 * Mapa exacto: src/data/redirects-docs.json, generado por
 * scripts/importar-docusaurus.ts (viejo → nuevo por página). Fallback
 * heurístico para paths que no estén en el mapa: minúsculas + prefijos
 * numéricos fuera + separadores a guion (la convención de slugs del CMS).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUTA_MAPA = path.resolve(__dirname, '../data/redirects-docs.json');

let mapa: Record<string, string> = {};
try {
  if (fs.existsSync(RUTA_MAPA)) {
    mapa = JSON.parse(fs.readFileSync(RUTA_MAPA, 'utf8'));
  }
} catch {
  mapa = {}; // sin mapa: solo heurística
}

export const redirectsActivos = process.env.REDIRECT_DOCS_A_CONTENIDOS === 'true';

/** Heurística viejo→nuevo por segmento (mismas reglas que el importador). */
function heuristica(pathname: string): string {
  const segmentos = pathname
    .split('/')
    .filter(Boolean)
    .slice(1) // quita "docs"
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
  if (!redirectsActivos || req.method !== 'GET') {
    next();
    return;
  }
  const pathname = req.path.replace(/\/+$/, '');
  const exacto = mapa[pathname];
  res.redirect(301, exacto ?? heuristica(pathname));
}
