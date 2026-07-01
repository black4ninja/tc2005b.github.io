import type { SidebarItem, DashboardRole } from '../../../../types/dashboard';

const AGENDA_ENTREVISTAS_URL =
  'https://docs.google.com/spreadsheets/d/1U1fbfaBWMp4Nje13qi2C3mhjhW0B8NxC-JXD0ff6fNQ/edit?gid=32307462#gid=32307462';

const adminItems: SidebarItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
  { label: 'Grupos', icon: 'groups', path: '/admin/grupos' },
  { label: 'Competencias', icon: 'emoji_events', path: '/admin/competencias' },
  { label: 'Actividades', icon: 'assignment', path: '/admin/actividades' },
  { label: 'Páginas', icon: 'article', path: '/admin/paginas' },
  { label: 'Documentación', icon: 'menu_book', path: '/docs/', external: true },
  { label: 'Agendar Entrevistas', icon: 'event_available', path: AGENDA_ENTREVISTAS_URL, external: true },
];

export function getSidebarItems(role: DashboardRole, selectedGrupoId?: string, perfilCompleto?: boolean): SidebarItem[] {
  if (role === 'admin') return adminItems;
  const items: SidebarItem[] = [];
  if (selectedGrupoId) {
    items.push({
      label: 'Calendario',
      icon: 'calendar_month',
      path: `/alumno/grupos/${selectedGrupoId}/calendario`,
    });
  }
  items.push({ label: 'Dashboard', icon: 'dashboard', path: '/alumno' });
  if (selectedGrupoId) {
    items.push({
      label: 'Malla',
      icon: 'grid_view',
      path: `/alumno/grupos/${selectedGrupoId}/malla`,
      disabled: !perfilCompleto,
    });
  }
  if (selectedGrupoId) {
    items.push({
      label: 'Competencias',
      icon: 'emoji_events',
      path: `/alumno/grupos/${selectedGrupoId}/competencias`,
      disabled: !perfilCompleto,
    });
  }
  items.push(
    { label: 'Documentación', icon: 'menu_book', path: '/docs/', external: true, disabled: !perfilCompleto },
    { label: 'Agendar Entrevistas', icon: 'event_available', path: AGENDA_ENTREVISTAS_URL, external: true, disabled: !perfilCompleto },
  );
  return items;
}

export function getGrupoDetailItems(grupoId: string): SidebarItem[] {
  return [
    { label: 'Calendario', icon: 'calendar_month', path: `/admin/grupos/${grupoId}/calendario` },
    { label: 'Alumnos', icon: 'people', path: `/admin/grupos/${grupoId}` },
    { label: 'Actividades Evaluación', icon: 'assignment', path: `/admin/grupos/${grupoId}/actividades-evaluacion` },
    { label: 'Plan de Evaluación', icon: 'checklist', path: `/admin/grupos/${grupoId}/plan-evaluacion` },
    { label: 'Equipos', icon: 'group_work', path: `/admin/grupos/${grupoId}/equipos` },
    { label: 'Entrevistas', icon: 'record_voice_over', path: `/admin/grupos/${grupoId}/entrevistas` },
  ];
}
