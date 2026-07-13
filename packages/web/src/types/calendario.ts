export type ActividadTipo =
  | 'lab' | 'lectura' | 'ejercicio' | 'proyecto'
  | 'evaluacion' | 'break' | 'asueto' | 'trabajo'
  | 'discusion' | 'info' | 'actividad';

export interface EnlaceExtra {
  texto: string;
  url: string;
}

export interface Actividad {
  id?: string;
  tipo: ActividadTipo;
  titulo?: string;
  descripcion?: string;
  enlace?: string;
  externo?: boolean;
  duracion?: string;
  fechaEntrega?: string;
  enlacesExtra?: EnlaceExtra[];
}

export interface Dia {
  nota?: string;
  previo?: Actividad[];
  actividades?: Actividad[];
}

export interface SemanaNormal {
  id?: string;
  numero: number;
  fechaInicio: string;
  fechaFin: string;
  tipo: 'normal';
  dias: {
    lunes?: Dia;
    martes?: Dia;
    miercoles?: Dia;
    jueves?: Dia;
  };
}

export interface SemanaEspecial {
  id?: string;
  numero: number | string;
  fechaInicio: string;
  fechaFin: string;
  tipo: 'especial';
  titulo: string;
  mensaje: string;
  mensajeImportante?: string;
}

export type Semana = SemanaNormal | SemanaEspecial;

export interface CalendarioEnlaces {
  asesoriaDenisse: string;
  asesoriaAlex: string;
  politicasEquipo: string;
  integridadMIT: string;
  mallaEvaluacion: string;
  agendaEntrevistas: string;
}

export interface Calendario {
  grupoId?: string;
  grupo: string;
  salon: string;
  enlaces: CalendarioEnlaces;
  semanas: Semana[];
}
