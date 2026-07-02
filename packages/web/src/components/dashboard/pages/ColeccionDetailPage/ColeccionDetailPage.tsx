import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import DocumentoForm, { aplanarCategorias, type DocumentoSavePayload } from '../../organisms/DocumentoForm/DocumentoForm';
import { slugify } from '../../organisms/ColeccionForm/ColeccionForm';
import { buildArbol } from '../../../../types/contenidos';
import type { ColeccionData, DocumentoData, DocumentoNodo, DocumentoPlantilla } from '../../../../types/contenidos';
import styles from './ColeccionDetailPage.module.css';

const API_BASE = '/api';

const ICONO_TIPO: Record<string, string> = {
  md: 'article',
  html: 'code',
  categoria: 'folder',
};

/** Admin del CMS "Contenidos": árbol de páginas de una colección (design §5.2). */
export default function ColeccionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { sessionToken } = useAuth();

  const [coleccion, setColeccion] = useState<ColeccionData | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Metadatos del documento seleccionado (edición en panel)
  const [metaTitulo, setMetaTitulo] = useState('');
  const [metaSlug, setMetaSlug] = useState('');
  const [metaPlantilla, setMetaPlantilla] = useState<'' | DocumentoPlantilla>('');
  const [moverA, setMoverA] = useState('');

  // Cuerpo (editor provisional; el editor rico llega en la US-2)
  const [cuerpo, setCuerpo] = useState('');
  const [cuerpoDirty, setCuerpoDirty] = useState(false);
  const [cuerpoCargando, setCuerpoCargando] = useState(false);
  const [guardandoCuerpo, setGuardandoCuerpo] = useState(false);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchDatos = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const auth = { 'x-session-token': sessionToken ?? '' };
      const [colRes, docsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/colecciones`, { headers: auth }),
        fetch(`${API_BASE}/admin/colecciones/${id}/documentos`, { headers: auth }),
      ]);
      if (!colRes.ok || !docsRes.ok) throw new Error('Error al cargar la colección');
      const colJson = await colRes.json();
      const docsJson = await docsRes.json();
      const encontrada = (colJson.colecciones ?? []).find((c: ColeccionData) => c.id === id) ?? null;
      if (!encontrada) throw new Error('Colección no encontrada');
      setColeccion(encontrada);
      setDocumentos(docsJson.documentos ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, sessionToken]);

  useEffect(() => {
    fetchDatos();
  }, [fetchDatos]);

  const arbol = useMemo(() => buildArbol(documentos), [documentos]);
  const categorias = useMemo(() => aplanarCategorias(arbol), [arbol]);
  const seleccionado = useMemo(
    () => documentos.find((d) => d.id === seleccionadoId) ?? null,
    [documentos, seleccionadoId],
  );

  // Sincronizar panel + cargar cuerpo al seleccionar.
  useEffect(() => {
    if (!seleccionado) return;
    setMetaTitulo(seleccionado.titulo);
    setMetaSlug(seleccionado.slug);
    setMetaPlantilla(seleccionado.plantilla ?? '');
    setMoverA(seleccionado.padreId ?? '');
    setCuerpo('');
    setCuerpoDirty(false);
    if (seleccionado.tipo === 'categoria') return;

    let cancelado = false;
    setCuerpoCargando(true);
    fetch(`${API_BASE}/admin/documentos/${seleccionado.id}/borrador`, { headers: { 'x-session-token': sessionToken ?? '' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelado && json) setCuerpo(json.cuerpo ?? '');
      })
      .catch(() => {})
      .finally(() => { if (!cancelado) setCuerpoCargando(false); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionadoId]);

  function toggleExpandido(docId: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }

  async function llamada(url: string, method: string, body?: unknown): Promise<boolean> {
    setError('');
    try {
      const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error en la operación');
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }

  async function handleCrear(data: DocumentoSavePayload) {
    setSaving(true);
    const ok = await llamada(`${API_BASE}/admin/colecciones/${id}/documentos`, 'POST', data);
    setSaving(false);
    if (ok) {
      setModalOpen(false);
      if (data.padreId) setExpandidos((prev) => new Set(prev).add(data.padreId!));
      await fetchDatos();
    }
  }

  async function handleGuardarMeta() {
    if (!seleccionado) return;
    const ok = await llamada(`${API_BASE}/admin/documentos/${seleccionado.id}`, 'PUT', {
      titulo: metaTitulo,
      slug: metaSlug,
      plantilla: metaPlantilla || null,
    });
    if (ok) await fetchDatos();
  }

  /** Hermanos del seleccionado (mismo padre), ordenados. */
  function hermanosDe(doc: DocumentoData): DocumentoData[] {
    return documentos
      .filter((d) => (d.padreId ?? null) === (doc.padreId ?? null))
      .sort((a, b) => a.orden - b.orden);
  }

  async function handleReordenar(direccion: -1 | 1) {
    if (!seleccionado) return;
    const hermanos = hermanosDe(seleccionado);
    const idx = hermanos.findIndex((h) => h.id === seleccionado.id);
    const destino = idx + direccion;
    if (destino < 0 || destino >= hermanos.length) return;
    const ok = await llamada(`${API_BASE}/admin/documentos/${seleccionado.id}/mover`, 'PUT', {
      padreId: seleccionado.padreId,
      orden: destino,
    });
    if (ok) await fetchDatos();
  }

  async function handleMoverA() {
    if (!seleccionado) return;
    const nuevoPadre = moverA || null;
    if ((seleccionado.padreId ?? null) === nuevoPadre) return;
    const ok = await llamada(`${API_BASE}/admin/documentos/${seleccionado.id}/mover`, 'PUT', {
      padreId: nuevoPadre,
      orden: documentos.length, // al final; el server lo acota a los hermanos reales
    });
    if (ok) {
      if (nuevoPadre) setExpandidos((prev) => new Set(prev).add(nuevoPadre));
      await fetchDatos();
    }
  }

  async function handleEliminar() {
    if (!seleccionado) return;
    if (!confirm(`¿Eliminar "${seleccionado.titulo}"? Esta acción no se puede deshacer.`)) return;
    const ok = await llamada(`${API_BASE}/admin/documentos/${seleccionado.id}`, 'DELETE');
    if (ok) {
      setSeleccionadoId(null);
      await fetchDatos();
    }
  }

  async function handleGuardarCuerpo() {
    if (!seleccionado) return;
    setGuardandoCuerpo(true);
    const ok = await llamada(`${API_BASE}/admin/documentos/${seleccionado.id}/borrador`, 'PUT', { cuerpo });
    setGuardandoCuerpo(false);
    if (ok) {
      setCuerpoDirty(false);
      await fetchDatos(); // refresca el estado borrador del árbol
    }
  }

  function renderNodo(nodo: DocumentoNodo, nivel: number) {
    const esCategoria = nodo.tipo === 'categoria';
    const abierto = expandidos.has(nodo.id);
    return (
      <div key={nodo.id}>
        <div
          className={`${styles.nodo} ${seleccionadoId === nodo.id ? styles.nodoActivo : ''}`}
          style={{ paddingLeft: 8 + nivel * 18 }}
          onClick={() => setSeleccionadoId(nodo.id)}
        >
          {esCategoria ? (
            <button
              type="button"
              className={styles.chevron}
              onClick={(e) => { e.stopPropagation(); toggleExpandido(nodo.id); }}
              aria-label={abierto ? 'Colapsar' : 'Expandir'}
            >
              <Icon name={abierto ? 'expand_more' : 'chevron_right'} size="sm" />
            </button>
          ) : (
            <span className={styles.chevronHueco} />
          )}
          <Icon name={ICONO_TIPO[nodo.tipo]} size="sm" />
          <span className={styles.nodoTitulo} title={nodo.titulo}>{nodo.titulo}</span>
          {!esCategoria && (
            <span className={`${styles.estado} ${nodo.publicado ? styles.estadoPub : styles.estadoBorr}`}>
              {nodo.publicado ? 'publicada' : 'borrador'}
            </span>
          )}
        </div>
        {esCategoria && abierto && nodo.hijos.map((h) => renderNodo(h, nivel + 1))}
      </div>
    );
  }

  if (loading) return <div className={styles.page}><p>Cargando...</p></div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/admin/contenidos" className={styles.volver}>
          <Icon name="arrow_back" size="sm" />
          <span>Contenidos</span>
        </Link>
        <h1 className={styles.pageTitle}>
          {coleccion ? `${coleccion.clave ? `${coleccion.clave} — ` : ''}${coleccion.nombre}` : id}
        </h1>
        <div className={styles.headerActions}>
          <DashButton onClick={() => setModalOpen(true)}>+ Página / Categoría</DashButton>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.split}>
        <div className={styles.arbolPanel}>
          <div className={styles.panelTitulo}>Árbol de páginas</div>
          {arbol.length === 0 ? (
            <p className={styles.hint}>Aún no hay páginas. Crea la primera con "+ Página / Categoría".</p>
          ) : (
            arbol.map((n) => renderNodo(n, 0))
          )}
        </div>

        <div className={styles.detallePanel}>
          {!seleccionado ? (
            <p className={styles.hint}>Selecciona una página del árbol para editarla.</p>
          ) : (
            <>
              <div className={styles.panelTitulo}>
                {seleccionado.tipo === 'categoria' ? 'Categoría' : `Página (${seleccionado.tipo})`}
              </div>

              <div className={styles.metaGrid}>
                <label className={styles.campo}>
                  <span>Título</span>
                  <input className={styles.input} value={metaTitulo} onChange={(e) => setMetaTitulo(e.target.value)} />
                </label>
                <label className={styles.campo}>
                  <span>Slug</span>
                  <input className={styles.input} value={metaSlug} onChange={(e) => setMetaSlug(slugify(e.target.value))} />
                </label>
                {seleccionado.tipo === 'md' && (
                  <label className={styles.campo}>
                    <span>Plantilla</span>
                    <select className={styles.input} value={metaPlantilla} onChange={(e) => setMetaPlantilla(e.target.value as '' | DocumentoPlantilla)}>
                      <option value="">Sin plantilla</option>
                      <option value="laboratorio">Laboratorio</option>
                      <option value="lectura">Lectura</option>
                      <option value="temario">Temario</option>
                    </select>
                  </label>
                )}
              </div>

              <div className={styles.accionesFila}>
                <DashButton variant="outline" onClick={handleGuardarMeta}>Guardar cambios</DashButton>
                <DashButton variant="outline" onClick={() => handleReordenar(-1)}>↑ Subir</DashButton>
                <DashButton variant="outline" onClick={() => handleReordenar(1)}>↓ Bajar</DashButton>
                <DashButton variant="outline" onClick={handleEliminar}>Eliminar</DashButton>
              </div>

              <div className={styles.moverFila}>
                <span className={styles.moverLabel}>Mover a</span>
                <select className={styles.input} value={moverA} onChange={(e) => setMoverA(e.target.value)}>
                  <option value="">Raíz de la colección</option>
                  {categorias
                    .filter((c) => c.id !== seleccionado.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                </select>
                <DashButton variant="outline" onClick={handleMoverA}>Mover</DashButton>
              </div>

              {seleccionado.tipo !== 'categoria' && (
                <div className={styles.editor}>
                  <div className={styles.editorBarra}>
                    <span className={styles.panelTitulo}>
                      Cuerpo ({seleccionado.tipo === 'md' ? 'Markdown' : 'HTML'})
                    </span>
                    <span className={styles.editorEstado}>
                      {cuerpoCargando ? 'Cargando…' : cuerpoDirty ? 'Cambios sin guardar' : 'Guardado'}
                    </span>
                    <DashButton onClick={handleGuardarCuerpo} disabled={guardandoCuerpo || cuerpoCargando || !cuerpoDirty}>
                      {guardandoCuerpo ? 'Guardando…' : 'Guardar borrador'}
                    </DashButton>
                  </div>
                  <textarea
                    className={styles.textarea}
                    value={cuerpo}
                    onChange={(e) => { setCuerpo(e.target.value); setCuerpoDirty(true); }}
                    disabled={cuerpoCargando}
                    spellCheck={false}
                    placeholder={seleccionado.tipo === 'md' ? '# Escribe el contenido en Markdown…' : '<!-- HTML crudo de la página -->'}
                  />
                  <p className={styles.hint}>Editor provisional — el editor con resaltado y preview llega en la siguiente iteración (US-2).</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nueva página o categoría">
        <DocumentoForm
          categorias={categorias}
          padreInicial={seleccionado?.tipo === 'categoria' ? seleccionado.id : undefined}
          onSave={handleCrear}
          onCancel={() => setModalOpen(false)}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
