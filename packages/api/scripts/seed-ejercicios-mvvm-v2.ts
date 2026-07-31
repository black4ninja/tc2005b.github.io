/**
 * Siembra los ejercicios de arquitectura MVVM, versión 2.
 *
 * Uso:
 *   ./node_modules/.bin/tsx scripts/seed-ejercicios-mvvm-v2.ts [coleccion]
 *       [--dry-run] [--publicar] [--solo <prefijoSlug>]
 *
 * Idempotente (upsert por slug). Nacen como BORRADOR salvo `--publicar`.
 *
 * Los ejercicios viven en `ejercicios-mvvm/`, un módulo por concepto. Este
 * script solo compone el enunciado con la estructura fija y guarda.
 *
 * `--solo` permite sembrar y verificar CONCEPTO A CONCEPTO, que es como hay que
 * trabajar aquí: son 36 ejercicios con hasta 144 soluciones de referencia, y
 * verificarlo todo al final es dejar los fallos para cuando ya no se sabe cuál
 * los introdujo.
 */
import Parse from 'parse/node';
import { renderMarkdown } from '@tc2005b/contenido-pipeline';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { componerEnunciado, slugDe, tituloDe, type Ejercicio } from './ejercicios-mvvm/tipos.js';
import { modeloAndroid } from './ejercicios-mvvm/cat1-modelo-android.js';
import { modeloIos } from './ejercicios-mvvm/cat1-modelo-ios.js';
import { mapperAndroid } from './ejercicios-mvvm/cat1-mapper.js';
import { idDesdeUrl } from './ejercicios-mvvm/cat1-id-desde-url.js';
import { repositorio } from './ejercicios-mvvm/cat2-repositorio.js';
import { casoDeUso } from './ejercicios-mvvm/cat2-caso-de-uso.js';
import { resultAndroid } from './ejercicios-mvvm/cat3-result.js';
import { uiStateAndroid } from './ejercicios-mvvm/cat3-uistate.js';
import { viewModelAndroid } from './ejercicios-mvvm/cat3-viewmodel-android.js';
import { viewModelIos } from './ejercicios-mvvm/cat3-viewmodel-ios.js';
import { composicionAndroid } from './ejercicios-mvvm/cat4-composicion-android.js';
import { composicionIos } from './ejercicios-mvvm/cat4-composicion-ios.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const PUBLICAR = argv.includes('--publicar');
const iSolo = argv.indexOf('--solo');
const SOLO = iSolo >= 0 ? argv[iSolo + 1] : null;
const SLUG_COL =
  argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--solo') || 'tc2007b';

const NOMBRE_BLOQUE = 'Arquitectura MVVM';

/** Todos los ejercicios, en el orden en que deben aparecer. */
const TODOS: Ejercicio[] = [...modeloAndroid, ...modeloIos, ...mapperAndroid, ...idDesdeUrl, ...repositorio, ...casoDeUso, ...resultAndroid, ...uiStateAndroid, ...viewModelAndroid, ...viewModelIos, ...composicionAndroid, ...composicionIos];

/**
 * Slugs de la v1, que sigue publicada mientras se revisa la v2.
 *
 * El upsert por slug no distingue una versión de otra: si un slug de la v2
 * coincide con uno de la v1, sobreescribe el ejercicio PUBLICADO en lugar de
 * crear uno nuevo, y el alumno pasa a ver un borrador sin revisar. Ya ocurrió
 * con `mvvm-id-desde-url` y `mvvm-contrato-repositorio`.
 */
const SLUGS_V1 = [
  'mvvm-modelo-dominio-android',
  'mvvm-modelo-dominio-ios',
  'mvvm-mapper-dto-dominio',
  'mvvm-contrato-repositorio',
  'mvvm-id-desde-url',
  'mvvm-caso-de-uso',
  'mvvm-result-android',
  'mvvm-uistate-reducer-android',
  'mvvm-viewmodel-android',
  'mvvm-viewmodel-ios',
  'mvvm-composicion-android',
  'mvvm-composicion-ios',
];

function abortarSiPisaLaV1(lista: Ejercicio[]): void {
  const choques = lista.map(slugDe).filter((s) => SLUGS_V1.includes(s));
  if (!choques.length) return;
  console.error(
    'Estos slugs pisarían ejercicios de la v1, que están publicados:\n' +
      choques.map((s) => `  - ${s}`).join('\n') +
      '\nRenombra el slugBase del concepto antes de sembrar.',
  );
  process.exit(1);
}

