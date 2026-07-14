import { useState, useEffect, useCallback, useRef } from 'react';
import { confirmar } from '../../../../utils/dialogos';
import { useParams, Link } from 'react-router';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { renderMarkdown } from '@tc2005b/contenido-pipeline';
import { useAuth } from '../../../../context/AuthContext';
import { useColeccionArbol } from '../../../../context/ColeccionArbolContext';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import type { DocumentoData } from '../../../../types/contenidos';
import '../../../../styles/contenido-render.css';
import styles from './EditorContenidoPage.module.css';

const API_BASE = '/api';
const AUTOSAVE_MS = 1500;
const PREVIEW_MS = 300;

type EstadoGuardado = 'cargando' | 'guardado' | 'dirty' | 'guardando' | 'error';

/** Qué mitades del split se ven. 'ambos' es el comportamiento de siempre. */
type Vista = 'codigo' | 'ambos' | 'preview';
const VISTA_KEY = 'cms:editor:vista';

function leerVista(): Vista {
  const v = localStorage.getItem(VISTA_KEY);
  return v === 'codigo' || v === 'preview' ? v : 'ambos';
}

interface VersionInfo {
  id: string;
  numero: number;
  mensaje: string | null;
  autor: { id: string; name: string | null } | null;
  esBorrador: boolean;
  esPublicada: boolean;
  createdAt: string;
}

