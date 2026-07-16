/**
 * Tipos del juez de ejercicios. El motor compila y ejecuta código no confiable
 * del alumno (Kotlin/Swift) en el servidor, aislado con bubblewrap, y compara su
 * salida contra casos de prueba (estilo entrada/salida, como UVA).
 */

/** Lenguajes soportados. La key se usa en la BD y en el catálogo de lenguajes. */
export type Lenguaje = 'kotlin' | 'swift';

export const LENGUAJES: readonly Lenguaje[] = ['kotlin', 'swift'] as const;

export function esLenguaje(v: unknown): v is Lenguaje {
  return typeof v === 'string' && (LENGUAJES as readonly string[]).includes(v);
}

/** Límites de recursos de UNA corrida (no de la compilación). */
export interface Limites {
  /** Reloj de pared por corrida (ms). Al excederse → tiempo_excedido. */
  tiempoMs: number;
  /** Memoria máxima (MB): -Xmx en la JVM, ulimit -v en binarios nativos. */
  memoriaMb: number;
  /** Tope de bytes capturados de stdout+stderr (evita salidas gigantes). */
  salidaMaxBytes: number;
  /** Máximo de procesos/hilos (ulimit -u), corta fork bombs. */
  procesos: number;
}

/**
 * Veredictos posibles, del "peor" al "mejor" no hay orden implícito; la
 * agregación elige el primero que falla. `aceptado` solo si TODOS los casos pasan.
 */
export type Veredicto =
  | 'aceptado'
  | 'error_compilacion'
  | 'error_ejecucion'
  | 'respuesta_incorrecta'
  | 'tiempo_excedido'
  | 'limite_memoria';

/** Resultado crudo de correr el binario/JVM una vez con cierto stdin. */
export interface ResultadoCorrida {
  salida: string;
  error: string;
  exitCode: number | null;
  /** Terminó por el reloj de pared (SIGKILL nuestro). */
  agotoTiempo: boolean;
  /** Señal que lo terminó (p. ej. 'SIGKILL', 'SIGSEGV') o null. */
  senal: NodeJS.Signals | null;
  duracionMs: number;
  /** La salida se truncó por exceder `salidaMaxBytes`. */
  truncado: boolean;
}

/** Un caso de prueba (entrada por stdin, salida esperada por stdout). */
export interface Caso {
  entrada: string;
  salidaEsperada: string;
  /** Oculto: no se revela su entrada/esperado al alumno, solo pasa/falla. */
  oculto?: boolean;
}

/** Resultado de evaluar UN caso. Los campos de detalle solo se llenan si !oculto. */
export interface ResultadoCaso {
  indice: number;
  oculto: boolean;
  paso: boolean;
  veredicto: Veredicto;
  duracionMs: number;
  entrada?: string;
  salidaEsperada?: string;
  salidaObtenida?: string;
}

/** Resultado de evaluar el envío completo contra todos los casos. */
export interface ResultadoEvaluacion {
  veredicto: Veredicto;
  casosPasados: number;
  casosTotales: number;
  /** Presente solo si el veredicto global es error_compilacion. */
  errorCompilacion?: string;
  casos: ResultadoCaso[];
  /** Mayor duración de corrida entre los casos (ms). */
  tiempoMaxMs: number;
}
