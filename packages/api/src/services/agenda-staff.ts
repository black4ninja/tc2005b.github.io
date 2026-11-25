import { DIAS_SEMANA, type DiaSemana, esDiaValido, normalizarDias } from '../constants/dias.js';
import { ZONA_CURSO } from '../constants/preguntas.js';

/**
 * «Mi agenda»: las sesiones y los días de entrevistas de TODOS los grupos de un
 * profesor o admin en una sola vista, para ver los traslapes entre grupos.
 *
 * Las entrevistas ya guardan instantes absolutos (`DiaEntrevistas.inicio/fin`).
 * Las sesiones no: el calendario sabe qué DÍAS hay clase, pero no a qué hora.
 * La hora sale de la actividad si tiene una propia (`Actividad.horaInicio/
 * horaFin`) y si no de `Grupo.horarioClase`, un horario por día de la semana.
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
  /** Solo entrevistas, y solo en rangos cortos: cómo va ocupado el bloque. */
  huecos?: HuecosEntrevistas;
  /** Solo sesiones: número de la semana del calendario (`?semana=`), para abrirla ahí. */
  semana?: string;
  /** Solo sesiones, y solo en rangos cortos: las actividades del día, como las serializa el calendario. */
  actividades?: Record<string, unknown>[];
  /** Solo sesiones: la actividad con hora propia que es este evento. Ausente = bloque de la clase. */
  actividadId?: string;
  /** Solo sesiones: quién la da. Ausente o vacío = todos (sin asignar). */
  imparten?: { id: string; name: string }[];
}

/** Una cita dentro del bloque de entrevistas, ya en hora de reloj. */
export interface CitaEnBloque {
  inicio: string;
  fin: string;
  alumno: string;
  competencia: string;
}

/**
 * El bloque de entrevistas por dentro. El bloque entero se aparta en la
 * agenda, pero los alumnos no siempre llenan todos los huecos: esto dice cuáles
 * ya están comprometidos y por quién, y cuáles cerró el profesor.
 */
export interface HuecosEntrevistas {
  duracionMin: number;
  total: number;
  citas: CitaEnBloque[];
  /** Inicio (HH:MM) de cada hueco suelto cerrado por el profesor. */
  cerrados: string[];
}

export interface SemanaParaAgenda {
  id: string;
  /** Se guarda como texto (`Semana.setNumero`). */
  numero?: string | number;
  fechaInicio: string;
  diasActivos?: unknown;
}

export interface ActividadParaAgenda {
  id: string;
  semanaId: string;
  dia: string;
  tipo: string;
  titulo: string;
  /** Hora propia (`HH:MM`); sin las dos, la actividad va en el bloque de la clase. */
  horaInicio?: string;
  horaFin?: string;
  /** Ids del staff que la da; vacío = todos. */
  responsables?: string[];
  /** La actividad completa para el detalle; sin ella, la sesión va sin actividades. */
  detalle?: Record<string, unknown>;
}

const conNombres = (ids: string[] | undefined) => (ids ?? []).map((id) => ({ id, name: '' }));

/**
 * Las sesiones de un grupo entre `desde` y `hasta` (incluidos), día activo por
 * día activo de cada semana:
 *
 * - Cada actividad con hora propia es su propio evento (`a-<id>`), con sus
 *   responsables. Así cada quien exporta SUS bloques, no la clase entera.
 * - Las que no tienen hora comparten el bloque de la clase (`s-<semana>-<día>`,
 *   con la hora de `horario`); un día sin actividades también lo tiene. El
 *   bloque es de quien dé alguna de ellas, o de todos si alguna no tiene
 *   responsables. Sin hora de clase ese día, no hay bloque.
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
    const numero = semana.numero !== undefined && semana.numero !== '' ? { semana: String(semana.numero) } : {};
    for (const dia of normalizarDias(semana.diasActivos)) {
      const fecha = sumarDiasFecha(semana.fechaInicio, DIAS_SEMANA.indexOf(dia));
      if (fecha < desde || fecha > hasta) continue;
      const delDia = actividades.filter((a) => a.semanaId === semana.id && a.dia === dia);
      if (delDia.length > 0 && delDia.every((a) => a.tipo === 'asueto')) continue;
      const conClase = delDia.filter((a) => a.tipo !== 'asueto');
      const conHora = conClase.filter((a) => a.horaInicio && a.horaFin);
      const sinHora = conClase.filter((a) => !(a.horaInicio && a.horaFin));

      for (const a of conHora) {
        eventos.push({
          id: `a-${a.id}`,
          actividadId: a.id,
          tipo: 'sesion',
          grupoId,
          fecha,
          inicio: a.horaInicio!,
          fin: a.horaFin!,
          titulo: a.titulo,
          ...numero,
          ...(a.detalle ? { actividades: [a.detalle] } : {}),
          ...(a.responsables?.length ? { imparten: conNombres(a.responsables) } : {}),
        });
      }

      const franja = horario[dia];
      if (!franja || (conClase.length > 0 && sinHora.length === 0)) continue;
      const temas = sinHora.map((a) => a.titulo).filter(Boolean);
      const detalles = sinHora.map((a) => a.detalle).filter((d): d is Record<string, unknown> => !!d);
      const todasAsignadas = sinHora.length > 0 && sinHora.every((a) => (a.responsables?.length ?? 0) > 0);
      const quienes = todasAsignadas ? [...new Set(sinHora.flatMap((a) => a.responsables!))] : [];
      eventos.push({
        id: `s-${semana.id}-${dia}`,
        tipo: 'sesion',
        grupoId,
        fecha,
        inicio: franja.inicio,
        fin: franja.fin,
        titulo: temas.join(' · '),
        ...numero,
        ...(detalles.length > 0 ? { actividades: detalles } : {}),
        ...(quienes.length > 0 ? { imparten: conNombres(quienes) } : {}),
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

/**
 * Los huecos de un día de entrevistas: el bloque se parte en tramos de
 * `duracionSegundos` desde su inicio, igual que en la agenda del grupo. Las
 * citas que caen fuera del bloque (el profesor lo acortó después) se dejan
 * fuera: aquí solo se pinta el bloque.
 */