interface RecursoInfo {
  id: string;
  nombre: string;
  mime: string;
  bytes: number;
  referencia: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

interface EditorProps {
  /**
   * Cuando el editor va embebido (dentro de la página de la colección) recibe
   * los ids por props; como ruta propia los saca de useParams. Embebido, además,
   * no pinta su cabecera de página completa ni calcula su alto contra el
   * viewport: se adapta al contenedor.
   */
  coleccionId?: string;
  docId?: string;
  embebido?: boolean;
}

/**
 * Editor del CMS "Contenidos" (design §3): CodeMirror + preview en vivo con
 * el MISMO pipeline unified que renderiza al publicar — WYSIWYG real.
 * Autosave a borrador único; publicar congela una versión; historial/restaurar.
 */
export default function EditorContenidoPage({
  coleccionId: propColeccionId,
  docId: propDocId,
  embebido = false,
}: EditorProps = {}) {
  const params = useParams<{ id: string; docId: string }>();
  const id = propColeccionId ?? params.id;
  const docId = propDocId ?? params.docId;
  const { sessionToken } = useAuth();
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const [documento, setDocumento] = useState<DocumentoData | null>(null);
  const [cuerpo, setCuerpo] = useState('');
  const [estado, setEstado] = useState<EstadoGuardado>('cargando');
  const [error, setError] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  // Se recuerda entre sesiones: quien escribe en una pantalla chica no quiere
  // volver a colapsar el preview cada vez que entra.
  const [vista, setVistaState] = useState<Vista>(leerVista);

  function setVista(v: Vista) {
    setVistaState(v);
    localStorage.setItem(VISTA_KEY, v);
  }

  const [publicarOpen, setPublicarOpen] = useState(false);
  const [mensajePublicar, setMensajePublicar] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [publicarError, setPublicarError] = useState('');

  const { cambiarPublicacion } = useColeccionArbol();
  const [cambiandoVisibilidad, setCambiandoVisibilidad] = useState(false);

  const [historialOpen, setHistorialOpen] = useState(false);
  const [versiones, setVersiones] = useState<VersionInfo[]>([]);
  const [historialError, setHistorialError] = useState('');
  const [verCuerpo, setVerCuerpo] = useState<{ numero: number; cuerpo: string } | null>(null);

  const [recursosOpen, setRecursosOpen] = useState(false);
  const [recursos, setRecursos] = useState<RecursoInfo[]>([]);
  const [recursosCargando, setRecursosCargando] = useState(false);
  const [recursosError, setRecursosError] = useState('');
  // Contador (no booleano): varios pegados concurrentes no deben apagar el
  // indicador cuando termina solo el primero.
  const [subidasActivas, setSubidasActivas] = useState(0);
  const subiendo = subidasActivas > 0;
  const archivoInputRef = useRef<HTMLInputElement>(null);

  // El autosave usa refs para leer el estado más reciente sin recrear timers.
  const cuerpoRef = useRef(cuerpo);
  cuerpoRef.current = cuerpo;
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const documentoRef = useRef(documento);
  documentoRef.current = documento;
  // Single-flight: nunca dos PUT de borrador en paralelo (dos escrituras
  // concurrentes sobre un documento sin borrador duplicarían versiones).
  const saveEnVuelo = useRef<Promise<boolean> | null>(null);

  function cancelarAutosave() {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  /* ── Carga inicial: el editor queda bloqueado hasta tener el cuerpo real ── */
  const cargar = useCallback(async () => {
    if (!docId) return;
    setEstado('cargando');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/documentos/${docId}/borrador`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'No se pudo cargar el documento');
      }
      const json = await res.json();
      setDocumento(json.documento);
      setCuerpo(json.cuerpo ?? '');
      setEstado('guardado');
    } catch (err: any) {
      setError(err.message);
      setEstado('error');
    }
  }, [docId, sessionToken]);

  useEffect(() => {
    cargar();
    // Al cambiar de documento (o desmontar) hay que resolver un autosave que
    // siga en el debounce. Cancelarlo a secas —como se hacía— PERDÍA hasta
    // AUTOSAVE_MS de escritura. Pero dejar correr el timer tampoco vale: para
    // cuando dispare, `cuerpoRef` ya apunta al cuerpo del documento NUEVO y lo
    // escribiría en el borrador del viejo.
    //
    // Así que se vacía a mano, con los valores del documento que dejamos: el
    // cleanup cierra sobre el `docId` de este efecto, y `cuerpoRef.current`
    // todavía no ha sido reemplazado (`cargar()` del nuevo documento es async y
    // corre después). Se encadena al PUT en vuelo para no romper el
    // single-flight.
    return () => {
      const habiaPendiente = autosaveTimer.current !== null;
      cancelarAutosave();
      if (!habiaPendiente || !docId || !documentoRef.current) return;

      const cuerpoPendiente = cuerpoRef.current;
      const enVuelo = saveEnVuelo.current;
      const flush = (enVuelo ? enVuelo.catch(() => {}) : Promise.resolve()).then(() =>
        fetch(`${API_BASE}/admin/documentos/${docId}/borrador`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken ?? '' },
          body: JSON.stringify({ cuerpo: cuerpoPendiente }),
        }).then(() => undefined),
      );
      // No se puede await en un cleanup: se deja en vuelo, pero registrado, para
      // que el siguiente guardado del MISMO documento no adelante a éste.
      saveEnVuelo.current = flush.then(() => true).catch(() => false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargar, docId, sessionToken]);

  /* ── Autosave debounced a borrador único ── */
  const guardar = useCallback(async (): Promise<boolean> => {
    // Guardas anti-pérdida: sin documento cargado NO se guarda (un PUT con el
    // editor vacío pisaría el borrador real del servidor).
    if (!docId || !documentoRef.current) return false;
    // Single-flight: esperar el PUT en vuelo y luego guardar lo más reciente.
    if (saveEnVuelo.current) await saveEnVuelo.current.catch(() => {});

    const vuelo = (async () => {
      setEstado('guardando');
      try {
        const res = await fetch(`${API_BASE}/admin/documentos/${docId}/borrador`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ cuerpo: cuerpoRef.current }),
        });
        if (!res.ok) throw new Error();
        setEstado('guardado');
        return true;
      } catch {
        setEstado('error');
        setError('No se pudo guardar el borrador. Reintenta (⌘S).');
        return false;
      }
    })();
    saveEnVuelo.current = vuelo;
    try {
      return await vuelo;
    } finally {
      saveEnVuelo.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, sessionToken]);

  function onCambio(valor: string) {
    setCuerpo(valor);
    setEstado('dirty');
    setError('');
    cancelarAutosave();
    autosaveTimer.current = setTimeout(() => { guardar(); }, AUTOSAVE_MS);
  }

  // Aviso al salir con cambios sin guardar.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (estadoRef.current === 'dirty' || estadoRef.current === 'guardando') e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  /* ── Plantilla ──
     Vive en la toolbar (y no en un panel de metadatos aparte) porque es una
     propiedad del contenido: se decide mientras se escribe. */
  async function cambiarPlantilla(valor: string) {
    if (!docId || !documento) return;
    const plantilla = (valor || null) as DocumentoData['plantilla'];
    const previo = documento.plantilla;
    setDocumento({ ...documento, plantilla }); // optimista
    try {
      const res = await fetch(`${API_BASE}/admin/documentos/${docId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ plantilla }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setDocumento((d) => (d ? { ...d, plantilla: previo } : d)); // revertir
      setError('No se pudo cambiar la plantilla.');
    }
  }

  /* ── Preview en vivo (solo Markdown; el HTML crudo se sirve sandboxeado en US-5) ── */
  const esMd = documento?.tipo === 'md';
  useEffect(() => {
    if (!esMd) return;
    const timer = setTimeout(() => {
      renderMarkdown(cuerpo).then(setPreviewHtml).catch(() => {});
    }, PREVIEW_MS);
    return () => clearTimeout(timer);
  }, [cuerpo, esMd]);

  /* ── Atajos: ⌘S guardar · ⌘⇧P publicar ──
     Mismas guardas que los botones: sin documento cargado (o cargando/error
     de carga) NO se guarda ni publica — un PUT con el editor vacío pisaría
     el borrador real. */
  function onKeyDown(e: React.KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.key.toLowerCase() === 's' && !e.shiftKey) {
      e.preventDefault();
      if (!documento || estado === 'cargando') return;
      cancelarAutosave();
      guardar();
    }
    if (e.key.toLowerCase() === 'p' && e.shiftKey) {
      e.preventDefault();
      if (!documento || estado === 'cargando' || estado === 'error') return;
      abrirPublicar();
    }
  }

  /* ── Toolbar: insertar snippets en el cursor ── */
  function insertar(antes: string, despues = '', relleno = '') {
    const view = editorRef.current?.view;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const seleccion = view.state.sliceDoc(from, to) || relleno;
    const texto = `${antes}${seleccion}${despues}`;
    view.dispatch({
      changes: { from, to, insert: texto },
      selection: { anchor: from + antes.length, head: from + antes.length + seleccion.length },
    });
    view.focus();
  }

  const SNIPPET_TABLA = '\n| Columna | Columna |\n| ------- | ------- |\n|         |         |\n';
  const SNIPPET_ADMONITION = '\n:::note Título\nContenido.\n:::\n';
  const SNIPPET_CODIGO = '\n```js\n// código\n```\n';

  /* ── Recursos: subir e insertar referencia `recurso:` (US-4) ── */
  async function subirArchivo(file: File): Promise<void> {
    if (!documento?.coleccionId || !docId) return;
    setSubidasActivas((n) => n + 1);
    setError('');
    try {
      const form = new FormData();
      form.append('archivo', file);
      form.append('coleccionId', documento.coleccionId);
      form.append('documentoId', docId);
      const res = await fetch(`${API_BASE}/admin/recursos`, {
        method: 'POST',
        headers: { 'x-session-token': sessionToken ?? '' }, // sin Content-Type: FormData pone el boundary
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al subir el archivo (límite: 50 MB)');
      }
      const json = await res.json();
      const esImagen = (json.recurso?.mime ?? '').startsWith('image/');
      const nombre = json.recurso?.nombre ?? file.name;
      insertar(`\n${esImagen ? '!' : ''}[${nombre}](${json.referencia})\n`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubidasActivas((n) => n - 1);
    }
  }

  /**
   * Solo pegados DENTRO del panel de fuente: a nivel de página secuestraría
   * el paste de los inputs de los modales (publicar/historial/recursos).
   * Secuencial: el orden de inserción respeta el orden de los archivos.
   */
  async function onPasteFuente(e: React.ClipboardEvent) {
    const archivos = [...(e.clipboardData?.files ?? [])];
    if (!archivos.length || !documento) return;
    e.preventDefault();
    for (const f of archivos) await subirArchivo(f);
  }

  async function abrirRecursos() {
    if (!documento?.coleccionId) return;
    setRecursosError('');
    setRecursos([]); // sin lista vieja: otro admin pudo borrar/subir entre aperturas
    setRecursosCargando(true);
    setRecursosOpen(true);
    try {
      const res = await fetch(
        `${API_BASE}/admin/colecciones/${documento.coleccionId}/recursos?documentoId=${docId}`,
        { headers: { 'x-session-token': sessionToken ?? '' } },
      );
      if (!res.ok) throw new Error('No se pudieron cargar los recursos');
      const json = await res.json();
      setRecursos(json.recursos ?? []);
    } catch (err: any) {
      setRecursosError(err.message);
    } finally {
      setRecursosCargando(false);
    }
  }

  async function eliminarRecurso(r: RecursoInfo) {
    if (!(await confirmar({ titulo: `¿Eliminar "${r.nombre}"?`, texto: `Las páginas que lo referencien mostrarán un enlace roto.`, confirmar: 'Eliminar', peligro: true }))) return;
    setRecursosError('');
    try {
      const res = await fetch(`${API_BASE}/admin/recursos/${r.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('No se pudo eliminar');
      setRecursos((prev) => prev.filter((x) => x.id !== r.id));
    } catch (err: any) {
      setRecursosError(err.message);
    }
  }

  /* ── Visibilidad (mostrar/ocultar a los alumnos) ──
   * Distinto de Publicar: no congela el borrador en una versión, solo enciende
   * o apaga la página en el árbol del alumno. Va por el contexto del árbol para
   * que el punto del sidebar quede al día sin recargar. */
  async function toggleVisibilidad() {
    if (!docId || !documento) return;
    const ocultar = documento.publicado;
    if (ocultar) {
      const ok = await confirmar({
        titulo: `¿Ocultar «${documento.titulo}»?`,
        texto: 'Dejará de aparecer para los alumnos. El contenido se conserva: '
          + 'al volver a mostrarla quedará igual que ahora.',
        confirmar: 'Ocultar',
      });
      if (!ok) return;
    }
    setCambiandoVisibilidad(true);
    const err = await cambiarPublicacion(docId, !ocultar);
    setCambiandoVisibilidad(false);
    if (err) {
      setError(err);
      return;
    }
    setDocumento({ ...documento, publicado: !ocultar });
  }

  /* ── Publicar ── */
  function abrirPublicar() {
    setMensajePublicar('');
    setPublicarError('');
    setPublicarOpen(true);
  }

  async function publicar() {
    if (!docId || !documento) return;
    setPublicando(true);
    setPublicarError('');
    try {
      // Asegurar que lo visible en pantalla es lo que se publica. `guardar`
      // es single-flight: si hay un autosave en vuelo, espera y reenvía lo último.
      if (estadoRef.current !== 'guardado') {
        cancelarAutosave();
        const ok = await guardar();
        if (!ok) throw new Error('No se pudo guardar el borrador antes de publicar');
      }
      const res = await fetch(`${API_BASE}/admin/documentos/${docId}/publicar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mensaje: mensajePublicar.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al publicar');
      }
      const json = await res.json();
      setDocumento(json.documento);
      setPublicarOpen(false);
    } catch (err: any) {
      setPublicarError(err.message);
    } finally {
      setPublicando(false);
    }
  }

  /* ── Historial ── */
  async function abrirHistorial() {
    setHistorialError('');
    setVerCuerpo(null);
    setHistorialOpen(true);
    try {
      const res = await fetch(`${API_BASE}/admin/documentos/${docId}/versiones`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('No se pudo cargar el historial');
      const json = await res.json();
      setVersiones(json.versiones ?? []);
    } catch (err: any) {
      setHistorialError(err.message);
    }
  }

  async function verVersion(v: VersionInfo) {
    setHistorialError('');
    try {
      const res = await fetch(`${API_BASE}/admin/documentos/${docId}/versiones/${v.id}`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('No se pudo cargar la versión');
      const json = await res.json();
      setVerCuerpo({ numero: v.numero, cuerpo: json.version?.cuerpo ?? '' });
    } catch (err: any) {
      setHistorialError(err.message);
    }
  }

  async function restaurarVersion(v: VersionInfo) {
    if (!(await confirmar({ titulo: `¿Restaurar la v${v.numero} al borrador?`, texto: `El contenido actual del borrador se reemplaza.` }))) return;
    // Un autosave pendiente (timer) o en vuelo (PUT) aterrizaría DESPUÉS del
    // restore y pisaría el borrador restaurado.
    cancelarAutosave();
    if (saveEnVuelo.current) await saveEnVuelo.current.catch(() => {});
    setHistorialError('');
    try {
      const res = await fetch(`${API_BASE}/admin/documentos/${docId}/versiones/${v.id}/restaurar`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'No se pudo restaurar');
      }
      const json = await res.json();
      setCuerpo(json.cuerpo ?? '');
      setEstado('guardado'); // el borrador restaurado YA está en el servidor
      setHistorialOpen(false);
    } catch (err: any) {
      setHistorialError(err.message);
    }
  }

  const ESTADO_LABEL: Record<EstadoGuardado, string> = {
    cargando: 'Cargando…',
    guardado: 'Borrador guardado',
    dirty: 'Cambios sin guardar',
    guardando: 'Guardando…',
    error: 'Error al guardar',
  };

  function formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className={`${styles.page} ${embebido ? styles.embebido : ''}`} onKeyDown={onKeyDown}>
      <div className={styles.header}>
        {embebido ? (
          <Link
            to={`/admin/contenidos/${id}/editar/${docId}`}
            className={styles.volver}
            title="Abrir a pantalla completa"
          >
            <Icon name="open_in_full" size="sm" />
          </Link>
        ) : (
          <Link to={`/admin/contenidos/${id}`} className={styles.volver} title="Volver a la colección">
            <Icon name="arrow_back" size="sm" />
          </Link>
        )}
        <div className={styles.tituloWrap}>
          <span className={styles.titulo} title={documento?.titulo}>{documento?.titulo ?? '…'}</span>
          <span className={styles.subtitulo}>
            {documento?.tipo === 'html' ? 'HTML crudo' : 'Markdown'}
            {documento?.publicado ? ' · publicada' : ' · oculta'}
          </span>
        </div>
        <span className={`${styles.estado} ${estado === 'error' ? styles.estadoError : ''}`}>
          <span className={`${styles.dot} ${styles[`dot-${estado}`]}`} />
          {ESTADO_LABEL[estado]}
        </span>
        {/* Solo con una versión publicada detrás: mostrar una página que nunca se
            publicó no tendría nada que servirle al alumno (el API lo rechaza). */}
        {documento?.versionId && (
          <DashButton
            variant="outline"
            onClick={toggleVisibilidad}
            disabled={cambiandoVisibilidad}
          >
            <Icon name={documento.publicado ? 'visibility_off' : 'visibility'} size="sm" />
            {documento.publicado ? ' Ocultar' : ' Mostrar'}
          </DashButton>
        )}
        <DashButton variant="outline" onClick={abrirHistorial}>🕘 Historial</DashButton>
        <DashButton onClick={abrirPublicar} disabled={estado === 'cargando' || estado === 'error'}>
          Publicar
        </DashButton>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          {estado === 'error' && !documento && (
            <DashButton variant="outline" onClick={cargar}>Reintentar</DashButton>
          )}
        </div>
      )}

      {esMd && (
        <div className={styles.toolbar}>
          <button type="button" title="Negritas" onClick={() => insertar('**', '**', 'texto')}><b>B</b></button>
          <button type="button" title="Cursivas" onClick={() => insertar('*', '*', 'texto')}><i>I</i></button>
          <button type="button" title="Encabezado" onClick={() => insertar('\n## ', '', 'Encabezado')}>H2</button>
          <span className={styles.sep} />
          <button type="button" title="Código en línea" onClick={() => insertar('`', '`', 'código')}>{'</>'}</button>
          <button type="button" title="Bloque de código" onClick={() => insertar(SNIPPET_CODIGO)}>{ '```' }</button>
          <button type="button" title="Enlace" onClick={() => insertar('[', '](https://)', 'texto')}>🔗</button>
          <button type="button" title="Tabla" onClick={() => insertar(SNIPPET_TABLA)}>▦ Tabla</button>
          <button type="button" title="Admonition" onClick={() => insertar(SNIPPET_ADMONITION)}>💡 Nota</button>
          <span className={styles.sep} />
          <button type="button" title="Subir imagen o archivo (o pega una imagen)" onClick={() => archivoInputRef.current?.click()} disabled={subiendo}>
            {subiendo ? '⏳ Subiendo…' : '🖼️ Subir'}
          </button>
          <button type="button" title="Recursos del documento" onClick={abrirRecursos}>📎 Recursos</button>

          <span className={styles.sep} />
          <select
            className={styles.plantillaSelect}
            value={documento?.plantilla ?? ''}
            onChange={(e) => cambiarPlantilla(e.target.value)}
            disabled={!documento}
            title="Plantilla de la página"
          >
            <option value="">Sin plantilla</option>
            <option value="laboratorio">Laboratorio</option>
            <option value="lectura">Lectura</option>
            <option value="temario">Temario</option>
          </select>

          {/* Colapsar código o preview. Solo en Markdown: el HTML crudo no tiene
              preview en vivo, así que no hay nada entre lo que elegir. */}
          <div className={styles.vistaGrupo} role="group" aria-label="Vista del editor">
            <button
              type="button"
              className={vista === 'codigo' ? styles.vistaActiva : ''}
              onClick={() => setVista('codigo')}
              title="Solo código"
              aria-pressed={vista === 'codigo'}
            >
              <Icon name="code" size="sm" />
            </button>
            <button
              type="button"
              className={vista === 'ambos' ? styles.vistaActiva : ''}
              onClick={() => setVista('ambos')}
              title="Código y vista previa"
              aria-pressed={vista === 'ambos'}
            >
              <Icon name="vertical_split" size="sm" />
            </button>
            <button
              type="button"
              className={vista === 'preview' ? styles.vistaActiva : ''}
              onClick={() => setVista('preview')}
              title="Solo vista previa"
              aria-pressed={vista === 'preview'}
            >
              <Icon name="visibility" size="sm" />
            </button>
          </div>

          <span className={styles.atajos}>⌘S guardar · ⌘⇧P publicar</span>
        </div>
      )}
      <input
        ref={archivoInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) subirArchivo(f);
          e.target.value = '';
        }}
      />

