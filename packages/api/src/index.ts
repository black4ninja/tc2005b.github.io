import app, { finalize } from './app.js';
import { config } from './config/index.js';
import { initializeParseServer } from './config/parse.js';
import Parse from 'parse/node';
import './models/index.js';

async function main() {
  const parseServer = await initializeParseServer();

  app.use(config.parseMount, parseServer.app as any);
  finalize();

  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  app.listen(config.port, () => {
    console.log(`[api] Server running on http://localhost:${config.port}`);
    console.log(`[api] Health check: http://localhost:${config.port}/api/health`);
    console.log(`[api] Parse Server: http://localhost:${config.port}${config.parseMount}`);
    console.log(`[api] Test GameScore: http://localhost:${config.port}/api/test/gamescore`);
  });
}

main().catch((error) => {
  console.error('[api] Failed to start server:', error);
  process.exit(1);
});
