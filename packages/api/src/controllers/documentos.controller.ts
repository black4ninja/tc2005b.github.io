import type { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDocumentosDir(): string {
  if (config.environment === 'production') {
    return path.resolve(__dirname, '../../../dist/documentos');
  }
  return path.resolve(__dirname, '../../../../static-legacy/documentos');
}

export async function listDocumentos(_req: Request, res: Response): Promise<void> {
  try {
    const dir = getDocumentosDir();
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const documentos = entries
      .filter((e) => e.isFile() && !e.name.startsWith('.'))
      .map((e) => {
        const ext = path.extname(e.name).slice(1).toLowerCase();
        return {
          nombre: e.name,
          extension: ext,
          ruta: `/documentos/${e.name}`,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    res.json({ status: 'ok', documentos });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al listar documentos' });
  }
}
