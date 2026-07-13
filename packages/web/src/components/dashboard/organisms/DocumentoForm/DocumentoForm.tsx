import { useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import { slugify } from '../../../../utils/slug';
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
  /** Error del servidor (p. ej. slug duplicado) — se muestra dentro del modal. */
  errorExterno?: string;
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

export default function DocumentoForm({ categorias, padreInicial, errorExterno, onSave, onCancel, loading }: DocumentoFormProps) {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<DocumentoTipo>('md');
  const [plantilla, setPlantilla] = useState<'' | DocumentoPlantilla>('');
  const [padreId, setPadreId] = useState(padreInicial ?? '');
  const [error, setError] = useState('');

  // El slug se deriva del título y ya no se edita aquí: al crear no hay nada
  // que apunte a la página todavía, así que generarlo es gratis. Cambiarlo
  // después sí mueve la URL pública, y para eso está la acción del árbol
  // (con su aviso).
  const slug = slugify(titulo);

  function handleTitulo(v: string) {
    setTitulo(v);
    setError('');
  }

  function doSave() {
    if (!titulo.trim()) {
      setError('El título es requerido');
      return;
    }
    if (!slug) {
      setError('El título debe tener al menos una letra o número');
      return;
    }
    setError('');
    onSave({
      titulo: titulo.trim(),
      slug,
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
      {errorExterno && <div className={styles.serverError}>{errorExterno}</div>}
      <TextInput
        label="Título"
        placeholder="Título de la página"
        icon="article"
        value={titulo}
        onChange={handleTitulo}
        error={error}
        disabled={loading}
      />
      {/* El slug no se edita: se muestra para que se vea qué URL va a quedar. */}
      <p className={styles.slugPreview}>
        URL: <code>/{slug || '…'}</code>
      </p>
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
