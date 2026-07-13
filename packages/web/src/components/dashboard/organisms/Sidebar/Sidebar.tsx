import { useState, useEffect } from 'react';
import { Link, useMatch } from 'react-router';
import NavItem from '../../molecules/NavItem/NavItem';
import DocusMenu, { type DocusLink } from '../../molecules/DocusMenu/DocusMenu';
import Icon from '../../atoms/Icon/Icon';
import ArbolContenidos from './ArbolContenidos';
import { getSidebarItems, getGrupoDetailItems } from './sidebarConfig';
import styles from './Sidebar.module.css';
import type { DashboardRole } from '../../../../types/dashboard';
import { useAuth } from '../../../../context/AuthContext';
import { useColeccionArbol } from '../../../../context/ColeccionArbolContext';
import { APP_NAME } from '../../../../config/app';

interface SidebarProps {
  role: DashboardRole;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ role, collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const grupoMatchExact = useMatch('/admin/grupos/:id');
  const grupoMatchSub = useMatch('/admin/grupos/:id/*');
  const grupoMatch = grupoMatchExact || grupoMatchSub;
  const isGrupoDetail = !!grupoMatch;
  const grupoId = grupoMatch?.params.id;

  // Colección abierta: el sidebar se vuelve el árbol de páginas (mismo patrón
  // contextual que el detalle de grupo). Los datos vienen del provider, que los
  // comparte con la página para que una mutación se refleje aquí.
  const { coleccionId, coleccion } = useColeccionArbol();
  const isColeccionDetail = !!coleccionId;

