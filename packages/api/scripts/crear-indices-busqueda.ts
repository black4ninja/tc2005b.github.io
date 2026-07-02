/**
 * Crea los índices de texto de Mongo que usa la búsqueda del CMS (US-5):
 *   - Documento.titulo (text)
 *   - DocumentoVersion.cuerpo (text)
 *
 * Idempotente: createIndex no hace nada si el índice ya existe.
 * Correr una vez por entorno (el endpoint degrada a regex si faltan):
 *   ./node_modules/.bin/tsx scripts/crear-indices-busqueda.ts
 */
import { MongoClient } from 'mongodb';
import { config } from '../src/config/index.js';

async function main() {
  const client = new MongoClient(config.databaseURI);
  await client.connect();
  const db = client.db();

  console.log('[indices] creando índice de texto Documento.titulo…');
  await db.collection('Documento').createIndex({ titulo: 'text' }, { name: 'busqueda_titulo_text' });

  console.log('[indices] creando índice de texto DocumentoVersion.cuerpo…');
  await db.collection('DocumentoVersion').createIndex({ cuerpo: 'text' }, { name: 'busqueda_cuerpo_text' });

  console.log('[indices] listo.');
  await client.close();
}

main().catch((error) => {
  console.error('[indices] error:', error);
  process.exit(1);
});
