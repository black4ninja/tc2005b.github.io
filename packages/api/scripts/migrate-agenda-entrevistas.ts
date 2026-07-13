/**
 * Migración: la agenda de entrevistas pasa de URL global hardcodeada a campo del
 * grupo (`Grupo.urlAgendaEntrevistas`).
 *
 * Antes, el ítem "Agendar Entrevistas" del menú apuntaba a una constante en
 * `sidebarConfig.ts` — la misma hoja para todos. Ahora cada grupo tiene la suya
 * y, sin URL, el ítem no aparece. Este script pone en los grupos existentes la
 * URL que estaba activa, para que nadie pierda el enlace con el deploy.
 *
 * Idempotente: solo toca los grupos que aún NO tienen URL.
 *
 *   ./node_modules/.bin/tsx scripts/migrate-agenda-entrevistas.ts --dry-run
 *   ./node_modules/.bin/tsx scripts/migrate-agenda-entrevistas.ts
 *   ./node_modules/.bin/tsx scripts/migrate-agenda-entrevistas.ts --url https://…
 *
 * ⚠️ Dev comparte la BD de PRODUCCIÓN. Corre --dry-run primero, y córrelo
 *    DESPUÉS de desplegar: si lo corres antes, no pasa nada malo (el código viejo
 *    ignora el campo), pero el orden seguro es siempre deploy → migración.
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

/** La que estaba hardcodeada en sidebarConfig.ts hasta este cambio. */
const URL_ACTUAL =
  'https://docs.google.com/spreadsheets/d/1U1fbfaBWMp4Nje13qi2C3mhjhW0B8NxC-JXD0ff6fNQ/edit?gid=32307462#gid=32307462';

const dryRun = process.argv.includes('--dry-run');
const iUrl = process.argv.indexOf('--url');
const url = iUrl !== -1 ? process.argv[iUrl + 1] : URL_ACTUAL;

function urlValida(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function main() {
  if (!urlValida(url)) {
    console.error(`✗ URL inválida (solo http/https): ${url}`);
    process.exit(1);
  }
  console.log(`URL a asignar:\n  ${url}\n`);

  // Sin filtro por `active`: un grupo archivado también debe conservar su enlace.
  const q = new Parse.Query('Grupo');
  q.equalTo('exists', true);
  q.limit(500);
  const grupos = await q.find({ useMasterKey: true });

  const sinUrl = grupos.filter((g) => !g.get('urlAgendaEntrevistas'));

  console.log(`Grupos: ${grupos.length}  |  sin URL: ${sinUrl.length}`);
  for (const g of grupos) {
    const actual = g.get('urlAgendaEntrevistas');
    const marca = actual ? '[ya tiene]' : dryRun ? '[dry-run] ' : '[asignar] ';
    console.log(`  ${marca} ${String(g.get('name')).padEnd(12)} ${actual ?? '(sin URL)'}`);
  }

  if (sinUrl.length === 0) {
    console.log('\n✓ Todos los grupos ya tienen URL. Nada que hacer.');
    return;
  }
  if (dryRun) {
    console.log('\n--dry-run: no se escribió nada. Quita la bandera para aplicar.');
    return;
  }

  for (const g of sinUrl) g.set('urlAgendaEntrevistas', url);
  await Parse.Object.saveAll(sinUrl, { useMasterKey: true });
  console.log(`\n✓ ${sinUrl.length} grupo(s) actualizados.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
