/**
 * Verifica en lote los ejercicios de diagrama de una colección.
 *
 * Contesta la pregunta que no se puede contestar leyendo el ejercicio: ¿las
 * comprobaciones dicen lo que el autor cree? Cada referencia debe pasarlas
 * TODAS, y el diagrama trampa debe fallar al menos una. Lo primero detecta
 * aserciones sobreajustadas; lo segundo, aserciones tan laxas que el ejercicio
 * se aprueba solo.
 *
 * Uso:
 *   ./node_modules/.bin/tsx scripts/verificar-ejercicios-diagrama.ts --coleccion <slug>
 *   ./node_modules/.bin/tsx scripts/verificar-ejercicios-diagrama.ts --coleccion <slug> --solo <slug-ejercicio>
 *
 * No modifica nada: solo lee y reporta. Sale con código 1 si algún ejercicio
 * falla, para poder encadenarlo en un script de publicación.
 */
import 'dotenv/config';
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Coleccion } from '../src/models/Coleccion.js';
import { EjercicioDiagrama } from '../src/models/EjercicioDiagrama.js';
import { verificarEjercicioDiagrama } from '../src/services/diagramas-verificacion.service.js';

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function inicializarParse(): void {
  Parse.initialize(config.parse.appId, undefined, config.parse.masterKey);
  (Parse as unknown as { serverURL: string }).serverURL = config.parse.serverURL;
}

async function main(): Promise<void> {
  const slugColeccion = arg('coleccion');
  if (!slugColeccion) {
    console.error('Falta --coleccion <slug>.');
    process.exit(2);
  }
  const solo = arg('solo');

  inicializarParse();

  const qc = new Parse.Query<Coleccion>('Coleccion');
  qc.equalTo('slug' as never, slugColeccion as never);
  qc.equalTo('exists' as never, true as never);
  const coleccion = await qc.first({ useMasterKey: true });
  if (!coleccion) {
    console.error(`No existe la colección «${slugColeccion}».`);
    process.exit(2);
  }

  const q = new Parse.Query<EjercicioDiagrama>('EjercicioDiagrama');
  q.equalTo('coleccion' as never, coleccion as never);
  q.equalTo('exists' as never, true as never);
  if (solo) q.equalTo('slug' as never, solo as never);
  q.ascending('orden');
  q.limit(1000);
  const ejercicios = await q.find({ useMasterKey: true });

  if (!ejercicios.length) {
    console.log('No hay ejercicios de diagrama que verificar.');
    return;
  }

  let conFallos = 0;
  for (const ej of ejercicios) {
    const informe = await verificarEjercicioDiagrama({
      motor: ej.getMotor(),
      tipoDiagrama: ej.getTipoDiagrama(),
      aserciones: ej.getAserciones(),
      diagramasContexto: ej.getDiagramasContexto(),
      diagramasReferencia: ej.getDiagramasReferencia(),
      diagramaTrampa: ej.getDiagramaTrampa(),
    });

    const marca = informe.ok ? 'OK  ' : 'FALLA';
    console.log(`\n${marca} ${ej.getSlug()} — ${ej.getTitulo()} [${ej.getTipoDiagrama()}]`);
    console.log(
      `      referencias: ${informe.referencias.length}` +
      `, comprobaciones: ${ej.getAserciones().length}` +
      `, trampa: ${informe.trampa ? (informe.trampa.detecta ? 'detectada' : 'NO detectada') : 'sin trampa'}`,
    );

    for (const r of informe.referencias) {
      if (r.veredicto === 'aceptado') continue;
      console.log(`      referencia ${r.indice + 1}: ${r.asercionesPasadas}/${r.asercionesTotales}`);
      for (const f of r.fallos) console.log(`        · ${f}`);
    }
    for (const p of informe.problemas) console.log(`      ! ${p}`);

    if (!informe.ok) conFallos++;
  }

  console.log(`\n${ejercicios.length - conFallos}/${ejercicios.length} ejercicios en orden.`);
  if (conFallos) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
