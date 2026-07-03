import { useState, useEffect } from 'react';
import { Link, useMatch } from 'react-router';
import NavItem from '../../molecules/NavItem/NavItem';
import DocusMenu, { type DocusLink } from '../../molecules/DocusMenu/DocusMenu';
import Icon from '../../atoms/Icon/Icon';
import { getSidebarItems, getGrupoDetailItems } from './sidebarConfig';
import styles from './Sidebar.module.css';
import type { DashboardRole } from '../../../../types/dashboard';
import { useAuth } from '../../../../context/AuthContext';
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
  const { sessionToken, user, updateUser } = useAuth();
  const [grupoName, setGrupoName] = useState('');
  const [selectedGrupoId, setSelectedGrupoId] = useState<string>('');
  const [docsHref, setDocsHref] = useState('/docs/');
  const [docusLinks, setDocusLinks] = useState<DocusLink[]>([]);

  useEffect(() => {
    if (role === 'alumno' && user?.grupos?.length) {
      setSelectedGrupoId(user.grupos[0].id);
    }
  }, [role, user?.grupos]);

  // Link "Documentación" del usuario. Para ALUMNOS con colecciones del CMS
  // asignadas (US-6), apunta al visor /contenidos/<slug>/; si no, aplica el
  // esquema Docusaurus actual (materia única → /docs/<slug>/, si no la
  // landing). El admin conserva /docs/ mientras Docusaurus siga operativo
  // (US-7) — su acceso al CMS es la sección "Contenidos".
  useEffect(() => {
    if (!sessionToken) return;
    const headers = { 'x-session-token': sessionToken };
    const porMaterias = () =>
      fetch('/api/me/materias', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          const materias: { slug: string }[] = json?.materias ?? [];
          setDocsHref(materias.length === 1 ? `/docs/${materias[0].slug}/` : '/docs/');
        });

    if (role !== 'alumno') {
      porMaterias().catch(() => {});
      return;
    }
    fetch('/api/me/colecciones', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const colecciones: { slug: string }[] = json?.colecciones ?? [];
        if (colecciones.length > 0) {
          setDocsHref(`/contenidos/${colecciones[0].slug}/`);
          return;
        }
        return porMaterias();
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
    const headers = { 'x-session-token': sessionToken };
    Promise.all([
      fetch('/api/admin/grupos', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/materias', { headers }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([gruposJson, materiasJson]) => {
        const grupos = gruposJson?.grupos ?? [];
        const found = grupos.find(
          (g: {
            id: string;
            name?: string;
            materia?: { slug?: string | null } | null;
            docusaurus?: string[];
            colecciones?: { slug: string; nombre: string; clave: string | null }[];
          }) => g.id === grupoId,
        );
        if (found?.name) setGrupoName(found.name);

        // Etiquetas "CLAVE — Nombre" resueltas desde la lista de materias
        // (la del grupo trae slug pero no código).
        const materias: { slug: string; nombre: string; codigo?: string | null }[] = materiasJson?.materias ?? [];
        const bySlug = new Map(materias.map((m) => [m.slug, m]));

        // Docusaurus del grupo = unión de (materia del grupo) + (docusaurus[]),
        // deduplicada, en el orden materia → asignados.
        const slugs = [found?.materia?.slug, ...(found?.docusaurus ?? [])].filter(
          (s): s is string => typeof s === 'string' && s.length > 0,
        );
        const links: DocusLink[] = [...new Set(slugs)].map((slug) => {
          const m = bySlug.get(slug);
          const clave = m?.codigo || slug.toUpperCase();
          const nombre = m?.nombre || slug;
          return { slug, label: `${clave} — ${nombre}`, href: `/docs/${slug}/` };
        });
        // + Colecciones del CMS Contenidos asignadas al grupo (US-6).
        for (const c of found?.colecciones ?? []) {
          const clave = c.clave || c.slug.toUpperCase();
          links.push({ slug: `cms-${c.slug}`, label: `${clave} — ${c.nombre}`, href: `/contenidos/${c.slug}/` });
        }
        setDocusLinks(links);
      })
      .catch(() => {});
  }, [grupoId, sessionToken]);

  const items = isGrupoDetail
    ? getGrupoDetailItems(grupoId!)
    : getSidebarItems(role, role === 'alumno' ? selectedGrupoId : undefined, user?.perfilCompleto, docsHref);

  return (
    <>
      {mobileOpen && <div className={styles.overlay} onClick={onCloseMobile} />}
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}
      >
        {isGrupoDetail ? (
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
        <nav className={styles.nav}>
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
