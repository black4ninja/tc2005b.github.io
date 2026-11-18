/**
 * Exportación del Happiness Door de un grupo a XLSX: todo su histórico,
 * segmentado por día.
 *
 * Dos hojas:
 *  - «Resumen por día»: cuántas entradas positivas, neutrales y negativas hubo
 *    cada día. Es lo que se mira primero para ver la tendencia del grupo.
 *  - «Entradas»: cada entrada completa, con una banda de título por día.
 *
 * ExcelJS se carga con import dinámico, como en `mallaExport`, para no
 * engordar el bundle principal.
 */
import type * as ExcelJS from 'exceljs';
import { APP_NAME } from '../config/app';
import { downloadBlob, sanitizeFileName } from './mallaExport';
import { ESTADOS_HAPPINESS, fechaLargaDia, horaCurso } from './happiness';
import type { EntradaHappiness, EstadoHappiness } from '../types/happiness';

export interface EntradaExport extends EntradaHappiness {
  autorEmail: string | null;
}

export interface ResumenDia {
  dia: string;
  positivo: number;
  neutral: number;
  negativo: number;
  total: number;
}

/** Agrupa por día, en orden cronológico, y dentro de cada día por hora. */
export function agruparPorDia(entradas: EntradaExport[]): [string, EntradaExport[]][] {
  const mapa = new Map<string, EntradaExport[]>();
  for (const e of entradas) {
    const lista = mapa.get(e.dia) ?? [];
    lista.push(e);
    mapa.set(e.dia, lista);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, lista]) => [dia, [...lista].sort((x, y) => x.createdAt.localeCompare(y.createdAt))]);
}

export function resumenPorDia(entradas: EntradaExport[]): ResumenDia[] {
  return agruparPorDia(entradas).map(([dia, lista]) => {
    const r: ResumenDia = { dia, positivo: 0, neutral: 0, negativo: 0, total: lista.length };
    for (const e of lista) r[e.estado] += 1;
    return r;
  });
}

/* ------------------------------------------------------------------ */
/*  Presentación                                                       */
/* ------------------------------------------------------------------ */

const COLORS = {
  title: 'FF1F4E78',
  tableHeader: 'FF4472C4',
  dayBand: 'FFDDE7F5',
  border: 'FFB8C2CC',
  totals: 'FFE2EFDA',
};

/** Los mismos tres colores del tablero, en ARGB. */
const FILL_ESTADO: Record<EstadoHappiness, string> = {
  positivo: 'FFDCFCE7',
  neutral: 'FFFEF9C3',
  negativo: 'FFFFE4E6',
};

const THIN = { style: 'thin' as const, color: { argb: COLORS.border } };
const BORDER: Partial<ExcelJS.Borders> = { top: THIN, left: THIN, bottom: THIN, right: THIN };

const etiquetaEstado = (e: EstadoHappiness) => ESTADOS_HAPPINESS.find((s) => s.key === e)?.label ?? e;

