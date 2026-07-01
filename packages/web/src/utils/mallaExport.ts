/**
 * Exportación de la malla de evaluación de un alumno a XLSX con formato,
 * pensada para entregarse como evidencia en auditorías.
 *
 * Usado por GrupoDetailPage (export individual y masivo en ZIP) y
 * MallaEvaluacionPage (export individual). ExcelJS y JSZip se cargan con
 * import dinámico para no engordar el bundle principal.
 */
import type * as ExcelJS from 'exceljs';
import { APP_NAME } from '../config/app';

const API_BASE = '/api';

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

export interface ExportPeriodoConfig {
  nombre: string;
  pesoFinal: number;
  pesoCompetencias: number;
  pesoActividades: number;
  competencias: string[];
  actividades: string[];
  acumulativo: boolean;
}

export interface ExportActividad {
  id: string;
  actividadGrupoId: string;
  nombre: string;
  tipo: string;
  aprendizajePlaneado: number;
  semanaPlaneada: number;
  aprendizajeGanado: number;
  semanaCompletada: number;
  observaciones: string;
}

export interface ExportCompetencia {
  competencia: string;
  nivel: string;
  descripcionNivel: string;
  orden?: number;
  valorPeriodo1: string;
  valorPeriodo2: string;
  retroPeriodo1: string;
  retroPeriodo2: string;
  esCalculada?: boolean;
  fechaIdealEvaluacion: string;
  incipienteB: string;
  incipienteA: string;
  basico: string;
  solido: string;
  destacado: string;
  evidencias: string[];
  competenciaId: string;
}

export interface ExportAlumnoInfo {
  name: string;
  email: string;
  matricula?: string;
}

export interface MallaExportInput {
  alumno: ExportAlumnoInfo;
  grupoNombre: string;
  actividades: ExportActividad[];
  competencias: ExportCompetencia[];
  periodos: ExportPeriodoConfig[];
}

/* ------------------------------------------------------------------ */
/*  Constantes de presentación                                         */
/* ------------------------------------------------------------------ */

const COLORS = {
  title: 'FF1F4E78',
  tableHeader: 'FF4472C4',
  infoBg: 'FFEAF1FA',
  zebra: 'FFF2F6FC',
  border: 'FFB8C2CC',
  totals: 'FFE2EFDA',
  gradeRed: 'FFF4CCCC',
  gradeOrange: 'FFFCE4CD',
  gradeGreen: 'FFD9EAD3',
};

/** Relleno por nivel de evaluación (clave = porcentaje). */
const EVAL_FILLS: Record<string, string> = {
  none: 'FFE7E6E6',
  '0': 'FFF4CCCC',
  '15': 'FFFCE4CD',
  '70': 'FFFFF2CC',
  '85': 'FFD9EAD3',
  '100': 'FFB7D7A8',
};

const NUMBER_TO_LABEL: Record<number, string> = {
  0: 'Incipiente B (0%)',
  15: 'Incipiente A (15%)',
  70: 'Básico (70%)',
  85: 'Sólido (85%)',
  100: 'Destacado (100%)',
};

const TIPO_LABEL: Record<string, string> = {
  lab: 'Lab',
  lectura: 'Lectura',
  ejercicio: 'Ejercicio',
  proyecto: 'Proyecto',
  evaluacion: 'Evaluación',
  break: 'Receso',
  asueto: 'Asueto',
  trabajo: 'Trabajo',
  discusion: 'Discusión',
  info: 'Info',
  actividad: 'Actividad',
};

const THIN = { style: 'thin' as const, color: { argb: COLORS.border } };
const BORDER: Partial<ExcelJS.Borders> = { top: THIN, left: THIN, bottom: THIN, right: THIN };

/* ------------------------------------------------------------------ */
/*  Helpers de datos                                                   */
/* ------------------------------------------------------------------ */

/**
 * Normaliza el valor guardado de una competencia ('85', 85 o 'Sólido (85%)')
 * a una etiqueta legible y su porcentaje.
 */
