import { useState, useEffect, useMemo } from 'react';
import { Link, useMatch, useSearchParams, useNavigate } from 'react-router';
import NavItem from '../../molecules/NavItem/NavItem';
import SeccionColecciones, { type EnlaceColeccion } from '../../molecules/SeccionColecciones/SeccionColecciones';
import Icon from '../../atoms/Icon/Icon';
import GrupoSelect from '../../atoms/GrupoSelect/GrupoSelect';
import ArbolContenidos from './ArbolContenidos';
import ArbolDiagramas from './ArbolDiagramas';
import { getSidebarItems, getGrupoDetailItems } from './sidebarConfig';
import styles from './Sidebar.module.css';
import type { DashboardRole } from '../../../../types/dashboard';
import { useAuth } from '../../../../context/AuthContext';
import { useGrupoActivo } from '../../../../context/GrupoActivoContext';
import { useColeccionArbol } from '../../../../context/ColeccionArbolContext';
import { useDiagramasNav } from '../../../../context/DiagramasNavContext';
import { APP_NAME } from '../../../../config/app';
import { moduloHabilitado } from '../../../../config/modulosContenido';
import { rutaEjerciciosAdmin, rutaEjerciciosAlumno } from '../../../../config/rutasEjercicios';
import { rutaDiagramasAdmin, rutaDiagramasAlumno, rutaTallerAdmin, rutaTallerAlumno } from '../../../../config/rutasDiagramas';

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

  // Dentro del módulo Diagramas el sidebar se vuelve su árbol de secciones,
  // mismo patrón contextual que la colección abierta. Cubre también el solver,
  // para que resolver un ejercicio no cueste perder la navegación.
  const diagramasNav = useDiagramasNav();
  const isDiagramas = diagramasNav.activo;

  const [grupoName, setGrupoName] = useState('');
  // El grupo activo del alumno es COMPARTIDO (contexto): antes era estado local
  // de este componente y el panel no se enteraba de los cambios.
  const { grupoActivoId: selectedGrupoId, cambiarGrupo } = useGrupoActivo();
  const [docsHref, setDocsHref] = useState<string | null>(null);
  const [ejerciciosHref, setEjerciciosHref] = useState<string | null>(null);
  const [diagramasHref, setDiagramasHref] = useState<string | null>(null);
  const [tallerHref, setTallerHref] = useState<string | null>(null);
  const [colecciones, setColecciones] = useState<ColeccionGrupo[]>([]);
  // Módulos apagados por colección del grupo: filtran qué secciones aparecen.
  const [modulosDeshabilitados, setModulosDeshabilitados] = useState<Record<string, string[]>>({});
  // Agenda de entrevistas del grupo abierto (admin). La del alumno sale del
  // payload de sesión (user.grupos), no requiere fetch.
  const [agendaGrupoHref, setAgendaGrupoHref] = useState<string | null>(null);
  // Secciones que el grupo del alumno comparte. `undefined` hasta que responde
  // el servidor: se asume que sí, para no parpadear quitando ítems.
  const [modulosGrupo, setModulosGrupo] = useState<{ malla?: boolean; competencias?: boolean }>({});
  // Hasta que el menú del alumno esté resuelto se pinta un esqueleto: es
  // preferible a enseñar ítems que van a cambiar en cuanto llegue la respuesta.
  const [menuCargado, setMenuCargado] = useState(false);

  // TODO el menú del alumno en UNA petición. Antes eran cinco efectos sueltos
  // (perfil, módulos, colecciones, ejercicios, diagramas) de entre 0,5 y 1,5 s
  // cada uno: el menú se pintaba por etapas y los ítems aparecían y desaparecían
  // según iban llegando. Ahora no se pinta nada hasta tenerlo todo.
  useEffect(() => {
    if (role !== 'alumno' || !selectedGrupoId || !sessionToken) return;
    let cancelado = false;
    setMenuCargado(false);
    fetch(`/api/alumno/grupos/${selectedGrupoId}/menu`, {
      headers: { 'x-session-token': sessionToken },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelado) return;
        const menu = json?.menu;
        if (menu) {
          setModulosGrupo(menu.modulos ?? {});
          updateUser({ perfilCompleto: menu.perfilCompleto ?? false });
          setDocsHref(menu.coleccionSlug ? `/contenidos/${menu.coleccionSlug}/` : null);
          setEjerciciosHref(menu.ejerciciosSlug ? rutaEjerciciosAlumno(menu.ejerciciosSlug) : null);
          setDiagramasHref(menu.diagramasSlug ? rutaDiagramasAlumno(menu.diagramasSlug) : null);
          // El taller no cuelga de una colección, pero solo se ofrece si el
          // módulo está activo para el alumno: sin él no pinta nada en el menú.
          setTallerHref(menu.diagramasSlug ? rutaTallerAlumno() : null);
        }
        // Cargado aunque falle: con un error de red es mejor un menú incompleto
        // que un esqueleto eterno.
        setMenuCargado(true);
      })
      .catch(() => {
        if (!cancelado) setMenuCargado(true);
      });
    return () => {
      cancelado = true;
    };
  }, [role, selectedGrupoId, sessionToken, updateUser]);

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
        // Mismo módulo que el alumno ve como "Wiki": el enlace lleva al mismo
        // visor. La key interna sigue siendo 'documentacion' (la usa el backend).
        key: 'contenido',
        titulo: 'Wiki',
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
    if (!grupoId) return null;
    const col = colecciones.find((c) => moduloHabilitado(modulosDeshabilitados, c.id, 'ejercicios'));
    return col ? rutaEjerciciosAdmin(grupoId, col.slug) : null;
  }, [colecciones, modulosDeshabilitados, grupoId]);

  // Ídem para Diagramas. Se resuelve por separado porque los dos módulos se
  // encienden por separado: un grupo puede tener uno y no el otro.
  const diagramasGrupoHref = useMemo(() => {
    if (!grupoId) return null;
    const col = colecciones.find((c) => moduloHabilitado(modulosDeshabilitados, c.id, 'diagramas'));
    return col ? rutaDiagramasAdmin(grupoId, col.slug) : null;
  }, [colecciones, modulosDeshabilitados, grupoId]);

  // El taller del admin cuelga del grupo abierto, igual que el resto del módulo,
  // y se ofrece bajo la misma condición que Diagramas.
  const tallerGrupoHref = grupoId && diagramasGrupoHref ? rutaTallerAdmin(grupoId) : null;

  /**
   * «Diagramas» como SECCIÓN desplegable y no como dos entradas sueltas:
   * resolver ejercicios y dibujar libremente son dos usos del mismo módulo, y
   * de un vistazo se leían como dos módulos distintos. Reutiliza el mismo
   * componente que agrupa «Contenido», que además se aplana a un enlace directo
   * si solo quedara una de las dos.
   */
  const enlacesDiagramas = useMemo<EnlaceColeccion[]>(() => {
    const listado = isGrupoDetail ? diagramasGrupoHref : diagramasHref;
    const taller = isGrupoDetail ? tallerGrupoHref : tallerHref;
    const enlaces: EnlaceColeccion[] = [];
    if (listado) enlaces.push({ key: 'ejercicios', label: 'Ejercicios', href: listado });
    if (taller) enlaces.push({ key: 'libre', label: 'Libre', href: taller });
    return enlaces;
  }, [isGrupoDetail, diagramasGrupoHref, diagramasHref, tallerGrupoHref, tallerHref]);

  const items = isGrupoDetail
    ? getGrupoDetailItems(grupoId!, agendaGrupoHref, ejerciciosGrupoHref)
    : getSidebarItems(
        role,
        role === 'alumno' ? selectedGrupoId : undefined,
        user?.perfilCompleto,
        docsHref,
        agendaAlumnoHref,
        ejerciciosHref,
        modulosGrupo,
      );

  return (
    <>
      {mobileOpen && <div className={styles.overlay} onClick={onCloseMobile} />}
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}
      >
        {isDiagramas ? (
          <div className={styles.backHeader}>
            <Link
              to={isGrupoDetail ? `/admin/grupos/${grupoId}` : '/alumno'}
              className={styles.backButton}
              onClick={onCloseMobile}
            >
              <Icon name="arrow_back" size="sm" />
              {!collapsed && <span>Salir de Diagramas</span>}
            </Link>
            {!collapsed && <span className={styles.grupoLabel}>Diagramas</span>}
          </div>
        ) : isColeccionDetail ? (
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
        {/* Con UN solo grupo el selector no sirve para elegir, pero sigue
            apareciendo —deshabilitado— porque es donde el alumno lee en qué
            grupo está. Antes, con un grupo, no había ni rastro del nombre. */}
        {role === 'alumno' && user?.grupos && user.grupos.length > 0 && !collapsed && (
          <div className={styles.grupoSelector}>
            <label className={styles.grupoSelectorLabel}>Grupo</label>
            <GrupoSelect
              grupos={user.grupos}
              valor={selectedGrupoId}
              onCambiar={cambiarGrupo}
              disabled={user.grupos.length === 1}
              etiqueta="Grupo"
              title={user.grupos.length === 1 ? 'Estás inscrito en un solo grupo' : undefined}
            />
          </div>
        )}
        {esProfesor && user?.grupos && user.grupos.length > 1 && !collapsed && (
          // Profesor con varios grupos: cambiar de grupo = navegar a su detalle.
          <div className={styles.grupoSelector}>
            <label className={styles.grupoSelectorLabel}>Grupo</label>
            <GrupoSelect
              grupos={user.grupos}
              valor={grupoId ?? ''}
              onCambiar={(id) => navigate(`/admin/grupos/${id}`)}
              etiqueta="Grupo"
            />
          </div>
        )}
        <nav
          className={`${styles.nav} ${(isColeccionDetail || isDiagramas) && !collapsed ? styles.navArbol : ''}`}
        >
          {isDiagramas ? (
            // Colapsado (70px) el árbol es ilegible: se oculta y queda el botón
            // de salida, igual que en el árbol de Contenidos.
            !collapsed && <ArbolDiagramas />
          ) : isColeccionDetail ? (
            // Colapsado (70px) el árbol es ilegible: se oculta y queda solo el
            // botón de volver, que es la salida.
            !collapsed && <ArbolContenidos coleccionId={coleccionId} />
          ) : role === 'alumno' && !menuCargado ? (
            // Esqueleto mientras se resuelve el menú: sin esto el alumno veía
            // aparecer y desaparecer ítems durante más de un segundo.
            <div className={styles.menuSkeleton} aria-busy="true" aria-label="Cargando el menú">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={styles.menuSkeletonItem} />
              ))}
            </div>
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
              {enlacesDiagramas.length > 0 && (
                <SeccionColecciones
                  titulo="Diagramas"
                  icono="schema"
                  items={enlacesDiagramas}
                  collapsed={collapsed}
                />
              )}
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
