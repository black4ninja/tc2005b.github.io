export interface LabRecurso {
  texto: string;
  url: string;
  externo: boolean;
}

export interface LabPractica {
  titulo: string;
  enlace: string;
  descripcion: string;
}

export interface Lab {
  id: string;
  numero: number | null;
  titulo: string;
  descripcion?: string;
  modalidad?: string;
  objetivos?: string[];
  instruccionesHtml?: string;
  preguntas?: string[];
  recursos?: LabRecurso[];
  entrega?: string;
  practica?: LabPractica;
}

export interface LabIndexEntry {
  id: string;
  numero: number | null;
  titulo: string;
}
