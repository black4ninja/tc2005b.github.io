import path from 'path';
import { promises as fs } from 'fs';
import ts from 'typescript';

// =====================================================================
// Paths compartidos
// =====================================================================

export const REPO_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../..',
);
export const LABS_DIR = path.join(REPO_ROOT, 'packages/web/src/data/labs');
export const AVANCES_DIR = path.join(REPO_ROOT, 'packages/web/src/data/avances');
export const DOCS_DIR = path.join(REPO_ROOT, 'docs');

// =====================================================================
// Tipos
// =====================================================================

export type LabStatic = {
  id: string;
  numero: number | null;
  titulo: string;
  preguntas: string[];
  entrega: string;
};

export type AvanceStatic = {
  id: string;
  numero: number;
  titulo: string;
  fechaEntrega: string;
  entregaContenido: string;
  entregaTag: string | null;
  entregaVideo: boolean;
  entregaCoevaluacion: boolean;
  entregaCoevaluacionUrl: string | null;
};

export type TipoInferido =
  | 'lab'
  | 'avance'
  | 'evaluacion'
  | 'ejercicio'
  | 'lectura'
  | 'actividad'
  | 'proyecto';

export type ActividadHidratada = {
  id: string;
  nombre: string;
  tipo: string;
  semanaPlaneada: number;
  orden: number;
  congelada: boolean;
  tipoInferido: TipoInferido;
  labKey?: string;
  avanceKey?: string;
};

export type PeriodoSerializable = {
  nombre: string;
  pesoFinal: number;
  pesoCompetencias: number;
  pesoActividades: number;
  acumulativo: boolean;
  actividades: ActividadHidratada[];
};

// =====================================================================
// Parser AST con TypeScript Compiler API
// =====================================================================

function readObjectLiteral(node: ts.ObjectLiteralExpression): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name =
      prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name))
        ? prop.name.text
        : null;
    if (!name) continue;
    result[name] = readValue(prop.initializer);
  }
  return result;
}

function readValue(node: ts.Expression): unknown {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  ) {
    return -Number(node.operand.text);
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((el) => readValue(el));
  }
  if (ts.isObjectLiteralExpression(node)) {
    return readObjectLiteral(node);
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = readValue(node.left);
    const right = readValue(node.right);
    if (typeof left === 'string' && typeof right === 'string') return left + right;
    return undefined;
  }
  if (ts.isTemplateExpression(node)) {
    let combined = node.head.text;
    for (const span of node.templateSpans) {
      combined += '';
      combined += span.literal.text;
    }
    return combined;
  }
  return undefined;
}

function findExportedDefaultObjectLiteral(
  source: ts.SourceFile,
): ts.ObjectLiteralExpression | null {
  let exportedName: string | null = null;
  for (const stmt of source.statements) {
    if (ts.isExportAssignment(stmt) && ts.isIdentifier(stmt.expression)) {
      exportedName = stmt.expression.text;
      break;
    }
  }
  if (!exportedName) return null;
  for (const stmt of source.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== exportedName) continue;
      if (decl.initializer && ts.isObjectLiteralExpression(decl.initializer)) {
        return decl.initializer;
      }
    }
  }
  return null;
}

async function parseStaticTsFile(filePath: string): Promise<Record<string, unknown> | null> {
  const content = await fs.readFile(filePath, 'utf8');
  const source = ts.createSourceFile(
    path.basename(filePath),
    content,
    ts.ScriptTarget.Latest,
    true,
  );
  const obj = findExportedDefaultObjectLiteral(source);
  if (!obj) return null;
  return readObjectLiteral(obj);
}

// =====================================================================
// Carga de labs/avances estáticos
// =====================================================================

