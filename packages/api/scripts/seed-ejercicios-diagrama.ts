/**
 * Siembra los ejercicios de diagrama en una colección. Idempotente por `slug`.
 *
 * Crea los bloques y las categorías que falten, y actualiza los ejercicios que
 * ya existan en vez de duplicarlos.
 *
 * Uso:
 *   ./node_modules/.bin/tsx scripts/seed-ejercicios-diagrama.ts --dry-run
 *   ./node_modules/.bin/tsx scripts/seed-ejercicios-diagrama.ts
 *   ./node_modules/.bin/tsx scripts/seed-ejercicios-diagrama.ts --publicar
 *   ./node_modules/.bin/tsx scripts/seed-ejercicios-diagrama.ts --coleccion tc2005b --solo <slug>
 *
 * ⚠️ La base de dev es la de PRODUCCIÓN. Corre siempre `--dry-run` primero. Los
 * ejercicios nacen como BORRADOR: `--publicar` es una decisión aparte y exige
 * que cada ejercicio pase su verificación de autoría, la misma que aplica el
 * endpoint de publicación.
 */
import 'dotenv/config';
import Parse from 'parse/node';
import { renderMarkdown } from '@tc2005b/contenido-pipeline';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { verificarEjercicioDiagrama } from '../src/services/diagramas-verificacion.service.js';
import { cargarDefiniciones } from './verificar-definiciones-diagrama.js';
import { componerEnunciado, type EjercicioDiagramaDef } from './ejercicios-diagrama/tipos.js';

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const PUBLICAR = argv.includes('--publicar');
const arg = (n: string): string | null => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] ?? null : null;
};
const SLUG_COL = arg('coleccion') ?? 'tc2007b';
const SOLO = arg('solo');

function inicializarParse(): void {
  // Mismo arranque que el resto de scripts de autoría: `config` expone appId,
  // serverURL y masterKey en la raíz, no bajo `parse`.
  Parse.initialize(config.appId);
  (Parse as unknown as { serverURL: string }).serverURL = config.serverURL;
  (Parse as unknown as { masterKey: string }).masterKey = config.masterKey;
}

/**
 * Busca o crea un objeto por (colección, nombre), y en ambos casos deja sus
 * campos `extra` como dicen las definiciones. Devuelve null en dry-run si no
 * existía.
 *
 * Actualizar también los EXISTENTES no es un detalle: `orden` se calcula a
 * partir del orden en que aparecen los bloques en las definiciones, y el
 * contador arranca de cero en cada corrida. Al crear solo los que faltaban, un
 * bloque nuevo recibía un número que los antiguos ya tenían, empataban y el
 * listado los pintaba en un orden arbitrario. Sembrar tiene que dejar el mismo
 * estado se ejecute las veces que se ejecute.
 */
async function obtenerOCrear(
  clase: string,
  coleccion: Parse.Object,
  nombre: string,
  extra: Record<string, unknown> = {},
): Promise<Parse.Object | null> {
  const q = new Parse.Query(clase);
  q.equalTo('coleccion' as never, coleccion as never);
  q.equalTo('nombre' as never, nombre as never);
  q.equalTo('exists' as never, true as never);
  const existente = await q.first({ useMasterKey: true });

  if (existente) {
    const cambios = Object.entries(extra).filter(([k, v]) => {
      const actual = existente.get(k);
      // Los punteros se comparan por id; el resto por valor.
      const actualId = (actual as Parse.Object | undefined)?.id;
      const nuevoId = (v as Parse.Object | undefined)?.id;
      return nuevoId ? actualId !== nuevoId : actual !== v;
    });
    if (cambios.length) {
      console.log(`  ~ ${clase}: «${nombre}» (${cambios.map(([k]) => k).join(', ')})`);
      if (!DRY_RUN) {
        for (const [k, v] of cambios) existente.set(k, v);
        await existente.save(null, { useMasterKey: true });
      }
    }
    return existente;
  }

  console.log(`  + ${clase}: «${nombre}»`);
  if (DRY_RUN) return null;

  const Modelo = Parse.Object.extend(clase);
  const nuevo = new Modelo();
  nuevo.set('coleccion', coleccion);
  nuevo.set('nombre', nombre);
  nuevo.set('active', true);
  nuevo.set('exists', true);
  for (const [k, v] of Object.entries(extra)) nuevo.set(k, v);
  await nuevo.save(null, { useMasterKey: true });
  return nuevo;
}

