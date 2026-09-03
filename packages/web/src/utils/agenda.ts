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

/**
 * `lunes, 7 de sep` — el día con su nombre entero.
 *
 * Para elegir día en una tira: «lun» abreviado se lee como un código y hay que
 * traducirlo mentalmente, y lo que el profesor tiene en la cabeza es «el
 * martes», no «el 8».
 */
export function fechaConDia(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'short',
  }).format(new Date(iso));
}

/** `2026-09-07` — la fecha del calendario del curso, para agrupar por día. */
export function claveFecha(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
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
 * Qué día de la agenda enseñar sin que se lo pidan: el más próximo que no haya
 * TERMINADO.
 *
 * Manda la hora y no la fecha. Un día de 9 a 11 a las diez de la noche ya pasó,
 * aunque siga siendo hoy, y lo que el profesor quiere ver entonces es el
 * siguiente. Si ya terminaron todos, el último: es donde están las entrevistas
 * que acaba de hacer, y una agenda en blanco no dice nada.
 */
export function diaMasProximo<T extends { id: string; inicio: string; fin: string }>(
  dias: T[],
  ahora: Date = new Date(),
): string | null {
  if (dias.length === 0) return null;
  const enOrden = [...dias].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const vivo = enOrden.find((d) => new Date(d.fin).getTime() >= ahora.getTime());
  return (vivo ?? enOrden[enOrden.length - 1]).id;
}

/**
 * Si esa hora sirve para otro intento de una competencia en la que el alumno ya
 * tiene estas otras.
 *
 * Espeja la regla del servidor (`puedeSerOtroIntento`), que es quien decide:
 * aquí solo sirve para no ofrecerle un botón que le va a decir que no. Tiene que
 * caer en un día POSTERIOR a todas —el mismo día son la misma entrevista
 * repetida, y antes convertiría al «segundo» intento en el que pasa primero—.
 */
export function puedeSerOtroIntento(previas: string[], candidato: string): boolean {
  const dia = claveFecha(candidato);
  return previas.every((p) => claveFecha(p) < dia);
}

/**
 * Cuándo se da por HECHO un intento: cuando tuvo cita y su hueco ya terminó.
 *
 * No basta con que exista la cita ni con que sea de hoy. El módulo se usa para
 * enseñarle al alumno su pregunta y darle la retroalimentación, y una pregunta
 * de una entrevista que todavía no ha pasado es una pregunta que se le está
 * adelantando: si tiene el primer intento el 2 y el segundo el 4, el día 3 solo
 * puede ver la del 2.
 *
 * Sin cita no está hecho —no hay nada que haya pasado—, y mientras el hueco
 * corre tampoco: se declara terminado cuando se cierra la hora que le tocaba.
 */
export function intentoTerminado(
  cita: { inicio: string; duracionSegundos: number } | null | undefined,
  ahora: Date,
): boolean {
  if (!cita) return false;
  const fin = new Date(cita.inicio).getTime() + cita.duracionSegundos * 1000;
  return Number.isFinite(fin) && ahora.getTime() >= fin;
}

/* ── Abrir días en lote ───────────────────────────────────────────────── */

/** Un horario pedido: en qué fechas y de qué hora a qué hora. */
export interface BloqueFechas {
  /** `yyyy-mm-dd`, las que el profesor picó en el calendario. */
  fechas: string[];
  /** `HH:MM` en la zona del profesor, como el alta de un día suelto. */
  desde: string;
  hasta: string;
}

/**
 * Convierte «el 7, el 8 y el 9, de 9 a 11» en los instantes que hay que abrir.
 *
 * Antes esto era un rango de fechas cruzado con los días de la semana —«del 7 al
 * 18, martes y jueves»—, y el profesor tenía que traducir mentalmente las fechas
 * que quería a una regla que las produjera. Se pican y ya.
 *
 * El calendario se resuelve AQUÍ y no en el servidor: a qué instante corresponde
 * «las 9:00» depende de la zona del profesor, y su navegador es quien la sabe.
 * Al servidor le llegan instantes absolutos y él decide cuáles entran.
 *
 * Salen en orden cronológico porque así se leen en la vista previa.
 */
export function expandirFechas(bloques: BloqueFechas[]): { inicio: string; fin: string }[] {
  const salida: { inicio: string; fin: string }[] = [];
  for (const bloque of bloques) {
    for (const fecha of bloque.fechas) {
      const inicio = new Date(`${fecha}T${bloque.desde}`);
      const fin = new Date(`${fecha}T${bloque.hasta}`);
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) continue;
      if (fin <= inicio) continue;
      salida.push({ inicio: inicio.toISOString(), fin: fin.toISOString() });
    }
  }
  return salida.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

/** `yyyy-mm-dd` de una fecha local, que es como se pican en el calendario. */
export function claveLocal(fecha: Date): string {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mm}-${dd}`;
}

/**
 * Las semanas de un mes para pintar un calendario, empezando en LUNES.
 *
 * Se rellenan los huecos de los extremos con los días del mes vecino para que
 * la rejilla salga cuadrada; `delMes` dice cuáles son de verdad de este mes.
 */
export function semanasDelMes(anio: number, mes: number): {
  fecha: Date; clave: string; dia: number; delMes: boolean;
}[][] {
  const primero = new Date(anio, mes, 1);
  // getDay(): 0 = domingo. Con la semana empezando en lunes, el domingo va al 6.
  const desplazamiento = (primero.getDay() + 6) % 7;
  const arranque = new Date(anio, mes, 1 - desplazamiento);

  const semanas: { fecha: Date; clave: string; dia: number; delMes: boolean }[][] = [];
  const cursor = new Date(arranque);
  // Seis semanas cubren cualquier mes: 31 días con seis de desplazamiento.
  for (let semana = 0; semana < 6; semana += 1) {
    const dias = [];
    for (let i = 0; i < 7; i += 1) {
      dias.push({
        fecha: new Date(cursor),
        clave: claveLocal(cursor),
        dia: cursor.getDate(),
        delMes: cursor.getMonth() === mes,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    semanas.push(dias);
    // Si la semana que viene ya no pisa el mes, se corta: una fila entera del
    // mes siguiente no dice nada y desplaza el resto del formulario.
    if (cursor.getMonth() !== mes && cursor > new Date(anio, mes + 1, 0)) break;
  }
  return semanas;
}

/** `L M X J V S D` — la cabecera del calendario, empezando en lunes. */
export const INICIALES_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** `septiembre de 2026` — el título del mes que se está mirando. */
export function nombreMes(anio: number, mes: number): string {
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' })
    .format(new Date(anio, mes, 1));
}
