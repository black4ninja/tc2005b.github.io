/** Tipos de la agenda de entrevistas (módulo "Preguntas"). */

export interface ReglasAgenda {
  horasHabilesAntelacion: number;
  margenCancelacionMinutos: number;
  maxIntentos: number;
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
}

export interface CompetenciaAgendable {
  id: string;
  nombre: string;
  /** Cuántas de las `maxIntentos` oportunidades ya tengo apuntadas. */
  usados: number;
}

export interface AgendaAlumno {
  serverNow: string;
  /** Lo más pronto que ya cumple las 24 horas hábiles. Lo calcula el servidor. */
  agendableDesde: string;
  reglas: ReglasAgenda;
  competencias: CompetenciaAgendable[];
  misCitas: CitaAlumno[];
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
}

export interface HuecoProfesor {
  inicio: string;
  cita: CitaProfesor | null;
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
