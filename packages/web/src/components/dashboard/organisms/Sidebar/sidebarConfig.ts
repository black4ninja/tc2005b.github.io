import type { SidebarItem, DashboardRole } from '../../../../types/dashboard';

const adminItems: SidebarItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
  { label: 'Alumnos', icon: 'people', path: '/admin/alumnos' },
  { label: 'Laboratorios', icon: 'science', path: '/admin/laboratorios' },
  { label: 'Avances', icon: 'trending_up', path: '/admin/avances' },
  { label: 'Calificaciones', icon: 'grading', path: '/admin/calificaciones' },
  { label: 'Estadísticas', icon: 'bar_chart', path: '/admin/estadisticas' },
  { label: 'Asistencia', icon: 'fact_check', path: '/admin/asistencia' },
];

const alumnoItems: SidebarItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/alumno' },
  { label: 'Mis Labs', icon: 'science', path: '/alumno/labs' },
  { label: 'Mis Avances', icon: 'trending_up', path: '/alumno/avances' },
  { label: 'Calificaciones', icon: 'grading', path: '/alumno/calificaciones' },
  { label: 'Calendario', icon: 'calendar_today', path: '/alumno/calendario' },
  { label: 'Materiales', icon: 'folder', path: '/alumno/materiales' },
  { label: 'Políticas', icon: 'policy', path: '/alumno/politicas' },
];

export function getSidebarItems(role: DashboardRole): SidebarItem[] {
  return role === 'admin' ? adminItems : alumnoItems;
}
