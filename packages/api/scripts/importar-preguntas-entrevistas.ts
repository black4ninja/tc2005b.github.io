/**
 * Sube al banco del módulo "Preguntas" los enunciados de las actas de
 * entrevistas (los .txt que exporta el profesor desde sus presentaciones).
 *
 * El cotejo contra lo que ya está en el banco se hace FUERA, en el script de
 * preparación; aquí solo se comprueba una última vez que el enunciado no esté
 * ya, para que re-ejecutarlo no duplique nada.
 *
 * Uso:
 *   ./node_modules/.bin/tsx scripts/importar-preguntas-entrevistas.ts \
 *       --json <archivo> --coleccion <objectId> [--etiqueta <tag>] [--dry-run]
 */
import fs from 'fs';
import Parse from 'parse/node';
import { renderMarkdown } from '@tc2005b/contenido-pipeline';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Pregunta } from '../src/models/Pregunta.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const dryRun = process.argv.includes('--dry-run');
const rutaJson = arg('json');
const coleccionId = arg('coleccion');
const etiqueta = arg('etiqueta');
if (!rutaJson || !coleccionId) {
  console.error('Faltan --json o --coleccion');
  process.exit(1);
}

/** Las dos competencias del banco de TC2007B, por la clase que trae el JSON. */
const COMPETENCIAS: Record<string, string> = {
  escenarios: 'Vt3DNRKC03', // SICT0203. Desarrollo de escenarios
  diseno: 'wwsPwc3Ybl',     // STC0203. Diseño de componentes de software
};

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  const entradas: { texto: string; competencia: string }[] = JSON.parse(fs.readFileSync(rutaJson, 'utf8'));

  const qc = new Parse.Query('Coleccion');
  const coleccion = await qc.get(coleccionId!, { useMasterKey: true });

  const qp = new Parse.Query<Pregunta>('Pregunta');
  qp.equalTo('coleccion' as any, coleccion as any);
  qp.limit(2000);
  const yaEstan = new Set((await qp.find({ useMasterKey: true })).map((p) => norm(p.get('texto') ?? '')));

  console.log(`Colección: ${coleccion.get('nombre')} · ${yaEstan.size} enunciados ya en el banco`);
  console.log(`Entradas del archivo: ${entradas.length}${dryRun ? '  (DRY RUN)' : ''}\n`);

  let creadas = 0, saltadas = 0;
  for (const e of entradas) {
    if (yaEstan.has(norm(e.texto))) { saltadas++; continue; }
    const compId = COMPETENCIAS[e.competencia];
    if (!compId) throw new Error(`competencia desconocida: ${e.competencia}`);
    yaEstan.add(norm(e.texto));
    creadas++;
    if (dryRun) { console.log(`  + [${e.competencia}] ${e.texto.slice(0, 90)}`); continue; }

    const pregunta = new Pregunta().initDefaults();
    pregunta.setColeccion(coleccion as never);
    pregunta.setCompetencia({ __type: 'Pointer', className: 'Competencia', objectId: compId } as never);
    pregunta.setTexto(e.texto);
    pregunta.setTextoHtml(await renderMarkdown(e.texto));
    pregunta.setEtiquetas(etiqueta ? [etiqueta] : []);
    pregunta.setNotas('');
    pregunta.setArchivada(false);
    await pregunta.save(null, { useMasterKey: true });
  }

  console.log(`\n===== REPORTE =====`);
  console.log(`Creadas:  ${creadas}`);
  console.log(`Saltadas: ${saltadas}  (ya estaban)`);
  console.log(`===================`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