async function main(): Promise<void> {
  abortarSiPisaLaV1(TODOS);

  const col = await new Parse.Query('Coleccion')
    .equalTo('slug', SLUG_COL)
    .first({ useMasterKey: true });
  if (!col) {
    console.error(`No existe la colección '${SLUG_COL}'.`);
    process.exit(1);
  }

  const bloque = await new Parse.Query('BloqueEjercicios')
    .equalTo('coleccion', col)
    .equalTo('nombre', NOMBRE_BLOQUE)
    .equalTo('exists', true)
    .first({ useMasterKey: true });
  if (!bloque) {
    console.error(`No existe el bloque "${NOMBRE_BLOQUE}".`);
    process.exit(1);
  }

  const lista = SOLO ? TODOS.filter((e) => slugDe(e).startsWith(SOLO)) : TODOS;
  if (!lista.length) {
    console.error(`Ningún ejercicio casa con --solo ${SOLO}`);
    process.exit(1);
  }

  console.log(
    `${lista.length} ejercicios${SOLO ? ` (filtro: ${SOLO})` : ''}` +
      `${DRY_RUN ? ' · DRY-RUN' : ''}\n`,
  );

  // Categorías necesarias, creadas bajo el bloque.
  const CatModel = Parse.Object.extend('CategoriaEjercicio');
  const catPorNombre = new Map<string, Parse.Object>();
  const nombresCat = [...new Set(lista.map((e) => e.categoria))];
  for (const nombre of nombresCat) {
    let cat = await new Parse.Query('CategoriaEjercicio')
      .equalTo('coleccion', col)
      .equalTo('nombre', nombre)
      .equalTo('exists', true)
      .first({ useMasterKey: true });
    if (!cat) {
      cat = new CatModel();
      cat!.set('active', true);
      cat!.set('exists', true);
      cat!.set('coleccion', col);
      cat!.set('nombre', nombre);
      cat!.set('orden', 100 + nombresCat.indexOf(nombre));
    }
    cat!.set('bloque', bloque);
    if (!DRY_RUN) await cat!.save(null, { useMasterKey: true });
    catPorNombre.set(nombre, cat!);
  }

  const EjModel = Parse.Object.extend('EjercicioProgramacion');
  let orden = 200;
  for (const d of lista) {
    const slug = slugDe(d);
    let ej = await new Parse.Query('EjercicioProgramacion')
      .equalTo('coleccion', col)
      .equalTo('slug', slug)
      .equalTo('exists', true)
      .first({ useMasterKey: true });
    const nuevo = !ej;
    if (!ej) {
      ej = new EjModel();
      ej!.set('active', true);
      ej!.set('exists', true);
    }

    const md = componerEnunciado(d);
    ej!.set('coleccion', col);
    ej!.set('categoria', catPorNombre.get(d.categoria));
    ej!.set('titulo', tituloDe(d));
    ej!.set('slug', slug);
    ej!.set('orden', orden++);
    ej!.set('enunciado', md);
    ej!.set('enunciadoHtml', await renderMarkdown(md));
    ej!.set('lenguajes', d.lenguajes);
    ej!.set('modoEvaluacion', 'plantilla');
    ej!.set('plantillaCodigo', d.plantilla);
    ej!.set('codigoInicial', d.inicial);
    ej!.set('casos', d.casos);
    ej!.set('solucionesReferencia', d.soluciones);
    ej!.set('limiteTiempoMs', 8000);
    ej!.set('limiteMemoriaMb', 256);
    if (nuevo) ej!.set('publicado', PUBLICAR);
    else if (PUBLICAR) ej!.set('publicado', true);

    console.log(
      `${nuevo ? '+' : '·'} ${slug.padEnd(38)} ${d.lenguajes.join('+').padEnd(13)} ${d.casos.length} casos`,
    );
    if (!DRY_RUN) await ej!.save(null, { useMasterKey: true });
  }

  console.log(`\n${DRY_RUN ? 'Verificado' : 'Aplicado'}${PUBLICAR ? ' y PUBLICADO' : ' como BORRADOR'}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
