import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

async function main() {
  console.log('=== Migración: copiar aprendizajePlaneado de ActividadEvaluacionGrupo a ActividadEvaluacionAlumno ===\n');

  let skip = 0;
  const batchSize = 200;
  let updated = 0;
  let skipped = 0;
  let total = 0;

  while (true) {
    const query = new Parse.Query('ActividadEvaluacionAlumno');
    query.equalTo('active', true);
    query.include('actividadGrupo');
    query.limit(batchSize);
    query.skip(skip);
    query.ascending('createdAt');

    const registros = await query.find({ useMasterKey: true });
    if (registros.length === 0) break;

    total += registros.length;
    const toSave: Parse.Object[] = [];

    for (const reg of registros) {
      const actGrupo = reg.get('actividadGrupo');
      if (!actGrupo) {
        skipped++;
        continue;
      }

      const valorGrupo: number = actGrupo.get('aprendizajePlaneado') ?? 0;
      const valorActual = reg.get('aprendizajePlaneado');

      // Solo actualizar si el campo no existe aún en el registro
      if (valorActual == null) {
        reg.set('aprendizajePlaneado', valorGrupo);
        toSave.push(reg);
      } else {
        skipped++;
      }
    }

    if (toSave.length > 0) {
      await Parse.Object.saveAll(toSave, { useMasterKey: true });
      updated += toSave.length;
      console.log(`  Batch ${skip / batchSize + 1}: ${toSave.length} actualizados`);
    } else {
      console.log(`  Batch ${skip / batchSize + 1}: sin cambios`);
    }

    skip += batchSize;
  }

  console.log(`\nResultado: ${total} registros procesados, ${updated} actualizados, ${skipped} sin cambio`);
}

main().catch(console.error);