function solido(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function titulo(ws: ExcelJS.Worksheet, texto: string, subtitulo: string, columnas: number) {
  ws.mergeCells(1, 1, 1, columnas);
  const t = ws.getCell(1, 1);
  t.value = texto;
  t.font = { bold: true, size: 14, color: { argb: COLORS.title } };
  ws.mergeCells(2, 1, 2, columnas);
  const s = ws.getCell(2, 1);
  s.value = subtitulo;
  s.font = { italic: true, size: 10, color: { argb: 'FF595959' } };
}

function cabecera(ws: ExcelJS.Worksheet, fila: number, nombres: string[]) {
  const row = ws.getRow(fila);
  nombres.forEach((n, i) => {
    const c = row.getCell(i + 1);
    c.value = n;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = solido(COLORS.tableHeader);
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = BORDER;
  });
}

function hojaResumen(wb: ExcelJS.Workbook, grupo: string, entradas: EntradaExport[]) {
  const ws = wb.addWorksheet('Resumen por día', { views: [{ state: 'frozen', ySplit: 4 }] });
  const COLS = ['Día', 'Fecha', 'Positivas', 'Neutrales', 'Negativas', 'Total', '% positivas'];
  titulo(ws, `Happiness Door · ${grupo}`, `Resumen por día · exportado el ${new Date().toLocaleString('es-MX')}`, COLS.length);
  cabecera(ws, 4, COLS);
  ws.columns = [{ width: 12 }, { width: 34 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 9 }, { width: 12 }];

  const resumen = resumenPorDia(entradas);
  let fila = 5;
  for (const r of resumen) {
    const row = ws.getRow(fila++);
    row.values = [r.dia, fechaLargaDia(r.dia), r.positivo, r.neutral, r.negativo, r.total, r.total ? r.positivo / r.total : 0];
    row.getCell(3).fill = solido(FILL_ESTADO.positivo);
    row.getCell(4).fill = solido(FILL_ESTADO.neutral);
    row.getCell(5).fill = solido(FILL_ESTADO.negativo);
    row.getCell(7).numFmt = '0%';
    row.eachCell((c) => { c.border = BORDER; });
  }

  if (resumen.length > 0) {
    const t = ws.getRow(fila);
    const sum = (k: 'positivo' | 'neutral' | 'negativo' | 'total') => resumen.reduce((n, r) => n + r[k], 0);
    const total = sum('total');
    t.values = ['Total', `${resumen.length} día(s)`, sum('positivo'), sum('neutral'), sum('negativo'), total, total ? sum('positivo') / total : 0];
    t.getCell(7).numFmt = '0%';
    t.eachCell((c) => { c.font = { bold: true }; c.fill = solido(COLORS.totals); c.border = BORDER; });
  } else {
    ws.getCell(5, 1).value = 'El grupo todavía no tiene entradas.';
  }
}

function hojaEntradas(wb: ExcelJS.Workbook, grupo: string, entradas: EntradaExport[]) {
  const ws = wb.addWorksheet('Entradas', { views: [{ state: 'frozen', ySplit: 4 }] });
  const COLS = ['Día', 'Hora', 'Estado', 'Autor', 'Correo', 'Retroalimentación'];
  titulo(ws, `Happiness Door · ${grupo}`, `Todas las entradas, agrupadas por día · ${entradas.length} en total`, COLS.length);
  cabecera(ws, 4, COLS);
  ws.columns = [{ width: 12 }, { width: 8 }, { width: 11 }, { width: 28 }, { width: 30 }, { width: 80 }];

  let fila = 5;
  for (const [dia, lista] of agruparPorDia(entradas)) {
    // Banda del día: separa los días a simple vista al recorrer la hoja.
    ws.mergeCells(fila, 1, fila, COLS.length);
    const banda = ws.getCell(fila, 1);
    const cuenta = (k: EstadoHappiness) => lista.filter((e) => e.estado === k).length;
    banda.value = `${fechaLargaDia(dia)} — ${lista.length} entrada(s): ${cuenta('positivo')} positivas, ${cuenta('neutral')} neutrales, ${cuenta('negativo')} negativas`;
    banda.font = { bold: true, color: { argb: COLORS.title } };
    banda.fill = solido(COLORS.dayBand);
    fila++;

    for (const e of lista) {
      const row = ws.getRow(fila++);
      row.values = [
        e.dia,
        horaCurso(e.createdAt),
        etiquetaEstado(e.estado),
        e.autor?.name ?? 'Usuario eliminado',
        e.autorEmail ?? '',
        e.texto,
      ];
      row.getCell(3).fill = solido(FILL_ESTADO[e.estado]);
      row.eachCell((c) => {
        c.border = BORDER;
        c.alignment = { vertical: 'top', wrapText: true };
      });
    }
  }
}

export async function buildHappinessWorkbook(grupo: string, entradas: EntradaExport[]): Promise<ArrayBuffer> {
  const mod: any = await import('exceljs');
  const ExcelJSLib = mod.default ?? mod;
  const wb: ExcelJS.Workbook = new ExcelJSLib.Workbook();
  wb.creator = APP_NAME;
  wb.created = new Date();
  hojaResumen(wb, grupo, entradas);
  hojaEntradas(wb, grupo, entradas);
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

/** Pide el histórico del grupo, arma el .xlsx y lo descarga. */
export async function exportarHappinessGrupo(grupoId: string, sessionToken: string): Promise<void> {
  const res = await fetch(`/api/admin/grupos/${grupoId}/happiness/historico`, {
    headers: { 'x-session-token': sessionToken },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || 'No se pudo cargar el histórico');
  const grupo: string = body.grupo?.name ?? 'grupo';
  const buffer = await buildHappinessWorkbook(grupo, body.entradas ?? []);
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const hoy = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `happiness_door_${sanitizeFileName(grupo).toLowerCase()}_${hoy}.xlsx`);
}
