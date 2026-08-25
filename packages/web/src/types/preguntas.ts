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
  titulo: string;
  texto: string;
  textoHtml: string;
  etiquetas: string[];
  duracionSegundos: number;
  /** Qué buscar en la respuesta. Nunca se proyecta. */
  notas: string;
  archivada: boolean;
}

/** La pregunta tal como viaja dentro de una asignación (resumida). */
export interface PreguntaDeAsignacion {
  id: string;
  titulo: string;
  etiquetas: string[];
  competencia: string | null;
  competenciaId: string | null;
  duracionSegundos: number | null;
  archivada: boolean;
}

export interface PreguntaAsignacion {
  id: string;
  alumnoId: string;
  pregunta: PreguntaDeAsignacion | null;
  /** Ajuste para este alumno. Solo lo ve el profesor. */
  nota: string;
  /** Duración a medida; null = la de la pregunta. */
  duracionSegundos: number | null;
  usada: boolean;
  createdAt: string;
}

export interface AlumnoConPregunta {
  id: string;
  name: string;
  matricula: string;
  email: string;
  asignacion: PreguntaAsignacion | null;
  totalAsignaciones: number;
}

/** Competencia presente en el banco del grupo, para las píldoras de filtro. */
export interface CompetenciaEnBanco {
  id: string;
  nombre: string;
}