export async function loadStaticLabs(): Promise<Map<string, LabStatic>> {
  // NOTA: lab3.ts y lab7.ts tienen el campo `id` cruzado en los datos fuente
  // (id: 'lab4' y id: 'lab3' respectivamente). Por eso usamos basename del
  // archivo como clave canónica en lugar del campo `id`.
  const map = new Map<string, LabStatic>();
  const files = await fs.readdir(LABS_DIR);
  for (const f of files) {
    if (!f.endsWith('.ts') || f === 'index.ts' || f === 'lab-index.ts') continue;
    const data = await parseStaticTsFile(path.join(LABS_DIR, f));
    if (!data) continue;
    const id = path.basename(f, '.ts');
    const numero = typeof data.numero === 'number' ? data.numero : null;
    const titulo = String(data.titulo ?? id);
    const preguntas = Array.isArray(data.preguntas)
      ? (data.preguntas as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
    const entrega = typeof data.entrega === 'string' ? data.entrega : '';
    map.set(id, { id, numero, titulo, preguntas, entrega });
  }
  return map;
}

export async function loadStaticAvances(): Promise<Map<string, AvanceStatic>> {
  // NOTA: La numeración del campo `numero` en av*.ts NO coincide con el
  // sufijo del filename. El BD referencia avances por su número de plan,
  // por eso indexamos por `av${numero}`.
  const map = new Map<string, AvanceStatic>();
  const files = await fs.readdir(AVANCES_DIR);
  for (const f of files) {
    if (!f.endsWith('.ts') || f === 'index.ts') continue;
    const data = await parseStaticTsFile(path.join(AVANCES_DIR, f));
    if (!data) continue;
    const numeroVal = typeof data.numero === 'number' ? data.numero : NaN;
    if (!Number.isFinite(numeroVal)) continue;
    const id = `av${numeroVal}`;
    const numero = numeroVal;
    const titulo = String(data.titulo ?? id);
    const fechaEntrega = String(data.fechaEntrega ?? '');
    const entregaObj = (data.entrega as Record<string, unknown> | undefined) ?? {};
    map.set(id, {
      id,
      numero,
      titulo,
      fechaEntrega,
      entregaContenido: typeof entregaObj.contenido === 'string' ? entregaObj.contenido : '',
      entregaTag: typeof entregaObj.tag === 'string' ? entregaObj.tag : null,
      entregaVideo: !!entregaObj.video,
      entregaCoevaluacion: !!entregaObj.coevaluacion,
      entregaCoevaluacionUrl:
        typeof entregaObj.coevaluacionUrl === 'string' ? entregaObj.coevaluacionUrl : null,
    });
  }
  return map;
}

// =====================================================================
// Normalización y matching de nombres
// =====================================================================

export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripLabPrefix(nombre: string): string {
  return nombre.replace(/^lab(?:oratorio)?\s*\d*\s*[:.\-]?\s*/i, '').trim();
}

const SPECIAL_LAB_KEYWORDS: { keyword: RegExp; key: string }[] = [
  { keyword: /screen\s*reader|lectores?\s+de\s+pantalla|accesibilidad/i, key: 'lab_screenreaders' },
  { keyword: /think\s*aloud|pensamiento\s+en\s+voz/i, key: 'lab_thinkaloud' },
  { keyword: /heur[ií]stica|usabilidad/i, key: 'lab_usabilidad' },
  { keyword: /taller\s+de\s+seguridad|\bseguridad\b/i, key: 'lab_seguridad' },
  { keyword: /servicios?\s+web\s+rest|\bphp\b/i, key: 'lab_phprest' },
];

export function fuzzyAvanceTitleMatch(
  nombreBD: string,
  avancesMap: Map<string, AvanceStatic>,
): string | undefined {
  const stripped = normalizeForMatch(
    nombreBD.replace(/^avance(?:\s+de\s+proyecto)?\s*\d*\s*[:.\-]?\s*/i, ''),
  );
  if (!stripped) return undefined;

  let bestKey: string | undefined;
  let bestLen = 0;
  for (const [key, av] of avancesMap) {
    const t = normalizeForMatch(av.titulo);
    if (!t) continue;
    if (t === stripped) return key;
    let overlapLen = 0;
    if (stripped.startsWith(t)) overlapLen = t.length;
    else if (t.startsWith(stripped)) overlapLen = stripped.length;
    else if (stripped.includes(t)) overlapLen = t.length;
    else if (t.includes(stripped)) overlapLen = stripped.length;
    if (overlapLen >= 8 && overlapLen > bestLen) {
      const minLen = Math.min(stripped.length, t.length);
      if (overlapLen / minLen >= 0.6) {
        bestLen = overlapLen;
        bestKey = key;
      }
    }
  }
  return bestKey;
}

export function fuzzyLabTitleMatch(
  nombreBD: string,
  labsMap: Map<string, LabStatic>,
): string | undefined {
  const stripped = normalizeForMatch(stripLabPrefix(nombreBD));
  if (!stripped) return undefined;

  let bestKey: string | undefined;
  let bestLen = 0;
  for (const [key, lab] of labsMap) {
    const labTitle = normalizeForMatch(lab.titulo);
    if (!labTitle) continue;
    if (labTitle === stripped) return key;
    let overlapLen = 0;
    if (stripped.startsWith(labTitle)) overlapLen = labTitle.length;
    else if (labTitle.startsWith(stripped)) overlapLen = stripped.length;
    else if (stripped.includes(labTitle)) overlapLen = labTitle.length;
    else if (labTitle.includes(stripped)) overlapLen = stripped.length;
    if (overlapLen >= 6 && overlapLen > bestLen) {
      const minLen = Math.min(stripped.length, labTitle.length);
      if (overlapLen / minLen >= 0.6) {
        bestLen = overlapLen;
        bestKey = key;
      }
    }
  }
  return bestKey;
}

export function inferTipoYKey(
  nombre: string,
  tipoBD: string,
  labsMap: Map<string, LabStatic>,
  avancesMap: Map<string, AvanceStatic>,
): {
  tipoInferido: TipoInferido;
  labKey?: string;
  avanceKey?: string;
} {
  const n = nombre.trim();

  const avMatch =
    n.match(/avance(?:\s+de\s+proyecto)?\s*0*(\d+)/i) ?? n.match(/^av\s*0*(\d+)/i);
  if (avMatch) {
    const avanceKey = fuzzyAvanceTitleMatch(n, avancesMap);
    return { tipoInferido: 'avance', avanceKey };
  }

  const labMatch = n.match(/lab(?:oratorio)?\s*0*(\d+)/i);
  if (labMatch) {
    const num = parseInt(labMatch[1], 10);
    const key = `lab${num}`;
    if (labsMap.has(key)) return { tipoInferido: 'lab', labKey: key };
    const fuzzy = fuzzyLabTitleMatch(n, labsMap);
    return { tipoInferido: 'lab', labKey: fuzzy };
  }

  if (/^lab(?:oratorio)?\b/i.test(n)) {
    for (const { keyword, key } of SPECIAL_LAB_KEYWORDS) {
      if (keyword.test(n) && labsMap.has(key)) {
        return { tipoInferido: 'lab', labKey: key };
      }
    }
    const fuzzy = fuzzyLabTitleMatch(n, labsMap);
    return { tipoInferido: 'lab', labKey: fuzzy };
  }

  for (const { keyword, key } of SPECIAL_LAB_KEYWORDS) {
    if (keyword.test(n) && labsMap.has(key)) {
      return { tipoInferido: 'lab', labKey: key };
    }
  }

  if (/evaluaci[oó]n|examen|parcial|quiz/i.test(n)) return { tipoInferido: 'evaluacion' };
  if (/ejercicio/i.test(n)) return { tipoInferido: 'ejercicio' };
  if (/lectura/i.test(n)) return { tipoInferido: 'lectura' };
  if (/proyecto|entrevistas?|presentaci[oó]n\s+final/i.test(n)) {
    return { tipoInferido: 'proyecto' };
  }

  if (tipoBD === 'lab') return { tipoInferido: 'lab' };
  return { tipoInferido: 'actividad' };
}

// =====================================================================
// Helpers de string
// =====================================================================

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function tipoEmoji(tipo: TipoInferido): string {
  switch (tipo) {
    case 'lab':
      return '🧪';
    case 'avance':
      return '🚀';
    case 'evaluacion':
      return '✅';
    case 'ejercicio':
      return '✏️';
    case 'lectura':
      return '📖';
    case 'proyecto':
      return '⭐';
    default:
      return '📌';
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
