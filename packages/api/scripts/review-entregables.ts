import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
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
  tipoEmoji,
} from './_evaluacion-utils.js';

const execFileP = promisify(execFile);

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
const TARGET_PERIODO_NUM = parseInt(process.argv[3] || '1', 10);

// Deadline: 2026-05-04 00:00 America/Mexico_City (UTC-6 fijo desde 2022)
// = 2026-05-04 06:00:00 UTC
const DEADLINE = new Date('2026-05-04T06:00:00Z');

const REVIEW_DIR = path.join(DOCS_DIR, 'review');
const REPOS_DIR = path.join(REVIEW_DIR, 'repos');

// =====================================================================
// Tipos
// =====================================================================

type AlumnoData = {
  id: string;
  matricula: string;
  name: string;
  email: string;
  repositorioIndividual: string;
};

type MallaEntry = {
  actividadGrupoId: string;
  semanaCompletada: number;
  aprendizajeGanado: number;
  observaciones: string;
};

type CommitInfo = {
  hash: string;
  date: Date;
  message: string;
};

type BranchInfo = {
  name: string;
  lastCommitHash: string;
  lastCommitDate: Date | null;
  lastCommitAuthor: string;
};

type RepoAnalysis = {
  cloned: boolean;
  cloneError?: string;
  branches: BranchInfo[];
  mergeCommitsPreDeadline: CommitInfo[];
  totalCommitsPreDeadline: number;
  lastCommitOverall: CommitInfo | null;
  lastCommitOnMain: CommitInfo | null;
  // path → último commit que la afectó (de cualquier branch)
  pathLastCommit: Map<string, CommitInfo>;
};

type ActivityVerification = {
  actividad: ActividadHidratada;
  claimed: boolean;
  semanaCompletada: number;
  pathsFound: { path: string; lastCommit: CommitInfo | null }[];
  // Para lab3: análisis de ramas/PRs
  ramasYPRs?: {
    extraBranches: string[];
    mergeCommits: CommitInfo[];
    cumpleWorkflow: boolean;
  };
  estado:
    | 'ok'
    | 'ok-lab3-workflow'
    | 'ok-lab3-solo-archivos'
    | 'tarde'
    | 'deshonestidad'
    | 'entregado-sin-claim'
    | 'sin-claim-sin-entrega'
    | 'no-verificable'
    | 'no-repo'
    | 'repo-error';
};

type AlumnoReport = {
  alumno: AlumnoData;
  repo: RepoAnalysis;
  verifications: ActivityVerification[];
  contadores: {
    ok: number;
    tarde: number;
    deshonestidad: number;
    sinClaim: number;
    noVerificable: number;
  };
};

// =====================================================================
// Helpers de git
// =====================================================================

