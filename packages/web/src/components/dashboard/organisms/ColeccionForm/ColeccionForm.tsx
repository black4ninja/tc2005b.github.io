import { useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import { slugify, slugifyInput } from '../../../../utils/slug';
import styles from './ColeccionForm.module.css';
import type { ColeccionData } from '../../../../types/contenidos';

interface ColeccionSavePayload {
  nombre: string;
  slug: string;
  clave?: string;
  descripcion?: string;
  publicada?: boolean;
}

interface ColeccionFormProps {
  coleccion?: ColeccionData;
  /** Error del servidor (p. ej. slug duplicado) — se muestra dentro del modal. */
  errorExterno?: string;
  onSave: (data: ColeccionSavePayload) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ColeccionForm({ coleccion, errorExterno, onSave, onCancel, loading }: ColeccionFormProps) {
  const [nombre, setNombre] = useState(coleccion?.nombre ?? '');
  const [slug, setSlug] = useState(coleccion?.slug ?? '');
  const [slugTocado, setSlugTocado] = useState(!!coleccion);
  const [clave, setClave] = useState(coleccion?.clave ?? '');
  const [descripcion, setDescripcion] = useState(coleccion?.descripcion ?? '');
  const [publicada, setPublicada] = useState(coleccion?.publicada ?? false);
  const [error, setError] = useState('');

  function handleNombre(v: string) {
    setNombre(v);
    if (!slugTocado) setSlug(slugify(v));
    setError('');
  }

  function doSave() {
    const slugFinal = slugify(slug);
    if (!nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (!slugFinal) {
      setError('El slug es requerido');
      return;
    }
    setError('');
    onSave({
      nombre: nombre.trim(),
      slug: slugFinal,
      clave: clave.trim() || undefined,
      descripcion: descripcion.trim() || undefined,
      ...(coleccion ? { publicada } : {}),
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
        label="Nombre"
        placeholder="Nombre de la colección"
        icon="menu_book"
        value={nombre}
        onChange={handleNombre}
        error={error}
        disabled={loading}
      />
      <TextInput
        label="Slug (ruta: /contenidos/<slug>/)"
        placeholder="tc2005b"
        icon="link"
        value={slug}
        onChange={(v) => { setSlug(slugifyInput(v)); setSlugTocado(true); setError(''); }}
        disabled={loading}
      />
      <TextInput
        label="Clave (nomenclatura CLAVE — Nombre)"
        placeholder="TC2005B"
        icon="tag"
        value={clave}
        onChange={(v) => setClave(v.toUpperCase())}
        disabled={loading}
      />
      <div className={styles.field}>
        <label className={styles.label}>Descripción</label>
        <textarea
          className={styles.textarea}
          rows={2}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          disabled={loading}
        />
      </div>
      {coleccion && (
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={publicada}
            onChange={(e) => setPublicada(e.target.checked)}
            disabled={loading}
          />
          <span>Publicada (visible para alumnos con acceso)</span>
        </label>
      )}
      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton disabled={loading} onClick={doSave}>
          {loading ? 'Guardando...' : coleccion ? 'Actualizar' : 'Crear'}
        </DashButton>
      </div>
    </form>
  );
}