async function main(): Promise<void> {
  inicializarParse();

  let definiciones = await cargarDefiniciones();
  if (SOLO) definiciones = definiciones.filter((d) => d.slug === SOLO);
  if (!definiciones.length) {
    console.error('No hay definiciones que sembrar.');
    process.exit(2);
  }

  const coleccion = await new Parse.Query('Coleccion')
    .equalTo('slug' as never, SLUG_COL as never)
    .equalTo('exists' as never, true as never)
    .first({ useMasterKey: true });
  if (!coleccion) {
    console.error(`No existe la colección «${SLUG_COL}».`);
    process.exit(2);
  }
  console.log(`Colección: ${SLUG_COL} (${coleccion.id})${DRY_RUN ? '  [DRY-RUN]' : ''}\n`);

  // Bloques y categorías, en el orden en que aparecen en las definiciones.
  //
  // Se numeran desde 200 porque `BloqueEjercicios` y `CategoriaEjercicio`
  // pertenecen a la COLECCIÓN y los comparten los dos módulos: en `tc2007b` ya
  // viven los bloques del mini-juez de código, numerados desde 0. Empezar
  // también en 0 hacía que "Punto de partida" empatara con "Introducción al
  // lenguaje", y un empate deja el orden a merced de la base de datos.
  const BASE_ORDEN = 200;
  const bloques = new Map<string, Parse.Object | null>();
  const categorias = new Map<string, Parse.Object | null>();
  let ordenBloque = BASE_ORDEN;
  let ordenCategoria = BASE_ORDEN;

  for (const d of definiciones) {
    if (!bloques.has(d.bloque)) {
      bloques.set(d.bloque, await obtenerOCrear('BloqueEjercicios', coleccion, d.bloque, { orden: ordenBloque++ }));
    }
    const claveCat = `${d.bloque}::${d.categoria}`;
    if (!categorias.has(claveCat)) {
      const bloque = bloques.get(d.bloque);
      const extra: Record<string, unknown> = { orden: ordenCategoria++ };
      if (bloque) extra.bloque = bloque;
      categorias.set(claveCat, await obtenerOCrear('CategoriaEjercicio', coleccion, d.categoria, extra));
    }
  }

  const Ejercicio = Parse.Object.extend('EjercicioDiagrama');
  let creados = 0;
  let actualizados = 0;
  let sinPublicar = 0;

  for (const d of definiciones) {
    const q = new Parse.Query('EjercicioDiagrama');
    q.equalTo('coleccion' as never, coleccion as never);
    q.equalTo('slug' as never, d.slug as never);
    q.equalTo('exists' as never, true as never);
    const existente = await q.first({ useMasterKey: true });

    const enunciado = componerEnunciado(d);
    const ej = existente ?? new Ejercicio();
    if (!existente) {
      ej.set('active', true);
      ej.set('exists', true);
      ej.set('coleccion', coleccion);
      ej.set('publicado', false); // nace como borrador, siempre
    }

    ej.set('titulo', d.titulo);
    ej.set('slug', d.slug);
    ej.set('orden', d.orden);
    ej.set('enunciado', enunciado);
    ej.set('enunciadoHtml', await renderMarkdown(enunciado));
    ej.set('motor', d.motor);
    ej.set('tipoDiagrama', d.tipoDiagrama);
    ej.set('codigoInicial', d.codigoInicial);
    ej.set('aserciones', d.aserciones);
    ej.set('diagramasContexto', d.diagramasContexto ?? []);
    ej.set('diagramasReferencia', d.diagramasReferencia);
    ej.set('diagramaTrampa', d.diagramaTrampa);
    ej.set('esEjemplo', d.esEjemplo === true);
    const cat = categorias.get(`${d.bloque}::${d.categoria}`);
    if (cat) ej.set('categoria', cat);

    // Publicar exige pasar la verificación, igual que por la pantalla de admin:
    // una aserción sobreajustada o laxa no se ve leyendo el ejercicio.
    if (PUBLICAR) {
      const informe = await verificarEjercicioDiagrama({
        motor: d.motor,
        tipoDiagrama: d.tipoDiagrama,
        aserciones: d.aserciones,
        diagramasContexto: d.diagramasContexto,
        diagramasReferencia: d.diagramasReferencia,
        diagramaTrampa: d.diagramaTrampa,
      });
      if (informe.ok) {
        ej.set('publicado', true);
      } else {
        sinPublicar++;
        console.log(`  ! ${d.slug} no pasa su verificación; se deja como borrador`);
        for (const p of informe.problemas) console.log(`      · ${p}`);
      }
    }

    const accion = existente ? 'actualiza' : 'crea';
    console.log(`  ${accion.padEnd(9)} ${d.slug} [${d.tipoDiagrama}/${d.nivel}]`);
    if (!DRY_RUN) await ej.save(null, { useMasterKey: true });
    if (existente) actualizados++; else creados++;
  }

  console.log(
    `\n${creados} creados, ${actualizados} actualizados` +
    (PUBLICAR ? `, ${definiciones.length - sinPublicar} publicados` : ', todos como BORRADOR') +
    (DRY_RUN ? '  [DRY-RUN: no se escribió nada]' : ''),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
