/** Utilidades puras de la agenda de entrevistas. */

const ZONA = 'America/Mexico_City';

/** `9:05` — la hora de un hueco, en la zona del curso. */
export function hora(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: ZONA, hour: 'numeric', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

/** `mié 27 de agosto` — la cabecera de un día. */
export function fechaLarga(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: ZONA, weekday: 'short', day: 'numeric', month: 'long',
  }).format(new Date(iso));
}

/** `mié 27 ago` — la columna de fecha de una lista, donde el mes largo no cabe. */
export function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: ZONA, weekday: 'short', day: 'numeric', month: 'short',
  }).format(new Date(iso));
}

/** `mié 27 ago, 9:05` — para una cita suelta, fuera de su día. */
export function fechaYHora(iso: string): string {
  return `${new Intl.DateTimeFormat('es-MX', {
    timeZone: ZONA, weekday: 'short', day: 'numeric', month: 'short',
  }).format(new Date(iso))}, ${hora(iso)}`;
}

/** `9:00 – 13:00`, el rango de un día. */
export function rangoHoras(inicio: string, fin: string): string {
  return `${hora(inicio)} – ${hora(fin)}`;
}

/**
 * Estado de un hueco para el alumno. Se calcula fuera del componente porque son
 * cuatro condiciones y encadenarlas en el JSX se vuelve ilegible enseguida.
 *
 * `agendableDesde` viene del SERVIDOR ya resuelto: si cada navegador dedujera
 * las 24 horas hábiles por su cuenta, dos alumnos con el reloj distinto verían
 * huecos distintos y uno de los dos se llevaría un rechazo al pulsar.
 */
export type EstadoHueco = 'libre' | 'mio' | 'ocupado' | 'pronto' | 'pasado';

/**
 * Adelanta una marca de tiempo del servidor lo que ha corrido el reloj local.
 *
 * La agenda llega con dos instantes del SERVIDOR —qué hora es y desde cuándo se
 * puede agendar— y se refresca cada minuto. Entre refresco y refresco esos dos
 * valores se quedaban congelados, así que la pantalla seguía enseñando como
 * libre un hueco que el servidor ya había cerrado: el alumno lo pulsaba y le
 * salía un «no se puede» que desde su lado parecía falso.
 *
 * Adelantar aquí lo que ha pasado desde que llegó la respuesta cierra esa
 * ventana sin duplicar la regla —la cuenta de las horas hábiles sigue siendo
 * del servidor— porque entre semana el umbral avanza al mismo ritmo que el
 * reloj: un minuto por minuto.
 */
export function adelantar(iso: string, transcurridoMs: number): string {
  return new Date(new Date(iso).getTime() + Math.max(0, transcurridoMs)).toISOString();
}

export function estadoHueco(
  hueco: { inicio: string; ocupado: boolean; mia: unknown | null },
  agendableDesde: string,
  ahora: string,
): EstadoHueco {
  if (hueco.mia) return 'mio';
  if (hueco.ocupado) return 'ocupado';
  if (new Date(hueco.inicio) < new Date(ahora)) return 'pasado';
  if (new Date(hueco.inicio) < new Date(agendableDesde)) return 'pronto';
  return 'libre';
}

/**
 * Los huecos VACÍOS seguidos se resumen en uno: «10:20 – 10:45 · libre». Un día
 * de cuatro horas son 48 filas y el profesor solo necesita saber dónde tiene un
 * respiro y a qué hora vuelve a empezar.
 */
export function agruparVacios<T extends { inicio: string; cita: unknown | null }>(
  huecos: T[],
  duracionSegundos: number,
): ({ tipo: 'cita'; hueco: T } | { tipo: 'vacio'; desde: string; hasta: string; cuantos: number })[] {
  const filas: ({ tipo: 'cita'; hueco: T } | { tipo: 'vacio'; desde: string; hasta: string; cuantos: number })[] = [];
  let racha: T[] = [];
  const cerrar = () => {
    if (racha.length === 0) return;
    const ultimo = new Date(racha[racha.length - 1].inicio).getTime() + duracionSegundos * 1000;
    filas.push({
      tipo: 'vacio',
      desde: racha[0].inicio,
      hasta: new Date(ultimo).toISOString(),
      cuantos: racha.length,
    });
    racha = [];
  };
  for (const h of huecos) {
    if (h.cita) { cerrar(); filas.push({ tipo: 'cita', hueco: h }); } else racha.push(h);
  }
  cerrar();
  return filas;
}

/* ── Abrir días en lote ───────────────────────────────────────────────── */

/** Un bloque pedido: qué días de la semana y a qué hora. */
export interface BloquePedido {
  /** 0 = domingo … 6 = sábado, como `Date.getDay()`. */
  dias: number[];
  /** `HH:MM` en la zona del profesor, como el alta de un día suelto. */
  desde: string;
  hasta: string;
}

/**
 * Convierte «del 7 al 18, martes y jueves, de 9 a 11» en los instantes que hay
 * que abrir.
 *
 * El calendario se resuelve AQUÍ y no en el servidor: qué fechas caen en martes
 * y a qué instante corresponde «las 9:00» depende de la zona del profesor, y su
 * navegador es quien la sabe. Es la misma cuenta que ya hacía el alta de un día
 * suelto, solo que repetida. Al servidor le llegan instantes absolutos y él
 * decide cuáles entran.
 *
 * Salen en orden cronológico porque así se leen en la vista previa: por fecha,
 * y dentro de cada fecha por hora.
 */
export function expandirBloques(
  desde: string,
  hasta: string,
  bloques: BloquePedido[],
): { inicio: string; fin: string }[] {
  if (!desde || !hasta) return [];
  const primera = new Date(`${desde}T00:00`);
  const ultima = new Date(`${hasta}T00:00`);
  if (Number.isNaN(primera.getTime()) || Number.isNaN(ultima.getTime())) return [];
  if (ultima < primera) return [];

  const salida: { inicio: string; fin: string }[] = [];
  const cursor = new Date(primera);
  // Tope de seguridad: un rango tecleado mal —dos años en vez de dos semanas—
  // no puede colgar el navegador antes de que el servidor lo rechace.
  let vueltas = 0;
  while (cursor <= ultima && vueltas < 400) {
    vueltas += 1;
    const dia = cursor.getDay();
    const fecha = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    for (const bloque of bloques) {
      if (!bloque.dias.includes(dia)) continue;
      const inicio = new Date(`${fecha}T${bloque.desde}`);
      const fin = new Date(`${fecha}T${bloque.hasta}`);
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) continue;
      if (fin <= inicio) continue;
      salida.push({ inicio: inicio.toISOString(), fin: fin.toISOString() });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return salida.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

/** Las iniciales de los días, empezando en lunes: como se leen en español. */
export const DIAS_SEMANA: { dia: number; letra: string; nombre: string }[] = [
  { dia: 1, letra: 'L', nombre: 'lunes' },
  { dia: 2, letra: 'M', nombre: 'martes' },
  { dia: 3, letra: 'X', nombre: 'miércoles' },
  { dia: 4, letra: 'J', nombre: 'jueves' },
  { dia: 5, letra: 'V', nombre: 'viernes' },
  { dia: 6, letra: 'S', nombre: 'sábado' },
  { dia: 0, letra: 'D', nombre: 'domingo' },
];
