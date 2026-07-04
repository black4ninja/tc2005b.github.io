import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import type { TocEntry } from '@tc2005b/contenido-pipeline';
import { useAuth } from '../../context/AuthContext';
import Icon from '../dashboard/atoms/Icon/Icon';
import '../../styles/contenido-render.css';
import styles from './VisorContenidoPage.module.css';

const API_BASE = '/api';
const TEMA_KEY = 'contenidos-tema';
const ARBOL_KEY = 'contenidos-arbol-oculto';

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
  toc: TocEntry[];
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
  const { sessionToken, user } = useAuth();

  const [coleccion, setColeccion] = useState<{ slug: string; nombre: string; clave: string | null } | null>(null);
  const [misColecciones, setMisColecciones] = useState<{ slug: string; nombre: string; clave: string | null }[]>([]);
  const [arbol, setArbol] = useState<NodoVisor[]>([]);
  const [pagina, setPagina] = useState<PaginaVisor | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  // Un 500/red caída NO es un 404: el usuario tiene derecho a reintentar.
  const [errorCarga, setErrorCarga] = useState(false);
  const [paginaNoEncontrada, setPaginaNoEncontrada] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [oscuro, setOscuro] = useState(() => localStorage.getItem(TEMA_KEY) === 'oscuro');
  // Árbol lateral colapsable: útil al presentar contenido con alumnos (estorba).
  const [arbolOculto, setArbolOculto] = useState(() => localStorage.getItem(ARBOL_KEY) === '1');
  const [reintento, setReintento] = useState(0);
  const articleRef = useRef<HTMLElement>(null);

  // Búsqueda (US-5): server-side, con scope por permisos.
  const [consulta, setConsulta] = useState('');
  const [resultados, setResultados] = useState<
    { titulo: string; coleccion: string; clave: string | null; path: string; snippet: string }[]
  >([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState(false);

  // Páginas html: se descargan con el MISMO auth que el resto del visor
  // (header x-session-token) y se montan como blob en el iframe sandboxeado
  // — un src directo solo podría autenticarse por cookie.
  const [htmlBlobUrl, setHtmlBlobUrl] = useState<string | null>(null);
  const [htmlError, setHtmlError] = useState(false);

  const path = (pathParam ?? '').replace(/\/+$/, '');
  const rutaPanel = user?.userType === 'admin' ? '/admin' : '/alumno';

  function toggleTema() {
    setOscuro((v) => {
      localStorage.setItem(TEMA_KEY, v ? 'claro' : 'oscuro');
      return !v;
    });
  }

  function toggleArbol() {
    setArbolOculto((v) => {
      localStorage.setItem(ARBOL_KEY, v ? '0' : '1');
      return !v;
    });
  }

  // Botón "copiar" en cada bloque de código. El cuerpo se inserta como HTML
  // (dangerouslySetInnerHTML), así que enriquecemos los <pre> tras el render;
  // al cambiar de página React reemplaza el HTML y el efecto vuelve a correr.
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    // Icono Material como texto (ligadura) — sin innerHTML, sin riesgo de XSS.
    const icono = (nombre: string) => {
      const s = document.createElement('span');
      s.className = 'material-icons';
      s.textContent = nombre;
      return s;
    };
    article.querySelectorAll('pre').forEach((pre) => {
      if (pre.querySelector('.contenido-copy-btn')) return; // idempotente
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'contenido-copy-btn';
      btn.setAttribute('aria-label', 'Copiar código');
      btn.appendChild(icono('content_copy'));
      const confirmar = () => {
        btn.classList.add('copiado');
        btn.replaceChildren(icono('check'));
        window.setTimeout(() => {
          btn.classList.remove('copiado');
          btn.replaceChildren(icono('content_copy'));
        }, 1500);
      };
      btn.addEventListener('click', () => {
        const codigo = (pre.querySelector('code')?.textContent ?? '').replace(/\n$/, '');
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(codigo).then(confirmar).catch(() => {});
        } else {
          // Contextos no seguros (http) o sin Clipboard API: fallback clásico.
          const ta = document.createElement('textarea');
          ta.value = codigo;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand('copy');
            confirmar();
          } catch {
            /* sin portapapeles disponible */
          }
          document.body.removeChild(ta);
        }
      });
      pre.appendChild(btn);
    });
  }, [pagina]);

  /* ── Árbol de la colección (autorizado por request) ── */
  useEffect(() => {
    if (!slug) return;
    let cancelado = false;
    setCargando(true);
    setNoEncontrado(false);
    setErrorCarga(false);
    fetch(`${API_BASE}/contenidos/${slug}/arbol`, {
      headers: { 'x-session-token': sessionToken ?? '' },
    })
      .then(async (r) => {
        if (cancelado) return;
        if (r.status === 404 || r.status === 401) {
          setNoEncontrado(true);
          return;
        }
        if (!r.ok) {
          setErrorCarga(true); // 500/transitorio: NO es "no existe"
          return;
        }
        const json = await r.json();
        if (cancelado) return;
        setColeccion(json.coleccion);
        setArbol(json.arbol ?? []);
        // Categorías del primer nivel abiertas por defecto.
        setExpandidos(new Set((json.arbol ?? []).filter((n: NodoVisor) => n.tipo === 'categoria').map((n: NodoVisor) => n.id)));
      })
      .catch(() => { if (!cancelado) setErrorCarga(true); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [slug, sessionToken, reintento]);

  /* ── Mis colecciones (switcher del topbar cuando hay más de una) ── */
  useEffect(() => {
    if (!sessionToken) return;
    fetch(`${API_BASE}/me/colecciones`, { headers: { 'x-session-token': sessionToken } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (json) setMisColecciones(json.colecciones ?? []); })
      .catch(() => {});
  }, [sessionToken]);

  /* ── Búsqueda debounced (el server aplica el scope de permisos) ── */
  useEffect(() => {
    const q = consulta.trim();
    if (q.length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    let cancelado = false;
    setBuscando(true);
    setErrorBusqueda(false);
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/contenidos/busqueda?q=${encodeURIComponent(q)}`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      })
        .then(async (r) => {
          if (cancelado) return;
          if (!r.ok) {
            // 401/500 NO son "sin resultados": el usuario debe distinguirlo.
            setResultados([]);
            setErrorBusqueda(true);
            return;
          }
          const json = await r.json();
          if (!cancelado) setResultados(json?.resultados ?? []);
        })
        .catch(() => { if (!cancelado) { setResultados([]); setErrorBusqueda(true); } })
        .finally(() => { if (!cancelado) setBuscando(false); });
    }, 300);
    return () => { cancelado = true; clearTimeout(timer); };
  }, [consulta, sessionToken]);

  /* ── Página html: descargar autenticado y montar como blob sandboxeado ── */
  useEffect(() => {
    if (!pagina || pagina.tipo !== 'html' || !slug || !path) {
      setHtmlBlobUrl(null);
      setHtmlError(false);
      return;
    }
    let cancelado = false;
    let blobUrl: string | null = null;
    setHtmlError(false);
    fetch(`${API_BASE}/contenidos/${slug}/html/${path}`, {
      headers: { 'x-session-token': sessionToken ?? '' },
    })
      .then(async (r) => {
        if (cancelado) return;
        if (!r.ok) throw new Error();
        const html = await r.text();
        blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        if (!cancelado) setHtmlBlobUrl(blobUrl);
      })
      .catch(() => { if (!cancelado) setHtmlError(true); });
    return () => {
      cancelado = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [pagina, slug, path, sessionToken]);

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

  /* ── Error transitorio (500/red): distinto de 404, con reintento ── */
  if (!cargando && errorCarga) {
    return (
      <div className={`${styles.visor} ${oscuro ? `${styles.oscuro} tema-oscuro` : ''}`}>
        <div className={styles.notFound}>
          <h1>😵</h1>
          <p>No se pudo cargar el contenido. Puede ser un problema temporal.</p>
          <button type="button" className={styles.reintentar} onClick={() => setReintento((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const arbolVacio = !cargando && !noEncontrado && !errorCarga && arbol.length === 0;

  return (
    <div className={`${styles.visor} ${oscuro ? `${styles.oscuro} tema-oscuro` : ''}`}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.arbolToggle}
          onClick={toggleArbol}
          title={arbolOculto ? 'Mostrar menú de contenido' : 'Ocultar menú de contenido'}
          aria-label={arbolOculto ? 'Mostrar menú de contenido' : 'Ocultar menú de contenido'}
          aria-pressed={!arbolOculto}
        >
          <span className="material-icons">{arbolOculto ? 'menu' : 'menu_open'}</span>
        </button>
        <span className={styles.brand} title={coleccion?.nombre}>
          📘 {coleccion ? `${coleccion.clave ? `${coleccion.clave} — ` : ''}${coleccion.nombre}` : '…'}
        </span>
        {misColecciones.length > 1 && (
          <select
            className={styles.switcher}
            value={slug}
            onChange={(e) => navigate(`/contenidos/${e.target.value}/`)}
            title="Cambiar de colección"
          >
            {misColecciones.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.clave ? `${c.clave} — ${c.nombre}` : c.nombre}
              </option>
            ))}
          </select>
        )}
        <div className={styles.buscador}>
          <input
            className={styles.buscadorInput}
            type="search"
            placeholder="🔍 Buscar en tus contenidos…"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
          />
          {consulta.trim().length >= 2 && (
            <div className={styles.buscadorPanel}>
              {buscando ? (
                <div className={styles.buscadorVacio}>Buscando…</div>
              ) : errorBusqueda ? (
                <div className={styles.buscadorVacio}>Error al buscar — reintenta</div>
              ) : resultados.length === 0 ? (
                <div className={styles.buscadorVacio}>Sin resultados</div>
              ) : (
                resultados.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    className={styles.buscadorItem}
                    onClick={() => {
                      setConsulta('');
                      navigate(`/contenidos/${r.coleccion}/${r.path}`);
                    }}
                  >
                    <span className={styles.buscadorTitulo}>
                      {r.clave ? `${r.clave} · ` : ''}{r.titulo}
                    </span>
                    <span className={styles.buscadorSnippet}>{r.snippet}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <span style={{ flex: 1 }} />
        <button type="button" className={styles.temaBtn} onClick={toggleTema} title="Cambiar tema">
          {oscuro ? '☀️' : '🌙'}
        </button>
        <Link to={rutaPanel} className={styles.panelLink}>Mi panel</Link>
      </header>

      <div className={`${styles.cuerpo} ${arbolOculto ? styles.cuerpoSinArbol : ''}`}>
        <nav className={styles.arbol}>
          <div className={styles.arbolTitulo}>Contenido</div>
          {cargando ? <p className={styles.hint}>Cargando…</p> : arbol.map((n) => renderNodo(n, '', 0))}
        </nav>

        <main className={styles.main}>
          {arbolVacio ? (
            <div className={styles.notFound}>
              <h1>📭</h1>
              <p>Esta colección aún no tiene contenido publicado.</p>
            </div>
          ) : paginaNoEncontrada ? (
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
                /* HTML crudo SIEMPRE sandboxeado: sin allow-same-origin el
                   iframe corre en origen opaco — sus scripts no ven cookies
                   ni pueden llamar al API con credenciales (design §3). El
                   server además manda CSP con `sandbox` (defensa doble). */
                htmlError ? (
                  <div className={styles.notFound}><h1>😵</h1><p>No se pudo cargar la demo.</p></div>
                ) : !htmlBlobUrl ? (
                  <p className={styles.hint}>Cargando…</p>
                ) : (
                  <iframe
                    src={htmlBlobUrl}
                    sandbox="allow-scripts"
                    className={styles.htmlFrame}
                    title={pagina.titulo}
                  />
                )
              ) : (
                /* Seguro: cuerpoHtml lo renderizó el SERVIDOR al publicar con el
                   pipeline compartido (rehype-sanitize, allowlist) — scripts,
                   handlers e iframes se eliminan (design §3). El HTML crudo de
                   páginas tipo `html` NUNCA pasa por aquí (iframe sandbox, US-5). */
                <article ref={articleRef} className="contenido-render" dangerouslySetInnerHTML={{ __html: pagina.cuerpoHtml }} />
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
