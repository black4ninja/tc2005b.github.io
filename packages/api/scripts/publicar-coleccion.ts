/**
 * Publica (o despublica) una Coleccion del CMS "Contenidos".
 *
 * `publicada` es el interruptor de la colección entera, independiente del
 * `publicado` de cada página: con la colección en borrador, un alumno recibe 404
 * aunque todas sus páginas estén publicadas (contenidos.service.ts). Los admin
 * ven todas las colecciones, publicadas o no.
 *
 * Requiere el API corriendo.
 *
 * Uso:
 *   ./node_modules/.bin/tsx scripts/publicar-coleccion.ts --slug <slug> [--despublicar] [--dry-run]
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Coleccion } from '../src/models/Coleccion.js';

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const dryRun = process.argv.includes('--dry-run');
const despublicar = process.argv.includes('--despublicar');
const slug = arg('slug');

if (!slug) {
  console.error('Uso: publicar-coleccion.ts --slug <slug> [--despublicar] [--dry-run]');
  process.exit(1);
}

async function main() {
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  const coleccion = await new Parse.Query<Coleccion>('Coleccion')
    .equalTo('slug' as any, slug as any)
    .equalTo('exists' as any, true as any)
    .first({ useMasterKey: true });
  if (!coleccion) { console.error(`No existe la colección "${slug}".`); process.exit(1); }

  const antes = coleccion.getPublicada();
  const despues = !despublicar;
  console.log(`Colección: ${slug} ("${coleccion.getNombre()}", id ${coleccion.id})`);
  console.log(`  publicada: ${antes}  ->  ${despues}`);

  if (antes === despues) { console.log('\nYa estaba así. No se toca nada.'); process.exit(0); }
  if (dryRun) { console.log('\nDry-run terminado. No se escribió nada.'); process.exit(0); }

  coleccion.setPublicada(despues);
  await coleccion.save(null, { useMasterKey: true });
  console.log(`\nListo. Colección ${despues ? 'PUBLICADA' : 'despublicada'}.`);
  console.log('El visor cachea los slugs 5 minutos; reinicia el API si necesitas verlo ya.');
  process.exit(0);
}

main().catch((error) => { console.error('[publicar-coleccion] error:', error); process.exit(1); });
