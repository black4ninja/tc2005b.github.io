/**
 * Migración: `Pagina.etiquetas` pasa de array de strings a array de pointers.
 *
 * El campo guardaba objectIds sueltos como strings, sin validación alguna. En
 * producción eso permitió que se colaran NOMBRES de etiqueta ("eval") donde
 * debía ir el objectId: el visor los descartaba en silencio, así que esas
 * páginas se veían sin etiqueta y no salían al filtrar.
 *
 * Para cada entrada del array, en este orden:
 *   1. ¿Es el objectId de una Etiqueta viva?  → pointer.
 *   2. ¿Coincide con el NOMBRE de una Etiqueta viva? → pointer (repara el bug).
 *   3. Ni una cosa ni la otra → se descarta y se reporta.
 * Al final se deduplica (av1 tenía el id bueno Y el string "eval": la misma
 * etiqueta dos veces).
 *
 * Idempotente: las páginas cuyo array ya sean pointers se saltan.
 *
 *   ./node_modules/.bin/tsx scripts/migrate-paginas-etiquetas-pointers.ts --dry-run
 *   ./node_modules/.bin/tsx scripts/migrate-paginas-etiquetas-pointers.ts
 *
 * ⚠️ Dev comparte la BD de PRODUCCIÓN. Corre --dry-run primero.
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

const dryRun = process.argv.includes('--dry-run');

function esPointer(x: unknown): boolean {
  return !!x && typeof x === 'object' && typeof (x as any).id === 'string';
}

async function main() {
  const qe = new Parse.Query('Etiqueta');
  qe.equalTo('exists', true);
  qe.equalTo('active', true);
  qe.limit(500);
  const etiquetas = await qe.find({ useMasterKey: true });

  const porId = new Map(etiquetas.map((e) => [e.id!, e]));
  const porNombre = new Map(etiquetas.map((e) => [String(e.get('nombre')).toLowerCase(), e]));
  console.log(`Etiquetas vivas: ${etiquetas.length} (${etiquetas.map((e) => e.get('nombre')).join(', ')})\n`);

  const qp = new Parse.Query('Pagina');
  qp.equalTo('exists', true);
  qp.ascending('slug');
  qp.limit(1000);
  const paginas = await qp.find({ useMasterKey: true });

  const aGuardar: Parse.Object[] = [];
  let yaPointers = 0;
  let reparadas = 0;
  let descartadas = 0;

  for (const p of paginas) {
    const actual = (p.get('etiquetas') ?? []) as unknown[];
    if (actual.length === 0) continue;

    if (actual.every(esPointer)) {
      yaPointers++;
      continue;
    }

    const resueltas: Parse.Object[] = [];
    const notas: string[] = [];

    for (const entrada of actual) {
      if (esPointer(entrada)) {
        const e = porId.get((entrada as any).id);
        if (e) resueltas.push(e);
        continue;
      }
      if (typeof entrada !== 'string') {
        notas.push(`descarta ${JSON.stringify(entrada)} (tipo inesperado)`);
        descartadas++;
        continue;
      }
      const porIdHit = porId.get(entrada);
      if (porIdHit) {
        resueltas.push(porIdHit);
        continue;
      }
      const porNombreHit = porNombre.get(entrada.toLowerCase());
      if (porNombreHit) {
        resueltas.push(porNombreHit);
        notas.push(`REPARA "${entrada}" (era el nombre) → ${porNombreHit.id}`);
        reparadas++;
        continue;
      }
      notas.push(`DESCARTA "${entrada}" (no es id ni nombre de ninguna etiqueta)`);
      descartadas++;
    }

    // Deduplicar por id: av1 traía el id bueno y además el string "eval".
    const unicas = [...new Map(resueltas.map((e) => [e.id!, e])).values()];

    const antes = actual.map((x) => (esPointer(x) ? `→${(x as any).id}` : JSON.stringify(x))).join(', ');
    const despues = unicas.map((e) => `→${e.id}(${e.get('nombre')})`).join(', ') || '(ninguna)';
    console.log(`${dryRun ? '[dry-run]' : '[migrar] '} /paginas/${p.get('slug')}`);
    console.log(`     antes:   [${antes}]`);
    console.log(`     después: [${despues}]`);
    for (const n of notas) console.log(`     · ${n}`);

    p.set('etiquetas', unicas);
    aGuardar.push(p);
  }

  console.log(`\nPáginas ya con pointers (saltadas): ${yaPointers}`);
  console.log(`Páginas a migrar:                   ${aGuardar.length}`);
  console.log(`Referencias reparadas (nombre→id):  ${reparadas}`);
  console.log(`Referencias descartadas:            ${descartadas}`);

  if (aGuardar.length === 0) {
    console.log('\n✓ Nada que migrar.');
    return;
  }
  if (dryRun) {
    console.log('\n--dry-run: no se escribió nada. Quita la bandera para aplicar.');
    return;
  }

  await Parse.Object.saveAll(aGuardar, { useMasterKey: true });
  console.log(`\n✓ ${aGuardar.length} página(s) migradas a pointers.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
