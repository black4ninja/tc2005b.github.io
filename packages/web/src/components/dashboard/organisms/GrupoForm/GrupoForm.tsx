import { useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './GrupoForm.module.css';

interface MateriaOption {
  id: string;
  nombre: string;
}

interface GrupoData {
  id?: string;
  name: string;
  fechaInicio?: string;
  fechaFin?: string;
  materia?: { id: string; nombre: string; slug: string } | null;
}

interface GrupoSavePayload {
  name: string;
  fechaInicio?: string;
  fechaFin?: string;
  materiaId?: string | null;
}

interface GrupoFormProps {
  grupo?: GrupoData;
  materias?: MateriaOption[];
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
  const [error, setError] = useState('');

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
