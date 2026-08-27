/** Utilidades puras del módulo "Preguntas". */
import type {
  AlumnoConPregunta, FaseProyeccion, Pregunta, PreguntaAsignacion, Proyeccion,
} from '../types/preguntas';

/** `95` → `1:35`. El temporizador se lee en minutos, no en segundos sueltos. */
export function formatearDuracion(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const min = Math.floor(s / 60);
  const resto = s % 60;
  return `${min}:${String(resto).padStart(2, '0')}`;
}

/**
 * El rótulo con el que se reconoce una pregunta en una lista.
 *
 * Sustituye al título que el banco tenía al principio: mantener título y
 * enunciado a la vez solo servía para que acabaran diciendo cosas distintas, y
 * el enunciado recortado identifica igual de bien. Se limpian las marcas de
 * Markdown porque en una celda de tabla no se renderizan y se leerían crudas.
 */
export function resumenPregunta(texto: string, maximo = 90): string {
  const plano = texto
    // Enlaces: se queda el texto, se va el destino.
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Marcas de bloque al principio de línea: encabezados, citas, viñetas.
    .replace(/^[#>\s-]*\s*/gm, '')
    // Énfasis y código en línea.
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plano.length <= maximo) return plano;
  // Se corta por la última palabra entera: partir a media palabra se lee peor
  // que perder dos caracteres.
  const cortado = plano.slice(0, maximo);
  const ultimoEspacio = cortado.lastIndexOf(' ');
  return `${(ultimoEspacio > maximo * 0.6 ? cortado.slice(0, ultimoEspacio) : cortado).trimEnd()}…`;
}


/**
 * Reparte preguntas entre alumnos sin repetir mientras queden por usar.
 *
 * Es el «rellena a los que faltan» del roster. Reparte en vez de sortear una a
 * una a propósito: con un banco de 5 preguntas y 30 alumnos, sortear
 * independientemente deja a media clase con la misma —y en una entrevista eso se
 * nota en cuanto el primero sale del aula—. Aquí se agota la vuelta antes de
 * empezar la siguiente, así que el reparto es lo más plano posible.
 *
 * `aleatorio` se inyecta para poder probarla: por defecto, `Math.random`.
 */
export function repartirPreguntas<T>(
  alumnoIds: string[],
  preguntaIds: T[],
  aleatorio: () => number = Math.random,
): { alumnoId: string; preguntaId: T }[] {
  if (alumnoIds.length === 0 || preguntaIds.length === 0) return [];
  const salida: { alumnoId: string; preguntaId: T }[] = [];
  let bolsa: T[] = [];
  for (const alumnoId of alumnoIds) {
    if (bolsa.length === 0) bolsa = [...preguntaIds];
    const i = Math.floor(aleatorio() * bolsa.length);
    // `aleatorio()` puede devolver algo ≥ 1 si quien la inyecta se equivoca;
    // sin el tope, `splice` devolvería vacío y el alumno se quedaría sin nada.
    const [elegida] = bolsa.splice(Math.min(i, bolsa.length - 1), 1);
    salida.push({ alumnoId, preguntaId: elegida });
  }
  return salida;
}

/**
 * Mete asignaciones en el roster: cada una desaloja lo que hubiera en SU hueco
 * (mismo alumno, misma competencia, mismo intento) y se queda con él.
 *
 * Está fuera del componente y sin estado propio para que sea evidente que
 * pintar y confirmar hacen exactamente lo mismo: la única diferencia entre la
 * versión optimista y la confirmada es el id.
 */
export function aplicarAsignaciones(
  alumnos: AlumnoConPregunta[],
  nuevas: PreguntaAsignacion[],
): AlumnoConPregunta[] {
  if (nuevas.length === 0) return alumnos;
  const porAlumno = new Map<string, PreguntaAsignacion[]>();
  for (const a of nuevas) {
    porAlumno.set(a.alumnoId, [...(porAlumno.get(a.alumnoId) ?? []), a]);
  }
  return alumnos.map((alumno) => {
    const suyas = porAlumno.get(alumno.id);
    if (!suyas) return alumno;
    const huecos = new Set(suyas.map((a) => a.hueco));
    return {
      ...alumno,
      asignaciones: [...alumno.asignaciones.filter((a) => !huecos.has(a.hueco)), ...suyas],
      totalAsignaciones: alumno.totalAsignaciones + suyas.length,
    };
  });
}

/** Saca asignaciones del roster por id (revertir una optimista, o quitarla). */
export function quitarAsignaciones(
  alumnos: AlumnoConPregunta[],
  ids: string[],
): AlumnoConPregunta[] {
  if (ids.length === 0) return alumnos;
  const fuera = new Set(ids);
  return alumnos.map((alumno) => (
    alumno.asignaciones.some((a) => fuera.has(a.id))
      ? { ...alumno, asignaciones: alumno.asignaciones.filter((a) => !fuera.has(a.id)) }
      : alumno
  ));
}

/**
 * Mueve el contador de «a cuántos se la has puesto» sin ir al servidor.
 *
 * Es solo una pista para variar, así que llevarla en el cliente es barato y
 * evita una recarga entera por cada clic. Se recalcula de verdad al recargar.
 */
export function ajustarUso(preguntas: Pregunta[], suman: string[], restan: string[]): Pregunta[] {
  if (suman.length === 0 && restan.length === 0) return preguntas;
  return preguntas.map((p) => {
    const delta = suman.filter((id) => id === p.id).length - restan.filter((id) => id === p.id).length;
    if (delta === 0) return p;
    const veces = Math.max(0, (p.uso?.veces ?? 0) + delta);
    return {
      ...p,
      uso: veces === 0 ? null : {
        veces,
        quienes: p.uso?.quienes ?? [],
        algunaUsada: p.uso?.algunaUsada ?? false,
      },
    };
  });
}

/**
 * En qué punto está la proyección y cuánto queda, según el reloj.
 *
 * El servidor guarda CUÁNDO se pulsó iniciar y nada más: aquí se deduce el
 * resto. Que sea una función pura es lo que permite que el panel y la pantalla
 * proyectada enseñen lo mismo sin hablarse, y que entrar a mitad no descuadre
 * nada.
 *
 * `ahora` se pasa desde fuera —y corregido con el desfase del servidor— porque
 * las dos pantallas son aparatos distintos y sus relojes no coinciden.
 */
export function faseProyeccion(
  p: Pick<Proyeccion, 'estado' | 'iniciadoEn' | 'asignacionId' | 'duracionSegundos' | 'graciaSegundos'>,
  ahora: number,
): { fase: FaseProyeccion; restante: number; visible: boolean } {
  const total = p.duracionSegundos;
  if (!p.asignacionId) return { fase: 'sin-pregunta', restante: total, visible: false };
  if (p.estado === 'detenido') return { fase: 'detenida', restante: 0, visible: false };
  if (p.estado !== 'corriendo' || !p.iniciadoEn) {
    return { fase: 'espera', restante: total, visible: false };
  }

  const transcurrido = (ahora - new Date(p.iniciadoEn).getTime()) / 1000;
  const restante = Math.max(0, Math.ceil(total - transcurrido));
  // La gracia: el reloj ya está a cero pero la pregunta sigue puesta, para que
  // la pantalla no cambie justo mientras el alumno está cerrando la frase.
  if (transcurrido < total) return { fase: 'corriendo', restante, visible: true };
  if (transcurrido < total + p.graciaSegundos) return { fase: 'gracia', restante: 0, visible: true };
  return { fase: 'finalizada', restante: 0, visible: false };
}
