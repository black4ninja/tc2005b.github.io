import type { StatCardData, DataRowItem, ChartConfig } from '../../types/dashboard';

export const alumnoStats: StatCardData[] = [
  {
    title: 'Labs Completados',
    value: '8/14',
    icon: 'science',
    color: '#5d87ff',
  },
  {
    title: 'Avances Entregados',
    value: '4/7',
    icon: 'trending_up',
    color: '#13deb9',
  },
  {
    title: 'Promedio',
    value: 88.5,
    icon: 'emoji_events',
    color: '#ffae1f',
    trend: { value: '+3.2', direction: 'up' },
  },
  {
    title: 'Próxima Entrega',
    value: 'Lab 9',
    icon: 'event',
    color: '#fa896b',
  },
];

export const progressChart: ChartConfig = {
  type: 'area',
  categories: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'],
  series: [{ name: 'Mi Progreso', data: [75, 80, 78, 85, 88, 82, 90, 88] }],
  colors: ['#5d87ff'],
};

export const upcomingDeliveries: DataRowItem[] = [
  {
    id: '1',
    name: 'Lab 9 - Express.js',
    subtitle: 'Laboratorio',
    columns: ['20 Mar 2026'],
    status: { label: 'Pendiente', color: '#ffae1f' },
  },
  {
    id: '2',
    name: 'Avance 5 - Backend',
    subtitle: 'Avance de Proyecto',
    columns: ['25 Mar 2026'],
    status: { label: 'Pendiente', color: '#ffae1f' },
  },
  {
    id: '3',
    name: 'Lab 10 - Base de Datos',
    subtitle: 'Laboratorio',
    columns: ['1 Abr 2026'],
    status: { label: 'No iniciado', color: '#94a3b8' },
  },
  {
    id: '4',
    name: 'Avance 6 - Integración',
    subtitle: 'Avance de Proyecto',
    columns: ['8 Abr 2026'],
    status: { label: 'No iniciado', color: '#94a3b8' },
  },
];

export const labProgress = [
  { label: 'Lab 1 - HTML', value: 100, color: '#13deb9' },
  { label: 'Lab 2 - CSS', value: 100, color: '#13deb9' },
  { label: 'Lab 3 - JavaScript', value: 100, color: '#13deb9' },
  { label: 'Lab 4 - Git', value: 100, color: '#13deb9' },
  { label: 'Lab 5 - Frontend', value: 100, color: '#13deb9' },
  { label: 'Lab 6 - React', value: 100, color: '#13deb9' },
  { label: 'Lab 7 - Node.js', value: 100, color: '#13deb9' },
  { label: 'Lab 8 - APIs', value: 85, color: '#5d87ff' },
  { label: 'Lab 9 - Express', value: 0, color: '#94a3b8' },
];
