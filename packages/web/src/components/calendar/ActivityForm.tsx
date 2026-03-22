import { useState } from 'react';
import type { ActividadTipo } from '@/types/calendario';
import DashButton from '@/components/dashboard/atoms/DashButton/DashButton';
import styles from './ActivityForm.module.css';

const TIPO_OPTIONS: { value: ActividadTipo; label: string }[] = [
  { value: 'lab', label: 'Laboratorio' },
  { value: 'lectura', label: 'Lectura' },
  { value: 'ejercicio', label: 'Ejercicio' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'evaluacion', label: 'Evaluación' },
  { value: 'trabajo', label: 'Trabajo en clase' },
  { value: 'discusion', label: 'Discusión / Resolución de dudas' },
  { value: 'info', label: 'Información / Caso de estudio' },
  { value: 'break', label: 'Descanso' },
  { value: 'asueto', label: 'Asueto' },
];

export interface ActivityFormData {
  tipo: ActividadTipo;
  titulo?: string;
  descripcion?: string;
  enlace?: string;
  externo?: boolean;
  duracion?: string;
  fechaEntrega?: string;
}

interface ActivityFormProps {
  onSave: (data: ActivityFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Partial<ActivityFormData>;
  mode?: 'create' | 'edit';
}

export default function ActivityForm({ onSave, onCancel, loading, initialData, mode = 'create' }: ActivityFormProps) {
  const [tipo, setTipo] = useState<ActividadTipo>(initialData?.tipo ?? 'lab');
  const [titulo, setTitulo] = useState(initialData?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? '');
  const [enlace, setEnlace] = useState(initialData?.enlace ?? '');
  const [externo, setExterno] = useState(initialData?.externo ?? false);
  const [duracion, setDuracion] = useState(initialData?.duracion ?? '');
  const [fechaEntrega, setFechaEntrega] = useState(initialData?.fechaEntrega ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: ActivityFormData = { tipo };

    if (mode === 'edit') {
      // En modo edición, enviar todos los campos para permitir limpiarlos
      data.titulo = titulo.trim();
      data.descripcion = descripcion.trim();
      data.enlace = enlace.trim();
      data.externo = enlace.trim() ? externo : false;
      data.duracion = duracion.trim();
      data.fechaEntrega = fechaEntrega.trim();
    } else {
      // En modo creación, solo enviar campos con contenido
      if (titulo.trim()) data.titulo = titulo.trim();
      if (descripcion.trim()) data.descripcion = descripcion.trim();
      if (enlace.trim()) {
        data.enlace = enlace.trim();
        data.externo = externo;
      }
      if (duracion.trim()) data.duracion = duracion.trim();
      if (fechaEntrega.trim()) data.fechaEntrega = fechaEntrega.trim();
    }

    onSave(data);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label>Tipo de actividad *</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as ActividadTipo)}>
          {TIPO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label>Título</label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título de la actividad"
        />
      </div>

      <div className={styles.field}>
        <label>Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción (opcional)"
        />
      </div>

      <div className={styles.field}>
        <label>Enlace</label>
        <input
          type="text"
          value={enlace}
          onChange={(e) => setEnlace(e.target.value)}
          placeholder="URL o ruta interna (/labs/lab1)"
        />
      </div>

      {enlace.trim() && (
        <div className={`${styles.field} ${styles.checkboxField}`}>
          <input
            type="checkbox"
            id="externo-check"
            checked={externo}
            onChange={(e) => setExterno(e.target.checked)}
          />
          <label htmlFor="externo-check">Enlace externo (abre en nueva pestaña)</label>
        </div>
      )}

      <div className={styles.field}>
        <label>Duración</label>
        <input
          type="text"
          value={duracion}
          onChange={(e) => setDuracion(e.target.value)}
          placeholder="ej. 30 min, 1h 50min"
        />
      </div>

      <div className={styles.field}>
        <label>Fecha de entrega</label>
        <input
          type="text"
          value={fechaEntrega}
          onChange={(e) => setFechaEntrega(e.target.value)}
          placeholder="ej. Viernes 27 de marzo"
        />
      </div>

      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton variant="primary" type="submit" disabled={loading}>
          {loading ? 'Guardando...' : (mode === 'edit' ? 'Guardar cambios' : 'Crear actividad')}
        </DashButton>
      </div>
    </form>
  );
}
