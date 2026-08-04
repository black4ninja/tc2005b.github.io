/**
 * Verifica las DEFINICIONES de ejercicios de diagrama sin tocar la base de datos.
 *
 * Existe para poder escribir y corregir el contenido sin escribir nada en
 * producción: carga los ficheros `cat*.ts` de `ejercicios-diagrama/`, evalúa cada
 * ejercicio con el juez real y aplica las dos comprobaciones de autoría —toda
 * referencia pasa, la trampa falla—.
 *
 * Uso:
 *   ./node_modules/.bin/tsx scripts/verificar-definiciones-diagrama.ts
 *   ./node_modules/.bin/tsx scripts/verificar-definiciones-diagrama.ts --solo <slug>
 *
 * Sale con código 1 si algo falla, para encadenarlo antes de sembrar.
 */
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verificarEjercicioDiagrama } from '../src/services/diagramas-verificacion.service.js';
import { componerEnunciado, type EjercicioDiagramaDef } from './ejercicios-diagrama/tipos.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CARPETA = join(AQUI, 'ejercicios-diagrama');

/** Carga todos los `cat*.ts` de la carpeta. Sin barrel: así cada fichero de
 *  contenido se puede añadir sin tocar otro y dos autores no chocan. */
export async function cargarDefiniciones(): Promise<EjercicioDiagramaDef[]> {
  const ficheros = (await readdir(CARPETA))
    .filter((f) => f.startsWith('cat') && f.endsWith('.ts'))
    .sort();
  const todos: EjercicioDiagramaDef[] = [];
  for (const f of ficheros) {
    const modulo = await import(pathToFileURL(join(CARPETA, f)).href);
    const defs = (modulo.default ?? []) as EjercicioDiagramaDef[];
    todos.push(...defs);
  }
  return todos.sort((a, b) => a.orden - b.orden);
}

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const solo = arg('solo');
  let definiciones = await cargarDefiniciones();
  if (solo) definiciones = definiciones.filter((d) => d.slug === solo);

  if (!definiciones.length) {
    console.log('No hay definiciones que verificar.');
    return;
  }

  // Un slug repetido haría que el seed sobrescribiera un ejercicio con otro.
  const vistos = new Map<string, number>();
  for (const d of definiciones) vistos.set(d.slug, (vistos.get(d.slug) ?? 0) + 1);
  const repetidos = [...vistos.entries()].filter(([, n]) => n > 1).map(([s]) => s);
  if (repetidos.length) {
    console.error(`Slugs repetidos: ${repetidos.join(', ')}`);
    process.exit(1);
  }

  let fallos = 0;
  for (const d of definiciones) {
    const informe = await verificarEjercicioDiagrama({
      motor: d.motor,
      tipoDiagrama: d.tipoDiagrama,
      aserciones: d.aserciones,
      diagramasContexto: d.diagramasContexto,
      diagramasReferencia: d.diagramasReferencia,
      diagramaTrampa: d.diagramaTrampa,
    });

    const marca = informe.ok ? 'OK   ' : 'FALLA';
    console.log(
      `${marca} ${d.slug} [${d.tipoDiagrama}/${d.nivel}] ` +
      `refs=${d.diagramasReferencia.length} comprobaciones=${d.aserciones.length} ` +
      `trampa=${informe.trampa ? (informe.trampa.detecta ? 'detectada' : 'NO DETECTADA') : 'sin trampa'}`,
    );
    for (const r of informe.referencias) {
      if (r.veredicto === 'aceptado') continue;
      console.log(`       referencia ${r.indice + 1}: ${r.asercionesPasadas}/${r.asercionesTotales}`);
      for (const f of r.fallos) console.log(`         · ${f}`);
    }
    for (const p of informe.problemas) console.log(`       ! ${p}`);

    // Que el enunciado se componga sin reventar es parte de la verificación: un
    // fallo aquí solo se vería al abrir la pantalla.
    try {
      const md = componerEnunciado(d);
      if (md.includes('undefined')) console.log('       ! el enunciado contiene "undefined"');
    } catch (e) {
      console.log(`       ! el enunciado no se pudo componer: ${e instanceof Error ? e.message : String(e)}`);
      fallos++;
      continue;
    }

    if (!informe.ok) fallos++;
  }

  console.log(`\n${definiciones.length - fallos}/${definiciones.length} definiciones en orden.`);
  if (fallos) process.exit(1);
}

// Solo corre si se invoca como script. El seed importa `cargarDefiniciones` de
// aquí, y sin esta guarda sembrar dispararía además una verificación completa.
const invocadoDirectamente =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invocadoDirectamente) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
