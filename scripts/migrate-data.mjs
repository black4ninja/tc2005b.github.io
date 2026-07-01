#!/usr/bin/env node
/**
 * migrate-data.mjs — Migrates lab, avance, and calendario data files
 * from global-var JS to typed ES module TS files.
 *
 * Usage: node scripts/migrate-data.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

// --- Link updater ---
function updateLinks(content) {
  return content
    .replace(/labs\/lab\.html\?id=(\w+)/g, '/labs/$1')
    .replace(/avances\/avance\.html\?id=(\w+)/g, '/avances/$1')
    .replace(/\.\.\/index\.html/g, '/')
    .replace(/\.\.\/grupo2-nuevo\.html/g, '/calendario/501')
    .replace(/code_reviews\.html/g, '/politicas');
}

// --- Migrate labs ---
function migrateLabs() {
  const srcDir = join(ROOT, 'data-source/labs');
  const destDir = join(ROOT, 'packages/web/src/data/labs');
  const files = readdirSync(srcDir).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const content = readFileSync(join(srcDir, file), 'utf-8');
    const name = basename(file, '.js');

    if (name === 'lab-index') {
      // Lab index: var LAB_INDEX = [...] → export const labIndex
      let ts = content
        .replace(/\/\*\*[\s\S]*?\*\/\n?/, '')
        .replace(/var LAB_INDEX\s*=/, 'import type { LabIndexEntry } from \'@/types/lab\';\n\nconst labIndex: LabIndexEntry[]  =')
        .replace(/;\s*$/, ';\n\nexport default labIndex;\n');
      ts = updateLinks(ts);
      writeFileSync(join(destDir, 'lab-index.ts'), ts);
      console.log(`  ✓ ${name} → lab-index.ts`);
      continue;
    }

    // Regular lab: const LAB = {...} → typed export default
    let ts = content
      .replace(/\/\/.*Created by.*\n?/, '')
      .replace(/const LAB\s*=/, `import type { Lab } from '@/types/lab';\n\nconst ${name}: Lab =`)
      .replace(/;\s*$/, `;\n\nexport default ${name};\n`);
    ts = updateLinks(ts);
    writeFileSync(join(destDir, `${name}.ts`), ts);
    console.log(`  ✓ ${name}`);
  }

  // Generate barrel export with dynamic imports
  const labFiles = files
    .filter(f => f !== 'lab-index.js')
    .map(f => basename(f, '.js'));
  const barrel = `import type { Lab } from '@/types/lab';\n\nexport const labLoaders: Record<string, () => Promise<{ default: Lab }>> = {\n${labFiles.map(id => `  '${id}': () => import('./${id}'),`).join('\n')}\n};\n\nexport { default as labIndex } from './lab-index';\n`;
  writeFileSync(join(destDir, 'index.ts'), barrel);
  console.log('  ✓ index.ts (barrel)');
}

// --- Migrate avances ---
function migrateAvances() {
  const srcDir = join(ROOT, 'data-source/avances');
  const destDir = join(ROOT, 'packages/web/src/data/avances');
  const files = readdirSync(srcDir).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const content = readFileSync(join(srcDir, file), 'utf-8');
    const name = basename(file, '.js');

    let ts = content
      .replace(/const AVANCE\s*=/, `import type { Avance } from '@/types/avance';\n\nconst ${name}: Avance =`)
      .replace(/;\s*$/, `;\n\nexport default ${name};\n`);
    ts = updateLinks(ts);
    writeFileSync(join(destDir, `${name}.ts`), ts);
    console.log(`  ✓ ${name}`);
  }

  // Barrel export
  const avanceFiles = files.map(f => basename(f, '.js'));
  const barrel = `import type { Avance } from '@/types/avance';\nimport type { AvanceNavEntry } from '@/types/avance';\n\nexport const avanceLoaders: Record<string, () => Promise<{ default: Avance }>> = {\n${avanceFiles.map(id => `  '${id}': () => import('./${id}'),`).join('\n')}\n};\n\nexport const avancesNav: AvanceNavEntry[] = [\n  { id: 'av1', numero: 1, titulo: 'Propuesta de proyecto' },\n  { id: 'av3', numero: 2, titulo: 'Análisis y diseño' },\n  { id: 'av4', numero: 3, titulo: 'Creación de la BD' },\n  { id: 'av5', numero: 4, titulo: 'Prueba de concepto' },\n  { id: 'av6', numero: 5, titulo: 'Versión Beta' },\n  { id: 'av7', numero: 6, titulo: 'Versión 1.0' },\n];\n`;
  writeFileSync(join(destDir, 'index.ts'), barrel);
  console.log('  ✓ index.ts (barrel)');
}

// --- Migrate calendario ---
function migrateCalendario() {
  const srcFile = join(ROOT, 'data-source/calendario/calendario-grupo2.js');
  const destFile = join(ROOT, 'packages/web/src/data/calendario/calendario-grupo2.ts');
  let content = readFileSync(srcFile, 'utf-8');

  let ts = content
    .replace(/\/\*\*[\s\S]*?\*\/\n?/, '')
    .replace(/const CALENDARIO\s*=/, `import type { Calendario } from '@/types/calendario';\n\nconst calendario: Calendario =`)
    .replace(/;\s*$/, `;\n\nexport default calendario;\n`);
  ts = updateLinks(ts);
  writeFileSync(destFile, ts);
  console.log('  ✓ calendario-grupo2');

  // Index
  writeFileSync(
    join(ROOT, 'packages/web/src/data/calendario/index.ts'),
    `export { default as calendarioGrupo2 } from './calendario-grupo2';\n`
  );
  console.log('  ✓ index.ts');
}

// --- Main ---
console.log('\n📦 Migrating lab data...');
migrateLabs();
console.log('\n📦 Migrating avance data...');
migrateAvances();
console.log('\n📦 Migrating calendario data...');
migrateCalendario();
console.log('\n✅ Data migration complete!\n');
