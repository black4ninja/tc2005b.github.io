import { config } from './index.js';

export async function initializeParseServer() {
  const { default: ParseServer } = await import('parse-server');

  const parseServer = new ParseServer({
    databaseURI: config.databaseURI,
    appId: config.appId,
    masterKey: config.masterKey,
    serverURL: config.serverURL,
    publicServerURL: config.serverURL,
    masterKeyIps: ['0.0.0.0/0', '::/0'],
    allowClientClassCreation: config.environment === 'development',
  });

  await parseServer.start();

  return parseServer;
}
