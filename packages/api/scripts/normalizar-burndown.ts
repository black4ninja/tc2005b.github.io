/**
 * Normaliza los burndown de los sprints que se jugaron antes de que la serie
 * empezara en el compromiso.
 *
 * Hace tres cosas por cada marcador:
 *  - tira todo lo anterior al ÚLTIMO corte de planning, incluido: mientras se
 *    planea el sprint backlog está a medio llenar, y si el equipo volvió al
 *    planning a mitad de sprint, el compromiso bueno es el último. Es lo mismo
 *    que graba el código nuevo, que no toma ningún corte en el planning;
 *  - le pone delante el corte «Compromiso» con lo que el equipo se comprometió;
 *  - fija los pasos del ciclo, para que la línea ideal no dependa de cuántas
 *    veces cambiara de etapa el profesor.
 *
 * Es una APROXIMACIÓN del histórico: si un equipo volvió al planning a mitad de
 * sprint y añadió trabajo, `planeados` es su compromiso FINAL y la serie empieza
 * ahí, no donde empezó de verdad. Con `--dry-run` no escribe nada.
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { SprintEquipo } from '../src/models/SprintEquipo.js';
import { EtapaScrum } from '../src/models/EtapaScrum.js';
import { Grupo } from '../src/models/Grupo.js';

const GRUPO = process.argv[2];
const SECO = process.argv.includes('--dry-run');

async function main() {
  if (!GRUPO) { console.error('uso: normalizar-burndown.ts <grupoId> [--dry-run]'); process.exit(1); }
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  const qe = new Parse.Query<EtapaScrum>('EtapaScrum');
  qe.equalTo('grupo' as any, Grupo.createWithoutData(GRUPO) as any);
  qe.equalTo('exists' as any, true as any);
  const etapas = await qe.find({ useMasterKey: true });
  const planning = new Set(
    etapas.filter((e) => e.getPolitica().cobraDeuda === true)
      .map((e) => e.getNombre().trim().toLowerCase()),
  );
  const pasos = etapas.filter((e) => e.getPolitica().cobraDeuda !== true).length + 2;
  console.log(`etapas del grupo: ${etapas.length} · planning: [${[...planning]}] · pasos = ${pasos}\n`);

  // Los marcadores de las dinámicas de este grupo, por sus equipos.
  const qd = new Parse.Query('DinamicaScrum');
  qd.equalTo('grupo' as any, Grupo.createWithoutData(GRUPO) as any);
  qd.equalTo('exists' as any, true as any);
  const dinamicas = await qd.find({ useMasterKey: true });
  const qeq = new Parse.Query('EquipoScrum');
  qeq.containedIn('dinamica' as any, dinamicas as any);
  qeq.equalTo('exists' as any, true as any);
  const equipos = await qeq.find({ useMasterKey: true });

  const q = new Parse.Query<SprintEquipo>('SprintEquipo');
  q.containedIn('equipo' as any, equipos as any);
  q.equalTo('exists' as any, true as any);
  q.include('sprint' as any);
  q.limit(1000);
  const marcadores = await q.find({ useMasterKey: true });

  const aGuardar: SprintEquipo[] = [];
  for (const m of marcadores) {
    const cortes = m.getCortes();
    if (cortes[0]?.etiqueta === 'Compromiso' && m.getPasos() > 0) continue;

    // El compromiso es el del ÚLTIMO planning: lo de antes se midió con el
    // sprint a medio armar y es lo que dibujaba la caída y la subida.
    let desde = -1;
    cortes.forEach((c, i) => { if (planning.has(c.etiqueta.trim().toLowerCase())) desde = i; });
    const limpios = cortes.slice(desde + 1);
    const nuevos = [
      { en: limpios[0]?.en ?? new Date(0).toISOString(), etiqueta: 'Compromiso', restantes: m.getPlaneados() },
      ...limpios,
    ];
    console.log(
      `Sprint ${m.getSprint()?.get('numero')} · equipo ${m.getEquipoId()} · planeados ${m.getPlaneados()}\n`
      + `   antes: [${cortes.map((c) => `${c.etiqueta}=${c.restantes}`).join(', ')}]\n`
      + `   ahora: [${nuevos.map((c) => `${c.etiqueta}=${c.restantes}`).join(', ')}]\n`,
    );
    m.setCortes(nuevos);
    m.setPasos(pasos);
    aGuardar.push(m);
  }

  if (aGuardar.length === 0) { console.log('no hay nada que normalizar'); process.exit(0); }
  if (SECO) { console.log(`[dry-run] se habrían tocado ${aGuardar.length} marcadores`); process.exit(0); }
  await Parse.Object.saveAll(aGuardar, { useMasterKey: true });
  console.log(`normalizados ${aGuardar.length} marcadores`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
