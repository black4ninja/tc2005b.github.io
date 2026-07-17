import { useState, useEffect, useMemo } from 'react';
import { Link, useMatch, useSearchParams, useNavigate } from 'react-router';
import NavItem from '../../molecules/NavItem/NavItem';
import SeccionColecciones, { type EnlaceColeccion } from '../../molecules/SeccionColecciones/SeccionColecciones';
import Icon from '../../atoms/Icon/Icon';
import ArbolContenidos from './ArbolContenidos';
import { getSidebarItems, getGrupoDetailItems } from './sidebarConfig';
import styles from './Sidebar.module.css';
import type { DashboardRole } from '../../../../types/dashboard';
import { useAuth } from '../../../../context/AuthContext';
import { useColeccionArbol } from '../../../../context/ColeccionArbolContext';
import { APP_NAME } from '../../../../config/app';
import { moduloHabilitado } from '../../../../config/modulosContenido';

/** Colección asignada al grupo, como la devuelve /api/admin/grupos. */
interface ColeccionGrupo {
  id: string;
  slug: string;
  nombre: string;
  clave: string | null;
}

interface SidebarProps {
  role: DashboardRole;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ role, collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate();
  const grupoMatchExact = useMatch('/admin/grupos/:id');
  const grupoMatchSub = useMatch('/admin/grupos/:id/*');
  const grupoMatch = grupoMatchExact || grupoMatchSub;

  // Las Páginas y Competencias de un grupo viven en pantallas globales
  // (/admin/paginas, /admin/competencias) filtradas por colección. Sin esto, al
  // entrar ahí desde el menú del grupo el sidebar volvería al menú admin y se
  // perdería la navegación del grupo. `?grupo=` conserva el contexto.
  const [params] = useSearchParams();
  // Solo para el admin: el menú del alumno no tiene modo "detalle de grupo", y un
  // `?grupo=` en su URL no debe cambiarle el sidebar.
  const grupoDeQuery = role === 'admin' ? params.get('grupo') : null;

  const { sessionToken, user, updateUser } = useAuth();

  // El profesor SIEMPRE está en modo grupo: su único contexto es su grupo
  // asignado. Aunque caiga en una ruta sin :id, se ancla a su primer grupo.
  const esProfesor = role === 'profesor';
  const profesorGrupoId = esProfesor ? user?.grupos?.[0]?.id : undefined;

  const grupoId = grupoMatch?.params.id ?? grupoDeQuery ?? profesorGrupoId ?? undefined;
  const isGrupoDetail = !!grupoId;

  // Colección abierta: el sidebar se vuelve el árbol de páginas (mismo patrón
  // contextual que el detalle de grupo). Los datos vienen del provider, que los
  // comparte con la página para que una mutación se refleje aquí.
  const { coleccionId, coleccion } = useColeccionArbol();
  const isColeccionDetail = !!coleccionId;

  const [grupoName, setGrupoName] = useState('');
  const [selectedGrupoId, setSelectedGrupoId] = useState<string>('');
  const [docsHref, setDocsHref] = useState<string | null>(null);
  const [ejerciciosHref, setEjerciciosHref] = useState<string | null>(null);
  const [colecciones, setColecciones] = useState<ColeccionGrupo[]>([]);
  // Módulos apagados por colección del grupo: filtran qué secciones aparecen.
  const [modulosDeshabilitados, setModulosDeshabilitados] = useState<Record<string, string[]>>({});
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

