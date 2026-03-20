import { useState } from 'react';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './IndicacionMallaForm.module.css';

interface IndicacionData {
  id?: string;
  descripcion: string;
}

interface IndicacionMallaFormProps {
  indicacion?: IndicacionData;
  onSave: (data: { descripcion: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function IndicacionMallaForm({ indicacion, onSave, onCancel, loading }: IndicacionMallaFormProps) {
  const [descripcion, setDescripcion] = useState(indicacion?.descripcion ?? '');
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!descripcion.trim()) {
      setError('La descripción es requerida');
      return;
    }
    setError('');
    onSave({ descripcion: descripcion.trim() });
  }

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>Descripción</label>
        <textarea
          className={styles.textarea}
          placeholder="Descripción de la indicación..."
          value={descripcion}
          onChange={(e) => { setDescripcion(e.target.value); setError(''); }}
          disabled={loading}
          rows={4}
        />
        {error && <span className={styles.error}>{error}</span>}
      </div>
      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton disabled={loading} onClick={handleSubmit}>
          {loading ? 'Guardando...' : indicacion ? 'Actualizar' : 'Crear'}
        </DashButton>
      </div>
    </div>
  );
}
