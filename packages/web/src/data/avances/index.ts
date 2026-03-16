import type { Avance } from '@/types/avance';
import type { AvanceNavEntry } from '@/types/avance';

export const avanceLoaders: Record<string, () => Promise<{ default: Avance }>> = {
  'av1': () => import('./av1'),
  'av3': () => import('./av3'),
  'av4': () => import('./av4'),
  'av5': () => import('./av5'),
  'av6': () => import('./av6'),
  'av7': () => import('./av7'),
};

export const avancesNav: AvanceNavEntry[] = [
  { id: 'av1', numero: 1, titulo: 'Propuesta de proyecto' },
  { id: 'av3', numero: 2, titulo: 'Análisis y diseño' },
  { id: 'av4', numero: 3, titulo: 'Creación de la BD' },
  { id: 'av5', numero: 4, titulo: 'Prueba de concepto' },
  { id: 'av6', numero: 5, titulo: 'Versión Beta' },
  { id: 'av7', numero: 6, titulo: 'Versión 1.0' },
];