export function huecosDeEntrevistas(
  inicio: Date,
  fin: Date,
  duracionSegundos: number,
  citas: { inicio: Date; alumno: string; competencia: string }[],
  huecosCerrados: string[],
  zona = ZONA_CURSO,
): HuecosEntrevistas {
  const paso = Math.max(60, duracionSegundos) * 1000;
  const total = Math.max(0, Math.floor((fin.getTime() - inicio.getTime()) / paso));
  const reloj = (t: number) => relojEnZona(new Date(t), zona).hora;
  const dentro = (t: number) => t >= inicio.getTime() && t < fin.getTime();
  return {
    duracionMin: Math.round(paso / 60000),
    total,
    citas: citas
      .filter((c) => dentro(c.inicio.getTime()))
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
      .map((c) => ({
        inicio: reloj(c.inicio.getTime()),
        fin: reloj(c.inicio.getTime() + paso),
        alumno: c.alumno,
        competencia: c.competencia,
      })),
    cerrados: huecosCerrados
      .map((iso) => new Date(iso).getTime())
      .filter((t) => Number.isFinite(t) && dentro(t))
      .sort((a, b) => a - b)
      .map(reloj),
  };
}

const COLOR = /^#[0-9a-f]{6}$/i;

/**
 * Lo que la persona eligió de un grupo: el color de cada tipo y si lo ve.
 * La visibilidad es por TIPO (`verSesiones`, `verEntrevistas`), como los
 * calendarios de Apple: se puede ver las sesiones de un grupo y no sus
 * entrevistas. `oculto` es el interruptor único de la primera versión; se
 * sigue aceptando y vale para los dos tipos mientras no haya uno propio.
 */
export interface PreferenciaGrupoAgenda {
  sesiones?: string;
  entrevistas?: string;
  verSesiones?: boolean;
  verEntrevistas?: boolean;
  /**
   * De las sesiones con responsables asignados, solo las de la persona. Sin
   * elegir, sí: la actividad de otro profesor no es parte de su agenda.
   */
  soloMias?: boolean;
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
    const { sesiones, entrevistas, oculto, verSesiones, verEntrevistas, soloMias } = pref as Record<string, unknown>;
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
    for (const [clave, valor] of [['verSesiones', verSesiones], ['verEntrevistas', verEntrevistas], ['soloMias', soloMias]] as const) {
      if (valor === undefined) continue;
      if (typeof valor !== 'boolean') return 'invalido';
      p[clave] = valor;
    }
    limpio[grupoId] = p;
  }
  return limpio;
}

/**
 * ¿Entra esta sesión en la agenda de la persona? Las que no tienen a nadie
 * asignado, siempre; las asignadas, si le tocan a ella o si eligió ver también
 * las de los demás (`soloMias: false`).
 */
export function sesionParaMi(ev: EventoAgenda, userId: string, pref: PreferenciaGrupoAgenda | undefined): boolean {
  if (ev.tipo !== 'sesion' || !ev.imparten || ev.imparten.length === 0) return true;
  if (pref?.soloMias === false) return true;
  return ev.imparten.some((p) => p.id === userId);
}
