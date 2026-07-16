/**
 * Migración de datos: Enrique Calderón pasa de admin a PROFESOR.
 *
 * Idempotente: si ya es profesor, no hace nada. Por convención del repo, las
 * migraciones de datos se corren DESPUÉS del deploy (nunca antes).
 *
 * Uso (requiere el API corriendo):
 *   cd packages/api
 *   ./node_modules/.bin/tsx scripts/migrate-enrique-profesor.ts --dry-run
 *   ./node_modules/.bin/tsx scripts/migrate-enrique-profesor.ts
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { BaseModel } from '../src/models/BaseModel.js';
import { AppUser } from '../src/models/AppUser.js';

const EMAIL = 'enrique.calderon@tec.mx';
const dryRun = process.argv.includes('--dry-run');

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

const user = await BaseModel.queryActive<AppUser>('AppUser')
  .equalTo('email', EMAIL)
  .first({ useMasterKey: true });

if (!user) {
  console.error(`No se encontró un usuario activo con email ${EMAIL}`);
  process.exit(1);
}

console.log(`Usuario: ${user.getName()} <${user.getEmail()}> — rol actual: ${user.getUserType()}`);

if (user.getUserType() === 'profesor') {
  console.log('Ya es profesor. Nada que hacer.');
  process.exit(0);
}

if (dryRun) {
  console.log("DRY RUN: se cambiaría userType 'admin' → 'profesor' (no se escribe nada).");
  process.exit(0);
}

user.setUserType('profesor');
await user.save(null, { useMasterKey: true });
console.log('Listo: Enrique quedó como profesor.');
process.exit(0);