      {/* El HTML crudo no tiene preview: se fuerza 'ambos' para que el hint siga
          apareciendo y el usuario no acabe con un panel vacío por una preferencia
          que eligió en un documento Markdown. */}
      {(() => {
        const vistaEfectiva: Vista = esMd ? vista : 'ambos';
        const verCodigo = vistaEfectiva !== 'preview';
        const verPreview = vistaEfectiva !== 'codigo';
        return (
          <div className={`${styles.split} ${styles[`split-${vistaEfectiva}`]}`}>
            {/* El editor se mantiene MONTADO aunque esté oculto: desmontarlo
                tiraría el historial de deshacer de CodeMirror y la posición del
                cursor cada vez que alternas de vista. */}
            <div
              className={`${styles.fuente} ${!verCodigo ? styles.oculto : ''}`}
              onPaste={onPasteFuente}
              aria-hidden={!verCodigo}
            >
              <CodeMirror
                ref={editorRef}
                value={cuerpo}
                onChange={onCambio}
                editable={documento !== null && estado !== 'cargando'}
                theme={oneDark}
                extensions={[esMd ? markdown() : html(), EditorView.lineWrapping]}
                basicSetup={{ foldGutter: true, highlightActiveLine: true }}
                className={styles.codemirror}
              />
            </div>
            {esMd ? (
              <div className={`${styles.preview} ${!verPreview ? styles.oculto : ''}`} aria-hidden={!verPreview}>
                {/* Seguro: previewHtml SIEMPRE sale de renderMarkdown(), cuyo pipeline
                    aplica rehype-sanitize (allowlist) — scripts/handlers/iframes se
                    eliminan. Es el mismo HTML que servirá producción (design §3). */}
                <div className="contenido-render" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            ) : (
              <div className={styles.preview}>
                <p className={styles.hint}>
                  Las páginas HTML se muestran sandboxeadas en el visor (iframe aislado, US-5) — sin preview en vivo aquí.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Modal publicar ── */}
      <Modal isOpen={publicarOpen} onClose={() => setPublicarOpen(false)} title="Publicar versión">
        <div className={styles.modalCuerpo}>
          {publicarError && <div className={styles.error}>{publicarError}</div>}
          <p className={styles.hint}>
            Se congela el borrador como la nueva versión publicada (los alumnos con acceso la verán en el visor).
          </p>
          <label className={styles.campo}>
            <span>¿Qué cambió? (opcional)</span>
            <input
              className={styles.input}
              value={mensajePublicar}
              onChange={(e) => setMensajePublicar(e.target.value)}
              placeholder="p. ej. nuevo ejercicio de flexbox"
              disabled={publicando}
            />
          </label>
          <div className={styles.modalAcciones}>
            <DashButton variant="outline" onClick={() => setPublicarOpen(false)} disabled={publicando}>
              Cancelar
            </DashButton>
            <DashButton onClick={publicar} disabled={publicando}>
              {publicando ? 'Publicando…' : 'Publicar'}
            </DashButton>
          </div>
        </div>
      </Modal>

      {/* ── Modal recursos ── */}
      <Modal isOpen={recursosOpen} onClose={() => setRecursosOpen(false)} title="Recursos del documento">
        <div className={styles.modalCuerpo}>
          {recursosError && <div className={styles.error}>{recursosError}</div>}
          {recursosCargando ? (
            <p className={styles.hint}>Cargando…</p>
          ) : recursos.length === 0 ? (
            <p className={styles.hint}>Sin recursos. Sube uno con 🖼️ o pega una imagen en el editor.</p>
          ) : (
            <div className={styles.versiones}>
              {recursos.map((r) => (
                <div key={r.id} className={styles.version}>
                  <div className={styles.versionInfo}>
                    <span>{r.mime.startsWith('image/') ? '🖼️' : '📦'}</span>
                    <b className={styles.recursoNombre} title={r.nombre}>{r.nombre}</b>
                    <span className={styles.versionMeta}>{formatBytes(r.bytes)}</span>
                  </div>
                  <div className={styles.versionAcciones}>
                    <DashButton
                      variant="outline"
                      onClick={() => {
                        insertar(`\n${r.mime.startsWith('image/') ? '!' : ''}[${r.nombre}](${r.referencia})\n`);
                        setRecursosOpen(false);
                      }}
                    >
                      Insertar
                    </DashButton>
                    <DashButton variant="outline" onClick={() => eliminarRecurso(r)}>Eliminar</DashButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Modal historial ── */}
      <Modal isOpen={historialOpen} onClose={() => setHistorialOpen(false)} title="Historial de versiones">
        <div className={styles.modalCuerpo}>
          {historialError && <div className={styles.error}>{historialError}</div>}
          {verCuerpo ? (
            <>
              <div className={styles.verBarra}>
                <b>v{verCuerpo.numero}</b>
                <DashButton variant="outline" onClick={() => setVerCuerpo(null)}>← Volver al historial</DashButton>
              </div>
              <pre className={styles.verCuerpo}>{verCuerpo.cuerpo}</pre>
            </>
          ) : versiones.length === 0 ? (
            <p className={styles.hint}>Sin versiones todavía.</p>
          ) : (
            <div className={styles.versiones}>
              {versiones.map((v) => (
                <div key={v.id} className={styles.version}>
                  <div className={styles.versionInfo}>
                    <b>v{v.numero}</b>
                    {v.esBorrador && <span className={`${styles.pill} ${styles.pillBorr}`}>borrador</span>}
                    {v.esPublicada && <span className={`${styles.pill} ${styles.pillPub}`}>publicada</span>}
                    <span className={styles.versionMeta}>
                      {v.autor?.name ?? '—'} · {formatFecha(v.createdAt)}
                      {v.mensaje ? ` · "${v.mensaje}"` : ''}
                    </span>
                  </div>
                  <div className={styles.versionAcciones}>
                    <DashButton variant="outline" onClick={() => verVersion(v)}>Ver</DashButton>
                    {!v.esBorrador && (
                      <DashButton variant="outline" onClick={() => restaurarVersion(v)}>Restaurar</DashButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
