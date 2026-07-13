import type { SidebarItem, DashboardRole } from '../../../../types/dashboard';

// La agenda de entrevistas dejó de ser una URL global hardcodeada: ahora es un
// campo del grupo (`Grupo.urlAgendaEntrevistas`). El admin la ve dentro del
// grupo (getGrupoDetailItems) y el alumno, la de SU grupo. Sin URL, no hay ítem.

// `docsHref` es el link del alumno al visor de Contenidos
// (/contenidos/<slug>/ de su primera colección); null = sin colecciones,
// el ítem no se muestra. El admin usa la sección "Contenidos".
export function getSidebarItems(
  role: DashboardRole,
  selectedGrupoId?: string,
  perfilCompleto?: boolean,
  docsHref: string | null = null,
  agendaHref: string | null = null,
): SidebarItem[] {
  if (role === 'admin') {
    return [
      { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
      { label: 'Grupos', icon: 'groups', path: '/admin/grupos' },
      { label: 'Competencias', icon: 'emoji_events', path: '/admin/competencias' },
      { label: 'Actividades', icon: 'assignment', path: '/admin/actividades' },
      { label: 'Páginas', icon: 'article', path: '/admin/paginas' },
      { label: 'Contenidos', icon: 'library_books', path: '/admin/contenidos' },
    ];
  }
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
  // Sin colecciones asignadas no hay documentación que enlazar.
  if (docsHref) {
    items.push({ label: 'Documentación', icon: 'menu_book', path: docsHref, external: true, disabled: !perfilCompleto });
  }
  // Sin URL en su grupo, no hay agenda que enlazar (igual que "Documentación").
  if (agendaHref) {
    items.push({
      label: 'Agendar Entrevistas',
      icon: 'event_available',
      path: agendaHref,
      external: true,
      disabled: !perfilCompleto,
    });
  }
  return items;
}

/**
 * Menú contextual del detalle de grupo.
 *
 * Ojo con los dos "entrevistas", que no son lo mismo:
 *  - "Entrevistas" → página interna de gestión (`/admin/grupos/:id/entrevistas`).
 *  - "Agendar Entrevistas" → enlace EXTERNO a la agenda del grupo (una hoja de
 *    cálculo, normalmente). Solo aparece si el grupo tiene URL.
 */
export function getGrupoDetailItems(grupoId: string, agendaHref: string | null = null): SidebarItem[] {
  const items: SidebarItem[] = [
    { label: 'Calendario', icon: 'calendar_month', path: `/admin/grupos/${grupoId}/calendario` },
    { label: 'Alumnos', icon: 'people', path: `/admin/grupos/${grupoId}` },
    { label: 'Actividades Evaluación', icon: 'assignment', path: `/admin/grupos/${grupoId}/actividades-evaluacion` },
    { label: 'Plan de Evaluación', icon: 'checklist', path: `/admin/grupos/${grupoId}/plan-evaluacion` },
    { label: 'Equipos', icon: 'group_work', path: `/admin/grupos/${grupoId}/equipos` },
    { label: 'Entrevistas', icon: 'record_voice_over', path: `/admin/grupos/${grupoId}/entrevistas` },
  ];
  if (agendaHref) {
    items.push({ label: 'Agendar Entrevistas', icon: 'event_available', path: agendaHref, external: true });
  }
  return items;
}