async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileP('git', args, {
    cwd,
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  return stdout;
}

function toSshUrl(httpsUrl: string): string {
  const trimmed = httpsUrl.trim().replace(/\.git$/, '');
  // GitHub
  let m = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/);
  if (m) return `git@github.com:${m[1]}/${m[2]}.git`;
  // Bitbucket
  m = trimmed.match(/^https?:\/\/bitbucket\.org\/([^/]+)\/([^/]+?)\/?$/);
  if (m) return `git@bitbucket.org:${m[1]}/${m[2]}.git`;
  // Si ya viene como SSH o no reconocemos, devolver tal cual (con .git al final si falta)
  if (trimmed.startsWith('git@')) return trimmed.endsWith('.git') ? trimmed : `${trimmed}.git`;
  return httpsUrl;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function cloneOrUpdateRepo(
  url: string,
  destDir: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sshUrl = toSshUrl(url);
  const exists = await pathExists(path.join(destDir, '.git'));
  try {
    if (exists) {
      await git(['fetch', '--all', '--prune', '--quiet'], destDir);
    } else {
      await fs.mkdir(path.dirname(destDir), { recursive: true });
      // Intenta clonar con --no-tags y --quiet para mayor velocidad
      await execFileP('git', ['clone', '--quiet', sshUrl, destDir], {
        maxBuffer: 50 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      });
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Limpiamos directorio parcialmente clonado para que la próxima ejecución reintente
    if (!exists) {
      await fs.rm(destDir, { recursive: true, force: true }).catch(() => {});
    }
    return { ok: false, error: msg.split('\n').slice(0, 3).join(' | ') };
  }
}

async function analyzeRepo(repoDir: string): Promise<RepoAnalysis> {
  const empty: RepoAnalysis = {
    cloned: false,
    branches: [],
    mergeCommitsPreDeadline: [],
    totalCommitsPreDeadline: 0,
    lastCommitOverall: null,
    lastCommitOnMain: null,
    pathLastCommit: new Map(),
  };

  if (!(await pathExists(path.join(repoDir, '.git')))) return empty;

  // Branches remotos (excluir HEAD symbolic)
  let branches: BranchInfo[] = [];
  try {
    const out = await git(
      ['for-each-ref', '--format=%(refname:short)|%(objectname)|%(committerdate:iso-strict)|%(authorname)', 'refs/remotes/'],
      repoDir,
    );
    branches = out
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [name, hash, date, author] = l.split('|');
        return {
          name,
          lastCommitHash: hash,
          lastCommitDate: date ? new Date(date) : null,
          lastCommitAuthor: author ?? '',
        };
      })
      .filter((b) => !b.name.endsWith('/HEAD'));
  } catch {
    // ignore
  }

  // Total commits pre-deadline (any branch, único por hash)
  let totalCommitsPreDeadline = 0;
  let lastCommitOverall: CommitInfo | null = null;
  try {
    const cutoffIso = DEADLINE.toISOString();
    const out = await git(
      [
        'log',
        '--all',
        '--no-merges',
        `--before=${cutoffIso}`,
        '--format=%H|%cI|%s',
      ],
      repoDir,
    );
    const lines = out.split('\n').filter(Boolean);
    totalCommitsPreDeadline = lines.length;
    if (lines.length > 0) {
      const [hash, date, ...rest] = lines[0].split('|');
      lastCommitOverall = { hash, date: new Date(date), message: rest.join('|') };
    }
  } catch {
    // ignore
  }

  // Último commit overall (incluye merges y todos los branches)
  try {
    const out = await git(
      ['log', '--all', '--format=%H|%cI|%s', '-n', '1'],
      repoDir,
    );
    const line = out.split('\n').filter(Boolean)[0];
    if (line) {
      const [hash, date, ...rest] = line.split('|');
      const allLastCommit = { hash, date: new Date(date), message: rest.join('|') };
      // Si no había uno pre-deadline, dejamos lastCommitOverall como el último real
      if (!lastCommitOverall || allLastCommit.date > lastCommitOverall.date) {
        lastCommitOverall = allLastCommit;
      }
    }
  } catch {
    // ignore
  }

  // Último commit en main/master (solo informativo)
  let lastCommitOnMain: CommitInfo | null = null;
  for (const candidate of ['origin/main', 'origin/master', 'main', 'master']) {
    try {
      const out = await git(['log', candidate, '--format=%H|%cI|%s', '-n', '1'], repoDir);
      const line = out.split('\n').filter(Boolean)[0];
      if (line) {
        const [hash, date, ...rest] = line.split('|');
        lastCommitOnMain = { hash, date: new Date(date), message: rest.join('|') };
        break;
      }
    } catch {
      // try next
    }
  }

  // Merge commits pre-deadline
  const mergeCommitsPreDeadline: CommitInfo[] = [];
  try {
    const out = await git(
      [
        'log',
        '--all',
        '--merges',
        `--before=${DEADLINE.toISOString()}`,
        '--format=%H|%cI|%s',
      ],
      repoDir,
    );
    for (const line of out.split('\n').filter(Boolean)) {
      const [hash, date, ...rest] = line.split('|');
      mergeCommitsPreDeadline.push({ hash, date: new Date(date), message: rest.join('|') });
    }
  } catch {
    // ignore
  }

  // Mapa: path → último commit que lo tocó (de cualquier branch, cualquier fecha).
  // No filtramos por deadline aquí para poder distinguir entre "no entregó nunca"
  // (path no aparece) y "entregó tarde" (path aparece pero solo con commits
  // post-deadline). El deadline se aplica luego en classifyActivity.
  const pathLastCommit = new Map<string, CommitInfo>();
  try {
    const out = await git(
      [
        'log',
        '--all',
        '--name-only',
        '--format=__COMMIT__%H|%cI|%s',
      ],
      repoDir,
    );
    let current: CommitInfo | null = null;
    for (const rawLine of out.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith('__COMMIT__')) {
        const rest = line.slice('__COMMIT__'.length);
        const [hash, date, ...msg] = rest.split('|');
        current = { hash, date: new Date(date), message: msg.join('|') };
        continue;
      }
      if (!current) continue;
      // line es un path (relativo a la raíz del repo)
      if (!pathLastCommit.has(line)) {
        pathLastCommit.set(line, current);
      }
    }
  } catch {
    // ignore
  }

  return {
    cloned: true,
    branches,
    mergeCommitsPreDeadline,
    totalCommitsPreDeadline,
    lastCommitOverall,
    lastCommitOnMain,
    pathLastCommit,
  };
}

// =====================================================================
// Detección heurística por actividad
// =====================================================================

// Stopwords en español para descartar al extraer keywords del título
const STOPWORDS = new Set([
  'de', 'la', 'el', 'y', 'a', 'al', 'del', 'los', 'las', 'en', 'con',
  'para', 'por', 'un', 'una', 'unos', 'unas', 'su', 'sus',
]);

function regexForLabNumber(n: number | string): RegExp {
  // (^|[/_\-\s.])lab[ _\-]?0?N(?![0-9])
  return new RegExp(`(^|[/_\\-\\s.])lab[ _\\-]?0?${n}(?![0-9])`, 'i');
}

function specialLabRegex(key: string): RegExp | null {
  switch (key) {
    case 'lab_seguridad':
      return /seguridad|security/i;
    case 'lab_usabilidad':
      return /usabilidad|heur[ií]stica/i;
    case 'lab_screenreaders':
      return /accesibilidad|screen.?reader|a11y/i;
    case 'lab_thinkaloud':
      return /think.?aloud|pensamiento/i;
    case 'lab_phprest':
      return /php.?rest|servicios.web|webservice/i;
  }
  return null;
}

