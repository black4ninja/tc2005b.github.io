import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import Icon from '../dashboard/atoms/Icon/Icon';
import '../../styles/contenido-render.css';
import styles from './VisorContenidoPage.module.css';

const API_BASE = '/api';
const TEMA_KEY = 'contenidos-tema';

interface NodoVisor {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  hijos: NodoVisor[];
}

interface PaginaVisor {
  titulo: string;
  tipo: string;
  cuerpoHtml: string;
  toc: { id: string; titulo: string; nivel: number }[];
  breadcrumb: { titulo: string; slug: string }[];
  prev: { titulo: string; path: string } | null;
  next: { titulo: string; path: string } | null;
}

/** Primera página (no categoría) del árbol, con su path completo. */
function primeraPagina(arbol: NodoVisor[], prefijo = ''): string | null {
  for (const n of arbol) {
    const path = prefijo ? `${prefijo}/${n.slug}` : n.slug;
    if (n.tipo !== 'categoria') return path;
    const anidada = primeraPagina(n.hijos, path);
    if (anidada) return anidada;
  }
  return null;
}

/**
 * Visor del CMS "Contenidos" (design §4): experiencia de lectura tipo
 * Docusaurus pero server-driven — árbol, breadcrumb, TOC y prev/next llegan
 * ya autorizados y calculados por request. Lo no permitido: 404.
 */
