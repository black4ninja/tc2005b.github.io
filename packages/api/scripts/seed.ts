import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { runPolicySeed } from './seed-policies.js';
import { runUserSeed } from './seed-users.js';
import { runCalendarioSeed } from './seed-calendario.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  // Initialize Parse SDK (no Express server needed)
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  if (dryRun) {
    console.log('=== DRY RUN MODE — no changes will be saved ===');
  }

  console.log(`Connecting to Parse Server at ${config.serverURL}...`);

  await runPolicySeed(dryRun);
  await runUserSeed(dryRun);
  await runCalendarioSeed(dryRun);

  console.log('\n=== Seed complete ===');
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
