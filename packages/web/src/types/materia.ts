/** Opción de materia para selects/listas del admin. */
export interface MateriaOption {
  id: string;
  nombre: string;
}

/** Referencia a la materia asignada a un grupo (incluye slug de Docusaurus). */
export interface MateriaRef {
  id: string;
  nombre: string;
  slug: string;
  codigo?: string | null;
}
