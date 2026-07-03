/**
 * Migración de archivos GridFS → S3 (US-8, design decisión #5).
 *
 * Prerrequisitos:
 *   1. Variables S3_* en el .env del servidor (de ~/.parse-contenidos-s3.env)
 *      y API REINICIADO — el adapter activo debe ser YA S3.
 *   2. El server corriendo (como el resto de los scripts).
 *
 * El script VERIFICA con una sonda que el server realmente guarda en S3
 * (guarda un archivo de prueba y comprueba que NO aterrizó en GridFS): si el
 * operador olvidó reiniciar con las S3_*, abortamos — sin la sonda, la
 * "migración" re-subiría los blobs DENTRO de GridFS con nombres nuevos y
 * reportaría éxito.
 *
 * Por cada archivo (deduplicado por nombre interno; puede compartirse entre
 * varios Recursos): lee los bytes directo de GridFS, los re-guarda como
 * Parse.File (aterriza en S3) y actualiza TODOS los pointers que lo usan.
 * Con --borrar-gridfs, el blob viejo se borra SOLO tras actualizar todos
 * sus pointers. Incluye Recursos soft-deleted (sus blobs también migran:
 * podrían restaurarse).
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

/** Borra un Parse.File del adapter actual vía REST (best-effort). */
async function borrarParseFile(nombreInterno: string): Promise<void> {
  try {
    await fetch(`${config.serverURL}/files/${encodeURIComponent(nombreInterno)}`, {
      method: 'DELETE',
      headers: { 'X-Parse-Application-Id': config.appId, 'X-Parse-Master-Key': config.masterKey },
    });
  } catch {
    // best-effort: si falla, queda huérfano y se reporta el nombre
  }
}

/**
 * Sonda: guarda un archivo de prueba vía el server y verifica que NO cayó
 * en GridFS (⇒ el adapter activo es S3). Limpia la sonda al terminar.
 */
async function verificarServerEnS3(bucket: GridFSBucket): Promise<boolean> {
  const sonda = new Parse.File('sonda-migracion-s3.txt', { base64: Buffer.from('sonda').toString('base64') }, 'text/plain');
  await sonda.save({ useMasterKey: true });
  const nombre = sonda.name();
  const enGridfs = await bucket.find({ filename: nombre }).toArray();
  if (enGridfs.length > 0) {
    // El server sigue en GridFS: limpiar la sonda de GridFS y abortar.
    for (const f of enGridfs) await bucket.delete(f._id);
    return false;
  }
  await borrarParseFile(nombre); // sonda en S3: limpiar
  return true;
}

async function main() {
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  if (dryRun) console.log('=== DRY RUN — no se migrará nada ===\n');

  const cliente = new MongoClient(config.databaseURI);
  await cliente.connect();
  const bucket = new GridFSBucket(cliente.db());

  if (!dryRun) {
    console.log('Verificando con sonda que el server guarda en S3…');
    if (!(await verificarServerEnS3(bucket))) {
      console.error('\nABORTADO: el server sigue guardando en GridFS.');
      console.error('Configura S3_BUCKET/S3_REGION/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY en el .env del SERVER y reinícialo.');
      await cliente.close();
      process.exit(1);
    }
    console.log('Sonda OK: el adapter activo es S3.\n');
  }

  // TODOS los Recursos (incluidos soft-deleted: sus blobs podrían restaurarse).
  const q = new Parse.Query<Recurso>('Recurso');
  q.limit(100000);
  const recursos = await q.find({ useMasterKey: true });

  // Dedupe por nombre interno: un mismo Parse.File puede compartirse entre
  // Recursos — se migra UNA vez y se actualizan TODOS sus pointers.
  const porNombre = new Map<string, Recurso[]>();
  let sinArchivo = 0;
  for (const r of recursos) {
    const archivo = r.getArchivo();
    if (!archivo) {
      sinArchivo += 1;
      continue;
    }
    const nombre = archivo.name();
    if (!porNombre.has(nombre)) porNombre.set(nombre, []);
    porNombre.get(nombre)!.push(r);
  }
  console.log(`Recursos: ${recursos.length} (${sinArchivo} sin archivo) · archivos únicos: ${porNombre.size}\n`);

  let migrados = 0;
  let borrados = 0;
  const fueraDeGridFS: string[] = [];
  const fallidos: string[] = [];

  for (const [nombreInterno, duenos] of porNombre) {
    try {
      const bytes = await leerDeGridFS(bucket, nombreInterno);
      if (!bytes) {
        // No está en GridFS: ya migrado a S3 en una corrida previa, o blob
        // perdido — se lista para que el operador lo verifique en el visor.
        fueraDeGridFS.push(`${nombreInterno} (recursos: ${duenos.map((d) => d.getNombre()).join(', ')})`);
        continue;
      }

      if (dryRun) {
        console.log(`migraría: ${nombreInterno} (${(bytes.length / 1024).toFixed(0)} KB, ${duenos.length} pointer/s)`);
        migrados += 1;
        continue;
      }

      const primero = duenos[0];
      const nuevo = new Parse.File(primero.getNombre(), { base64: bytes.toString('base64') }, primero.getMime());
      await nuevo.save({ useMasterKey: true }); // adapter actual = S3 (verificado)

      try {
        for (const r of duenos) {
          r.setArchivo(nuevo);
          await r.save(null, { useMasterKey: true });
        }
      } catch (err) {
        // Pointer(s) sin actualizar: borrar el objeto recién subido a S3
        // para no dejar huérfanos de pago; el blob viejo sigue intacto.
        await borrarParseFile(nuevo.name());
        throw err;
      }

      migrados += 1;
      console.log(`migrado: ${nombreInterno} (${(bytes.length / 1024).toFixed(0)} KB, ${duenos.length} pointer/s)`);

      // Borrar el blob viejo SOLO tras actualizar todos sus pointers.
      if (borrarGridfs) {
        for (const f of await bucket.find({ filename: nombreInterno }).toArray()) {
          await bucket.delete(f._id);
          borrados += 1;
        }
      }
    } catch (err) {
      fallidos.push(`${nombreInterno}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('\n===== RESUMEN =====');
  console.log(`Archivos migrados:   ${migrados}${dryRun ? ' (dry-run)' : ''}`);
  console.log(`Ya fuera de GridFS:  ${fueraDeGridFS.length} (migrados antes o blob perdido — verificar en el visor)`);
  for (const x of fueraDeGridFS.slice(0, 20)) console.log(`  · ${x}`);
  console.log(`Blobs GridFS borrados: ${borrados}${borrarGridfs ? '' : ' (respaldo conservado; usa --borrar-gridfs EN LA MISMA corrida de migración)'}`);
  console.log(`FALLIDOS:            ${fallidos.length}`);
  for (const x of fallidos) console.log(`  ✗ ${x}`);
  await cliente.close();
  process.exit(fallidos.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('[migrar-archivos-s3] error:', error);
  process.exit(1);
});
