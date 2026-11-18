export type EstadoHappiness = 'positivo' | 'neutral' | 'negativo';

export interface EntradaHappiness {
  id: string;
  /** `AAAA-MM-DD`, en la zona del curso. */
  dia: string;
  estado: EstadoHappiness;
  texto: string;
  autor: { id: string; name: string | null; rol: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TableroHappiness {
  hoy: string;
  dia: string;
  /** Días con alguna entrada, en orden. */
  dias: string[];
  entradas: EntradaHappiness[];
}
