/**
 * Enlaces del SITIO PÚBLICO (navbar y pie), que no tiene contexto de grupo.
 *
 * Antes vivían hardcodeados en tres sitios (Navbar, el mock del calendario que
 * lee el Footer, y sidebarConfig) con la misma URL copiada. El del sidebar se
 * fue: la agenda de entrevistas es ahora un campo del grupo
 * (`Grupo.urlAgendaEntrevistas`), y el menú del admin y el del alumno enlazan a
 * la de SU grupo.
 *
 * Estos, en cambio, los ve un visitante anónimo, que no pertenece a ningún
 * grupo: por eso siguen siendo del sitio. Si algún día el sitio público deja de
 * ofrecer la agenda, se borra de aquí y de los dos componentes.
 */
export const ENLACES_SITIO = {
  asesoria: 'https://calendar.app.google/YjY5BqzNsrFAxkpJ6',
  integridadMIT: 'https://integrity.mit.edu/handbook/writing-code',
  mallaEvaluacion:
    'https://docs.google.com/spreadsheets/d/1DzGDdW9kCbSaVki8JP3T85q9jfWLOmCUv7tRsYMLYLE/edit?usp=sharing',
  agendaEntrevistas:
    'https://docs.google.com/spreadsheets/d/1U1fbfaBWMp4Nje13qi2C3mhjhW0B8NxC-JXD0ff6fNQ/edit?gid=32307462#gid=32307462',
} as const;
