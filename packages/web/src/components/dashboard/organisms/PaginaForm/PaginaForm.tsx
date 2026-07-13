import { useState, useEffect } from 'react';
import type { PaginaData, ContentBlock, EtiquetaData, ColeccionRef } from '../../../../types/pagina';
import BlockEditor from '../BlockEditor/BlockEditor';
import PaginaContent from '../../../paginas/PaginaContent';
import DashButton from '../../atoms/DashButton/DashButton';
import { slugify } from '../../../../utils/slug';
import styles from './PaginaForm.module.css';

interface PaginaFormProps {
  pagina?: PaginaData;
  etiquetas?: EtiquetaData[];
  colecciones?: ColeccionRef[];
  onSave: (data: Omit<PaginaData, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  loading?: boolean;
  previewMode?: boolean;
}

export default function PaginaForm({ pagina, etiquetas: availableTags = [], colecciones = [], onSave, onCancel, loading, previewMode }: PaginaFormProps) {
  const [activeTab, setActiveTab] = useState<'editar' | 'preview'>(previewMode ? 'preview' : 'editar');

  const [titulo, setTitulo] = useState(pagina?.titulo ?? '');
  const [slug, setSlug] = useState(pagina?.slug ?? '');
  const [slugManual, setSlugManual] = useState(!!pagina?.slug);
  const [descripcion, setDescripcion] = useState(pagina?.descripcion ?? '');
  const [icono, setIcono] = useState(pagina?.icono ?? 'article');
  const [coleccionId, setColeccionId] = useState(pagina?.coleccionId ?? '');
  const [publicado, setPublicado] = useState(pagina?.publicado ?? false);
  const [bloques, setBloques] = useState<ContentBlock[]>(pagina?.bloques ?? []);
  const [selectedTags, setSelectedTags] = useState<string[]>(pagina?.etiquetas ?? []);

  // Auto-generate slug from title if not manually edited
  useEffect(() => {
    if (!slugManual && titulo) {
      setSlug(slugify(titulo));
    }
  }, [titulo, slugManual]);

  function handleSlugChange(value: string) {
    setSlugManual(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  }

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      titulo: titulo.trim(),
      slug: slug.trim(),
      descripcion: descripcion.trim() || undefined,
      icono: icono.trim() || 'article',
      coleccionId: coleccionId || null,
      bloques,
      publicado,
      etiquetas: selectedTags,
    });
  }

  const previewData: PaginaData = {
    id: pagina?.id ?? 'preview',
    titulo,
    slug,
    descripcion: descripcion || undefined,
    icono,
    coleccionId: coleccionId || null,
    bloques,
    publicado,
  };

  if (previewMode) {
    return (
      <div>
        <div className={styles.previewWrapper}>
          <PaginaContent pagina={previewData} />
        </div>
        <div className={styles.actions}>
          <DashButton variant="outline" onClick={onCancel}>
            Cerrar
          </DashButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'editar' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('editar')}
        >
          <span className="material-icons">edit</span>
          Editar
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'preview' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <span className="material-icons">visibility</span>
          Vista previa
        </button>
      </div>

      {activeTab === 'preview' ? (
        <div className={styles.previewWrapper}>
          <PaginaContent pagina={previewData} />
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.metaGrid}>
            <div className={`${styles.field} ${styles.metaFull}`}>
              <label>Título *</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título de la página"
                required
              />
            </div>

            <div className={styles.field}>
              <label>Slug *</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="mi-pagina"
                required
              />
              <span className={styles.slugPreview}>
                URL: <code>/paginas/{slug || '...'}</code>
              </span>
            </div>

            <div className={styles.field}>
              <label>Icono (Material Icons)</label>
              <input
                type="text"
                value={icono}
                onChange={(e) => setIcono(e.target.value)}
                placeholder="article"
              />
            </div>

            <div className={`${styles.field} ${styles.metaFull}`}>
              <label>Descripción</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción breve (opcional)"
                rows={2}
              />
            </div>

            <div className={styles.field}>
              <label>Colección (materia)</label>
              <select
                value={coleccionId ?? ''}
                onChange={(e) => setColeccionId(e.target.value)}
              >
                <option value="">Sin asignar</option>
                {colecciones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clave ? `${c.clave} — ${c.nombre}` : c.nombre}
                  </option>
                ))}
              </select>
              <span className={styles.slugPreview}>
                Sin asignar, la página no aparece al agregar actividades al calendario
              </span>
            </div>

            <div className={`${styles.field} ${styles.checkboxField}`}>
              <input
                type="checkbox"
                id="publicado-check"
                checked={publicado}
                onChange={(e) => setPublicado(e.target.checked)}
              />
              <label htmlFor="publicado-check">Publicado (visible públicamente)</label>
            </div>

            {availableTags.length > 0 && (
              <div className={`${styles.field} ${styles.metaFull}`}>
                <label>Etiquetas</label>
                <div className={styles.tagList}>
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`${styles.tagBadge} ${isSelected ? styles.tagBadgeSelected : styles.tagBadgeUnselected}`}
                        style={{
                          background: isSelected ? tag.color : 'transparent',
                          color: isSelected ? tag.textColor : tag.textColor,
                          borderColor: tag.textColor,
                        }}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {isSelected && <span className="material-icons" style={{ fontSize: 14 }}>check</span>}
                        {tag.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <BlockEditor bloques={bloques} onChange={setBloques} />

          <div className={styles.actions}>
            <DashButton variant="outline" onClick={onCancel} disabled={loading}>
              Cancelar
            </DashButton>
            <DashButton variant="primary" type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (pagina ? 'Guardar cambios' : 'Crear página')}
            </DashButton>
          </div>
        </form>
      )}
    </div>
  );
}
