import { useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import { slugify } from '../ColeccionForm/ColeccionForm';
import styles from './DocumentoForm.module.css';
import type { DocumentoNodo, DocumentoTipo, DocumentoPlantilla } from '../../../../types/contenidos';

export interface DocumentoSavePayload {
  titulo: string;
  slug: string;
  tipo: DocumentoTipo;
  plantilla?: DocumentoPlantilla;
  padreId?: string;
}

interface DocumentoFormProps {
  /** Categorías disponibles como padre (aplanadas, con sangría en el label). */
  categorias: { id: string; label: string }[];
  /** Padre preseleccionado (p. ej. la categoría seleccionada en el árbol). */
  padreInicial?: string;
  onSave: (data: DocumentoSavePayload) => void;
  onCancel: () => void;
  loading?: boolean;
}

/** Aplana las categorías del árbol para el select de padre. */
export function aplanarCategorias(nodos: DocumentoNodo[], nivel = 0): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const n of nodos) {
    if (n.tipo !== 'categoria') continue;
    out.push({ id: n.id, label: `${'— '.repeat(nivel)}${n.titulo}` });
    out.push(...aplanarCategorias(n.hijos, nivel + 1));
  }
  return out;
}

export default function DocumentoForm({ categorias, padreInicial, onSave, onCancel, loading }: DocumentoFormProps) {
  const [titulo, setTitulo] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTocado, setSlugTocado] = useState(false);
  const [tipo, setTipo] = useState<DocumentoTipo>('md');
  const [plantilla, setPlantilla] = useState<'' | DocumentoPlantilla>('');
  const [padreId, setPadreId] = useState(padreInicial ?? '');
  const [error, setError] = useState('');

  function handleTitulo(v: string) {
    setTitulo(v);
    if (!slugTocado) setSlug(slugify(v));
    setError('');
  }

  function doSave() {
    if (!titulo.trim()) {
      setError('El título es requerido');
      return;
    }
    if (!slug.trim()) {
      setError('El slug es requerido');
      return;
    }
    setError('');
    onSave({
      titulo: titulo.trim(),
      slug: slug.trim(),
      tipo,
      plantilla: tipo === 'md' && plantilla ? plantilla : undefined,
      padreId: padreId || undefined,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSave();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <TextInput
        label="Título"
        placeholder="Título de la página"
        icon="article"
        value={titulo}
        onChange={handleTitulo}
        error={error}
        disabled={loading}
      />
      <TextInput
        label="Slug"
        placeholder="lab1-html"
        icon="link"
        value={slug}
        onChange={(v) => { setSlug(slugify(v)); setSlugTocado(true); setError(''); }}
        disabled={loading}
      />
      <div className={styles.field}>
        <label className={styles.label}>Tipo</label>
        <select className={styles.select} value={tipo} onChange={(e) => setTipo(e.target.value as DocumentoTipo)} disabled={loading}>
          <option value="md">Página (Markdown)</option>
          <option value="html">Página (HTML crudo)</option>
          <option value="categoria">Categoría (agrupa páginas)</option>
        </select>
      </div>
      {tipo === 'md' && (
        <div className={styles.field}>
          <label className={styles.label}>Plantilla</label>
          <select className={styles.select} value={plantilla} onChange={(e) => setPlantilla(e.target.value as '' | DocumentoPlantilla)} disabled={loading}>
            <option value="">Sin plantilla</option>
            <option value="laboratorio">Laboratorio</option>
            <option value="lectura">Lectura</option>
            <option value="temario">Temario</option>
          </select>
        </div>
      )}
      <div className={styles.field}>
        <label className={styles.label}>Ubicación</label>
        <select className={styles.select} value={padreId} onChange={(e) => setPadreId(e.target.value)} disabled={loading}>
          <option value="">Raíz de la colección</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton disabled={loading} onClick={doSave}>
          {loading ? 'Creando...' : 'Crear'}
        </DashButton>
      </div>
    </form>
  );
}
