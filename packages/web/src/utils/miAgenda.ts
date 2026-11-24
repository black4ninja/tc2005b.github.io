/**
 * «Mi agenda» del staff: utilidades puras de la vista semanal.
 *
 * Los eventos llegan del servidor como hora de RELOJ en la zona del curso
 * (`fecha` + `HH:MM`), no como instantes. Aquí no se convierte ninguna zona:
 * se compara texto con texto, y así lo que choca en el aula choca en pantalla.
 */

import type { Actividad } from '../types/calendario';

export interface EventoAgenda {
  id: string;
  tipo: 'sesion' | 'entrevista';
  grupoId: string;
  fecha: string;
  inicio: string;
  fin: string;
  titulo: string;
  cerrado?: boolean;
  /** Solo entrevistas, en rangos de hasta seis semanas. */
  huecos?: HuecosEntrevistas;
  /** Solo sesiones: número de semana del calendario (`?semana=`). */
  semana?: string;
  /** Solo sesiones, en rangos de hasta seis semanas: las actividades del día. */
  actividades?: Actividad[];
  /** Solo sesiones: quién la imparte. Sin dato = todos (sin asignar). */
  imparten?: { id: string; name: string }[];
}

export interface CitaEnBloque {
  inicio: string;
  fin: string;
  alumno: string;
  competencia: string;
}

/** El bloque de entrevistas por dentro: qué huecos ya están comprometidos. */
export interface HuecosEntrevistas {
  duracionMin: number;
  total: number;
  citas: CitaEnBloque[];
  cerrados: string[];
}

export type TipoEvento = EventoAgenda['tipo'];

export interface GrupoAgenda {
  id: string;
  name: string;
  esMio: boolean;
  conHorario: boolean;
  /** Da clase en la semana pedida pero no tiene horario: sus sesiones no salen. */
  sinHoraConClase?: boolean;
  /** Tiene calendario con semanas (sin dato, se asume que sí). */
  tieneSesiones?: boolean;
  /** Ha abierto alguna vez días de entrevistas (sin dato, se asume que sí). */
  tieneEntrevistas?: boolean;
  /** Alguna sesión del grupo tiene quién imparte asignado. */
  conImparten?: boolean;
}

export interface PreferenciaGrupo {
  sesiones?: string;
  entrevistas?: string;
  verSesiones?: boolean;
  verEntrevistas?: boolean;
  /** De las sesiones asignadas, solo las propias (sin elegir: sí). */
  soloMias?: boolean;
  /** Interruptor único de la primera versión: vale para los dos tipos. */
  oculto?: boolean;
}

export const ZONA_CURSO = 'America/Mexico_City';

