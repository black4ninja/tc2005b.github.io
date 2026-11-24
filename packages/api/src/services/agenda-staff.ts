import { DIAS_SEMANA, type DiaSemana, esDiaValido, normalizarDias } from '../constants/dias.js';
import { ZONA_CURSO } from '../constants/preguntas.js';

/**
 * «Mi agenda»: las sesiones y los días de entrevistas de TODOS los grupos de un
 * profesor o admin en una sola vista, para ver los traslapes entre grupos.
 *
 * Las entrevistas ya guardan instantes absolutos (`DiaEntrevistas.inicio/fin`).
 * Las sesiones no: el calendario sabe qué DÍAS hay clase, pero no a qué hora.
 * La hora sale de `Grupo.horarioClase`, un horario por día de la semana.
 *
 * Todo se devuelve como hora de reloj EN LA ZONA DEL CURSO (`fecha` + `HH:MM`),
 * no como instante: así el navegador no reinterpreta nada y dos eventos que
 * chocan en el aula chocan también en pantalla, sin depender de dónde esté
 * quien mira.
 */

export interface FranjaHoraria {
  inicio: string;
  fin: string;
}

export type HorarioClase = Partial<Record<DiaSemana, FranjaHoraria>>;

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** `'7:30'` → `'07:30'`; algo que no sea una hora → null. */
export function normalizarHora(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const t = valor.trim();
  const corto = /^(\d):([0-5]\d)$/.exec(t);
  const hora = corto ? `0${corto[1]}:${corto[2]}` : t;
  return HORA.test(hora) ? hora : null;
}

/**
 * `horarioClase` del body → horario limpio, o 'invalido' (400).
 *
 * `null` borra el horario entero; un día ausente = ese día no tiene hora (sus
 * sesiones no salen en la agenda). El inicio tiene que ser anterior al fin: una
 * franja vacía o al revés es una errata, no un horario.
 */
export function normalizarHorarioClase(valor: unknown): HorarioClase | 'invalido' {
  if (valor === null) return {};
  if (typeof valor !== 'object' || Array.isArray(valor)) return 'invalido';
  const limpio: HorarioClase = {};
  for (const [dia, franja] of Object.entries(valor as Record<string, unknown>)) {
    if (!esDiaValido(dia)) return 'invalido';
    if (franja === null || franja === undefined) continue;
    if (typeof franja !== 'object') return 'invalido';
    const { inicio, fin } = franja as Record<string, unknown>;
    const i = normalizarHora(inicio);
    const f = normalizarHora(fin);
    if (!i || !f || i >= f) return 'invalido';
    limpio[dia] = { inicio: i, fin: f };
  }
  return limpio;
}

