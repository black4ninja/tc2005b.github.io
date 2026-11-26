/**
 * Reglas puras del Happiness Door (sin Parse ni Express, para poder probarlas).
 */
import { DIAS_SEMANA, normalizarDias } from '../constants/dias.js';
import { sumarDiasFecha, type HorarioClase } from './agenda-staff.js';

export const ESTADOS_HAPPINESS = ['positivo', 'neutral', 'negativo'] as const;
export type EstadoHappiness = (typeof ESTADOS_HAPPINESS)[number];

/** Tope del texto: un párrafo largo cabe de sobra; un documento pegado, no. */
export const TEXTO_HAPPINESS_MAX = 5000;

export function esEstadoHappiness(v: unknown): v is EstadoHappiness {
  return typeof v === 'string' && (ESTADOS_HAPPINESS as readonly string[]).includes(v);
}

/** `AAAA-MM-DD` que además es una fecha real (no `2026-02-30`). */
export function esDiaValido(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export type ValidacionEntrada =
  | { ok: true; estado?: EstadoHappiness; texto?: string; dia?: string }
  | { ok: false; error: string };

/**
 * Valida el body de una entrada. Al crear hacen falta estado y texto; al editar
 * basta con un campo, y el que no venga se queda como estaba. `dia` (la sesión
 * que se evalúa) es opcional siempre: aquí solo se mira la forma; si es una
 * sesión del grupo lo decide el controlador, que tiene el calendario.
 */
export function validarEntrada(body: unknown, creando: boolean): ValidacionEntrada {
  const { estado, texto, dia } = (body ?? {}) as Record<string, unknown>;
  const out: { ok: true; estado?: EstadoHappiness; texto?: string; dia?: string } = { ok: true };

  if (dia !== undefined) {
    if (!esDiaValido(dia)) return { ok: false, error: 'La sesión debe ser un día con el formato AAAA-MM-DD' };
    out.dia = dia;
  }

  if (estado !== undefined) {
    if (!esEstadoHappiness(estado)) return { ok: false, error: 'El estado debe ser positivo, neutral o negativo' };
    out.estado = estado;
  } else if (creando) {
    return { ok: false, error: 'Elige cómo te fue: positivo, neutral o negativo' };
  }

  if (texto !== undefined) {
    if (typeof texto !== 'string' || texto.trim() === '') return { ok: false, error: 'Escribe tu retroalimentación' };
    if (texto.length > TEXTO_HAPPINESS_MAX) {
      return { ok: false, error: `La retroalimentación no puede pasar de ${TEXTO_HAPPINESS_MAX} caracteres` };
    }
    out.texto = texto.trim();
  } else if (creando) {
    return { ok: false, error: 'Escribe tu retroalimentación' };
  }

  if (!creando && out.estado === undefined && out.texto === undefined && out.dia === undefined) {
    return { ok: false, error: 'No hay nada que cambiar' };
  }
  return out;
}

/**
 * Una sesión de clase que se puede evaluar en el Happiness Door. La entrada se
 * guarda con el `dia` de la sesión, no con el de cuando se escribe: muchos
 * escriben al día siguiente (o ya entrada la noche) y su entrada caía en la
 * sesión de después.
 */
export interface SesionHappiness {
  /** `AAAA-MM-DD` de la sesión. */
  dia: string;
  semana?: string;
  /** Hora de reloj (zona del curso) a la que empieza; '00:00' si no se sabe. */
  inicio: string;
  /** Títulos de lo que se vio ese día, sin previos ni asuetos. */
  temas: string[];
}

export interface SemanaParaHappiness {
  id: string;
  numero?: string;
  fechaInicio?: string;
  diasActivos?: unknown;
}

export interface ActividadParaHappiness {
  semanaId: string;
  dia: string;
  tipo: string;
  titulo: string;
  isPrevio?: boolean;
  horaInicio?: string;
}

/**
 * Las sesiones del calendario del grupo que ya pueden evaluarse —las de días
 * pasados y la de hoy—, de la más reciente a la más antigua. Un día es sesión
 * si está activo en su semana y no es solo asueto.
 */
export function sesionesEvaluables(
  horario: HorarioClase,
  semanas: SemanaParaHappiness[],
  actividades: ActividadParaHappiness[],
  hoy: string,
): SesionHappiness[] {
  const sesiones: SesionHappiness[] = [];
  for (const semana of semanas) {
    if (!semana.fechaInicio || !/^\d{4}-\d{2}-\d{2}$/.test(semana.fechaInicio)) continue;
    for (const dia of normalizarDias(semana.diasActivos)) {
      const fecha = sumarDiasFecha(semana.fechaInicio, DIAS_SEMANA.indexOf(dia));
      if (fecha > hoy) continue;
      const delDia = actividades.filter((a) => a.semanaId === semana.id && a.dia === dia && !a.isPrevio);
      if (delDia.length > 0 && delDia.every((a) => a.tipo === 'asueto')) continue;
      const clase = delDia.filter((a) => a.tipo !== 'asueto');
      const horas = [horario[dia]?.inicio, ...clase.map((a) => a.horaInicio)].filter((h): h is string => !!h).sort();
      sesiones.push({
        dia: fecha,
        ...(semana.numero ? { semana: String(semana.numero) } : {}),
        inicio: horas[0] ?? '00:00',
        temas: clase.map((a) => a.titulo).filter(Boolean),
      });
    }
  }
  // Un mismo día no se repite aunque dos semanas se encimen por error.
  const unicas = new Map(sesiones.map((s) => [s.dia, s]));
  return [...unicas.values()].sort((a, b) => b.dia.localeCompare(a.dia));
}

/**
 * La sesión que se propone al escribir: la última que ya EMPEZÓ. Quien escribe
 * en la mañana habla de la clase de ayer, no de la de esta tarde. Si ninguna
 * empezó todavía, null.
 */
export function sesionSugerida(sesiones: SesionHappiness[], ahora: { fecha: string; hora: string }): SesionHappiness | null {
  return sesiones.find((s) => s.dia < ahora.fecha || (s.dia === ahora.fecha && s.inicio <= ahora.hora)) ?? null;
}
