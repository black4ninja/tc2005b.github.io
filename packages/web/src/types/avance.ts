export interface AvanceInstruccion {
  titulo?: string;
  contenido?: string;
  items?: string[];
}

export interface AvanceEntrega {
  contenido: string;
  tag: string | null;
  video: boolean;
  coevaluacion: boolean;
  coevaluacionUrl?: string;
}

export interface Avance {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string;
  modalidad: string;
  fechaEntrega: string;
  objetivos: string[];
  instrucciones: AvanceInstruccion[];
  entrega: AvanceEntrega;
}

export interface AvanceNavEntry {
  id: string;
  numero: number;
  titulo: string;
}
