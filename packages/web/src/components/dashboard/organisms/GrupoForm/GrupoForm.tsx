import { useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './GrupoForm.module.css';

interface GrupoData {
  id?: string;
  name: string;
  fechaInicio?: string;
  fechaFin?: string;
}

interface GrupoFormProps {
  grupo?: GrupoData;
  onSave: (data: { name: string; fechaInicio?: string; fechaFin?: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

function toDateString(value?: string | Date): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

export default function GrupoForm({ grupo, onSave, onCancel, loading }: GrupoFormProps) {
  const [name, setName] = useState(grupo?.name ?? '');
  const [fechaInicio, setFechaInicio] = useState(toDateString(grupo?.fechaInicio));
  const [fechaFin, setFechaFin] = useState(toDateString(grupo?.fechaFin));
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setError('');
    onSave({
      name: name.trim(),
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
    });
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
        <DashButton disabled={loading} onClick={() => {
          if (!name.trim()) { setError('El nombre es requerido'); return; }
          setError('');
          onSave({ name: name.trim(), fechaInicio: fechaInicio || undefined, fechaFin: fechaFin || undefined });
        }}>
          {loading ? 'Guardando...' : grupo ? 'Actualizar' : 'Crear'}
        </DashButton>
      </div>
    </form>
  );
}
