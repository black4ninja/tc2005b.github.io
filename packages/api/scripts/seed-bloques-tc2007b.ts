/**
 * Crea los BLOQUES de ejercicios de `tc2007b` y les asigna las categorías
 * existentes. Idempotente (upsert por nombre dentro de la colección) y con
 * `--dry-run`, que imprime el plan sin escribir nada.
 *
 * Uso:
 *   ./node_modules/.bin/tsx scripts/seed-bloques-tc2007b.ts [slugColeccion] [--dry-run]
 *
 * Reversible desde la UI: borrar un bloque desasigna sus categorías sin borrar
 * nada. Una categoría que ya tenga bloque NO se toca, para no pisar un cambio
 * hecho a mano en el modal.
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { BloqueEjercicios } from '../src/models/BloqueEjercicios.js';
import { CategoriaEjercicio } from '../src/models/CategoriaEjercicio.js';
import { Coleccion } from '../src/models/Coleccion.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const SLUG = argv.find((a) => !a.startsWith('--')) || 'tc2007b';

/** Bloques a garantizar, en orden. `categorias` = nombres que van dentro. */
const PLAN: { nombre: string; descripcion: string; categorias: string[] }[] = [
  {
    nombre: 'Introducción al lenguaje',
    descripcion: 'Sintaxis y estructuras básicas de Kotlin y Swift, antes de entrar en arquitectura.',
    categorias: [
      'Sintaxis básica',
      'Funciones y control de flujo',
      'Colecciones',
      'Programación funcional',
      'Nulos y opcionales',
    ],
  },
  {
    nombre: 'Arquitectura MVVM',
    descripcion: 'Cada capa por separado —modelo, datos, dominio, estado— y después compuestas.',
    categorias: [],
  },
];

async function main(): Promise<void> {
  const qc = new Parse.Query<Coleccion>('Coleccion');
  qc.equalTo('slug' as any, SLUG as any);
  const col = await qc.first({ useMasterKey: true });
  if (!col) {
    console.error(`No existe la colección '${SLUG}'.`);
    process.exit(1);
  }

  const qcat = new Parse.Query<CategoriaEjercicio>('CategoriaEjercicio');
  qcat.equalTo('coleccion' as any, col as any);
  qcat.equalTo('exists' as any, true as any);
  qcat.limit(1000);
  const categorias = await qcat.find({ useMasterKey: true });
  const porNombre = new Map(categorias.map((c) => [c.getNombre(), c]));

  console.log(`Colección '${SLUG}' · ${categorias.length} categorías${DRY_RUN ? ' · DRY-RUN, no se escribe' : ''}\n`);

  let sinEncontrar = 0;
  for (const [i, def] of PLAN.entries()) {
    const q = new Parse.Query<BloqueEjercicios>('BloqueEjercicios');
    q.equalTo('coleccion' as any, col as any);
    q.equalTo('nombre' as any, def.nombre as any);
    q.equalTo('exists' as any, true as any);
    let bloque = await q.first({ useMasterKey: true });
    const nuevo = !bloque;

    if (!bloque) {
      bloque = new BloqueEjercicios().initDefaults();
      bloque.setColeccion(col);
      bloque.setNombre(def.nombre);
      bloque.setDescripcion(def.descripcion);
      bloque.setOrden(i);
    }
    console.log(`${nuevo ? '+' : '·'} bloque "${def.nombre}" (orden ${i})${nuevo ? '' : ' — ya existía, se respeta'}`);
    if (!DRY_RUN && nuevo) await bloque.save(null, { useMasterKey: true });

    for (const nombreCat of def.categorias) {
      const cat = porNombre.get(nombreCat);
      if (!cat) {
        console.log(`    ! no encontré la categoría "${nombreCat}"`);
        sinEncontrar++;
        continue;
      }
      const yaTiene = cat.getBloque();
      if (yaTiene) {
        console.log(`    · "${nombreCat}" ya tiene bloque, no se toca`);
        continue;
      }
      console.log(`    → "${nombreCat}"`);
      if (!DRY_RUN) {
        cat.setBloque(bloque);
        await cat.save(null, { useMasterKey: true });
      }
    }
  }

  if (sinEncontrar) {
    console.error(`\n${sinEncontrar} categoría(s) del plan no existen en '${SLUG}'. ¿Nombre cambiado?`);
    process.exit(1);
  }
  console.log(`\n${DRY_RUN ? 'Plan verificado' : 'Aplicado'}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
