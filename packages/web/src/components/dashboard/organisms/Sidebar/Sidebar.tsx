import { useState, useEffect } from 'react';
import { Link, useMatch } from 'react-router';
import NavItem from '../../molecules/NavItem/NavItem';
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

  useEffect(() => {
    if (role === 'alumno' && user?.grupos?.length) {
      setSelectedGrupoId(user.grupos[0].id);
    }
  }, [role, user?.grupos]);

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
    fetch('/api/admin/grupos', {
      headers: { 'x-session-token': sessionToken },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        const grupos = json?.grupos ?? [];
        const found = grupos.find((g: { id: string }) => g.id === grupoId);
        if (found?.name) setGrupoName(found.name);
      })
      .catch(() => {});
  }, [grupoId, sessionToken]);

  const items = isGrupoDetail
    ? getGrupoDetailItems(grupoId!)
    : getSidebarItems(role, role === 'alumno' ? selectedGrupoId : undefined, user?.perfilCompleto);

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