/** Fecha `AAAA-MM-DD` sumándole días, en calendario puro (sin zona). */
export function sumarDiasFecha(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const RELOJ = new Map<string, Intl.DateTimeFormat>();

/** Un instante → su fecha y su hora de reloj en la zona del curso. */
export function relojEnZona(momento: Date, zona = ZONA_CURSO): { fecha: string; hora: string } {
  let f = RELOJ.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    RELOJ.set(zona, f);
  }
  const p = Object.fromEntries(f.formatToParts(momento).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}

export interface EventoAgenda {
  id: string;
  tipo: 'sesion' | 'entrevista';
  grupoId: string;
  fecha: string;
  inicio: string;
  fin: string;
  titulo: string;
  /** Solo entrevistas: el día ya no admite reservas. */
  cerrado?: boolean;
}

export interface SemanaParaAgenda {
  id: string;
  fechaInicio: string;
  diasActivos?: unknown;
}

export interface ActividadParaAgenda {
  semanaId: string;
  dia: string;
  tipo: string;
  titulo: string;
}

/**
 * Las sesiones de un grupo entre `desde` y `hasta` (incluidos), una por día
 * activo de cada semana que tenga hora en el horario.
 *
 * No hay sesión los días cuyo contenido es SOLO un asueto: el calendario los
 * marca activos para poder mostrar el aviso, pero no hay clase.
 */
export function sesionesDelGrupo(
  grupoId: string,
  horario: HorarioClase,
  semanas: SemanaParaAgenda[],
  actividades: ActividadParaAgenda[],
  desde: string,
  hasta: string,
): EventoAgenda[] {
  const eventos: EventoAgenda[] = [];
  for (const semana of semanas) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(semana.fechaInicio ?? '')) continue;
    const dias = normalizarDias(semana.diasActivos);
    for (const dia of dias) {
      const franja = horario[dia];
      if (!franja) continue;
      const fecha = sumarDiasFecha(semana.fechaInicio, DIAS_SEMANA.indexOf(dia));
      if (fecha < desde || fecha > hasta) continue;
      const delDia = actividades.filter((a) => a.semanaId === semana.id && a.dia === dia);
      if (delDia.length > 0 && delDia.every((a) => a.tipo === 'asueto')) continue;
      const temas = delDia.filter((a) => a.tipo !== 'asueto').map((a) => a.titulo).filter(Boolean);
      eventos.push({
        id: `s-${semana.id}-${dia}`,
        tipo: 'sesion',
        grupoId,
        fecha,
        inicio: franja.inicio,
        fin: franja.fin,
        titulo: temas.join(' · '),
      });
    }
  }
  return eventos;
}

/**
 * Un día de entrevistas como evento. Si cruza la medianoche (no debería), se
 * recorta al final del día en que empieza: la vista es por días.
 */
export function eventoDeEntrevistas(
  id: string,
  grupoId: string,
  inicio: Date,
  fin: Date,
  nota: string,
  cerrado: boolean,
  zona = ZONA_CURSO,
): EventoAgenda {
  const a = relojEnZona(inicio, zona);
  const b = relojEnZona(fin, zona);
  return {
    id: `e-${id}`,
    tipo: 'entrevista',
    grupoId,
    fecha: a.fecha,
    inicio: a.hora,
    fin: b.fecha === a.fecha ? b.hora : '23:59',
    titulo: nota,
    cerrado,
  };
}

const COLOR = /^#[0-9a-f]{6}$/i;

export interface PreferenciaGrupoAgenda {
  sesiones?: string;
  entrevistas?: string;
  oculto?: boolean;
}

/**
 * Preferencias de color y visibilidad por grupo → limpias, o 'invalido'.
 * Solo colores `#rrggbb`: es lo que da un `<input type="color">`, y cualquier
 * otra cosa acabaría inyectada en un `style`.
 */
export function normalizarPreferenciasAgenda(
  valor: unknown,
): Record<string, PreferenciaGrupoAgenda> | 'invalido' {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return 'invalido';
  const entradas = Object.entries(valor as Record<string, unknown>);
  if (entradas.length > 200) return 'invalido';
  const limpio: Record<string, PreferenciaGrupoAgenda> = {};
  for (const [grupoId, pref] of entradas) {
    if (!/^[A-Za-z0-9]{1,32}$/.test(grupoId)) return 'invalido';
    if (typeof pref !== 'object' || pref === null || Array.isArray(pref)) return 'invalido';
    const { sesiones, entrevistas, oculto } = pref as Record<string, unknown>;
    const p: PreferenciaGrupoAgenda = {};
    if (sesiones !== undefined) {
      if (typeof sesiones !== 'string' || !COLOR.test(sesiones)) return 'invalido';
      p.sesiones = sesiones.toLowerCase();
    }
    if (entrevistas !== undefined) {
      if (typeof entrevistas !== 'string' || !COLOR.test(entrevistas)) return 'invalido';
      p.entrevistas = entrevistas.toLowerCase();
    }
    if (oculto !== undefined) {
      if (typeof oculto !== 'boolean') return 'invalido';
      if (oculto) p.oculto = true;
    }
    limpio[grupoId] = p;
  }
  return limpio;
}
