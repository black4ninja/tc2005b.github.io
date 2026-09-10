/**
 * Lógica PURA de comparación de salida y mapeo a veredicto. Sin procesos ni
 * Parse, para poder probarla sin compiladores (patrón modulos-contenido.test).
 */
import type { ResultadoCorrida, Veredicto } from './tipos.js';

/**
 * Normaliza para comparar como lo hacen los jueces estilo UVA: unifica saltos de
 * línea, quita espacios/tabs al final de cada línea y colapsa saltos finales.
 * No toca espacios internos (el ejercicio decide su formato exacto).
 *
 * Y unifica la forma Unicode a NFC. «ñ» se puede escribir de dos maneras que en
 * pantalla son idénticas: un solo punto de código (U+00F1) o una `n` seguida de
 * una tilde combinante (U+006E U+0303). macOS produce la segunda en algunos
 * caminos de copiar y pegar, así que un alumno podía mandar una salida que se
 * VE igual que la esperada y que `===` rechazaba, sin nada visible que explicara
 * por qué. Componer las dos a NFC antes de comparar quita esa clase entera de
 * falsos fallos, y para una salida ASCII —la mayoría— no cambia nada.
 */
export function normalizarSalida(s: string): string {
  return s
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((linea) => linea.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

export interface VeredictoCorrida {
  paso: boolean;
  veredicto: Veredicto;
  salidaObtenida: string;
}

/**
 * Traduce una corrida cruda + la salida esperada a un veredicto. `oom` es la
 * heurística (best-effort, sin cgroups) de que faltó memoria, ya evaluada por el
 * llamador contra el stderr del lenguaje.
 */
export function veredictoDeCorrida(
  corrida: ResultadoCorrida,
  salidaEsperada: string,
  oom: boolean,
): VeredictoCorrida {
  const salidaObtenida = corrida.salida;

  if (corrida.agotoTiempo) {
    return { paso: false, veredicto: 'tiempo_excedido', salidaObtenida };
  }
  if (corrida.truncado) {
    // Produjo más salida que el tope: no puede considerarse correcto.
    return { paso: false, veredicto: 'respuesta_incorrecta', salidaObtenida };
  }
  if (oom) {
    return { paso: false, veredicto: 'limite_memoria', salidaObtenida };
  }
  if (corrida.senal !== null) {
    // Terminado por señal (SIGSEGV, SIGKILL, etc.) sin señal de OOM → runtime.
    return { paso: false, veredicto: 'error_ejecucion', salidaObtenida };
  }
  if (corrida.exitCode !== 0) {
    return { paso: false, veredicto: 'error_ejecucion', salidaObtenida };
  }
  const ok = normalizarSalida(salidaObtenida) === normalizarSalida(salidaEsperada);
  return {
    paso: ok,
    veredicto: ok ? 'aceptado' : 'respuesta_incorrecta',
    salidaObtenida,
  };
}
