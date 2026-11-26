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
  /** La sesión del calendario de ese día, si la hay. */
  sesion?: SesionHappiness | null;
  entradas: EntradaHappiness[];
}

/** Una sesión del calendario del grupo que ya se puede evaluar. */
export interface SesionHappiness {
  /** `AAAA-MM-DD`: el día con el que se guarda la entrada. */
  dia: string;
  semana?: string;
  inicio: string;
  /** Lo que se vio ese día. */
  temas: string[];
}