export default function VisorContenidoPage() {
  const { slug, '*': pathParam } = useParams<{ slug: string; '*': string }>();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();

  const [coleccion, setColeccion] = useState<{ slug: string; nombre: string; clave: string | null } | null>(null);
  const [arbol, setArbol] = useState<NodoVisor[]>([]);
  const [pagina, setPagina] = useState<PaginaVisor | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [paginaNoEncontrada, setPaginaNoEncontrada] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [oscuro, setOscuro] = useState(() => localStorage.getItem(TEMA_KEY) === 'oscuro');

  const path = (pathParam ?? '').replace(/\/+$/, '');

  function toggleTema() {
    setOscuro((v) => {
      localStorage.setItem(TEMA_KEY, v ? 'claro' : 'oscuro');
      return !v;
    });
  }

  /* ── Árbol de la colección (autorizado por request) ── */
  useEffect(() => {
    if (!slug) return;
    let cancelado = false;
    setCargando(true);
    setNoEncontrado(false);
    fetch(`${API_BASE}/contenidos/${slug}/arbol`, {
      headers: { 'x-session-token': sessionToken ?? '' },
    })
      .then(async (r) => {
        if (cancelado) return;
        if (!r.ok) {
          setNoEncontrado(true);
          return;
        }
        const json = await r.json();
        if (cancelado) return;
        setColeccion(json.coleccion);
        setArbol(json.arbol ?? []);
        // Categorías del primer nivel abiertas por defecto.
        setExpandidos(new Set((json.arbol ?? []).filter((n: NodoVisor) => n.tipo === 'categoria').map((n: NodoVisor) => n.id)));
      })
      .catch(() => { if (!cancelado) setNoEncontrado(true); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [slug, sessionToken]);

  /* ── Sin path: ir a la primera página del árbol ── */
  useEffect(() => {
    if (cargando || noEncontrado || path) return;
    const primera = primeraPagina(arbol);
    if (primera) navigate(`/contenidos/${slug}/${primera}`, { replace: true });
  }, [cargando, noEncontrado, path, arbol, slug, navigate]);

  /* ── Página actual ── */
  useEffect(() => {
    if (!slug || !path) {
      setPagina(null);
      return;
    }
    let cancelado = false;
    setPaginaNoEncontrada(false);
    fetch(`${API_BASE}/contenidos/${slug}/pagina/${path}`, {
      headers: { 'x-session-token': sessionToken ?? '' },
    })
      .then(async (r) => {
        if (cancelado) return;
        if (!r.ok) {
          setPagina(null);
          setPaginaNoEncontrada(true);
          return;
        }
        const json = await r.json();
        if (!cancelado) setPagina(json.pagina);
      })
      .catch(() => { if (!cancelado) setPaginaNoEncontrada(true); });
    return () => { cancelado = true; };
  }, [slug, path, sessionToken]);

  /* ── Abrir las categorías del path activo ── */
  const idsPathActivo = useMemo(() => {
    const ids: string[] = [];
    let nivel = arbol;
    for (const segmento of path.split('/')) {
      const nodo = nivel.find((n) => n.slug === segmento);
      if (!nodo) break;
      ids.push(nodo.id);
      nivel = nodo.hijos;
    }
    return ids;
  }, [arbol, path]);

  useEffect(() => {
    if (idsPathActivo.length) setExpandidos((prev) => new Set([...prev, ...idsPathActivo]));
  }, [idsPathActivo]);

  function renderNodo(nodo: NodoVisor, prefijo: string, nivel: number) {
    const nodoPath = prefijo ? `${prefijo}/${nodo.slug}` : nodo.slug;
    if (nodo.tipo === 'categoria') {
      const abierto = expandidos.has(nodo.id);
      return (
        <div key={nodo.id}>
          <button
            type="button"
            className={styles.cat}
            style={{ paddingLeft: 10 + nivel * 14 }}
            onClick={() => setExpandidos((prev) => {
              const next = new Set(prev);
              if (next.has(nodo.id)) next.delete(nodo.id);
              else next.add(nodo.id);
              return next;
            })}
          >
            <Icon name={abierto ? 'expand_more' : 'chevron_right'} size="sm" />
            <span>{nodo.titulo}</span>
          </button>
          {abierto && nodo.hijos.map((h) => renderNodo(h, nodoPath, nivel + 1))}
        </div>
      );
    }
    const activo = nodoPath === path;
    return (
      <Link
        key={nodo.id}
        to={`/contenidos/${slug}/${nodoPath}`}
        className={`${styles.item} ${activo ? styles.itemActivo : ''}`}
        style={{ paddingLeft: 10 + nivel * 14 + 20 }}
      >
        {nodo.titulo}
      </Link>
    );
  }

  /* ── 404 de colección: no existe o no tienes acceso — indistinguible ── */
  if (!cargando && noEncontrado) {
    return (
      <div className={`${styles.visor} ${oscuro ? `${styles.oscuro} tema-oscuro` : ''}`}>
        <div className={styles.notFound}>
          <h1>404</h1>
          <p>Página no encontrada.</p>
          <Link to="/login" className={styles.notFoundLink}>Ir al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.visor} ${oscuro ? `${styles.oscuro} tema-oscuro` : ''}`}>
      <header className={styles.topbar}>
        <span className={styles.brand} title={coleccion?.nombre}>
          📘 {coleccion ? `${coleccion.clave ? `${coleccion.clave} — ` : ''}${coleccion.nombre}` : '…'}
        </span>
        <span style={{ flex: 1 }} />
        <button type="button" className={styles.temaBtn} onClick={toggleTema} title="Cambiar tema">
          {oscuro ? '☀️' : '🌙'}
        </button>
        <Link to="/alumno" className={styles.panelLink}>Mi panel</Link>
      </header>

      <div className={styles.cuerpo}>
        <nav className={styles.arbol}>
          <div className={styles.arbolTitulo}>Contenido</div>
          {cargando ? <p className={styles.hint}>Cargando…</p> : arbol.map((n) => renderNodo(n, '', 0))}
        </nav>

        <main className={styles.main}>
          {paginaNoEncontrada ? (
            <div className={styles.notFound}>
              <h1>404</h1>
              <p>Página no encontrada.</p>
            </div>
          ) : !pagina ? (
            <p className={styles.hint}>Cargando…</p>
          ) : (
            <>
              <div className={styles.breadcrumb}>
                {pagina.breadcrumb.map((b, i) => (
                  <span key={i}>
                    {i > 0 && <span className={styles.breadcrumbSep}>/</span>}
                    {b.titulo}
                  </span>
                ))}
              </div>
              {pagina.tipo === 'html' ? (
                <div className={styles.htmlAviso}>
                  <h1>{pagina.titulo}</h1>
                  <p>Esta página es una demo HTML interactiva — se habilita con el visor sandboxeado (próxima iteración).</p>
                </div>
              ) : (
                /* Seguro: cuerpoHtml lo renderizó el SERVIDOR al publicar con el
                   pipeline compartido (rehype-sanitize, allowlist) — scripts,
                   handlers e iframes se eliminan (design §3). El HTML crudo de
                   páginas tipo `html` NUNCA pasa por aquí (iframe sandbox, US-5). */
                <article className="contenido-render" dangerouslySetInnerHTML={{ __html: pagina.cuerpoHtml }} />
              )}
              <div className={styles.prevNext}>
                {pagina.prev ? (
                  <Link to={`/contenidos/${slug}/${pagina.prev.path}`} className={styles.pn}>
                    ← Anterior<b>{pagina.prev.titulo}</b>
                  </Link>
                ) : <span />}
                {pagina.next ? (
                  <Link to={`/contenidos/${slug}/${pagina.next.path}`} className={`${styles.pn} ${styles.pnDer}`}>
                    Siguiente →<b>{pagina.next.titulo}</b>
                  </Link>
                ) : <span />}
              </div>
            </>
          )}
        </main>

        {pagina && pagina.toc.length > 0 && (
          <aside className={styles.toc}>
            <div className={styles.tocTitulo}>En esta página</div>
            {pagina.toc.map((t) => (
              <a key={t.id} href={`#${t.id}`} className={t.nivel === 3 ? styles.tocSub : ''}>
                {t.titulo}
              </a>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}
