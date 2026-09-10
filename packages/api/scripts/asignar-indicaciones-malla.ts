/**
 * Pone una materia a las indicaciones de la malla que no la tienen.
 *
 * Las «Indicaciones — leer antes de evaluar» nacieron sin colección: eran una
 * lista global que se le enseñaba a todo alumno, llevara la materia o no. Desde
 * que cuelgan de una colección, una indicación sin materia NO LA VE NADIE —el
 * alumno solo recibe las de las materias de su grupo—, así que las que ya
 * estaban escritas hay que adoptarlas a mano. Para eso es esto.
 *
 * Es idempotente: por defecto solo toca las que están huérfanas, así que
 * repetirlo no mueve nada. Con `--mover` se pueden llevar de una materia a otra,
 * que es la operación peligrosa y por eso va aparte.
 *
 * ⚠️ La BD de desarrollo es la de PRODUCCIÓN. Corre `--dry-run` primero.
 *
 * Requiere el API corriendo.
 *
 * Uso:
 *   ./node_modules/.bin/tsx scripts/asignar-indicaciones-malla.ts --coleccion tc2005b --dry-run
 *   ./node_modules/.bin/tsx scripts/asignar-indicaciones-malla.ts --coleccion tc2005b
 *   ./node_modules/.bin/tsx scripts/asignar-indicaciones-malla.ts --coleccion tc2007b --mover --desde tc2005b --dry-run
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Coleccion } from '../src/models/Coleccion.js';
import { IndicacionMalla } from '../src/models/IndicacionMalla.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const dryRun = process.argv.includes('--dry-run');
const mover = process.argv.includes('--mover');
const destino = arg('coleccion');
const origen = arg('desde');

/** Busca una colección por slug, y si no, por objectId. */
async function buscarColeccion(clave: string): Promise<Coleccion | null> {
  const porSlug = new Parse.Query<Coleccion>('Coleccion');
  porSlug.equalTo('exists' as any, true as any);
  porSlug.equalTo('slug' as any, clave as any);
  const encontrada = await porSlug.first({ useMasterKey: true });
  if (encontrada) return encontrada;

  const porId = new Parse.Query<Coleccion>('Coleccion');
  porId.equalTo('exists' as any, true as any);
  return (await porId.get(clave, { useMasterKey: true }).catch(() => null)) ?? null;
}

function recorte(texto: string, largo = 78): string {
  return texto.length <= largo ? texto : `${texto.slice(0, largo - 1)}…`;
}

async function main() {
  if (!destino) {
    console.error('Falta --coleccion <slug|objectId>: a qué materia se asignan.');
    process.exit(1);
  }
  if (mover && !origen) {
    console.error('--mover necesita --desde <slug|objectId>: de qué materia se sacan.');
    process.exit(1);
  }

  const coleccion = await buscarColeccion(destino);
  if (!coleccion) {
    console.error(`No existe la colección «${destino}».`);
    process.exit(1);
  }

  const q = new Parse.Query<IndicacionMalla>('IndicacionMalla');
  q.equalTo('exists' as any, true as any);
  q.include('coleccion' as any);
  q.ascending('createdAt');
  q.limit(1000);
  const todas = await q.find({ useMasterKey: true });

  let candidatas: IndicacionMalla[];
  if (mover) {
    const desde = await buscarColeccion(origen!);
    if (!desde) {
      console.error(`No existe la colección de origen «${origen}».`);
      process.exit(1);
    }
    candidatas = todas.filter((i) => (i.get('coleccion') as Parse.Object | undefined)?.id === desde.id);
  } else {
    candidatas = todas.filter((i) => !i.get('coleccion'));
  }

  const conMateria = todas.length - todas.filter((i) => !i.get('coleccion')).length;
  console.log(`Colección destino : ${coleccion.get('clave') ?? coleccion.get('slug')} — ${coleccion.get('nombre')}`);
  console.log(`Indicaciones vivas: ${todas.length}  (con materia: ${conMateria}, huérfanas: ${todas.length - conMateria})`);
  console.log(`A tocar            : ${candidatas.length}${mover ? ` (movidas desde «${origen}»)` : ' (las huérfanas)'}`);
  console.log(dryRun ? '\n=== DRY RUN: no se escribe nada ===\n' : '');

  if (candidatas.length === 0) {
    console.log('Nada que hacer.');
    return;
  }

  for (const [n, ind] of candidatas.entries()) {
    console.log(`  ${String(n + 1).padStart(2)}. ${recorte(ind.get('descripcion') ?? '')}`);
    if (dryRun) continue;
    ind.set('coleccion', coleccion);
    await ind.save(null, { useMasterKey: true });
  }

  console.log(`\n===== REPORTE =====`);
  if (dryRun) {
    console.log(`Se asignarían ${candidatas.length} a ${coleccion.get('clave') ?? coleccion.get('slug')}.`);
    console.log('Vuelve a correrlo sin --dry-run para aplicarlo.');
  } else {
    console.log(`Asignadas: ${candidatas.length} a ${coleccion.get('clave') ?? coleccion.get('slug')}.`);
    console.log('Los alumnos de los grupos que llevan esa materia ya las verán.');
  }
  console.log('===================');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
