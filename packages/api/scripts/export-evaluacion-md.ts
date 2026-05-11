import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import Parse from 'parse/node';
import '../src/models/index.js';
import {
  ActividadHidratada,
  AvanceStatic,
  DOCS_DIR,
  LabStatic,
  PeriodoSerializable,
  inferTipoYKey,
  loadStaticAvances,
  loadStaticLabs,
  normalizeForMatch,
  slugify,
  stripHtml,
  stripLabPrefix,
  tipoEmoji,
} from './_evaluacion-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const APP_ID = process.env.APP_ID!;
const MASTER_KEY = process.env.MASTER_KEY!;
const SERVER_URL = process.env.SERVER_URL!;

Parse.initialize(APP_ID);
(Parse as any).serverURL = SERVER_URL;
(Parse as any).masterKey = MASTER_KEY;

const TARGET_GRUPO = process.argv[2] || 'ABYXbnDQ28';

// =====================================================================
// Consulta a Parse
// =====================================================================

async function fetchData(): Promise<{
  grupoName: string;
  curso: string;
  nombreCurso: string;
  periodos: PeriodoSerializable[];
}> {
  const grupoQ = new Parse.Query('Grupo');
  const grupo = await grupoQ.get(TARGET_GRUPO, { useMasterKey: true }).catch(() => null);
  if (!grupo) {
    throw new Error(`Grupo ${TARGET_GRUPO} no existe en BD`);
  }

  const planQ = new Parse.Query('PlanEvaluacion');
  planQ.equalTo('grupo', grupo);
  planQ.equalTo('active', true);
  const plan = await planQ.first({ useMasterKey: true });
  if (!plan) {
    throw new Error(`PlanEvaluacion no encontrado (active=true) para grupo ${TARGET_GRUPO}`);
  }

  const periodosRaw = (plan.get('periodos') ?? []) as Array<{
    nombre: string;
    pesoFinal: number;
    pesoCompetencias: number;
    pesoActividades: number;
    actividades: string[];
    acumulativo: boolean;
  }>;

  const labsMap = await loadStaticLabs();
  const avancesMap = await loadStaticAvances();

  const periodos: PeriodoSerializable[] = [];
  for (const p of periodosRaw) {
    const ids = Array.isArray(p.actividades) ? p.actividades : [];
    let actividades: ActividadHidratada[] = [];
    if (ids.length > 0) {
      const actQ = new Parse.Query('ActividadEvaluacionGrupo');
      actQ.equalTo('exists', true);
      actQ.equalTo('grupo', grupo);
      actQ.containedIn('objectId', ids);
      actQ.limit(ids.length);
      const acts = await actQ.find({ useMasterKey: true });
      const byId = new Map(acts.map((a) => [a.id, a]));
      for (const id of ids) {
        const a = byId.get(id);
        if (!a) continue;
        const nombre = String(a.get('nombre') ?? '');
        const tipoBD = String(a.get('tipo') ?? 'actividad');
        const inferred = inferTipoYKey(nombre, tipoBD, labsMap, avancesMap);
        actividades.push({
          id: a.id!,
          nombre,
          tipo: tipoBD,
          semanaPlaneada: Number(a.get('semanaPlaneada') ?? 0),
          orden: Number(a.get('orden') ?? 0),
          congelada: !!a.get('congelada'),
          tipoInferido: inferred.tipoInferido,
          labKey: inferred.labKey,
          avanceKey: inferred.avanceKey,
        });
      }
    }
    periodos.push({
      nombre: String(p.nombre ?? 'Periodo'),
      pesoFinal: Number(p.pesoFinal ?? 0),
      pesoCompetencias: Number(p.pesoCompetencias ?? 0),
      pesoActividades: Number(p.pesoActividades ?? 0),
      acumulativo: !!p.acumulativo,
      actividades,
    });
  }

  return {
    grupoName: String(grupo.get('name') ?? TARGET_GRUPO),
    curso: String(grupo.get('curso') ?? ''),
    nombreCurso: String(grupo.get('nombreCurso') ?? ''),
    periodos,
  };
}

// =====================================================================
// Generación de markdown
// =====================================================================

function titulosDivergentes(bdNombre: string, staticTitulo: string): boolean {
  const a = normalizeForMatch(stripLabPrefix(bdNombre));
  const b = normalizeForMatch(staticTitulo);
  if (!a || !b) return false;
  if (a === b) return false;
  if (a.includes(b) || b.includes(a)) return false;
  return true;
}

