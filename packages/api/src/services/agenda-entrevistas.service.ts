/**
 * Reglas de la agenda de entrevistas, sin Parse ni Express.
 *
 * Aquí no se toca la base: son las cuentas que deciden cuándo se puede agendar,
 * hasta cuándo se puede cancelar y en qué huecos se parte un día. Están aparte
 * para poder probarlas —son reglas con fechas y con fines de semana, justo lo
 * que se rompe en silencio— y para que el alumno y el profesor apliquen las
 * mismas.
 */
import { ZONA_CURSO, HORAS_HABILES_ANTELACION, MARGEN_CANCELACION_MINUTOS } from '../constants/preguntas.js';

/**
 * Paso con el que se avanza al contar horas hábiles.
 *
 * Un MINUTO, y no media hora como antes. El paso se ancla en `desde`, así que su
 * tamaño es también el grano con el que se mueve el resultado: con media hora,
 * el umbral daba saltos de 30 minutos y —peor— RETROCEDÍA 29 al cruzar la noche
 * del viernes, porque al avanzar `desde` un minuto cambiaba qué pasos caían en
 * fin de semana. Un hueco cerrado volvía a abrirse y se cerraba otra vez.
 *
 * Con un minuto el umbral avanza minuto a minuto y nunca retrocede, que es como
 * se espera que se vayan cerrando los huecos.
 */
const PASO_MS = 60 * 1000;

/**
 * El formateador se construye UNA vez y se reutiliza.
 *
 * Con el paso de un minuto esto se llama hasta unos pocos miles de veces por
 * cuenta —24 horas hábiles son 1440 pasos, y un fin de semana por medio suma
 * dos días más—, y construir un `Intl.DateTimeFormat` cada vez costaba más que
 * toda la consulta a la base.
 */
const DIA_SEMANA = new Map<string, Intl.DateTimeFormat>();

function formateador(zona: string): Intl.DateTimeFormat {
  let f = DIA_SEMANA.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: zona, weekday: 'short' });
    DIA_SEMANA.set(zona, f);
  }
  return f;
}

/** ¿Ese instante cae en día hábil (lunes a viernes) en la zona del curso? */
export function esDiaHabil(momento: Date, zona = ZONA_CURSO): boolean {
  const dia = formateador(zona).format(momento);
  return dia !== 'Sat' && dia !== 'Sun';
}

/**
 * `desde` más N horas HÁBILES: el reloj corre de lunes a viernes y se para el
 * fin de semana. Agendar el viernes a las 10:00 abre el lunes a las 10:00.
 *
 * Avanza a saltos en vez de calcular a mano los tramos porque el fin de semana
 * no es el único caso: la zona del curso cambia de horario dos veces al año y un
 * cálculo en milisegundos se desfasaría una hora sin avisar.
 */
export function sumarHorasHabiles(desde: Date, horas = HORAS_HABILES_ANTELACION, zona = ZONA_CURSO): Date {
  // La cuenta va en MINUTOS ENTEROS. Restando fracciones de hora, los 1440
  // pasos de un día acumulaban un error de coma flotante que dejaba un resto
  // positivo minúsculo al final: una vuelta de más y el umbral salía un minuto
  // tarde. Con el paso de media hora no se notaba porque 0,5 es exacto en
  // binario; al afinar el paso, sí.
  let restantes = Math.round(horas * 60);
  let t = desde.getTime();
  // Tope de seguridad: 24 h hábiles nunca pasan de una semana natural.
  const limite = t + 30 * 24 * 60 * 60 * 1000;
  while (restantes > 0 && t < limite) {
    // Cuenta el tramo por donde EMPIEZA, no por donde acaba: el salto de las
    // 23:59 del domingo a las 00:00 del lunes no es tiempo hábil, y midiéndolo
    // por el final se colaba un minuto que dejaba el límite corto.
    if (esDiaHabil(new Date(t), zona)) restantes -= 1;
    t += PASO_MS;
  }
  return new Date(t);
}

/** ¿Le da tiempo al alumno de agendar esa hora? */
export function puedeAgendar(inicio: Date, ahora: Date, zona = ZONA_CURSO): boolean {
  return inicio.getTime() >= sumarHorasHabiles(ahora, HORAS_HABILES_ANTELACION, zona).getTime();
}

/**
 * ¿Sigue a tiempo de cancelar? Hasta `MARGEN_CANCELACION_MINUTOS` antes de su
 * hora. Después la cita cuenta como celebrada, se presente o no.
 */
export function puedeCancelar(inicio: Date, ahora: Date): boolean {
  return ahora.getTime() < inicio.getTime() - MARGEN_CANCELACION_MINUTOS * 60 * 1000;
}

/**
 * Los huecos de un día: desde `inicio`, de `duracionSegundos` en
 * `duracionSegundos`, mientras quepan enteros antes de `fin`.
 *
 * El último hueco no se recorta: media entrevista no es una entrevista.
 */
export function huecosDelDia(inicio: Date, fin: Date, duracionSegundos: number): Date[] {
  const paso = Math.max(1, Math.round(duracionSegundos)) * 1000;
  const huecos: Date[] = [];
  // Tope de seguridad por si alguien guarda un día de tres semanas.
  for (let t = inicio.getTime(); t + paso <= fin.getTime() && huecos.length < 500; t += paso) {
    huecos.push(new Date(t));
  }
  return huecos;
}

/**
 * En qué intento va cada cita de un alumno en una competencia: la más temprana
 * es el 1.º y así.
 *
 * Se calcula al leer y no se guarda a propósito. Si el alumno cancela su primera
 * cita, la que le queda pasa a ser la primera —y le toca la primera pregunta—,
 * que es lo que espera cualquiera; con el número guardado se quedaría en un
 * segundo intento sin haber tenido el primero.
 */
export function numerarIntentos<T extends { inicio: Date; id?: string }>(citas: T[]): Map<string, number> {
  const orden = [...citas].sort((a, b) => {
    const d = a.inicio.getTime() - b.inicio.getTime();
    // Empate por hora: el id desempata para que el número no baile entre cargas.
    return d !== 0 ? d : (a.id ?? '').localeCompare(b.id ?? '');
  });
  return new Map(orden.map((c, i) => [c.id ?? String(i), i + 1]));
}
