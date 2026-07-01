import type { StatCardData, DataRowItem, ActivityItem, ChartConfig } from '../../types/dashboard';

export const adminStats: StatCardData[] = [
  {
    title: 'Total Alumnos',
    value: 45,
    icon: 'people',
    color: '#5d87ff',
  },
  {
    title: 'Labs Entregados',
    value: 312,
    icon: 'assignment_turned_in',
    color: '#13deb9',
    trend: { value: '+12%', direction: 'up' },
  },
  {
    title: 'Avances Pendientes',
    value: 18,
    icon: 'pending_actions',
    color: '#ffae1f',
  },
  {
    title: 'Promedio General',
    value: 85.4,
    icon: 'insights',
    color: '#fa896b',
  },
];

export const weeklyDeliveriesChart: ChartConfig = {
  type: 'line',
  categories: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'],
  series: [{ name: 'Entregas', data: [12, 19, 15, 28, 22, 35, 30, 40] }],
  colors: ['#5d87ff'],
};

export const gradesByLabChart: ChartConfig = {
  type: 'bar',
  categories: ['Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5', 'Lab 6', 'Lab 7', 'Lab 8'],
  series: [{ name: 'Promedio', data: [88, 82, 90, 78, 85, 92, 87, 80] }],
  colors: ['#13deb9'],
};

export const recentStudents: DataRowItem[] = [
  {
    id: '1',
    name: 'Ana Martínez',
    subtitle: 'A01234567',
    columns: ['Lab 8', '92'],
    status: { label: 'Activo', color: '#13deb9' },
  },
  {
    id: '2',
    name: 'Roberto Sánchez',
    subtitle: 'A01234568',
    columns: ['Lab 7', '85'],
    status: { label: 'Activo', color: '#13deb9' },
  },
  {
    id: '3',
    name: 'María López',
    subtitle: 'A01234569',
    columns: ['Lab 8', '78'],
    status: { label: 'Retrasado', color: '#ffae1f' },
  },
  {
    id: '4',
    name: 'Diego Torres',
    subtitle: 'A01234570',
    columns: ['Lab 6', '65'],
    status: { label: 'En riesgo', color: '#fa896b' },
  },
  {
    id: '5',
    name: 'Lucía Ramírez',
    subtitle: 'A01234571',
    columns: ['Lab 8', '95'],
    status: { label: 'Activo', color: '#13deb9' },
  },
];

export const adminActivity: ActivityItem[] = [
  {
    id: '1',
    icon: 'assignment_turned_in',
    color: '#13deb9',
    title: 'Lab 8 entregado',
    description: 'Ana Martínez entregó Lab 8 - Node.js',
    time: 'Hace 5 min',
  },
  {
    id: '2',
    icon: 'trending_up',
    color: '#5d87ff',
    title: 'Avance 4 entregado',
    description: 'Equipo 3 entregó Avance 4 del proyecto',
    time: 'Hace 15 min',
  },
  {
    id: '3',
    icon: 'warning',
    color: '#ffae1f',
    title: 'Fecha límite próxima',
    description: 'Lab 9 vence en 2 días',
    time: 'Hace 1 hr',
  },
  {
    id: '4',
    icon: 'person_add',
    color: '#539bff',
    title: 'Nuevo alumno registrado',
    description: 'Pedro Hernández se unió al grupo 2',
    time: 'Hace 2 hr',
  },
];