export function evalDisplay(val: string | number | null | undefined): { label: string; pct: number | null } {
  if (val === null || val === undefined || val === '') return { label: 'Sin evaluar', pct: null };
  if (typeof val === 'number') return { label: NUMBER_TO_LABEL[val] ?? `${val}%`, pct: val };
  const direct = Number(val);
  if (!isNaN(direct) && val.trim() !== '') {
    return { label: NUMBER_TO_LABEL[direct] ?? `${direct}%`, pct: direct };
  }
  const m = val.match(/\((\d+)\s*%\)/);
  return { label: val, pct: m ? Number(m[1]) : null };
}

interface PeriodoResumen {
  nombre: string;
  actScore: number;
  compScore: number;
  periodoScore: number;
  totalPlaneado: number;
  totalGanado: number;
  pesoFinal: number;
  pesoActividades: number;
  pesoCompetencias: number;
  contribucion: number;
}

/** Réplica del cálculo de calificación acumulada de MallaEvaluacionPage. */
function calcResumen(
  periodos: ExportPeriodoConfig[],
  actividades: ExportActividad[],
  competencias: ExportCompetencia[],
): { periodos: PeriodoResumen[]; calificacionActual: number } {
  const res = periodos.map((periodo, periodoIdx) => {
    const ownIds = new Set(periodo.actividades);
    let totalPlaneado = 0;
    let totalGanado = 0;
    for (const act of actividades) {
      if (ownIds.has(act.actividadGrupoId)) {
        totalPlaneado += act.aprendizajePlaneado;
        totalGanado += act.aprendizajeGanado;
      }
    }
    if (periodo.acumulativo && periodoIdx > 0) {
      for (let pi = 0; pi < periodoIdx; pi++) {
        const prevIds = new Set(periodos[pi].actividades);
        for (const act of actividades) {
          if (prevIds.has(act.actividadGrupoId) && !ownIds.has(act.actividadGrupoId)) {
            totalPlaneado += act.aprendizajePlaneado;
            totalGanado += act.aprendizajeGanado;
          }
        }
      }
    }
    const actScore = totalPlaneado > 0 ? (totalGanado / totalPlaneado) * 100 : 0;

    const compIds = new Set(periodo.competencias);
    let compSum = 0;
    let compCount = 0;
    const valorField = periodoIdx === 0 ? 'valorPeriodo1' : 'valorPeriodo2';
    for (const comp of competencias) {
      if (compIds.has(comp.competenciaId)) {
        compSum += evalDisplay(comp[valorField]).pct ?? 0;
        compCount++;
      }
    }
    const compScore = compCount > 0 ? compSum / compCount : 0;
    const periodoScore = (actScore * periodo.pesoActividades + compScore * periodo.pesoCompetencias) / 100;

    return {
      nombre: periodo.nombre || `P${periodoIdx + 1}`,
      actScore,
      compScore,
      periodoScore,
      totalPlaneado,
      totalGanado,
      pesoFinal: periodo.pesoFinal,
      pesoActividades: periodo.pesoActividades,
      pesoCompetencias: periodo.pesoCompetencias,
      contribucion: (periodoScore * periodo.pesoFinal) / 100,
    };
  });
  return { periodos: res, calificacionActual: res.reduce((s, p) => s + p.contribucion, 0) };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function gradeFill(pct: number): string {
  return pct < 50 ? COLORS.gradeRed : pct < 70 ? COLORS.gradeOrange : COLORS.gradeGreen;
}

/* ------------------------------------------------------------------ */
/*  Helpers de estilo                                                  */
/* ------------------------------------------------------------------ */

function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function styleHeaderCell(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  fill(cell, COLORS.tableHeader);
  cell.border = BORDER;
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
}

function styleDataCell(cell: ExcelJS.Cell, zebra: boolean) {
  cell.border = BORDER;
  if (zebra) fill(cell, COLORS.zebra);
  cell.alignment = { vertical: 'top', wrapText: true, ...(cell.alignment ?? {}) };
}

function sectionHeader(ws: ExcelJS.Worksheet, row: number, lastCol: string, text: string) {
  ws.mergeCells(`A${row}:${lastCol}${row}`);
  const cell = ws.getCell(`A${row}`);
  cell.value = text;
  cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  fill(cell, COLORS.tableHeader);
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(row).height = 18;
}

/**
 * Bloque superior común a todas las hojas: título + datos del alumno.
 * Devuelve la siguiente fila libre.
 */
function infoBlock(ws: ExcelJS.Worksheet, input: MallaExportInput, lastCol: string, subtitle: string): number {
  ws.mergeCells(`A1:${lastCol}1`);
  const title = ws.getCell('A1');
  title.value = `MALLA DE EVALUACIÓN — ${subtitle.toUpperCase()}`;
  title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  fill(title, COLORS.title);
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 28;

  const fecha = new Date().toLocaleString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const bold = { bold: true, size: 10 };
  const normal = { size: 10 };
  const infoRows: ExcelJS.CellRichTextValue[] = [
    {
      richText: [
        { text: 'Alumno:  ', font: bold },
        { text: input.alumno.name, font: normal },
        { text: '        Matrícula:  ', font: bold },
        { text: input.alumno.matricula || '—', font: normal },
      ],
    },
    {
      richText: [
        { text: 'Correo:  ', font: bold },
        { text: input.alumno.email, font: normal },
        { text: '        Grupo:  ', font: bold },
        { text: input.grupoNombre || '—', font: normal },
      ],
    },
    {
      richText: [
        { text: 'Exportado:  ', font: bold },
        { text: fecha, font: normal },
      ],
    },
  ];

  let row = 2;
  for (const value of infoRows) {
    ws.mergeCells(`A${row}:${lastCol}${row}`);
    const cell = ws.getCell(`A${row}`);
    cell.value = value;
    fill(cell, COLORS.infoBg);
    cell.alignment = { vertical: 'middle' };
    row++;
  }
  return row + 1; // fila en blanco de separación
}

/* ------------------------------------------------------------------ */
/*  Hojas                                                              */
/* ------------------------------------------------------------------ */

function buildActividadesSheet(wb: ExcelJS.Workbook, input: MallaExportInput) {
  const ws = wb.addWorksheet('Actividades');
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  const widths = [5, 12, 42, 16, 13, 15, 10, 15, 50];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
  const LAST = 'I';

  let r = infoBlock(ws, input, LAST, 'Actividades');

  /* --- Resumen de calificación --- */
  const resumen = calcResumen(input.periodos, input.actividades, input.competencias);
  if (resumen.periodos.length > 0) {
    sectionHeader(ws, r, LAST, 'RESUMEN DE CALIFICACIÓN');
    r++;
    const headers = ['Periodo', 'Actividades %', 'Peso Act.', 'Competencias %', 'Peso Comp.', 'Calif. Periodo', 'Peso Final', 'Contribución'];
    headers.forEach((h, i) => styleHeaderCell(Object.assign(ws.getRow(r).getCell(i + 1), { value: h })));
    r++;
    resumen.periodos.forEach((p, idx) => {
      const vals: (string | number)[] = [
        p.nombre,
        round1(p.actScore),
        `${p.pesoActividades}%`,
        round1(p.compScore),
        `${p.pesoCompetencias}%`,
        round1(p.periodoScore),
        `${p.pesoFinal}%`,
        round1(p.contribucion),
      ];
      const row = ws.getRow(r);
      vals.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v;
        styleDataCell(cell, idx % 2 === 1);
        if (i > 0) cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      fill(row.getCell(6), gradeFill(p.periodoScore));
      r++;
    });
    ws.mergeCells(`A${r}:G${r}`);
    const totLabel = ws.getCell(`A${r}`);
    totLabel.value = 'CALIFICACIÓN ACUMULADA ACTUAL';
    totLabel.font = { bold: true, size: 11 };
    totLabel.alignment = { vertical: 'middle', horizontal: 'right' };
    totLabel.border = BORDER;
    fill(totLabel, COLORS.totals);
    const totVal = ws.getCell(`H${r}`);
    totVal.value = round1(resumen.calificacionActual);
    totVal.font = { bold: true, size: 11 };
    totVal.alignment = { vertical: 'middle', horizontal: 'center' };
    totVal.border = BORDER;
    fill(totVal, gradeFill(resumen.calificacionActual));
    r += 2;
  }

  /* --- Tabla de actividades --- */
  sectionHeader(ws, r, LAST, 'ACTIVIDADES DE EVALUACIÓN');
  r++;
  const headers = ['#', 'Tipo', 'Actividad', 'Aprend. Planeado', 'Sem. Planeada', 'Aprend. Ganado', 'Calif. %', 'Sem. Completada', 'Observaciones'];
  headers.forEach((h, i) => styleHeaderCell(Object.assign(ws.getRow(r).getCell(i + 1), { value: h })));
  r++;

  const actividades = [...input.actividades].sort((a, b) => a.semanaPlaneada - b.semanaPlaneada);
  let sumPlaneado = 0;
  let sumGanado = 0;
  actividades.forEach((act, idx) => {
    const pct = act.aprendizajePlaneado > 0
      ? Math.round((act.aprendizajeGanado / act.aprendizajePlaneado) * 100)
      : 0;
    sumPlaneado += act.aprendizajePlaneado;
    sumGanado += act.aprendizajeGanado;
    const vals: (string | number)[] = [
      idx + 1,
      TIPO_LABEL[act.tipo] ?? act.tipo,
      act.nombre,
      act.aprendizajePlaneado,
      act.semanaPlaneada || '—',
      act.aprendizajeGanado,
      pct,
      act.semanaCompletada || '—',
      act.observaciones || '',
    ];
    const row = ws.getRow(r);
    vals.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      styleDataCell(cell, idx % 2 === 1);
      if (i !== 2 && i !== 8) cell.alignment = { vertical: 'top', horizontal: 'center' };
    });
    const pctCell = row.getCell(7);
    pctCell.numFmt = '0"%"';
    fill(pctCell, gradeFill(pct));
    r++;
  });

  // Totales
  ws.mergeCells(`A${r}:C${r}`);
  const totalsLabel = ws.getCell(`A${r}`);
  totalsLabel.value = 'TOTALES';
  totalsLabel.font = { bold: true };
  totalsLabel.alignment = { vertical: 'middle', horizontal: 'right' };
  const overallPct = sumPlaneado > 0 ? Math.round((sumGanado / sumPlaneado) * 100) : 0;
  const totalVals: Record<number, string | number> = { 4: sumPlaneado, 6: sumGanado, 7: overallPct };
  for (let c = 1; c <= 9; c++) {
    const cell = ws.getRow(r).getCell(c);
    if (totalVals[c] !== undefined) {
      cell.value = totalVals[c];
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (c === 7) cell.numFmt = '0"%"';
    }
    cell.border = BORDER;
    fill(cell, COLORS.totals);
  }
}

