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

export async function listLecturas(_req: Request, res: Response): Promise<void> {
  try {
    const dir = getLecturasDir();
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const lecturas = entries
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => {
        if (e.isDirectory()) {
          return {
            nombre: e.name,
            tipo: 'directorio' as const,
            ruta: `/lecturas/${e.name}/`,
          };
        }
        return {
          nombre: e.name,
          tipo: 'archivo' as const,
          ruta: `/lecturas/${e.name}`,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    res.json({ status: 'ok', lecturas });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al listar lecturas' });
  }
}
