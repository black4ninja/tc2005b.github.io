import Parse from 'parse/node';
import XLSX from 'xlsx';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Competencia } from '../src/models/Competencia.js';

const EXCEL_PATH = process.argv[2] || '/Users/black4ninja/Downloads/Malla de Evaluación TC2005B (1).xlsx';
const dryRun = process.argv.includes('--dry-run');

export async function runCompetenciasSeed(filePath: string, dryRun: boolean) {
  console.log('\n--- Seed Competencias ---');
  console.log(`Reading Excel: ${filePath}`);

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets['Competencias'];
  if (!ws) {
    console.error('Sheet "Competencias" not found. Available sheets:', wb.SheetNames.join(', '));
    return;
  }

  // range: 3 skips the first 3 rows (0-2), so row index 3 = Excel row 4
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, range: 3 });

  // Query existing competencias to avoid duplicates
  const query = new Parse.Query<Competencia>('Competencia');
  query.equalTo('active', true);
  query.limit(1000);
  const existing = await query.find({ useMasterKey: true });
  console.log(`Found ${existing.length} existing competencias in DB`);

  // Build a map for quick lookup by name
  const existingByName = new Map(existing.map(c => [c.getCompetencia(), c]));

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const [
      competencia, nivel, descripcionNivel, guiaEvidencias,
      incipienteB, incipienteA, basico, solido, destacado,
      fechaIdealEvaluacion,
    ] = row as (string | undefined)[];

    if (!competencia) continue; // skip empty rows

    const name = competencia.toString().trim();

    if (existingByName.has(name)) {
      const existingComp = existingByName.get(name)!;
      existingComp.setOrden(i);
      if (!dryRun) {
        await existingComp.save(null, { useMasterKey: true });
      }
      console.log(`  ${dryRun ? 'DRY-RUN UPDATE' : 'UPDATED'} orden=${i}: ${name}`);
      updated++;
      continue;
    }

    const comp = new Competencia().initDefaults();
    comp.setCompetencia(name);
    comp.setOrden(i);
    if (nivel) comp.setNivel(nivel.toString().trim());
    if (descripcionNivel) comp.setDescripcionNivel(descripcionNivel.toString().trim());
    if (guiaEvidencias) comp.setGuiaEvidencias(guiaEvidencias.toString().trim());
    if (incipienteB) comp.setIncipienteB(incipienteB.toString().trim());
    if (incipienteA) comp.setIncipienteA(incipienteA.toString().trim());
    if (basico) comp.setBasico(basico.toString().trim());
    if (solido) comp.setSolido(solido.toString().trim());
    if (destacado) comp.setDestacado(destacado.toString().trim());
    if (fechaIdealEvaluacion) comp.setFechaIdealEvaluacion(fechaIdealEvaluacion.toString().trim());

    if (!dryRun) {
      await comp.save(null, { useMasterKey: true });
    }

    console.log(`  ${dryRun ? 'DRY-RUN' : 'CREATED'}: ${name}`);
    created++;
  }

  console.log(`\nCompetencias seed done: ${created} created, ${updated} updated, ${skipped} skipped`);
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
  await runCompetenciasSeed(EXCEL_PATH, dryRun);
}

main().catch((error) => {
  console.error('Seed competencias failed:', error);
  process.exit(1);
});