function buildCompetenciasSheet(wb: ExcelJS.Workbook, input: MallaExportInput) {
  const ws = wb.addWorksheet('Competencias');
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  const widths = [38, 11, 13, 14, 18, 45, 18, 45, 45];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
  const LAST = 'I';

  let r = infoBlock(ws, input, LAST, 'Competencias');

  /* --- Leyenda de la escala --- */
  sectionHeader(ws, r, LAST, 'ESCALA DE EVALUACIÓN');
  r++;
  ws.mergeCells(`A${r}:${LAST}${r}`);
  const legendNote = ws.getCell(`A${r}`);
  legendNote.value =
    'Cada competencia se evalúa por periodo con la siguiente escala. El porcentaje entre paréntesis es el valor que aporta a la calificación. La hoja "Rúbrica de Niveles" describe qué significa cada nivel para cada competencia.';
  legendNote.font = { italic: true, size: 9 };
  legendNote.alignment = { vertical: 'middle', wrapText: true };
  ws.getRow(r).height = 26;
  r++;
  const legend: [string, string][] = [
    ['Sin evaluar', EVAL_FILLS.none],
    ['Incipiente B (0%)', EVAL_FILLS['0']],
    ['Incipiente A (15%)', EVAL_FILLS['15']],
    ['Básico (70%)', EVAL_FILLS['70']],
    ['Sólido (85%)', EVAL_FILLS['85']],
    ['Destacado (100%)', EVAL_FILLS['100']],
  ];
  legend.forEach(([label, color], i) => {
    const cell = ws.getRow(r).getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, size: 9 };
    fill(cell, color);
    cell.border = BORDER;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  r += 2;

  /* --- Tabla de competencias --- */
  sectionHeader(ws, r, LAST, 'EVALUACIÓN DE COMPETENCIAS');
  r++;
  const headers = ['Competencia', 'Tipo', 'Nivel', 'Fecha Ideal', 'Evaluación P1', 'Retroalimentación P1', 'Evaluación P2', 'Retroalimentación P2', 'Evidencias'];
  headers.forEach((h, i) => styleHeaderCell(Object.assign(ws.getRow(r).getCell(i + 1), { value: h })));
  r++;

  const competencias = [...input.competencias].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  let hayCalculadas = false;
  competencias.forEach((comp, idx) => {
    if (comp.esCalculada) hayCalculadas = true;
    const p1 = evalDisplay(comp.valorPeriodo1);
    const p2 = evalDisplay(comp.valorPeriodo2);
    const vals: (string | number)[] = [
      comp.competencia,
      comp.esCalculada ? 'Calculada *' : 'Directa',
      comp.nivel || '—',
      comp.fechaIdealEvaluacion || '—',
      p1.label,
      comp.retroPeriodo1 || '—',
      p2.label,
      comp.retroPeriodo2 || '—',
      (comp.evidencias ?? []).length > 0 ? comp.evidencias.join('\n') : '—',
    ];
    const row = ws.getRow(r);
    vals.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      styleDataCell(cell, idx % 2 === 1);
      if (i >= 1 && i <= 4 || i === 6) cell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
    });
    fill(row.getCell(5), EVAL_FILLS[String(p1.pct ?? 'none')] ?? EVAL_FILLS.none);
    fill(row.getCell(7), EVAL_FILLS[String(p2.pct ?? 'none')] ?? EVAL_FILLS.none);
    r++;
  });

  if (hayCalculadas) {
    ws.mergeCells(`A${r}:${LAST}${r}`);
    const note = ws.getCell(`A${r}`);
    note.value =
      '* Las competencias marcadas como "Calculada" se obtienen automáticamente como el mínimo de las competencias de las que dependen; no se evalúan de forma directa.';
    note.font = { italic: true, size: 9 };
    note.alignment = { vertical: 'middle', wrapText: true };
    ws.getRow(r).height = 24;
  }
}

