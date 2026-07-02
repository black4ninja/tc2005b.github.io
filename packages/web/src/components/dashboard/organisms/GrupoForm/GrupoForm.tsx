import { useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './GrupoForm.module.css';
import type { MateriaRef } from '../../../../types/materia';

interface GrupoData {
  id?: string;
  name: string;
  fechaInicio?: string;
  fechaFin?: string;
  materia?: MateriaRef | null;
  docusaurus?: string[];
}

interface GrupoSavePayload {
  name: string;
  fechaInicio?: string;
  fechaFin?: string;
  materiaId?: string | null;
  docusaurus?: string[];
}

interface GrupoFormProps {
  grupo?: GrupoData;
  materias?: MateriaRef[];
  onSave: (data: GrupoSavePayload) => void;
  onCancel: () => void;
  loading?: boolean;
}

function toDateString(value?: string | Date): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

export default function GrupoForm({ grupo, materias = [], onSave, onCancel, loading }: GrupoFormProps) {
  const [name, setName] = useState(grupo?.name ?? '');
  const [fechaInicio, setFechaInicio] = useState(toDateString(grupo?.fechaInicio));
  const [fechaFin, setFechaFin] = useState(toDateString(grupo?.fechaFin));
  const [materiaId, setMateriaId] = useState(grupo?.materia?.id ?? '');
  const [docusaurus, setDocusaurus] = useState<string[]>(grupo?.docusaurus ?? []);
  const [error, setError] = useState('');

  function toggleDocusaurus(slug: string) {
    setDocusaurus((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function doSave() {
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setError('');
    onSave({
      name: name.trim(),
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      materiaId: materiaId || null,
      docusaurus,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSave();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <TextInput
        label="Nombre"
        placeholder="Nombre del grupo"
        icon="group"
        value={name}
        onChange={(v) => { setName(v); setError(''); }}
        error={error}
        disabled={loading}
      />
      <div className={styles.field}>
        <label className={styles.label}>Materia</label>
        <select
          className={styles.dateInput}
          value={materiaId}
          onChange={(e) => setMateriaId(e.target.value)}
          disabled={loading}
        >
          <option value="">Sin materia</option>
          {materias.map((m) => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Docusaurus con acceso</label>
        <div className={styles.checkboxList}>
          {materias.length === 0 && (
            <span className={styles.hint}>No hay Docusaurus disponibles.</span>
          )}
          {materias.map((m) => {
            const clave = m.codigo || m.slug.toUpperCase();
            const label = `${clave} — ${m.nombre}`;
            return (
              <label key={m.slug} className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={docusaurus.includes(m.slug)}
                  onChange={() => toggleDocusaurus(m.slug)}
                  disabled={loading}
                />
                <span className={styles.checkboxLabel} title={label}>{label}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Fecha de inicio</label>
        <input
          type="date"
          className={styles.dateInput}
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Fecha de fin</label>
        <input
          type="date"
          className={styles.dateInput}
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton disabled={loading} onClick={doSave}>
          {loading ? 'Guardando...' : grupo ? 'Actualizar' : 'Crear'}
        </DashButton>
      </div>
    </form>
  );
}
