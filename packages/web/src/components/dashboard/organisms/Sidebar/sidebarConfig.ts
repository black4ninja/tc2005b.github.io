import type { SidebarItem, DashboardRole } from '../../../../types/dashboard';

const adminItems: SidebarItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
  { label: 'Grupos', icon: 'groups', path: '/admin/grupos' },
  { label: 'Calendario', icon: 'calendar_month', path: '/admin/calendario' },
  { label: 'Competencias', icon: 'emoji_events', path: '/admin/competencias' },
  { label: 'Actividades', icon: 'assignment', path: '/admin/actividades' },
];

const alumnoBaseItems: SidebarItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/alumno' },
];

export function getSidebarItems(role: DashboardRole, grupoId?: string): SidebarItem[] {
  if (role === 'admin') return adminItems;
  if (grupoId) {
    return [
      ...alumnoBaseItems,
      { label: 'Malla de Evaluación', icon: 'grid_view', path: `/alumno/grupos/${grupoId}/malla` },
    ];
  }
  return alumnoBaseItems;
}

export function getGrupoDetailItems(grupoId: string): SidebarItem[] {
  return [
    { label: 'Alumnos', icon: 'people', path: `/admin/grupos/${grupoId}` },
    { label: 'Actividades Evaluación', icon: 'assignment', path: `/admin/grupos/${grupoId}/actividades-evaluacion` },
    { label: 'Plan de Evaluación', icon: 'checklist', path: `/admin/grupos/${grupoId}/plan-evaluacion` },
    { label: 'Equipos', icon: 'group_work', path: `/admin/grupos/${grupoId}/equipos` },
  ];
}