  const { sessionToken, user, updateUser } = useAuth();
  const [grupoName, setGrupoName] = useState('');
  const [selectedGrupoId, setSelectedGrupoId] = useState<string>('');
  const [docsHref, setDocsHref] = useState<string | null>(null);
  const [docusLinks, setDocusLinks] = useState<DocusLink[]>([]);
  // Agenda de entrevistas del grupo abierto (admin). La del alumno sale del
  // payload de sesión (user.grupos), no requiere fetch.
  const [agendaGrupoHref, setAgendaGrupoHref] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'alumno' && user?.grupos?.length) {
      setSelectedGrupoId(user.grupos[0].id);
    }
  }, [role, user?.grupos]);

  // Link "Documentación" del alumno: el visor de su primera colección del
  // CMS; sin colecciones asignadas, el ítem se oculta (docsHref = null).
  // El admin no lleva este ítem — su acceso es la sección "Contenidos".
  useEffect(() => {
    if (!sessionToken || role !== 'alumno') return;
    fetch('/api/me/colecciones', { headers: { 'x-session-token': sessionToken } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const colecciones: { slug: string }[] = json?.colecciones ?? [];
        setDocsHref(colecciones.length > 0 ? `/contenidos/${colecciones[0].slug}/` : null);
      })
      .catch(() => {});
  }, [sessionToken, role]);

  useEffect(() => {
    if (role !== 'alumno' || !selectedGrupoId || !sessionToken) return;
    fetch(`/api/alumno/grupos/${selectedGrupoId}/perfil`, {
      headers: { 'x-session-token': sessionToken },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json?.perfil) {
          updateUser({ perfilCompleto: json.perfil.perfilCompleto ?? false });
        }
      })
      .catch(() => {});
  }, [role, selectedGrupoId, sessionToken]);

  useEffect(() => {
    if (!grupoId || !sessionToken) return;
    fetch('/api/admin/grupos', { headers: { 'x-session-token': sessionToken } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const grupos = json?.grupos ?? [];
        const found = grupos.find(
          (g: {
            id: string;
            name?: string;
            urlAgendaEntrevistas?: string | null;
            colecciones?: { slug: string; nombre: string; clave: string | null }[];
          }) => g.id === grupoId,
        );
        if (found?.name) setGrupoName(found.name);
        setAgendaGrupoHref(found?.urlAgendaEntrevistas ?? null);

        // Documentación del grupo = sus colecciones del CMS Contenidos.
        const links: DocusLink[] = (found?.colecciones ?? []).map(
          (c: { slug: string; nombre: string; clave: string | null }) => ({
            slug: c.slug,
            label: `${c.clave || c.slug.toUpperCase()} — ${c.nombre}`,
            href: `/contenidos/${c.slug}/`,
          }),
        );
        setDocusLinks(links);
      })
      .catch(() => {});
  }, [grupoId, sessionToken]);

  // La agenda del alumno es la de SU grupo seleccionado; viaja en el payload de
  // sesión, así que no hace falta pedirla.
  const agendaAlumnoHref =
    role === 'alumno'
      ? user?.grupos?.find((g) => g.id === selectedGrupoId)?.urlAgendaEntrevistas ?? null
      : null;

  const items = isGrupoDetail
    ? getGrupoDetailItems(grupoId!, agendaGrupoHref)
    : getSidebarItems(
        role,
        role === 'alumno' ? selectedGrupoId : undefined,
        user?.perfilCompleto,
        docsHref,
        agendaAlumnoHref,
      );

  return (
    <>
      {mobileOpen && <div className={styles.overlay} onClick={onCloseMobile} />}
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}
      >
        {isColeccionDetail ? (
          <div className={styles.backHeader}>
            <Link to="/admin/contenidos" className={styles.backButton} onClick={onCloseMobile}>
              <Icon name="arrow_back" size="sm" />
              {!collapsed && <span>Volver a Contenidos</span>}
            </Link>
            {!collapsed && (
              <span className={styles.grupoLabel} title={coleccion?.nombre ?? ''}>
                {coleccion?.clave ?? coleccion?.slug ?? '…'}
              </span>
            )}
          </div>
        ) : isGrupoDetail ? (
          <div className={styles.backHeader}>
            <Link to="/admin/grupos" className={styles.backButton} onClick={onCloseMobile}>
              <Icon name="arrow_back" size="sm" />
              {!collapsed && <span>Volver a Grupos</span>}
            </Link>
            {!collapsed && (
              <span className={styles.grupoLabel}>
                {grupoName ? `Grupo: ${grupoName}` : `Grupo: ${grupoId}`}
              </span>
            )}
          </div>
        ) : (
          <div className={styles.logo}>
            <Link to={role === 'admin' ? '/admin' : '/alumno'} className={styles.logoLink}>
              <Icon name="school" size="lg" />
              {!collapsed && <span className={styles.logoText}>{APP_NAME}</span>}
            </Link>
          </div>
        )}
        {role === 'alumno' && user?.grupos && user.grupos.length > 1 && !collapsed && (
          <div className={styles.grupoSelector}>
            <label className={styles.grupoSelectorLabel}>Grupo</label>
            <select
              className={styles.grupoSelect}
              value={selectedGrupoId}
              onChange={(e) => setSelectedGrupoId(e.target.value)}
            >
              {user.grupos.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}
        <nav className={`${styles.nav} ${isColeccionDetail && !collapsed ? styles.navArbol : ''}`}>
          {isColeccionDetail ? (
            // Colapsado (70px) el árbol es ilegible: se oculta y queda solo el
            // botón de volver, que es la salida.
            !collapsed && <ArbolContenidos coleccionId={coleccionId} />
          ) : (
            <>
              {items.map(item => (
                <NavItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  badge={item.badge}
                  disabled={item.disabled}
                  external={item.external}
                  collapsed={collapsed}
                  onClick={onCloseMobile}
                />
              ))}
              {isGrupoDetail && <DocusMenu items={docusLinks} collapsed={collapsed} />}
            </>
          )}
        </nav>
        <div className={styles.footer}>
          {!collapsed && (
            <Link to="/" className={styles.backLink}>
              <Icon name="arrow_back" size="sm" />
              <span>Volver al sitio</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