function buildRubricaSheet(wb: ExcelJS.Workbook, input: MallaExportInput) {
  const ws = wb.addWorksheet('Rúbrica de Niveles');
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  const widths = [32, 10, 28, 30, 30, 30, 30, 30];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
  const LAST = 'H';

  let r = infoBlock(ws, input, LAST, 'Rúbrica de Niveles');

  sectionHeader(ws, r, LAST, 'DESCRIPCIÓN DE NIVELES POR COMPETENCIA');
  r++;
  const headers: [string, string | null][] = [
    ['Competencia', null],
    ['Nivel', null],
    ['Descripción del Nivel', null],
    ['Incipiente B (0%)', EVAL_FILLS['0']],
    ['Incipiente A (15%)', EVAL_FILLS['15']],
    ['Básico (70%)', EVAL_FILLS['70']],
    ['Sólido (85%)', EVAL_FILLS['85']],
    ['Destacado (100%)', EVAL_FILLS['100']],
  ];
  headers.forEach(([h, color], i) => {
    const cell = ws.getRow(r).getCell(i + 1);
    cell.value = h;
    if (color) {
      // los encabezados de nivel usan el mismo color que las celdas de
      // evaluación para asociarlos visualmente con la otra hoja
      cell.font = { bold: true, size: 10 };
      fill(cell, color);
      cell.border = BORDER;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    } else {
      styleHeaderCell(cell);
    }
  });
  r++;

  const competencias = [...input.competencias].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  competencias.forEach((comp, idx) => {
    const vals = [
      comp.competencia,
      comp.nivel || '—',
      comp.descripcionNivel || '—',
      comp.incipienteB || '—',
      comp.incipienteA || '—',
      comp.basico || '—',
      comp.solido || '—',
      comp.destacado || '—',
    ];
    const row = ws.getRow(r);
    vals.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      styleDataCell(cell, idx % 2 === 1);
      if (i === 1) cell.alignment = { vertical: 'top', horizontal: 'center' };
    });
    r++;
  });
}