function renderActividad(
  index: number,
  act: ActividadHidratada,
  labsMap: Map<string, LabStatic>,
  avancesMap: Map<string, AvanceStatic>,
): string {
  const lines: string[] = [];

  lines.push(`## ${index}. ${tipoEmoji(act.tipoInferido)} ${act.nombre}`);

  const meta: string[] = [
    `**Tipo:** ${act.tipoInferido}`,
    `**Semana planeada:** ${act.semanaPlaneada || 'sin definir'}`,
  ];
  if (act.congelada) meta.push('**Estado:** congelada');
  lines.push(meta.join(' · '));
  lines.push('');

  if (act.labKey && labsMap.has(act.labKey)) {
    const lab = labsMap.get(act.labKey)!;
    lines.push(`> Fuente: \`packages/web/src/data/labs/${lab.id}.ts\` — _${lab.titulo}_`);
    if (titulosDivergentes(act.nombre, lab.titulo)) {
      lines.push(
        `> ⚠️ El título del archivo estático difiere del nombre en BD. Verifica que el contenido siga siendo aplicable.`,
      );
    }
    lines.push('');

    if (lab.preguntas.length > 0) {
      lines.push('### Preguntas de evaluación');
      lab.preguntas.forEach((q, i) => {
        lines.push(`${i + 1}. ${q}`);
      });
      lines.push('');
    } else {
      lines.push('### Preguntas de evaluación');
      lines.push('_Este laboratorio no define preguntas en su archivo estático._');
      lines.push('');
    }

    if (lab.entrega) {
      lines.push('### Entregable');
      lines.push(stripHtml(lab.entrega));
      lines.push('');
    } else {
      lines.push('### Entregable');
      lines.push('_Este laboratorio no define instrucciones de entrega en su archivo estático._');
      lines.push('');
    }
  } else if (act.avanceKey && avancesMap.has(act.avanceKey)) {
    const av = avancesMap.get(act.avanceKey)!;
    lines.push(
      `> Fuente: \`packages/web/src/data/avances/\` — _${av.titulo}_ (numero=${av.numero})`,
    );
    if (titulosDivergentes(act.nombre, av.titulo)) {
      lines.push(
        `> ⚠️ El título del archivo estático difiere del nombre en BD. Verifica que el contenido siga siendo aplicable.`,
      );
    }
    lines.push('');

    if (av.fechaEntrega) lines.push(`**Fecha de entrega:** ${av.fechaEntrega}`);
    const flags: string[] = [];
    if (av.entregaTag) flags.push(`tag git: \`${av.entregaTag}\``);
    if (av.entregaVideo) flags.push('video requerido');
    if (av.entregaCoevaluacion) {
      flags.push(
        av.entregaCoevaluacionUrl
          ? `coevaluación ([rúbrica](${av.entregaCoevaluacionUrl}))`
          : 'coevaluación',
      );
    }
    if (flags.length > 0) {
      lines.push(`**Requisitos:** ${flags.join(' · ')}`);
      lines.push('');
    } else {
      lines.push('');
    }

    lines.push('### Entregable');
    lines.push(av.entregaContenido ? stripHtml(av.entregaContenido) : '_Sin descripción de entrega._');
    lines.push('');
  } else {
    lines.push(
      `_Sin entregable detallado en archivos estáticos. Ver detalle en la página del calendario o pedir al equipo docente._`,
    );
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

function renderPeriodoMd(
  periodoIndex: number,
  periodo: PeriodoSerializable,
  meta: { grupoId: string; grupoName: string; nombreCurso: string; curso: string; generatedAt: string },
  labsMap: Map<string, LabStatic>,
  avancesMap: Map<string, AvanceStatic>,
): string {
  const lines: string[] = [];

  const titulo = `Periodo ${periodoIndex}: ${periodo.nombre}`;
  lines.push(`# Evaluación — ${titulo}`);
  lines.push('');
  lines.push(
    `> Grupo: \`${meta.grupoId}\` · ${meta.grupoName}` +
      (meta.nombreCurso ? ` · ${meta.nombreCurso}` : '') +
      (meta.curso ? ` (${meta.curso})` : ''),
  );
  lines.push(`> Generado: ${meta.generatedAt}`);
  lines.push(
    `> Peso final: ${periodo.pesoFinal}% · Peso competencias: ${periodo.pesoCompetencias}% · Peso actividades: ${periodo.pesoActividades}% · Acumulativo: ${periodo.acumulativo ? 'sí' : 'no'}`,
  );
  lines.push(`> Actividades: ${periodo.actividades.length}`);
  lines.push('');

  if (periodo.actividades.length === 0) {
    lines.push('_Este periodo no tiene actividades registradas en el plan de evaluación._');
    return lines.join('\n');
  }

  lines.push('## Resumen');
  lines.push('');
  lines.push('| # | Tipo | Nombre | Sem. | Entregable |');
  lines.push('|---|------|--------|------|------------|');
  periodo.actividades.forEach((a, i) => {
    const tieneEntregable =
      (a.labKey && labsMap.has(a.labKey)) || (a.avanceKey && avancesMap.has(a.avanceKey))
        ? 'Sí'
        : 'No';
    const nombre = a.nombre.replace(/\|/g, '\\|');
    lines.push(
      `| ${i + 1} | ${tipoEmoji(a.tipoInferido)} ${a.tipoInferido} | ${nombre} | ${a.semanaPlaneada || '-'} | ${tieneEntregable} |`,
    );
  });
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Detalle por actividad');
  lines.push('');
  periodo.actividades.forEach((a, i) => {
    lines.push(renderActividad(i + 1, a, labsMap, avancesMap));
  });

  return lines.join('\n');
}

function renderIndexMd(
  meta: { grupoId: string; grupoName: string; nombreCurso: string; curso: string; generatedAt: string },
  periodos: { archivo: string; titulo: string; nActividades: number; nMapeadas: number }[],
): string {
  const lines: string[] = [];
  lines.push(`# Guía de evaluación — Grupo \`${meta.grupoId}\``);
  lines.push('');
  lines.push(
    `> ${meta.grupoName}` +
      (meta.nombreCurso ? ` · ${meta.nombreCurso}` : '') +
      (meta.curso ? ` (${meta.curso})` : ''),
  );
  lines.push(`> Generado: ${meta.generatedAt}`);
  lines.push('');
  lines.push('Este directorio se autogenera. **No editar a mano.**');
  lines.push('');
  lines.push('## Periodos');
  lines.push('');
  for (const p of periodos) {
    lines.push(
      `- [${p.titulo}](./${p.archivo}) — ${p.nActividades} actividades (${p.nMapeadas} con entregable detallado)`,
    );
  }
  lines.push('');
  lines.push('## Regenerar');
  lines.push('');
  lines.push('Desde la raíz del repo:');
  lines.push('');
  lines.push('```bash');
  lines.push(`cd packages/api && yarn export:evaluacion ${meta.grupoId}`);
  lines.push('```');
  lines.push('');
  lines.push('## Fuente de datos');
  lines.push('');
  lines.push(
    '- **Periodos y lista de actividades:** Parse Server (`PlanEvaluacion`, `ActividadEvaluacionGrupo`).',
  );
  lines.push(
    '- **Preguntas y entregables de labs:** archivos estáticos en `packages/web/src/data/labs/*.ts`.',
  );
  lines.push(
    '- **Entregables de avances:** archivos estáticos en `packages/web/src/data/avances/*.ts`.',
  );
  return lines.join('\n');
}

// =====================================================================
// Main
// =====================================================================

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function clearOldGenerated(): Promise<void> {
  try {
    const files = await fs.readdir(DOCS_DIR);
    for (const f of files) {
      if (f.startsWith('evaluacion-periodo-') && f.endsWith('.md')) {
        await fs.unlink(path.join(DOCS_DIR, f));
      }
    }
  } catch {
    // dir no existe todavía
  }
}

async function main() {
  console.log(`\n=== Exportando guía de evaluación para grupo ${TARGET_GRUPO} ===\n`);

  const data = await fetchData();
  const labsMap = await loadStaticLabs();
  const avancesMap = await loadStaticAvances();

  console.log(`Grupo: ${data.grupoName}`);
  console.log(`Curso: ${data.nombreCurso} (${data.curso})`);
  console.log(`Periodos: ${data.periodos.length}`);
  console.log(`Labs estáticos cargados: ${labsMap.size}`);
  console.log(`Avances estáticos cargados: ${avancesMap.size}`);
  console.log('');

  await ensureDir(DOCS_DIR);
  await clearOldGenerated();

  const generatedAt = new Date().toISOString();
  const meta = {
    grupoId: TARGET_GRUPO,
    grupoName: data.grupoName,
    nombreCurso: data.nombreCurso,
    curso: data.curso,
    generatedAt,
  };

  const indexEntries: { archivo: string; titulo: string; nActividades: number; nMapeadas: number }[] = [];

  for (let i = 0; i < data.periodos.length; i++) {
    const p = data.periodos[i];
    const periodoNum = i + 1;
    const filename = `evaluacion-periodo-${periodoNum}-${slugify(p.nombre)}.md`;
    const md = renderPeriodoMd(periodoNum, p, meta, labsMap, avancesMap);
    await fs.writeFile(path.join(DOCS_DIR, filename), md, 'utf8');
    const nMapeadas = p.actividades.filter((a) => a.labKey || a.avanceKey).length;
    console.log(
      `Periodo ${periodoNum} "${p.nombre}": ${p.actividades.length} actividades (${nMapeadas} con entregable detallado) → ${filename}`,
    );
    indexEntries.push({
      archivo: filename,
      titulo: `Periodo ${periodoNum}: ${p.nombre}`,
      nActividades: p.actividades.length,
      nMapeadas,
    });
  }

  await fs.writeFile(path.join(DOCS_DIR, 'README.md'), renderIndexMd(meta, indexEntries), 'utf8');
  console.log(`\nÍndice escrito en docs/README.md`);
  console.log(`\nDirectorio: ${DOCS_DIR}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  });
