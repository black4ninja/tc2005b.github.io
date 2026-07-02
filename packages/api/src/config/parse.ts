import { config } from './index.js';

/**
 * Files adapter (US-8, design decisión #5): si el .env trae credenciales S3,
 * los Parse.File van al bucket privado (groups-meeplab-contenidos); si no,
 * GridFS (default) — dev funciona sin AWS y producción cambia SOLO con
 * configuración. La lectura sigue siendo exclusiva del endpoint gated de
 * Recursos (files-gate); directAccess desactivado: S3 jamás sirve directo.
 *
 * Variables (ver ~/.parse-contenidos-s3.env del usuario):
 *   S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 */
async function crearFilesAdapter(): Promise<unknown | undefined> {
  const { S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return undefined;

  const { default: S3Adapter } = (await import('@parse/s3-files-adapter')) as any;
  return new S3Adapter({
    bucket: S3_BUCKET,
    region: S3_REGION || 'us-east-1',
    directAccess: false,
    s3overrides: {
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
    },
  });
}

export async function initializeParseServer() {
  const { default: ParseServer } = (await import('parse-server')) as any;

  const filesAdapter = await crearFilesAdapter();
  if (filesAdapter) {
    console.log(`[api] Files adapter: S3 (${process.env.S3_BUCKET})`);
  }

  const parseServer = new ParseServer({
    databaseURI: config.databaseURI,
    appId: config.appId,
    masterKey: config.masterKey,
    serverURL: config.serverURL,
    publicServerURL: config.serverURL,
    masterKeyIps: ['0.0.0.0/0', '::/0'],
    allowClientClassCreation: config.environment === 'development',
    ...(filesAdapter ? { filesAdapter } : {}),
  });

  await parseServer.start();

  return parseServer;
}
