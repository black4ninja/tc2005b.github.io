export type ActividadTipo =
  | 'lab' | 'lectura' | 'ejercicio' | 'proyecto'
  | 'evaluacion' | 'break' | 'asueto' | 'trabajo'
  | 'discusion' | 'info' | 'actividad' | 'presentacion';

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
  /** Adjunto de una presentación. Solo metadatos: el binario va por su endpoint. */
  archivoNombre?: string;
  archivoMime?: string;
  archivoBytes?: number;
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
  /** Días con clase de esta semana. Ausente en semanas anteriores al campo. */
  diasActivos?: string[];
  dias: {
    lunes?: Dia;
    martes?: Dia;
    miercoles?: Dia;
    jueves?: Dia;
    viernes?: Dia;
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

export interface Calendario {
  grupoId?: string;
  grupo: string;
  salon: string;
  semanas: Semana[];
}
