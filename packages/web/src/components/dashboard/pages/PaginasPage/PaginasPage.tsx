import { useState, useEffect, useCallback, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import PaginaForm from '../../organisms/PaginaForm/PaginaForm';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import type { PaginaData, EtiquetaData } from '../../../../types/pagina';
import { randomUUID } from '../../../../utils/uuid';
import styles from './PaginasPage.module.css';

const API_BASE = '/api';

const COLOR_PRESETS = [
  { bg: '#dcfce7', text: '#166534', label: 'Verde' },
  { bg: '#dbeafe', text: '#1e40af', label: 'Azul' },
  { bg: '#fef3c7', text: '#92400e', label: 'Amarillo' },
  { bg: '#ede9fe', text: '#5b21b6', label: 'Morado' },
  { bg: '#fee2e2', text: '#991b1b', label: 'Rojo' },
  { bg: '#ffedd5', text: '#9a3412', label: 'Naranja' },
  { bg: '#f0fdfa', text: '#115e59', label: 'Teal' },
  { bg: '#fce7f3', text: '#9d174d', label: 'Rosa' },
];

export default function PaginasPage() {
  const { sessionToken } = useAuth();

  const [paginas, setPaginas] = useState<PaginaData[]>([]);
  const [etiquetas, setEtiquetas] = useState<EtiquetaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editPagina, setEditPagina] = useState<PaginaData | undefined>();
  const [previewPagina, setPreviewPagina] = useState<PaginaData | undefined>();
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string | null>(null);

  // Etiquetas CRUD state
  const [etiquetasOpen, setEtiquetasOpen] = useState(false);
  const [newTagNombre, setNewTagNombre] = useState('');
  const [newTagColorIdx, setNewTagColorIdx] = useState(0);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagNombre, setEditTagNombre] = useState('');
  const [editTagColorIdx, setEditTagColorIdx] = useState(0);

  const etiquetaMap = useMemo(() => {
    const map = new Map<string, EtiquetaData>();
    etiquetas.forEach((e) => map.set(e.id, e));
    return map;
  }, [etiquetas]);

  const paginasFiltradas = useMemo(() => {
    if (!filtroEtiqueta) return paginas;
    return paginas.filter((p) => p.etiquetas?.includes(filtroEtiqueta));
  }, [paginas, filtroEtiqueta]);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchPaginas = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/paginas`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('Error al cargar páginas');
      const data = await res.json();
      setPaginas(data.paginas);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  const fetchEtiquetas = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/etiquetas`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('Error al cargar etiquetas');
      const data = await res.json();
      setEtiquetas(data.etiquetas);
    } catch (err: any) {
      setError(err.message);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchPaginas();
    fetchEtiquetas();
  }, [fetchPaginas, fetchEtiquetas]);

  // ── Page handlers ──────────────────────────────────────────────

  function openCreate() {
    setEditPagina(undefined);
    setPreviewPagina(undefined);
    setModalOpen(true);
  }

  function openEdit(pagina: PaginaData) {
    setEditPagina(pagina);
    setPreviewPagina(undefined);
    setModalOpen(true);
  }

  function openPreview(pagina: PaginaData) {
    setPreviewPagina(pagina);
    setEditPagina(undefined);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditPagina(undefined);
    setPreviewPagina(undefined);
  }

  async function handleSave(data: Omit<PaginaData, 'id' | 'createdAt' | 'updatedAt'>) {
    setSaving(true);
    setError('');
    try {
      const url = editPagina
        ? `${API_BASE}/admin/paginas/${editPagina.id}`
        : `${API_BASE}/admin/paginas`;
      const method = editPagina ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar');
      }
      closeModal();
      await fetchPaginas();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(pagina: PaginaData) {
    if (!confirm(`¿Eliminar la página "${pagina.titulo}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/paginas/${pagina.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchPaginas();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDuplicate(pagina: PaginaData) {
    try {
      const existingSlugs = new Set(paginas.map((p) => p.slug));
      let newSlug = `${pagina.slug}-copia`;
      let counter = 2;
      while (existingSlugs.has(newSlug)) {
        newSlug = `${pagina.slug}-copia-${counter}`;
        counter++;
      }

      const newBloques = pagina.bloques.map((b) => ({
        ...b,
        id: randomUUID(),
      }));

      const res = await fetch(`${API_BASE}/admin/paginas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          titulo: `${pagina.titulo} (copia)`,
          slug: newSlug,
          descripcion: pagina.descripcion ?? '',
          icono: pagina.icono ?? 'article',
          grupoId: pagina.grupoId ?? null,
          bloques: newBloques,
          publicado: false,
          etiquetas: pagina.etiquetas ?? [],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al duplicar');
      }
      await fetchPaginas();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleTogglePublicado(pagina: PaginaData) {
    try {
      const res = await fetch(`${API_BASE}/admin/paginas/${pagina.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ publicado: !pagina.publicado }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      await fetchPaginas();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // ── Etiqueta CRUD handlers ────────────────────────────────────

  async function handleCreateTag() {
    const nombre = newTagNombre.trim();
    if (!nombre) return;
    const preset = COLOR_PRESETS[newTagColorIdx];
    try {
      const res = await fetch(`${API_BASE}/admin/etiquetas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nombre, color: preset.bg, textColor: preset.text }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al crear etiqueta');
      }
      setNewTagNombre('');
      setNewTagColorIdx(0);
      await fetchEtiquetas();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startEditTag(tag: EtiquetaData) {
    setEditingTagId(tag.id);
    setEditTagNombre(tag.nombre);
    const idx = COLOR_PRESETS.findIndex((c) => c.bg === tag.color);
    setEditTagColorIdx(idx >= 0 ? idx : 0);
  }

  async function handleUpdateTag() {
    if (!editingTagId) return;
    const nombre = editTagNombre.trim();
    if (!nombre) return;
    const preset = COLOR_PRESETS[editTagColorIdx];
    try {
      const res = await fetch(`${API_BASE}/admin/etiquetas/${editingTagId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ nombre, color: preset.bg, textColor: preset.text }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al actualizar etiqueta');
      }
      setEditingTagId(null);
      await fetchEtiquetas();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteTag(tag: EtiquetaData) {
    if (!confirm(`¿Eliminar la etiqueta "${tag.nombre}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/etiquetas/${tag.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Error al eliminar etiqueta');
      if (filtroEtiqueta === tag.id) setFiltroEtiqueta(null);
      await fetchEtiquetas();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // ── Table columns ─────────────────────────────────────────────

  const columnHelper = createColumnHelper<PaginaData>();
  const columns = [
    columnHelper.accessor('titulo', {
      header: 'Título',
      cell: (info) => <span className={styles.truncate} title={info.getValue()}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('slug', {
      header: 'Slug',
      cell: (info) => <code>/paginas/{info.getValue()}</code>,
    }),
    columnHelper.accessor('publicado', {
      header: 'Estado',
      cell: (info) => info.getValue()
        ? <span className={`${styles.badge} ${styles.badgePublicado}`}>Publicado</span>
        : <span className={`${styles.badge} ${styles.badgeBorrador}`}>Borrador</span>,
    }),
    columnHelper.accessor('grupoId', {
      header: 'Alcance',
      cell: (info) => info.getValue()
        ? <span>Grupo</span>
        : <span className={`${styles.badge} ${styles.badgeGlobal}`}>Global</span>,
    }),
    columnHelper.accessor('etiquetas', {
      header: 'Etiquetas',
      cell: (info) => {
        const tagIds = info.getValue() ?? [];
        if (tagIds.length === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        return (
          <div className={styles.tagCell}>
            {tagIds.map((tagId) => {
              const tag = etiquetaMap.get(tagId);
              if (!tag) return null;
              return (
                <span
                  key={tagId}
                  className={styles.tagBadge}
                  style={{ background: tag.color, color: tag.textColor }}
                >
                  {tag.nombre}
                </span>
              );
            })}
          </div>
        );
      },
    }),
    columnHelper.accessor('bloques', {
      header: 'Bloques',
      cell: (info) => info.getValue()?.length ?? 0,
    }),
  ];

  const getActions = (pagina: PaginaData): ActionItem[] => [
    { label: 'Editar', icon: 'edit', onClick: () => openEdit(pagina) },
    { label: 'Vista previa', icon: 'visibility', onClick: () => openPreview(pagina) },
    {
      label: pagina.publicado ? 'Despublicar' : 'Publicar',
      icon: pagina.publicado ? 'unpublished' : 'publish',
      onClick: () => handleTogglePublicado(pagina),
    },
    { label: 'Duplicar', icon: 'content_copy', onClick: () => handleDuplicate(pagina) },
    { label: 'Eliminar', icon: 'delete', onClick: () => handleDelete(pagina), variant: 'danger' },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Páginas</h1>

      {error && <div className={styles.error}>{error}</div>}

      {/* ── Etiquetas collapsible CRUD ── */}
      <div className={styles.etiquetasSection}>
        <button
          type="button"
          className={styles.etiquetasToggle}
          onClick={() => setEtiquetasOpen(!etiquetasOpen)}
        >
          <span className="material-icons">
            {etiquetasOpen ? 'expand_less' : 'expand_more'}
          </span>
          <span className="material-icons">label</span>
          Etiquetas ({etiquetas.length})
        </button>

        {etiquetasOpen && (
          <div className={styles.etiquetasBody}>
            {/* Create new tag */}
            <div className={styles.tagCreateRow}>
              <input
                type="text"
                value={newTagNombre}
                onChange={(e) => setNewTagNombre(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag(); } }}
                placeholder="Nueva etiqueta..."
                className={styles.tagInput}
              />
              <div className={styles.colorPicker}>
                {COLOR_PRESETS.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.colorDot} ${newTagColorIdx === i ? styles.colorDotActive : ''}`}
                    style={{ background: c.bg, borderColor: c.text }}
                    title={c.label}
                    onClick={() => setNewTagColorIdx(i)}
                  />
                ))}
              </div>
              <button type="button" className={styles.tagCreateBtn} onClick={handleCreateTag}>
                <span className="material-icons">add</span>
                Crear
              </button>
            </div>

            {/* List existing tags */}
            {etiquetas.length === 0 && (
              <p className={styles.tagEmpty}>No hay etiquetas creadas.</p>
            )}
            <div className={styles.tagGrid}>
              {etiquetas.map((tag) => (
                <div key={tag.id} className={styles.tagRow}>
                  {editingTagId === tag.id ? (
                    <>
                      <input
                        type="text"
                        value={editTagNombre}
                        onChange={(e) => setEditTagNombre(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUpdateTag(); } }}
                        className={styles.tagInput}
                      />
                      <div className={styles.colorPicker}>
                        {COLOR_PRESETS.map((c, i) => (
                          <button
                            key={i}
                            type="button"
                            className={`${styles.colorDot} ${editTagColorIdx === i ? styles.colorDotActive : ''}`}
                            style={{ background: c.bg, borderColor: c.text }}
                            title={c.label}
                            onClick={() => setEditTagColorIdx(i)}
                          />
                        ))}
                      </div>
                      <button type="button" className={styles.tagSaveBtn} onClick={handleUpdateTag} title="Guardar">
                        <span className="material-icons">check</span>
                      </button>
                      <button type="button" className={styles.tagCancelBtn} onClick={() => setEditingTagId(null)} title="Cancelar">
                        <span className="material-icons">close</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className={styles.tagBadge}
                        style={{ background: tag.color, color: tag.textColor }}
                      >
                        {tag.nombre}
                      </span>
                      <div className={styles.tagRowActions}>
                        <button type="button" className={styles.tagActionBtn} onClick={() => startEditTag(tag)} title="Editar">
                          <span className="material-icons">edit</span>
                        </button>
                        <button type="button" className={`${styles.tagActionBtn} ${styles.tagActionBtnDanger}`} onClick={() => handleDeleteTag(tag)} title="Eliminar">
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Tag filter bar ── */}
      {etiquetas.length > 0 && (
        <div className={styles.tagFilter}>
          <span className={styles.tagFilterLabel}>
            <span className="material-icons">filter_list</span>
            Filtrar:
          </span>
          {etiquetas.map((tag) => {
            const active = filtroEtiqueta === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                className={`${styles.tagFilterBtn} ${active ? styles.tagFilterBtnActive : ''}`}
                style={{
                  background: active ? tag.textColor : tag.color,
                  color: active ? '#fff' : tag.textColor,
                  borderColor: tag.textColor,
                }}
                onClick={() => setFiltroEtiqueta(active ? null : tag.id)}
              >
                {tag.nombre}
              </button>
            );
          })}
          {filtroEtiqueta && (
            <button
              type="button"
              className={styles.tagFilterClear}
              onClick={() => setFiltroEtiqueta(null)}
            >
              <span className="material-icons">close</span>
              Limpiar
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <AdminTable
          title="Páginas del sitio"
          columns={columns}
          data={paginasFiltradas}
          actions={getActions}
          onAdd={openCreate}
          addLabel="Crear Página"
          emptyMessage="No hay páginas registradas"
          searchPlaceholder="Buscar página..."
          pagination={100}
          initialSorting={[{ id: 'slug', desc: false }]}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={previewPagina ? `Vista previa: ${previewPagina.titulo}` : (editPagina ? 'Editar Página' : 'Nueva Página')}
        wide
      >
        <PaginaForm
          pagina={editPagina ?? previewPagina}
          etiquetas={etiquetas}
          onSave={handleSave}
          onCancel={closeModal}
          loading={saving}
          previewMode={!!previewPagina}
        />
      </Modal>
    </div>
  );
}
