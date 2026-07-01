import type { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLecturasDir(): string {
  if (config.environment === 'production') {
    return path.resolve(__dirname, '../../../dist/lecturas');
  }
  return path.resolve(__dirname, '../../../../static-legacy/lecturas');
}

async function findEntryHtml(dirPath: string, dirName: string): Promise<string | null> {
  try {
    const files = await fs.readdir(dirPath);
    const htmlFiles = files.filter((f) => f.endsWith('.html') && !f.includes('deprecated'));

    // Prefer index.html first
    if (htmlFiles.includes('index.html')) return 'index.html';

    // Then try to find a single main HTML file
    if (htmlFiles.length === 1) return htmlFiles[0];

    // Try to match by directory name pattern (e.g. lectura3.html in lectura3_Mr/)
    const match = htmlFiles.find((f) => dirName.startsWith(f.replace('.html', '')));
    if (match) return match;

    // Return first non-index HTML file
    return htmlFiles[0] ?? null;
  } catch {
    return null;
  }
}

export async function listLecturas(_req: Request, res: Response): Promise<void> {
  try {
    const dir = getLecturasDir();
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const results = await Promise.all(
      entries
        .filter((e) => !e.name.startsWith('.'))
        .map(async (e) => {
          if (e.isDirectory()) {
            const entryHtml = await findEntryHtml(path.join(dir, e.name), e.name);
            const ruta = entryHtml
              ? `/lecturas/${e.name}/${entryHtml}`
              : `/lecturas/${e.name}/`;
            return { nombre: e.name, ruta };
          }
          return { nombre: e.name, ruta: `/lecturas/${e.name}` };
        }),
    );

    results.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    res.json({ status: 'ok', lecturas: results });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al listar lecturas' });
  }
}