function pathContainsWordOrPrefix(normalizedPath: string, word: string): boolean {
  if (normalizedPath.includes(word)) return true;
  // Prefix match desde length-1 hasta 4. "introduccion" matchea "intro".
  if (word.length >= 5) {
    for (let len = word.length - 1; len >= 4; len--) {
      if (normalizedPath.includes(word.slice(0, len))) return true;
    }
  }
  return false;
}

// Prefijos aceptables que indican que un path es entregable de actividad
// (no archivo aleatorio del proyecto): "lab", "clase", "tarea", "actividad",
// "practica", "proyecto", "ejercicio".
const ACTIVITY_PREFIX_RE = /\b(lab|laboratorio|clase|tarea|actividad|practica|proyecto|ejercicio)\b/;

function matchesByTitle(normalizedPath: string, titulo: string): boolean {
  const normalizedTitle = normalizeForMatch(titulo);
  if (!normalizedTitle) return false;

  // Estrategia A: título completo es substring del path → match aunque no tenga
  // prefijo de actividad (casos como "CSS Avanzado.zip")
  if (normalizedTitle.length >= 5 && normalizedPath.includes(normalizedTitle)) return true;

  // Keywords significativas (≥3 chars, no stopwords)
  const words = normalizedTitle.split(/\s+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  if (words.length === 0) return false;

  let matched = 0;
  for (const w of words) {
    if (pathContainsWordOrPrefix(normalizedPath, w)) matched++;
  }

  // Estrategia B: títulos largos con muchas coincidencias (≥3 palabras) son
  // suficientemente distintivos para no requerir prefijo.
  if (words.length >= 3 && matched >= 3) return true;

  // Estrategia C: títulos cortos requieren prefijo de actividad para evitar
  // que archivos aleatorios (style.css) matcheen labs como CSS.
  if (!ACTIVITY_PREFIX_RE.test(normalizedPath)) return false;

  // Reglas calibradas:
  // - 1-2 palabras: exigir TODAS
  // - 3-4 palabras: exigir ≥2
  // - 5+ palabras: exigir ≥3
  if (words.length <= 2) return matched === words.length;
  if (words.length <= 4) return matched >= 2;
  return matched >= 3;
}

function findActivityArtifacts(
  act: ActividadHidratada,
  repo: RepoAnalysis,
  labsMap: Map<string, LabStatic>,
): { path: string; lastCommit: CommitInfo | null }[] {
  if (act.tipoInferido !== 'lab') return [];

  const labKey = act.labKey;
  const lab = labKey ? labsMap.get(labKey) : undefined;
  const labFilenameNum = labKey?.match(/^lab(\d+)$/)?.[1];
  const numRegex = labFilenameNum ? regexForLabNumber(labFilenameNum) : null;
  const specialRegex = labKey ? specialLabRegex(labKey) : null;
  const bdNumMatch = !labKey ? act.nombre.match(/lab(?:oratorio)?\s*0*(\d+)/i) : null;
  const bdNumRegex = bdNumMatch ? regexForLabNumber(bdNumMatch[1]) : null;

  // Título base para matching: el del archivo estático si existe, si no el
  // nombre BD sin prefijo "Lab N:".
  const tituloBase = lab
    ? lab.titulo
    : act.nombre.replace(/^lab(?:oratorio)?\s*\d*\s*[:.\-]?\s*/i, '');

  const matched = new Map<string, CommitInfo | null>();
  for (const [p, commit] of repo.pathLastCommit) {
    let isMatch = false;
    if (numRegex && numRegex.test(p)) isMatch = true;
    else if (bdNumRegex && bdNumRegex.test(p)) isMatch = true;
    else if (specialRegex && specialRegex.test(p)) isMatch = true;
    else if (tituloBase) {
      const np = normalizeForMatch(p);
      if (matchesByTitle(np, tituloBase)) isMatch = true;
    }
    if (isMatch && !matched.has(p)) matched.set(p, commit);
  }
  return [...matched].map(([p, c]) => ({ path: p, lastCommit: c }));
}

function classifyActivity(
  act: ActividadHidratada,
  malla: MallaEntry | undefined,
  repo: RepoAnalysis,
  alumno: AlumnoData,
  labsMap: Map<string, LabStatic>,
): ActivityVerification {
  const claimed = !!malla && malla.semanaCompletada > 0;
  const semanaCompletada = malla?.semanaCompletada ?? 0;

  // Sin repo registrado → todo lo que el alumno marcó como completado en labs
  // verificables se considera deshonestidad
  if (!alumno.repositorioIndividual) {
    if (act.tipoInferido === 'lab' && claimed) {
      return {
        actividad: act,
        claimed,
        semanaCompletada,
        pathsFound: [],
        estado: 'no-repo',
      };
    }
    return {
      actividad: act,
      claimed,
      semanaCompletada,
      pathsFound: [],
      estado: act.tipoInferido === 'lab' ? 'sin-claim-sin-entrega' : 'no-verificable',
    };
  }

  // Repo no clonable
  if (!repo.cloned) {
    return {
      actividad: act,
      claimed,
      semanaCompletada,
      pathsFound: [],
      estado: 'repo-error',
    };
  }

  // No verificables en repo: lecturas, ejercicios, evaluaciones, actividades, proyectos, avances
  if (act.tipoInferido !== 'lab') {
    return {
      actividad: act,
      claimed,
      semanaCompletada,
      pathsFound: [],
      estado: 'no-verificable',
    };
  }

  // Buscar artefactos en repo
  const pathsFound = findActivityArtifacts(act, repo, labsMap);

  // Verificación específica para Lab 3: ramas + PRs
  // El "lab 3 de git" es lab7.ts en disco (numero=3, titulo "Manejo de ramas").
  // Pero los alumnos lo entregan referenciando "Lab 3" → labKey resolverá según
  // el matching. El criterio: si labKey === 'lab7' (filename con "Manejo de
  // ramas") O si nombre del activity tiene "ramas" o "branches".
  const isLab3 =
    act.labKey === 'lab7' || /\bramas?\b|\bbranches?\b/i.test(act.nombre);

  if (isLab3) {
    const extraBranches = repo.branches
      .filter((b) => !/\/(HEAD|main|master)$/.test(b.name))
      .map((b) => b.name);
    const cumpleWorkflow = extraBranches.length >= 1 && repo.mergeCommitsPreDeadline.length >= 1;

    if (!claimed && pathsFound.length === 0) {
      return {
        actividad: act,
        claimed,
        semanaCompletada,
        pathsFound,
        ramasYPRs: { extraBranches, mergeCommits: repo.mergeCommitsPreDeadline, cumpleWorkflow },
        estado: 'sin-claim-sin-entrega',
      };
    }
    if (pathsFound.length === 0) {
      // Alumno marcó completado pero no hay carpeta lab3 → para lab3 igual
      // verificamos si AL MENOS demostró el workflow de ramas (mergeo cualquier
      // cosa). Si no, deshonestidad.
      if (cumpleWorkflow) {
        return {
          actividad: act,
          claimed,
          semanaCompletada,
          pathsFound,
          ramasYPRs: { extraBranches, mergeCommits: repo.mergeCommitsPreDeadline, cumpleWorkflow },
          estado: 'ok-lab3-solo-archivos',
        };
      }
      return {
        actividad: act,
        claimed,
        semanaCompletada,
        pathsFound,
        ramasYPRs: { extraBranches, mergeCommits: repo.mergeCommitsPreDeadline, cumpleWorkflow },
        estado: 'deshonestidad',
      };
    }
    // pathsFound > 0
    const tieneCommitPreDeadline = pathsFound.some(
      (p) => p.lastCommit && p.lastCommit.date <= DEADLINE,
    );
    if (!tieneCommitPreDeadline) {
      return {
        actividad: act,
        claimed,
        semanaCompletada,
        pathsFound,
        ramasYPRs: { extraBranches, mergeCommits: repo.mergeCommitsPreDeadline, cumpleWorkflow },
        estado: 'tarde',
      };
    }
    return {
      actividad: act,
      claimed: claimed,
      semanaCompletada,
      pathsFound,
      ramasYPRs: { extraBranches, mergeCommits: repo.mergeCommitsPreDeadline, cumpleWorkflow },
      estado: cumpleWorkflow ? 'ok-lab3-workflow' : 'ok-lab3-solo-archivos',
    };
  }

  // Resto de labs
  if (pathsFound.length === 0) {
    if (claimed) {
      return {
        actividad: act,
        claimed,
        semanaCompletada,
        pathsFound,
        estado: 'deshonestidad',
      };
    }
    return {
      actividad: act,
      claimed,
      semanaCompletada,
      pathsFound,
      estado: 'sin-claim-sin-entrega',
    };
  }

  // pathsFound > 0
  const tieneCommitPreDeadline = pathsFound.some(
    (p) => p.lastCommit && p.lastCommit.date <= DEADLINE,
  );
  if (!tieneCommitPreDeadline) {
    return {
      actividad: act,
      claimed,
      semanaCompletada,
      pathsFound,
      estado: 'tarde',
    };
  }
  if (!claimed) {
    return {
      actividad: act,
      claimed,
      semanaCompletada,
      pathsFound,
      estado: 'entregado-sin-claim',
    };
  }
  return {
    actividad: act,
    claimed,
    semanaCompletada,
    pathsFound,
    estado: 'ok',
  };
}

// =====================================================================
// Fetch desde Parse
// =====================================================================

async function fetchAlumnos(grupoPtr: Parse.Object): Promise<AlumnoData[]> {
  const grupoAlumnoQ = new Parse.Query('GrupoAlumno');
  grupoAlumnoQ.equalTo('grupo', grupoPtr);
  grupoAlumnoQ.equalTo('active', true);
  grupoAlumnoQ.equalTo('exists', true);
  grupoAlumnoQ.include('alumno');
  grupoAlumnoQ.limit(500);
  const links = await grupoAlumnoQ.find({ useMasterKey: true });

  const out: AlumnoData[] = [];
  for (const link of links) {
    const alumno = link.get('alumno');
    if (!alumno) continue;
    out.push({
      id: alumno.id!,
      matricula: String(alumno.get('matricula') ?? '').trim() || alumno.id!,
      name: String(alumno.get('name') ?? '').trim() || '(sin nombre)',
      email: String(alumno.get('email') ?? '').trim(),
      repositorioIndividual: String(link.get('repositorioIndividual') ?? '').trim(),
    });
  }
  // Orden determinista por matrícula
  out.sort((a, b) => a.matricula.localeCompare(b.matricula));
  return out;
}

async function fetchPeriodos(grupoPtr: Parse.Object): Promise<PeriodoSerializable[]> {
  const planQ = new Parse.Query('PlanEvaluacion');
  planQ.equalTo('grupo', grupoPtr);
  planQ.equalTo('active', true);
  const plan = await planQ.first({ useMasterKey: true });
  if (!plan) throw new Error('PlanEvaluacion no encontrado');

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
      actQ.equalTo('grupo', grupoPtr);
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
  return periodos;
}

async function fetchMallaAlumno(
  alumnoId: string,
  actividadGrupoIds: string[],
): Promise<Map<string, MallaEntry>> {
  const map = new Map<string, MallaEntry>();
  if (actividadGrupoIds.length === 0) return map;

  const alumnoPtr = Parse.Object.extend('AppUser').createWithoutData(alumnoId);
  const actPtrs = actividadGrupoIds.map((id) =>
    Parse.Object.extend('ActividadEvaluacionGrupo').createWithoutData(id),
  );

  const q = new Parse.Query('ActividadEvaluacionAlumno');
  q.equalTo('alumno', alumnoPtr);
  q.containedIn('actividadGrupo', actPtrs);
  q.limit(actividadGrupoIds.length);
  const records = await q.find({ useMasterKey: true });

  for (const r of records) {
    const actPtr = r.get('actividadGrupo');
    if (!actPtr || !actPtr.id) continue;
    map.set(actPtr.id, {
      actividadGrupoId: actPtr.id,
      semanaCompletada: Number(r.get('semanaCompletada') ?? 0),
      aprendizajeGanado: Number(r.get('aprendizajeGanado') ?? 0),
      observaciones: String(r.get('observaciones') ?? ''),
    });
  }
  return map;
}

// =====================================================================
// Renderizado de markdown
// =====================================================================

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  // Mostrar en hora México para que el deadline sea claro
  return d.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', hour12: false });
}

