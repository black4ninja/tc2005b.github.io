/**
 * Migración de archivos GridFS → S3 (US-8, design §8/US-8).
 *
 * Prerrequisitos:
 *   1. Variables S3_* en el .env del servidor (de ~/.parse-contenidos-s3.env)
 *      y API REINICIADO — el adapter activo debe ser YA S3 (este script
 *      guarda los archivos nuevos a través del server).
 *   2. El server corriendo (como el resto de los scripts).
 *
 * Qué hace: por cada Recurso con archivo, lee los bytes DIRECTO de GridFS
 * (el adapter S3 ya no puede leer los viejos), los re-guarda como Parse.File
 * (que ahora aterriza en S3) y actualiza el pointer del Recurso. Los blobs
 * de GridFS se conservan como respaldo salvo --borrar-gridfs.
 *
 * Uso:
 *   cd packages/api
 *   ./node_modules/.bin/tsx scripts/migrar-archivos-s3.ts [--dry-run] [--borrar-gridfs]
 */
import { MongoClient, GridFSBucket } from 'mongodb';
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Recurso } from '../src/models/Recurso.js';

const dryRun = process.argv.includes('--dry-run');
const borrarGridfs = process.argv.includes('--borrar-gridfs');

async function leerDeGridFS(bucket: GridFSBucket, nombre: string): Promise<Buffer | null> {
  const archivos = await bucket.find({ filename: nombre }).toArray();
  if (archivos.length === 0) return null;
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    bucket
      .openDownloadStreamByName(nombre)
      .on('data', (c) => chunks.push(c))
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject);
  });
}

async function main() {
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  if (!dryRun && !process.env.S3_BUCKET) {
    console.error('El .env de este proceso no trae S3_BUCKET — el server debe estar ya en S3.');
    console.error('(El script solo verifica su propio entorno; asegúrate de que el SERVER también lo tenga.)');
  }
  if (dryRun) console.log('=== DRY RUN — no se migrará nada ===\n');

  const cliente = new MongoClient(config.databaseURI);
  await cliente.connect();
  const bucket = new GridFSBucket(cliente.db());

  const q = new Parse.Query<Recurso>('Recurso');
  q.equalTo('exists' as any, true as any);
  q.limit(100000);
  const recursos = await q.find({ useMasterKey: true });
  console.log(`Recursos con archivo: ${recursos.length}\n`);

  let migrados = 0;
  let yaEnS3 = 0;
  let sinBlob = 0;

  for (const recurso of recursos) {
    const archivo = recurso.getArchivo();
    if (!archivo) continue;
    const nombreInterno = archivo.name();

    const bytes = await leerDeGridFS(bucket, nombreInterno);
    if (!bytes) {
      // No está en GridFS: o ya migró (vive en S3) o el blob se perdió.
      yaEnS3 += 1;
      continue;
    }

    if (dryRun) {
      console.log(`migraría: ${recurso.getNombre()} (${(bytes.length / 1024).toFixed(0)} KB)`);
      migrados += 1;
      continue;
    }

    const nuevo = new Parse.File(recurso.getNombre(), { base64: bytes.toString('base64') }, recurso.getMime());
    await nuevo.save({ useMasterKey: true }); // adapter actual = S3
    recurso.setArchivo(nuevo);
    await recurso.save(null, { useMasterKey: true });
    migrados += 1;

    if (borrarGridfs) {
      for (const f of await bucket.find({ filename: nombreInterno }).toArray()) {
        await bucket.delete(f._id);
      }
    }
    console.log(`migrado: ${recurso.getNombre()} (${(bytes.length / 1024).toFixed(0)} KB)`);
  }

  console.log('\n===== RESUMEN =====');
  console.log(`Migrados:        ${migrados}${dryRun ? ' (dry-run)' : ''}`);
  console.log(`Ya fuera de GridFS: ${yaEnS3}`);
  if (sinBlob) console.log(`Sin blob:        ${sinBlob}`);
  console.log(`GridFS ${borrarGridfs ? 'LIMPIADO' : 'conservado como respaldo (usa --borrar-gridfs tras validar)'}`);
  await cliente.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('[migrar-archivos-s3] error:', error);
  process.exit(1);
});
