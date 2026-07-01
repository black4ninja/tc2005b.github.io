import Parse from 'parse/node';
import XLSX from 'xlsx';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { ActividadEvaluacion } from '../src/models/ActividadEvaluacion.js';

const dryRun = process.argv.includes('--dry-run');
const EXCEL_PATH = process.argv.filter(a => !a.startsWith('--'))[2] || '/Users/black4ninja/Downloads/Malla de Evaluación TC2005B (1).xlsx';

function inferTipo(nombre: string): string {
  if (/^Lab \d+:/i.test(nombre)) return 'lab';
  if (/^Lectura/i.test(nombre)) return 'lectura';
  if (/^Caso[s]? /i.test(nombre) || /^Ejercicio/i.test(nombre) || /^Nodeschool/i.test(nombre)) return 'ejercicio';
  if (/^Avance de proyecto/i.test(nombre)) return 'proyecto';
  if (/^Entrevista de evaluación/i.test(nombre)) return 'evaluacion';
  if (/^Política/i.test(nombre)) return 'info';
  return 'actividad';
}

export async function runActividadesEvaluacionSeed(filePath: string, dryRun: boolean) {
  console.log('\n--- Seed Actividades de Evaluación ---');
  console.log(`Reading Excel: ${filePath}`);

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets['Perfil'];
  if (!ws) {
    console.error('Sheet "Perfil" not found. Available sheets:', wb.SheetNames.join(', '));
    return;
  }

  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Find header row (row with "Actividad" in first column)
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] && String(rows[i][0] ?? '').trim() === 'Actividad') {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    console.error('Could not find header row with "Actividad"');
    return;
  }

  // Query existing to avoid duplicates
  const query = new Parse.Query<ActividadEvaluacion>('ActividadEvaluacion');
  query.equalTo('active', true);
  query.limit(1000);
  const existing = await query.find({ useMasterKey: true });
  console.log(`Found ${existing.length} existing actividades de evaluación in DB`);

  const existingByName = new Map(existing.map(a => [a.getNombre(), a]));

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let orden = 0;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;

    const nombre = String(row[0]).replace(/\r\n/g, '\n').trim();
    if (!nombre) continue;

    const aprendizajePlaneado = Number(row[1]) || 0;
    const semanaPlaneada = Number(row[2]) || 0;
    const tipo = inferTipo(nombre);

    orden++;

    if (existingByName.has(nombre)) {
      const act = existingByName.get(nombre)!;
      act.setOrden(orden);
      act.setAprendizajePlaneado(aprendizajePlaneado);
      act.setSemanaPlaneada(semanaPlaneada);
      act.setTipo(tipo);
      if (!dryRun) {
        await act.save(null, { useMasterKey: true });
      }
      console.log(`  ${dryRun ? 'DRY-RUN UPDATE' : 'UPDATED'} #${orden}: [${tipo}] ${nombre}`);
      updated++;
      continue;
    }

    const act = new ActividadEvaluacion().initDefaults();
    act.setNombre(nombre);
    act.setTipo(tipo);
    act.setAprendizajePlaneado(aprendizajePlaneado);
    act.setSemanaPlaneada(semanaPlaneada);
    act.setOrden(orden);

    if (!dryRun) {
      await act.save(null, { useMasterKey: true });
    }

    console.log(`  ${dryRun ? 'DRY-RUN' : 'CREATED'} #${orden}: [${tipo}] ${nombre}`);
    created++;
  }

  console.log(`\nActividades evaluación seed done: ${created} created, ${updated} updated, ${skipped} skipped`);
}

// Standalone execution
async function main() {
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  if (dryRun) {
    console.log('=== DRY RUN MODE — no changes will be saved ===');
  }

  console.log(`Connecting to Parse Server at ${config.serverURL}...`);
  await runActividadesEvaluacionSeed(EXCEL_PATH, dryRun);
}

main().catch((error) => {
  console.error('Seed actividades evaluación failed:', error);
  process.exit(1);
});
