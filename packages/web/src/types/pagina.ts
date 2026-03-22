export type ContentBlockType =
  | 'encabezado'
  | 'objetivos'
  | 'instrucciones'
  | 'preguntas'
  | 'recursos'
  | 'entrega'
  | 'practica'
  | 'texto';

export interface ContentBlock {
  id: string;
  tipo: ContentBlockType;
  datos: Record<string, unknown>;
}

export interface PaginaData {
  id: string;
  titulo: string;
  slug: string;
  descripcion?: string;
  icono?: string;
  grupoId?: string | null;
  bloques: ContentBlock[];
  publicado: boolean;
  orden?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginaResumen {
  id: string;
  slug: string;
  titulo: string;
}
