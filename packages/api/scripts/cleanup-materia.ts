/**
 * Limpieza de datos huérfanos tras retirar la entidad `Materia` del código.
 *
 * El código ya no declara `Materia` ni `Grupo.materia`, así que Parse ignora esos
 * datos: son INERTES, no rompen nada. Este script solo existe para dejar la BD
 * tan limpia como el código.
 *
 * Hace dos cosas:
 *   1. `unset('materia')` en los `Grupo` que aún tengan el pointer colgante.
 *   2. Borra los documentos de la clase `Materia`.
 *
 * Antes de borrar nada escribe un **respaldo JSON** de las materias y de los
 * pointers que va a quitar, para que el borrado sea reversible a mano.
 *
 * Idempotente: correrlo dos veces no hace nada la segunda vez.
 *
 *   ./node_modules/.bin/tsx scripts/cleanup-materia.ts --dry-run
 *   ./node_modules/.bin/tsx scripts/cleanup-materia.ts
 *
 * ⚠️ Dev comparte la BD de PRODUCCIÓN, y el paso 2 es un borrado DURO
 *    (`destroy`, no soft-delete: la clase ya no existe en el código, marcar
 *    `exists: false` no serviría de nada). Corre --dry-run primero.
 *    Requiere que el PR que retira `Materia` ya esté desplegado; si no, el
 *    front seguirá pidiendo /api/admin/materias.
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

const dryRun = process.argv.includes('--dry-run');

async function main() {
  // `Materia` ya no es una subclase registrada: se consulta por nombre de clase.
  const qm = new Parse.Query('Materia');
  qm.limit(1000);
  const materias = await qm.find({ useMasterKey: true }).catch(() => []);

  // Grupos con el pointer colgante. `exists` no filtra aquí a propósito: también
  // queremos limpiar los grupos archivados.
  const qg = new Parse.Query('Grupo');
  qg.exists('materia');
  qg.limit(1000);
  const grupos = await qg.find({ useMasterKey: true });

  console.log(`Materias huérfanas:            ${materias.length}`);
  for (const m of materias) {
    console.log(`  ${m.id}  slug=${m.get('slug')}  codigo=${m.get('codigo')}  "${m.get('nombre')}"`);
  }
  console.log(`\nGrupos con pointer 'materia':  ${grupos.length}`);
  for (const g of grupos) {
    console.log(`  ${g.id}  ${g.get('name')}  → materia ${g.get('materia')?.id}`);
  }

  if (materias.length === 0 && grupos.length === 0) {
    console.log('\n✓ Nada que limpiar.');
    return;
  }

  if (dryRun) {
    console.log('\n--dry-run: no se escribió nada. Quita la bandera para aplicar.');
    return;
  }

  // Respaldo antes de tocar nada.
  const backup = {
    generadoEn: new Date().toISOString(),
    materias: materias.map((m) => ({
      objectId: m.id,
      nombre: m.get('nombre'),
      slug: m.get('slug'),
      codigo: m.get('codigo'),
      active: m.get('active'),
      exists: m.get('exists'),
    })),
    gruposConMateria: grupos.map((g) => ({
      objectId: g.id,
      name: g.get('name'),
      materiaId: g.get('materia')?.id ?? null,
    })),
  };
  const backupPath = resolve(__dirname, 'materia-backup.json');
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log(`\n📄 Respaldo escrito en ${backupPath}`);

  // 1. Quitar el pointer de los grupos (antes de borrar las materias, para no
  //    dejar punteros a documentos inexistentes si el script muere a la mitad).
  if (grupos.length > 0) {
    for (const g of grupos) g.unset('materia');
    await Parse.Object.saveAll(grupos, { useMasterKey: true });
    console.log(`✓ ${grupos.length} grupo(s): pointer 'materia' eliminado.`);
  }

  // 2. Borrar las materias.
  if (materias.length > 0) {
    await Parse.Object.destroyAll(materias, { useMasterKey: true });
    console.log(`✓ ${materias.length} materia(s) borradas.`);
  }

  console.log('\n✓ Limpieza completa.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
