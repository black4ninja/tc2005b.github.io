/** Tipos del módulo "Preguntas" (entrevistas personales). */

/** La competencia que una pregunta explora. Es su "categoría". */
export interface CompetenciaDePregunta {
  id: string;
  competencia: string;
  nivel: string;
  /**
   * La colección de la COMPETENCIA, que puede no ser la de la pregunta: se
   * permite enlazar una competencia de otra materia y la interfaz lo señala.
   */
  coleccionId: string | null;
}

export interface Pregunta {
  id: string;
  coleccionId: string | null;
  competenciaId: string | null;
  competencia: CompetenciaDePregunta | null;
  /**
   * El enunciado. No hay título: el rótulo con el que se reconoce en una lista
   * sale de aquí con `resumenPregunta`.
   */
  texto: string;
  textoHtml: string;
  etiquetas: string[];
  /**
   * Tiempo YA RESUELTO para el grupo desde el que se pide (anulación del grupo →
   * tiempo de la materia → el del módulo). No es un campo de la pregunta: el
   * banco de admin no lo trae y el proyector lo recibe como prop.
   */
  duracionSegundos?: number;
  /** Quién la tiene tomada; null = libre. Se deriva, no se guarda. */
  uso?: UsoPregunta | null;
  /** Qué buscar en la respuesta. Nunca se proyecta. */
  notas: string;
  archivada: boolean;
}

/**
 * Quién tiene tomada una pregunta. Mientras exista, no se puede volver a
 * asignar: se libera al desactivar el grupo o al quitarla del roster.
 */
export interface UsoPregunta {
  grupoId: string;
  grupoNombre: string;
  alumnoId: string;
  alumnoNombre: string;
  /** Ya se le planteó en la entrevista. */
  usada: boolean;
}

/** La pregunta tal como viaja dentro de una asignación (resumida). */
export interface PreguntaDeAsignacion {
  id: string;
  texto: string;
  etiquetas: string[];
  competencia: string | null;
  competenciaId: string | null;
  archivada: boolean;
}

export interface PreguntaAsignacion {
  id: string;
  alumnoId: string;
  /** Competencia que ocupa (`sin-competencia` si la pregunta no tiene). */
  hueco?: string;
  pregunta: PreguntaDeAsignacion | null;
  /** Ajuste para este alumno. Solo lo ve el profesor. */
  nota: string;
  usada: boolean;
  createdAt: string;
}

export interface AlumnoConPregunta {
  id: string;
  name: string;
  matricula: string;
  email: string;
  /** Una por competencia con banco. El cliente las indexa por `hueco`. */
  asignaciones: PreguntaAsignacion[];
  totalAsignaciones: number;
}

/**
 * Competencia presente en el banco del grupo. Es a la vez la píldora de filtro y
 * un HUECO: cada alumno lleva una pregunta de cada una.
 */
export interface CompetenciaEnBanco {
  id: string;
  nombre: string;
  /** Preguntas del banco en esta competencia y cuántas siguen libres. */
  total: number;
  libres: number;
}

/** De dónde sale el tiempo en este grupo. Lo sirve el listado del roster. */
export interface DuracionConfig {
  /** Anulación del grupo; null = manda la materia. */
  grupo: number | null;
  /** El del módulo, cuando nadie más lo dice. */
  porDefecto: number;
  materias: {
    id: string;
    clave: string | null;
    nombre: string | null;
    duracionSegundos: number | null;
  }[];
}
