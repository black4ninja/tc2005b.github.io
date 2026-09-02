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