/** `'17:30'` → 1050. */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** Fecha `AAAA-MM-DD` más N días, sin pasar por ninguna zona horaria. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** El lunes de la semana de esa fecha. */
export function lunesDe(fecha: string): string {
  const dow = new Date(`${fecha}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, dow === 0 ? -6 : 1 - dow);
}

/** Hoy en el calendario del curso, no en el del navegador. */
export function hoyEnCurso(ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_CURSO, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(ahora);
}

/**
 * Colores por defecto, uno por grupo en el orden en que llegan. Saturados y
 * distintos entre sí; el texto encima se elige con `textoSobre`.
 */
export const PALETA = ['#2563eb', '#0d9488', '#d97706', '#7c3aed', '#db2777', '#16a34a', '#dc2626', '#0891b2'];

/** Mezcla el color con blanco: las entrevistas usan un tono claro del grupo. */
export function aclarar(hex: string, cuanto = 0.55): string {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v: number) => Math.round(v + (255 - v) * cuanto);
  const r = canal((n >> 16) & 255), g = canal((n >> 8) & 255), b = canal(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}

/** Blanco o tinta, lo que más contraste dé sobre ese fondo. */
export function textoSobre(fondo: string): string {
  const L = luminancia(fondo);
  const conBlanco = 1.05 / (L + 0.05);
  const conTinta = (L + 0.05) / (luminancia('#0b1220') + 0.05);
  return conBlanco >= conTinta ? '#ffffff' : '#0b1220';
}

/** Colores efectivos de un grupo: los suyos o los de la paleta. */
export function coloresDe(indice: number, pref: PreferenciaGrupo | undefined): { sesiones: string; entrevistas: string } {
  const base = PALETA[indice % PALETA.length];
  const sesiones = pref?.sesiones ?? base;
  return { sesiones, entrevistas: pref?.entrevistas ?? aclarar(sesiones) };
}

/**
 * ¿Se ven las sesiones (o las entrevistas) del grupo? Lo que haya elegido la
 * persona para ese tipo; si no, lo del interruptor antiguo; y sin elección
 * ninguna, se ven los suyos (`esMio`). Al admin le llegan TODOS los grupos
 * activos y no tiene por qué cargar con los que no administra.
 */
export function grupoVisible(grupo: GrupoAgenda, pref: PreferenciaGrupo | undefined, tipo: TipoEvento): boolean {
  const propia = tipo === 'sesion' ? pref?.verSesiones : pref?.verEntrevistas;
  if (propia !== undefined) return propia;
  if (pref?.oculto !== undefined) return !pref.oculto;
  return grupo.esMio;
}

/**
 * ¿Entra esta sesión en mi agenda? Las que nadie tiene asignadas, siempre; las
 * asignadas, si me tocan o si elegí ver también las de los demás.
 */
export function sesionParaMi(ev: EventoAgenda, userId: string | undefined, pref: PreferenciaGrupo | undefined): boolean {
  if (ev.tipo !== 'sesion' || !ev.imparten || ev.imparten.length === 0) return true;
  if (pref?.soloMias === false) return true;
  return !!userId && ev.imparten.some((p) => p.id === userId);
}

/** «Eduardo López, Alejandro Fernández» → «Eduardo, Alejandro». */
export function nombresCortos(personas: { name: string }[]): string {
  return personas.map((p) => p.name.trim().split(/\s+/)[0]).filter(Boolean).join(', ');
}

// ── Vistas ────────────────────────────────────────────────────────────────

export type Vista = 'dia' | 'semana' | 'mes' | 'anio';

export const VISTAS: { clave: Vista; nombre: string; atajo: string }[] = [
  { clave: 'dia', nombre: 'Día', atajo: 'D' },
  { clave: 'semana', nombre: 'Semana', atajo: 'S' },
  { clave: 'mes', nombre: 'Mes', atajo: 'M' },
  { clave: 'anio', nombre: 'Año', atajo: 'A' },
];

export function esVista(v: unknown): v is Vista {
  return VISTAS.some((x) => x.clave === v);
}

/** Primer día del mes de esa fecha. */
export function inicioDeMes(fecha: string): string {
  return `${fecha.slice(0, 7)}-01`;
}

/** Fecha más N meses, anclada al día 1 (no hay «31 de febrero» que resolver). */
export function sumarMeses(fecha: string, meses: number): string {
  const [a, m] = fecha.split('-').map(Number);
  const total = a * 12 + (m - 1) + meses;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`;
}

/**
 * Las seis semanas que pinta un mes, de lunes a domingo: empieza en el lunes de
 * la semana del día 1, como Google Calendar, para que la rejilla no cambie de
 * alto de un mes a otro.
 */
export function diasDeMes(fecha: string): string[] {
  const inicio = lunesDe(inicioDeMes(fecha));
  return Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
}

/** Los días que hay que pedir al servidor para pintar la vista. */
export function rangoDeVista(vista: Vista, fecha: string): { desde: string; hasta: string } {
  switch (vista) {
    case 'dia':
      return { desde: fecha, hasta: fecha };
    case 'semana': {
      const l = lunesDe(fecha);
      return { desde: l, hasta: sumarDias(l, 6) };
    }
    case 'mes': {
      const dias = diasDeMes(fecha);
      return { desde: dias[0], hasta: dias[41] };
    }
    case 'anio':
      return { desde: `${fecha.slice(0, 4)}-01-01`, hasta: `${fecha.slice(0, 4)}-12-31` };
  }
}

/** La fecha de la vista anterior (−1) o siguiente (+1). */
export function moverVista(vista: Vista, fecha: string, sentido: 1 | -1): string {
  switch (vista) {
    case 'dia':
      return sumarDias(fecha, sentido);
    case 'semana':
      return sumarDias(fecha, 7 * sentido);
    case 'mes':
      return sumarMeses(fecha, sentido);
    case 'anio':
      return `${Number(fecha.slice(0, 4)) + sentido}-01-01`;
  }
}

function seTraslapan(a: EventoAgenda, b: EventoAgenda): boolean {
  return a.fecha === b.fecha && aMinutos(a.inicio) < aMinutos(b.fin) && aMinutos(b.inicio) < aMinutos(a.fin);
}

export interface Traslape {
  a: EventoAgenda;
  b: EventoAgenda;
}

/**
 * Todos los pares de eventos que se pisan. Cuenta también los del MISMO grupo
 * (una sesión y sus entrevistas a la vez): para quien da las dos, es el mismo
 * problema.
 */
export function traslapes(eventos: EventoAgenda[]): Traslape[] {
  const orden = [...eventos].sort((x, y) => (x.fecha + x.inicio).localeCompare(y.fecha + y.inicio));
  const pares: Traslape[] = [];
  for (let i = 0; i < orden.length; i++) {
    for (let j = i + 1; j < orden.length; j++) {
      // Van ordenados por inicio: en cuanto uno empieza después de que acaba
      // el i (o cae otro día), los siguientes tampoco lo pisan.
      if (!seTraslapan(orden[i], orden[j])) break;
      pares.push({ a: orden[i], b: orden[j] });
    }
  }
  return pares;
}

export interface EventoAcomodado {
  evento: EventoAgenda;
  columna: number;
  columnas: number;
}

/**
 * Reparte los eventos de UN día en columnas para que los que se pisan queden
 * lado a lado, como en Google Calendar. Cada grupo de eventos encadenados
 * (que se tocan entre sí) comparte el mismo número de columnas.
 */
export function acomodarDia(eventos: EventoAgenda[]): EventoAcomodado[] {
  const orden = [...eventos].sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio) || aMinutos(b.fin) - aMinutos(a.fin));
  const resultado: EventoAcomodado[] = [];
  let racimo: EventoAcomodado[] = [];
  let finRacimo = -1;
  let finesColumna: number[] = [];

  const cerrarRacimo = () => {
    for (const e of racimo) e.columnas = finesColumna.length;
    resultado.push(...racimo);
    racimo = [];
    finesColumna = [];
  };

  for (const ev of orden) {
    const ini = aMinutos(ev.inicio);
    const fin = aMinutos(ev.fin);
    if (racimo.length > 0 && ini >= finRacimo) cerrarRacimo();
    let col = finesColumna.findIndex((f) => f <= ini);
    if (col === -1) { col = finesColumna.length; finesColumna.push(fin); } else finesColumna[col] = fin;
    racimo.push({ evento: ev, columna: col, columnas: 1 });
    finRacimo = Math.max(racimo.length === 1 ? fin : finRacimo, fin);
  }
  if (racimo.length > 0) cerrarRacimo();
  return resultado;
}

/** Rango de horas a pintar: de 7 a 21 como mínimo, ampliado si algo se sale. */
export function rangoHoras(eventos: EventoAgenda[]): { desde: number; hasta: number } {
  let desde = 7, hasta = 21;
  for (const e of eventos) {
    desde = Math.min(desde, Math.floor(aMinutos(e.inicio) / 60));
    hasta = Math.max(hasta, Math.ceil(aMinutos(e.fin) / 60));
  }
  return { desde, hasta: Math.min(hasta, 24) };
}
