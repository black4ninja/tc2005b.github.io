import { ZONA_CURSO } from '../constants/preguntas.js';
import { relojEnZona, type EventoAgenda, type PreferenciaGrupoAgenda } from './agenda-staff.js';

/**
 * «Mi agenda» como calendario iCalendar (RFC 5545), para suscribirse desde
 * Google Calendar u Outlook con una URL y sin OAuth.
 *
 * Lo que sale aquí lo puede leer cualquiera que tenga la URL, así que NO lleva
 * nombres de alumnos: de cada bloque de entrevistas solo cuántos huecos están
 * ocupados y, de cada cita, la hora y la competencia que se evalúa.
 */

/** Token de la URL del feed: 32 caracteres base64url. */
export const TOKEN_ICS = /^[A-Za-z0-9_-]{32}$/;

/**
 * Una hora de reloj en la zona del curso → instante UTC. Se calcula el
 * desfase con la propia zona (y no con un −6 fijo) por si México vuelve a
 * cambiar de horario: se prueba el instante ingenuo y se corrige por lo que
 * marque el reloj de la zona en ese momento.
 */
export function relojAUtc(fecha: string, hora: string, zona = ZONA_CURSO): Date {
  const [a, m, d] = fecha.split('-').map(Number);
  const [h, min] = hora.split(':').map(Number);
  const deseado = Date.UTC(a, m - 1, d, h, min);
  let t = deseado;
  for (let i = 0; i < 2; i++) {
    const r = relojEnZona(new Date(t), zona);
    const [ra, rm, rd] = r.fecha.split('-').map(Number);
    const [rh, rmin] = r.hora.split(':').map(Number);
    t += deseado - Date.UTC(ra, rm - 1, rd, rh, rmin);
  }
  return new Date(t);
}

/** `20261123T233000Z`. */
function sello(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Texto de una propiedad: barra, punto y coma, coma y saltos de línea escapados. */
export function escaparTexto(t: string): string {
  return t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/**
 * Las líneas no pueden pasar de 75 octetos: se parten y la continuación
 * empieza con un espacio. Se cuenta en bytes UTF-8 y sin partir un carácter.
 */
export function plegar(linea: string): string {
  const enc = new TextEncoder();
  if (enc.encode(linea).length <= 75) return linea;
  const partes: string[] = [];
  let actual = '';
  let bytes = 0;
  for (const ch of linea) {
    const n = enc.encode(ch).length;
    const limite = partes.length === 0 ? 75 : 74;
    if (bytes + n > limite) {
      partes.push(actual);
      actual = '';
      bytes = 0;
    }
    actual += ch;
    bytes += n;
  }
  partes.push(actual);
  return partes.join('\r\n ');
}

/**
 * ¿Se ve este tipo de evento del grupo? Lo mismo que decide la vista: lo que
 * eligió la persona para ese tipo; si no, el interruptor antiguo; y si nada,
 * solo sus grupos.
 */
export function visibleEnAgenda(
  esMio: boolean,
  pref: PreferenciaGrupoAgenda | undefined,
  tipo: EventoAgenda['tipo'],
): boolean {
  const propia = tipo === 'sesion' ? pref?.verSesiones : pref?.verEntrevistas;
  if (propia !== undefined) return propia;
  if (pref?.oculto !== undefined) return !pref.oculto;
  return esMio;
}

interface Opciones {
  eventos: EventoAgenda[];
  nombreGrupo: Map<string, string>;
  /** Base de la web, para el enlace de cada evento (`URL`). */
  base: string;
  ahora?: Date;
}

function descripcion(ev: EventoAgenda): string {
  if (ev.tipo === 'sesion') {
    const lineas = (ev.actividades ?? []).map((a) => {
      const titulo = String(a.titulo ?? '');
      const detalle = a.descripcion ? ` (${String(a.descripcion)})` : '';
      const enlace = a.enlace ? `\n  ${String(a.enlace)}` : '';
      return `• ${titulo}${detalle}${enlace}`;
    });
    return lineas.length > 0 ? lineas.join('\n') : ev.titulo;
  }
  const h = ev.huecos;
  const partes: string[] = [];
  if (ev.titulo) partes.push(ev.titulo);
  if (ev.cerrado) partes.push('Cerrado a reservas.');
  if (h) {
    const abiertos = h.total - h.cerrados.length;
    partes.push(`${h.citas.length} de ${abiertos} lugares ocupados (huecos de ${h.duracionMin} min).`);
    // Solo la hora y la competencia: el nombre del alumno no sale de la plataforma.
    for (const c of h.citas) partes.push(`${c.inicio} · ${c.competencia || 'Entrevista'}`);
  }
  return partes.join('\n');
}

function resumen(ev: EventoAgenda, grupo: string): string {
  if (ev.tipo === 'sesion') return `${grupo} · Sesión`;
  const h = ev.huecos;
  const cuenta = h ? ` (${h.citas.length}/${h.total - h.cerrados.length})` : '';
  return `${grupo} · Entrevistas${cuenta}`;
}

/** El calendario completo, listo para servir como `text/calendar`. */
export function generarIcs({ eventos, nombreGrupo, base, ahora = new Date() }: Opciones): string {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TC2005B//Mi agenda//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Mi agenda (plataforma)',
    `X-WR-TIMEZONE:${ZONA_CURSO}`,
    // Sugerencia de refresco: Google la ignora (refresca cada 8–24 h); Outlook y Apple la usan.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];
  const estampa = sello(ahora);
  for (const ev of eventos) {
    const grupo = nombreGrupo.get(ev.grupoId) ?? '';
    const enlace = ev.tipo === 'sesion'
      ? `${base}/admin/grupos/${ev.grupoId}/calendario${ev.semana ? `?semana=${encodeURIComponent(ev.semana)}` : ''}`
      : `${base}/admin/grupos/${ev.grupoId}/preguntas?dia=${encodeURIComponent(ev.id.replace(/^e-/, ''))}`;
    lineas.push(
      'BEGIN:VEVENT',
      // El id del evento es estable entre refrescos: así el calendario lo
      // actualiza en vez de duplicarlo.
      `UID:${ev.id}@agenda.tc2005b`,
      `DTSTAMP:${estampa}`,
      `DTSTART:${sello(relojAUtc(ev.fecha, ev.inicio))}`,
      `DTEND:${sello(relojAUtc(ev.fecha, ev.fin))}`,
      `SUMMARY:${escaparTexto(resumen(ev, grupo))}`,
      `DESCRIPTION:${escaparTexto(`${descripcion(ev)}\n\nAbrir en la plataforma: ${enlace}`.trim())}`,
      `URL:${enlace}`,
      `CATEGORIES:${ev.tipo === 'sesion' ? 'Sesión' : 'Entrevistas'}`,
      'TRANSP:OPAQUE',
      'END:VEVENT',
    );
  }
  lineas.push('END:VCALENDAR');
  return lineas.map(plegar).join('\r\n') + '\r\n';
}
