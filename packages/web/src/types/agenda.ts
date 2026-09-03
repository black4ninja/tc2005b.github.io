/** Tipos de la agenda de entrevistas (módulo "Preguntas"). */

export interface ReglasAgenda {
  horasHabilesAntelacion: number;
  margenCancelacionMinutos: number;
  maxIntentos: number;
}

/**
 * Un enlace que el alumno entrega como evidencia.
 *
 * Cuelga de la CITA y no del número de intento: el número se deduce del orden
 * de reserva y cambia al cancelar, así que por número las evidencias saltarían
 * de una entrevista a otra.
 */
export interface Evidencia {
  id: string;
  alumnoId: string | null;
  /** Null = quedó suelta al cancelar su cita; sigue viva en su competencia. */
  citaId: string | null;
  competencia: { id: string; nombre: string } | null;
  origen: 'entrevista' | 'malla';
  url: string;
  titulo: string;
  createdAt: string;
}

export interface HuecoAlumno {
  inicio: string;
  ocupado: boolean;
  /** Si es mía, con qué competencia vengo. De las ajenas no se dice nada. */
  mia: { id: string; competencia: string } | null;
}

export interface DiaAlumno {
  id: string;
  inicio: string;
  fin: string;
  duracionSegundos: number;
  nota: string;
  cerrado: boolean;
  huecos: HuecoAlumno[];
}

export interface CitaAlumno {
  id: string;
  diaId: string | null;
  inicio: string;
  competencia: { id: string; nombre: string } | null;
  intento: number;
  diaNota: string;
  cancelable: boolean;
  evidencias: Evidencia[];
}

export interface CompetenciaAgendable {
  id: string;
  nombre: string;
  /** Cuántas de las `maxIntentos` oportunidades ya tengo apuntadas. */
  usados: number;
}

export interface AgendaAlumno {
  serverNow: string;
  /** El «Manual de competencias» del grupo. Vacío = no tiene. */
  manualUrl: string;
  /** Lo más pronto que ya cumple las 24 horas hábiles. Lo calcula el servidor. */
  agendableDesde: string;
  reglas: ReglasAgenda;
  competencias: CompetenciaAgendable[];
  misCitas: CitaAlumno[];
  /** Las que quedaron sin cita al cancelar. No se pierden. */
  evidenciasSueltas: Evidencia[];
  dias: DiaAlumno[];
}

/* ── Lado del profesor ────────────────────────────────────────────────── */

export interface CitaProfesor {
  id: string;
  diaId: string | null;
  inicio: string;
  alumno: { id: string; name: string; matricula: string } | null;
  competencia: { id: string; nombre: string } | null;
  intento: number;
  /** La asignación que le toca a ese intento; null = no tiene pregunta puesta. */
  asignacionId: string | null;
  pregunta: { id: string; texto: string } | null;
  evidencias: Evidencia[];
}

export interface HuecoProfesor {
  inicio: string;
  cita: CitaProfesor | null;
  /** Cerrado a mano: el alumno no lo ve, el profesor sí para poder reabrirlo. */
  cerrado: boolean;
}

export interface DiaProfesor {
  id: string;
  inicio: string;
  fin: string;
  duracionSegundos: number;
  nota: string;
  cerrado: boolean;
  huecos: HuecoProfesor[];
}

export interface Agenda {
  serverNow: string;
  duracionSegundos: number;
  competencias: { id: string; nombre: string }[];
  reglas: ReglasAgenda;
  dias: DiaProfesor[];
}
