/** Tipos del módulo "Escenarios" (preguntas de entrevista). */

export interface EscenarioPregunta {
  id: string;
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
  duracionSegundos: number | null;
  archivada: boolean;
}

export interface EscenarioAsignacion {
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

export interface AlumnoConEscenario {
  id: string;
  name: string;
  matricula: string;
  email: string;
  asignacion: EscenarioAsignacion | null;
  totalAsignaciones: number;
}