function estadoLabel(e: ActivityVerification['estado']): string {
  switch (e) {
    case 'ok':
      return '✅ OK';
    case 'ok-lab3-workflow':
      return '✅ OK (ramas + merges)';
    case 'ok-lab3-solo-archivos':
      return '⚠️ Solo archivos (sin ramas/merges)';
    case 'tarde':
      return '⚠️ Tarde (commit post-deadline)';
    case 'deshonestidad':
      return '🚨 DESHONESTIDAD (claimed sin entrega)';
    case 'entregado-sin-claim':
      return '📤 Entregado sin marcar';
    case 'sin-claim-sin-entrega':
      return '⚪ Sin claim ni entrega';
    case 'no-verificable':
      return '➖ No verificable en repo';
    case 'no-repo':
      return '🚨 Sin repo registrado (claimed sin entrega)';
    case 'repo-error':
      return '❌ Repo no clonable';
  }
}

function renderAlumnoMd(
  rep: AlumnoReport,
  meta: { grupoId: string; grupoName: string; periodoNum: number; periodoNombre: string; deadline: string; generatedAt: string },
): string {
  const lines: string[] = [];
  const a = rep.alumno;

  lines.push(`# Review — ${a.matricula} · ${a.name}`);
  lines.push('');
  lines.push(
    `> Grupo: \`${meta.grupoId}\` · ${meta.grupoName} · Periodo ${meta.periodoNum}: ${meta.periodoNombre}`,
  );
  lines.push(`> Email: ${a.email}`);
  lines.push(`> Repo: ${a.repositorioIndividual ? a.repositorioIndividual : '_(no registrado)_'}`);
  lines.push(`> Deadline: ${meta.deadline}`);
  lines.push(`> Generado: ${meta.generatedAt}`);
  lines.push('');

  // Estado del repo
  lines.push('## Estado del repositorio');
  lines.push('');
  if (!a.repositorioIndividual) {
    lines.push('❌ **No tiene URL de repositorio individual registrada en `GrupoAlumno`.**');
    lines.push('');
  } else if (rep.repo.cloneError) {
    lines.push(`❌ **Error al clonar:** \`${rep.repo.cloneError}\``);
    lines.push('');
  } else if (!rep.repo.cloned) {
    lines.push('❌ **Repo no clonado.**');
    lines.push('');
  } else {
    lines.push(`- Commits pre-deadline: **${rep.repo.totalCommitsPreDeadline}**`);
    lines.push(`- Merge commits pre-deadline: **${rep.repo.mergeCommitsPreDeadline.length}**`);
    lines.push(
      `- Último commit overall: ${rep.repo.lastCommitOverall ? `\`${rep.repo.lastCommitOverall.hash.slice(0, 7)}\` · ${fmtDate(rep.repo.lastCommitOverall.date)} · _${rep.repo.lastCommitOverall.message}_` : '—'}`,
    );
    lines.push(
      `- Último commit en main/master: ${rep.repo.lastCommitOnMain ? `\`${rep.repo.lastCommitOnMain.hash.slice(0, 7)}\` · ${fmtDate(rep.repo.lastCommitOnMain.date)}` : '—'}`,
    );
    if (
      rep.repo.lastCommitOverall &&
      rep.repo.lastCommitOnMain &&
      rep.repo.lastCommitOverall.hash !== rep.repo.lastCommitOnMain.hash
    ) {
      lines.push(
        `  - ⚠️ El último commit del repo NO está en main/master. Revisar en qué rama está: \`${rep.repo.lastCommitOverall.hash.slice(0, 7)}\``,
      );
    }
    lines.push('');
    if (rep.repo.branches.length > 0) {
      lines.push('### Branches');
      lines.push('');
      lines.push('| Branch | Último commit | Fecha (MX) | Autor |');
      lines.push('|--------|---------------|------------|-------|');
      for (const b of rep.repo.branches) {
        lines.push(
          `| \`${b.name}\` | \`${b.lastCommitHash.slice(0, 7)}\` | ${fmtDate(b.lastCommitDate)} | ${b.lastCommitAuthor.replace(/\|/g, '\\|')} |`,
        );
      }
      lines.push('');
    }
  }

  // Resumen contadores
  lines.push('## Resumen');
  lines.push('');
  lines.push(`- ✅ OK: **${rep.contadores.ok}**`);
  lines.push(`- ⚠️ Tarde: **${rep.contadores.tarde}**`);
  lines.push(`- 🚨 Deshonestidad: **${rep.contadores.deshonestidad}**`);
  lines.push(`- ➖ No verificable: **${rep.contadores.noVerificable}**`);
  lines.push(`- ⚪ Sin claim ni entrega: **${rep.contadores.sinClaim}**`);
  lines.push('');

  // Tabla de actividades
  lines.push('## Actividades del periodo');
  lines.push('');
  lines.push('| # | Tipo | Actividad | Marcada | Sem. | Entregada en repo | Último commit (MX) | Estado |');
  lines.push('|---|------|-----------|---------|------|-------------------|--------------------|--------|');
  rep.verifications.forEach((v, i) => {
    const nombre = v.actividad.nombre.replace(/\|/g, '\\|');
    const claimed = v.claimed ? `Sí (sem. ${v.semanaCompletada})` : 'No';
    const paths = v.pathsFound.length > 0 ? v.pathsFound.length + ' path(s)' : '—';
    const lastCommit = v.pathsFound
      .map((p) => p.lastCommit?.date ?? null)
      .filter((d): d is Date => !!d)
      .sort((x, y) => y.getTime() - x.getTime())[0];
    const lastCommitStr = lastCommit ? fmtDate(lastCommit) : '—';
    lines.push(
      `| ${i + 1} | ${tipoEmoji(v.actividad.tipoInferido)} ${v.actividad.tipoInferido} | ${nombre} | ${claimed} | ${v.actividad.semanaPlaneada || '-'} | ${paths} | ${lastCommitStr} | ${estadoLabel(v.estado)} |`,
    );
  });
  lines.push('');

  // Detalle por actividad con flag (solo flagged: deshonestidad, tarde, no-repo, lab3 status)
  const flagged = rep.verifications.filter(
    (v) =>
      v.estado === 'deshonestidad' ||
      v.estado === 'tarde' ||
      v.estado === 'no-repo' ||
      v.estado === 'ok-lab3-workflow' ||
      v.estado === 'ok-lab3-solo-archivos' ||
      v.estado === 'entregado-sin-claim',
  );

  if (flagged.length > 0) {
    lines.push('## Detalle de actividades destacadas');
    lines.push('');
    for (const v of flagged) {
      lines.push(`### ${tipoEmoji(v.actividad.tipoInferido)} ${v.actividad.nombre}`);
      lines.push('');
      lines.push(`**Estado:** ${estadoLabel(v.estado)}`);
      lines.push(
        `**Marcada por alumno:** ${v.claimed ? `Sí, semana ${v.semanaCompletada}` : 'No'}`,
      );
      lines.push('');
      if (v.pathsFound.length > 0) {
        lines.push('**Paths encontrados en repo:**');
        for (const p of v.pathsFound.slice(0, 20)) {
          const c = p.lastCommit;
          lines.push(
            `- \`${p.path}\`${c ? ` — último commit \`${c.hash.slice(0, 7)}\` (${fmtDate(c.date)})` : ' — sin commit pre-deadline'}`,
          );
        }
        if (v.pathsFound.length > 20) {
          lines.push(`- _(... y ${v.pathsFound.length - 20} más)_`);
        }
        lines.push('');
      } else {
        lines.push('_No se encontraron archivos relacionados en el repositorio._');
        lines.push('');
      }
      if (v.ramasYPRs) {
        lines.push('**Workflow de ramas (Lab 3):**');
        lines.push(
          `- Branches extras: ${v.ramasYPRs.extraBranches.length === 0 ? '_ninguno_' : v.ramasYPRs.extraBranches.map((b) => `\`${b}\``).join(', ')}`,
        );
        lines.push(`- Merge commits pre-deadline: **${v.ramasYPRs.mergeCommits.length}**`);
        if (v.ramasYPRs.mergeCommits.length > 0) {
          for (const m of v.ramasYPRs.mergeCommits.slice(0, 3)) {
            lines.push(`  - \`${m.hash.slice(0, 7)}\` (${fmtDate(m.date)}) — _${m.message}_`);
          }
        }
        lines.push(
          `- Cumple workflow ramas+PR: **${v.ramasYPRs.cumpleWorkflow ? 'Sí' : 'No'}**`,
        );
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}

