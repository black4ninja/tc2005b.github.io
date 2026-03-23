import type { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEjerciciosDir(): string {
  if (config.environment === 'production') {
    return path.resolve(__dirname, '../../../dist/ejercicios');
  }
  return path.resolve(__dirname, '../../../../static-legacy/ejercicios');
}

async function findEntryHtml(dirPath: string): Promise<string | null> {
  try {
    const files = await fs.readdir(dirPath);
    const htmlFiles = files.filter((f) => f.endsWith('.html') && !f.includes('deprecated'));
    if (htmlFiles.includes('index.html')) return 'index.html';
    if (htmlFiles.length === 1) return htmlFiles[0];
    return htmlFiles[0] ?? null;
  } catch {
    return null;
  }
}

export async function listEjercicios(_req: Request, res: Response): Promise<void> {
  try {
    const dir = getEjerciciosDir();
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const results = await Promise.all(
      entries
        .filter((e) => !e.name.startsWith('.'))
        .map(async (e) => {
          if (e.isDirectory()) {
            const entryHtml = await findEntryHtml(path.join(dir, e.name));
            const ruta = entryHtml
              ? `/ejercicios/${e.name}/${entryHtml}`
              : `/ejercicios/${e.name}/`;
            return { nombre: e.name, ruta };
          }
          return { nombre: e.name, ruta: `/ejercicios/${e.name}` };
        }),
    );

    results.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    res.json({ status: 'ok', ejercicios: results });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al listar ejercicios' });
  }
}
