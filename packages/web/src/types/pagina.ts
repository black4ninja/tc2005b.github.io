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

/** Colección del CMS "Contenidos" tal como la expone `Pagina.toSafeJSON()`. */
export interface ColeccionRef {
  id: string;
  nombre: string | null;
  slug: string | null;
  clave: string | null;
}

export interface PaginaData {
  id: string;
  titulo: string;
  slug: string;
  descripcion?: string;
  icono?: string;
  /** Colección (materia) a la que pertenece. `null` = sin asignar. */
  coleccionId?: string | null;
  /** Datos de la colección; solo viene en los endpoints admin (con include). */
  coleccion?: ColeccionRef | null;
  bloques: ContentBlock[];
  publicado: boolean;
  orden?: number;
  /**
   * Etiquetas ya hidratadas (el API las resuelve y omite las borradas). Al
   * guardar, en cambio, se mandan solo los ids: ver `PaginaSavePayload`.
   */
  etiquetas?: EtiquetaData[];
  createdAt?: string;
  updatedAt?: string;
}

/** Lo que el form manda al API: las etiquetas viajan como ids. */
export type PaginaSavePayload = Omit<PaginaData, 'id' | 'coleccion' | 'etiquetas' | 'createdAt' | 'updatedAt'> & {
  etiquetas?: string[];
};

export interface PaginaResumen {
  id: string;
  slug: string;
  titulo: string;
}

export interface EtiquetaData {
  id: string;
  nombre: string;
  color: string;
  textColor: string;
}