function renderConsolidatedMd(
  reports: AlumnoReport[],
  meta: { grupoId: string; grupoName: string; periodoNum: number; periodoNombre: string; deadline: string; generatedAt: string },
): string {
  const lines: string[] = [];
  lines.push(`# Review consolidado — Grupo \`${meta.grupoId}\` · Periodo ${meta.periodoNum}`);
  lines.push('');
  lines.push(`> ${meta.grupoName} · Periodo: ${meta.periodoNombre}`);
  lines.push(`> Deadline: ${meta.deadline}`);
  lines.push(`> Generado: ${meta.generatedAt}`);
  lines.push('');
  lines.push('Este directorio se autogenera. **No editar a mano.**');
  lines.push('');

  const sorted = [...reports].sort(
    (a, b) =>
      b.contadores.deshonestidad - a.contadores.deshonestidad ||
      b.contadores.tarde - a.contadores.tarde ||
      a.alumno.matricula.localeCompare(b.alumno.matricula),
  );

  // Tabla principal
  lines.push('## Resumen general');
  lines.push('');
  lines.push(
    '| Matrícula | Nombre | Repo | Commits pre-DL | 🚨 Deshonest. | ⚠️ Tarde | ✅ OK | ➖ NoVerif | Detalle |',
  );
  lines.push('|-----------|--------|------|----------------|---------------|----------|------|-----------|---------|');
  for (const r of sorted) {
    const repoStatus = !r.alumno.repositorioIndividual
      ? '🚫 sin repo'
      : !r.repo.cloned
        ? '❌ error'
        : '✅';
    lines.push(
      `| \`${r.alumno.matricula}\` | ${r.alumno.name.replace(/\|/g, '\\|')} | ${repoStatus} | ${r.repo.totalCommitsPreDeadline} | ${r.contadores.deshonestidad} | ${r.contadores.tarde} | ${r.contadores.ok} | ${r.contadores.noVerificable} | [→](./${r.alumno.matricula}.md) |`,
    );
  }
  lines.push('');

  // Casos prioritarios de revisión
  const prioritarios = sorted.filter((r) => r.contadores.deshonestidad > 0);
  if (prioritarios.length > 0) {
    lines.push('## 🚨 Casos de revisión prioritaria (posible deshonestidad)');
    lines.push('');
    for (const r of prioritarios) {
      const flags = r.verifications.filter(
        (v) => v.estado === 'deshonestidad' || v.estado === 'no-repo',
      );
      lines.push(`### ${r.alumno.matricula} · ${r.alumno.name}`);
      lines.push('');
      lines.push(`Repo: ${r.alumno.repositorioIndividual || '_(no registrado)_'}`);
      lines.push('');
      for (const v of flags) {
        lines.push(
          `- ${tipoEmoji(v.actividad.tipoInferido)} **${v.actividad.nombre}** — marcada como completada en semana ${v.semanaCompletada}, pero NO se encontró entrega en el repo.`,
        );
      }
      lines.push('');
      lines.push(`[Ver detalle →](./${r.alumno.matricula}.md)`);
      lines.push('');
    }
  }

  // Repo errors
  const errores = sorted.filter(
    (r) => r.repo.cloneError || (!r.repo.cloned && r.alumno.repositorioIndividual),
  );
  if (errores.length > 0) {
    lines.push('## ❌ Repos con error de clonado');
    lines.push('');
    for (const r of errores) {
      lines.push(
        `- \`${r.alumno.matricula}\` ${r.alumno.name} — ${r.alumno.repositorioIndividual} — ${r.repo.cloneError ?? 'unknown'}`,
      );
    }
    lines.push('');
  }

  // Sin repo
  const sinRepo = sorted.filter((r) => !r.alumno.repositorioIndividual);
  if (sinRepo.length > 0) {
    lines.push('## 🚫 Alumnos sin repositorio registrado');
    lines.push('');
    for (const r of sinRepo) {
      lines.push(`- \`${r.alumno.matricula}\` ${r.alumno.name} (${r.alumno.email})`);
    }
    lines.push('');
  }

  lines.push('## Regenerar');
  lines.push('');
  lines.push('```bash');
  lines.push(`cd packages/api && yarn review:periodo ${meta.grupoId} ${meta.periodoNum}`);
  lines.push('```');
  return lines.join('\n');
}