/* ------------------------------------------------------------------ */
/*  API pública                                                        */
/* ------------------------------------------------------------------ */

/** Construye el workbook completo y devuelve el buffer .xlsx. */
export async function buildMallaWorkbook(input: MallaExportInput): Promise<ArrayBuffer> {
  const mod: any = await import('exceljs');
  const ExcelJSLib = mod.default ?? mod;
  const wb: ExcelJS.Workbook = new ExcelJSLib.Workbook();
  wb.creator = APP_NAME;
  wb.created = new Date();

  buildActividadesSheet(wb, input);
  buildCompetenciasSheet(wb, input);
  buildRubricaSheet(wb, input);

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export function sanitizeFileName(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^\w\s.-]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'archivo'
  );
}

export function mallaFileName(alumno: ExportAlumnoInfo): string {
  // matricula_nombre_completo en snake_case (minúsculas, sin acentos)
  const parts = [alumno.matricula, alumno.name].filter(Boolean) as string[];
  return `${parts.map((p) => sanitizeFileName(p).toLowerCase()).join('_')}.xlsx`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Construye y descarga el .xlsx de un alumno. */
export async function exportMallaAlumnoXlsx(input: MallaExportInput): Promise<void> {
  const buffer = await buildMallaWorkbook(input);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, mallaFileName(input.alumno));
}