  // Ejercicios del ALUMNO: solo si alguna colección suya tiene el módulo encendido
  // y con ejercicios publicados (el backend aplica ambos filtros). El enlace del
  // profesor/admin en modo grupo se calcula aparte, acotado al grupo abierto.
  useEffect(() => {
    if (!sessionToken || role !== 'alumno') return;
    fetch('/api/me/ejercicios/colecciones', { headers: { 'x-session-token': sessionToken } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const cols: { slug: string }[] = json?.colecciones ?? [];
        setEjerciciosHref(cols.length > 0 ? `/contenidos/${cols[0].slug}/ejercicios` : null);
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
            colecciones?: { id: string; slug: string; nombre: string; clave: string | null }[];
            modulosDeshabilitados?: Record<string, string[]>;
          }) => g.id === grupoId,
        );
        if (found?.name) setGrupoName(found.name);
        setAgendaGrupoHref(found?.urlAgendaEntrevistas ?? null);
        setColecciones(found?.colecciones ?? []);
        setModulosDeshabilitados(found?.modulosDeshabilitados ?? {});
      })
      .catch(() => {});
  }, [grupoId, sessionToken]);

  /**
   * El menú del grupo se agrupa por ACCIÓN, no por colección: cuatro secciones
   * (Contenido, Páginas, Competencias, Actividades) y dentro de cada una, las
   * colecciones del grupo. Al revés —una entrada por colección y acción— un
   * grupo con 3 materias daba una lista plana de 12 enlaces.
   *
   * Dentro de la sección la etiqueta es solo la clave ("TC2005B"): la cabecera
   * ya dice qué acción es, repetirlo sería "Páginas → TC2005B — Páginas".
   */
  const secciones = useMemo(() => {
    // Cada sección corresponde a un MÓDULO: solo aparecen las colecciones que lo
    // tienen habilitado para el grupo (Grupo.modulosDeshabilitados).
    const enlaces = (
      moduloKey: string,
      hacerHref: (c: ColeccionGrupo) => string,
      sufijo: string,
      externo?: boolean,
    ): EnlaceColeccion[] =>
      colecciones
        .filter((c) => moduloHabilitado(modulosDeshabilitados, c.id, moduloKey))
        .map((c) => ({
          key: `${c.slug}-${sufijo}`,
          label: c.clave || c.slug.toUpperCase(),
          href: hacerHref(c),
          externo,
        }));

    // `grupo=` no filtra nada: mantiene el contexto. Sin él, al salir a
    // /admin/paginas el sidebar dejaría de estar en modo grupo y perderías su
    // navegación justo al usarla.
    const ctx = (ruta: string, c: ColeccionGrupo) =>
      `/admin/${ruta}?coleccion=${c.id}&grupo=${grupoId}`;

    return [
      {
        key: 'contenido',
        titulo: 'Contenido',
        icono: 'menu_book',
        items: enlaces('documentacion', (c) => `/contenidos/${c.slug}/`, 'doc', true),
      },
      {
        key: 'paginas',
        titulo: 'Páginas',
        icono: 'article',
        items: enlaces('paginas', (c) => ctx('paginas', c), 'paginas'),
      },
      {
        key: 'competencias',
        titulo: 'Competencias',
        icono: 'emoji_events',
        items: enlaces('competencias', (c) => ctx('competencias', c), 'competencias'),
      },
      {
        key: 'actividades',
        titulo: 'Actividades',
        icono: 'assignment',
        items: enlaces('actividades', (c) => ctx('actividades', c), 'actividades'),
      },
    ];
  }, [colecciones, modulosDeshabilitados, grupoId]);

  // La agenda del alumno es la de SU grupo seleccionado; viaja en el payload de
  // sesión, así que no hace falta pedirla.
  const agendaAlumnoHref =
    role === 'alumno'
      ? user?.grupos?.find((g) => g.id === selectedGrupoId)?.urlAgendaEntrevistas ?? null
      : null;

  // Enlace "Ejercicios (vista alumno)" del grupo abierto: primera colección del
  // grupo con el módulo 'ejercicios' ENCENDIDO. Se calcula de lo ya cargado del
  // grupo (colecciones + modulosDeshabilitados), así queda acotado a ESE grupo —
  // tanto para el profesor como para el admin que lo revisa.
  const ejerciciosGrupoHref = useMemo(() => {
    const col = colecciones.find((c) => moduloHabilitado(modulosDeshabilitados, c.id, 'ejercicios'));
    return col ? `/contenidos/${col.slug}/ejercicios` : null;
  }, [colecciones, modulosDeshabilitados]);

  const items = isGrupoDetail
    ? getGrupoDetailItems(grupoId!, agendaGrupoHref, ejerciciosGrupoHref)
    : getSidebarItems(
        role,
        role === 'alumno' ? selectedGrupoId : undefined,
        user?.perfilCompleto,
        docsHref,
        agendaAlumnoHref,
        ejerciciosHref,
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
            {/* El profesor no tiene "todos los grupos" que ver: su contexto ES su
                grupo. En vez de "Volver a Grupos", solo la etiqueta del grupo. */}
            {esProfesor ? (
              <div className={styles.logo}>
                <Icon name="school" size="lg" />
                {!collapsed && (
                  <span className={styles.grupoLabel}>
                    {grupoName ? `Grupo: ${grupoName}` : 'Mi grupo'}
                  </span>
                )}
              </div>
            ) : (
              <>
                <Link to="/admin/grupos" className={styles.backButton} onClick={onCloseMobile}>
                  <Icon name="arrow_back" size="sm" />
                  {!collapsed && <span>Volver a Grupos</span>}
                </Link>
                {!collapsed && (
                  <span className={styles.grupoLabel}>
                    {grupoName ? `Grupo: ${grupoName}` : `Grupo: ${grupoId}`}
                  </span>
                )}
              </>
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
        {esProfesor && user?.grupos && user.grupos.length > 1 && !collapsed && (
          // Profesor con varios grupos: cambiar de grupo = navegar a su detalle.
          <div className={styles.grupoSelector}>
            <label className={styles.grupoSelectorLabel}>Grupo</label>
            <select
              className={styles.grupoSelect}
              value={grupoId ?? ''}
              onChange={(e) => navigate(`/admin/grupos/${e.target.value}`)}
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
              {/* Las secciones de colección (Páginas/Actividades) llevan a
                  pantallas GLOBALES admin-only; el profesor no las ve. */}
              {isGrupoDetail && !esProfesor &&
                (colecciones.length === 0 ? (
                  // Sin materia asignada no hay nada que separar en cuatro: una
                  // sola entrada que lo diga, en vez de cuatro secciones vacías.
                  <SeccionColecciones titulo="Contenido" icono="menu_book" items={[]} collapsed={collapsed} />
                ) : (
                  // Una sección sin colecciones (módulo apagado en todas) no se
                  // muestra: el menú refleja exactamente lo asignado.
                  secciones
                    .filter((s) => s.items.length > 0)
                    .map((s) => (
                      <SeccionColecciones
                        key={s.key}
                        titulo={s.titulo}
                        icono={s.icono}
                        items={s.items}
                        collapsed={collapsed}
                      />
                    ))
                ))}
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