// =====================================================================
// Main
// =====================================================================

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function clearOldReports(): Promise<void> {
  try {
    const files = await fs.readdir(REVIEW_DIR);
    for (const f of files) {
      if (f.endsWith('.md')) {
        await fs.unlink(path.join(REVIEW_DIR, f));
      }
    }
  } catch {
    // dir no existe
  }
}

async function main() {
  console.log(`\n=== Review entregables · grupo ${TARGET_GRUPO} · periodo ${TARGET_PERIODO_NUM} ===`);
  console.log(`Deadline: ${DEADLINE.toISOString()} (= 2026-05-03 23:59:59 America/Mexico_City)\n`);

  const grupoQ = new Parse.Query('Grupo');
  const grupo = await grupoQ.get(TARGET_GRUPO, { useMasterKey: true }).catch(() => null);
  if (!grupo) {
    console.error(`Grupo ${TARGET_GRUPO} no existe`);
    process.exit(1);
  }
  const grupoName = String(grupo.get('name') ?? TARGET_GRUPO);

  const periodos = await fetchPeriodos(grupo);
  if (periodos.length < TARGET_PERIODO_NUM || TARGET_PERIODO_NUM < 1) {
    console.error(`Periodo ${TARGET_PERIODO_NUM} fuera de rango (hay ${periodos.length})`);
    process.exit(1);
  }
  const periodo = periodos[TARGET_PERIODO_NUM - 1];
  const actividadesIds = periodo.actividades.map((a) => a.id);
  console.log(`Periodo: "${periodo.nombre}" con ${periodo.actividades.length} actividades`);

  const alumnos = await fetchAlumnos(grupo);
  console.log(`Alumnos activos: ${alumnos.length}\n`);

  const labsMap = await loadStaticLabs();

  await ensureDir(REVIEW_DIR);
  await ensureDir(REPOS_DIR);
  await clearOldReports();

  const reports: AlumnoReport[] = [];
  const generatedAt = new Date().toISOString();
  const meta = {
    grupoId: TARGET_GRUPO,
    grupoName,
    periodoNum: TARGET_PERIODO_NUM,
    periodoNombre: periodo.nombre,
    deadline: '2026-05-03 23:59:59 América/México_City',
    generatedAt,
  };

  for (let i = 0; i < alumnos.length; i++) {
    const alumno = alumnos[i];
    const progress = `[${i + 1}/${alumnos.length}]`;
    console.log(`${progress} ${alumno.matricula} ${alumno.name}`);

    let repoAnalysis: RepoAnalysis = {
      cloned: false,
      branches: [],
      mergeCommitsPreDeadline: [],
      totalCommitsPreDeadline: 0,
      lastCommitOverall: null,
      lastCommitOnMain: null,
      pathLastCommit: new Map(),
    };

    if (alumno.repositorioIndividual) {
      const dest = path.join(REPOS_DIR, alumno.matricula);
      const cloneRes = await cloneOrUpdateRepo(alumno.repositorioIndividual, dest);
      if (!cloneRes.ok) {
        repoAnalysis.cloneError = cloneRes.error;
        console.log(`  ⚠️  clonado falló: ${cloneRes.error}`);
      } else {
        repoAnalysis = await analyzeRepo(dest);
        console.log(
          `  ✓ ${repoAnalysis.totalCommitsPreDeadline} commits pre-DL · ${repoAnalysis.branches.length} branches · ${repoAnalysis.mergeCommitsPreDeadline.length} merges`,
        );
      }
    } else {
      console.log('  ⚠️  sin repo registrado');
    }

    const malla = await fetchMallaAlumno(alumno.id, actividadesIds);
    const verifications = periodo.actividades.map((act) =>
      classifyActivity(act, malla.get(act.id), repoAnalysis, alumno, labsMap),
    );

    const contadores = {
      ok: verifications.filter((v) =>
        ['ok', 'ok-lab3-workflow', 'ok-lab3-solo-archivos', 'entregado-sin-claim'].includes(v.estado),
      ).length,
      tarde: verifications.filter((v) => v.estado === 'tarde').length,
      deshonestidad: verifications.filter((v) =>
        ['deshonestidad', 'no-repo'].includes(v.estado),
      ).length,
      sinClaim: verifications.filter((v) => v.estado === 'sin-claim-sin-entrega').length,
      noVerificable: verifications.filter((v) => v.estado === 'no-verificable').length,
    };

    reports.push({ alumno, repo: repoAnalysis, verifications, contadores });
  }

  // Escribir MDs
  for (const r of reports) {
    const md = renderAlumnoMd(r, meta);
    await fs.writeFile(path.join(REVIEW_DIR, `${r.alumno.matricula}.md`), md, 'utf8');
  }

  await fs.writeFile(
    path.join(REVIEW_DIR, 'README.md'),
    renderConsolidatedMd(reports, meta),
    'utf8',
  );

  console.log('\n=== Resumen ===');
  const totalDes = reports.reduce((acc, r) => acc + r.contadores.deshonestidad, 0);
  const totalTarde = reports.reduce((acc, r) => acc + r.contadores.tarde, 0);
  const totalOk = reports.reduce((acc, r) => acc + r.contadores.ok, 0);
  console.log(`Alumnos: ${reports.length}`);
  console.log(`🚨 Casos de deshonestidad detectados: ${totalDes}`);
  console.log(`⚠️ Entregas tardías: ${totalTarde}`);
  console.log(`✅ Entregas OK: ${totalOk}`);
  console.log(`\nDirectorio: ${REVIEW_DIR}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  });