/** Periodos del plan de evaluación del grupo (se consulta una vez por export). */
export async function fetchPlanPeriodos(grupoId: string, sessionToken: string): Promise<ExportPeriodoConfig[]> {
  const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/plan-evaluacion`, {
    headers: { 'x-session-token': sessionToken },
  });
  if (!res.ok) throw new Error('Error al cargar plan de evaluación');
  const json = await res.json();
  return json.plan?.periodos ?? [];
}

/** Malla (actividades) y competencias de un alumno, en paralelo. */
export async function fetchMallaExportData(
  grupoId: string,
  alumnoId: string,
  sessionToken: string,
): Promise<{ actividades: ExportActividad[]; competencias: ExportCompetencia[] }> {
  const headers = { 'x-session-token': sessionToken };
  const [mallaRes, compRes] = await Promise.all([
    fetch(`${API_BASE}/admin/grupos/${grupoId}/alumnos/${alumnoId}/malla`, { headers }),
    fetch(`${API_BASE}/admin/grupos/${grupoId}/alumnos/${alumnoId}/competencias`, { headers }),
  ]);
  if (!mallaRes.ok) throw new Error('Error al cargar malla del alumno');
  if (!compRes.ok) throw new Error('Error al cargar competencias del alumno');
  const [mallaJson, compJson] = await Promise.all([mallaRes.json(), compRes.json()]);
  return {
    actividades: mallaJson.actividades ?? [],
    competencias: compJson.competencias ?? [],
  };
}
