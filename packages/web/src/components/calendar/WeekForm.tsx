import { useState } from 'react';
import DashButton from '@/components/dashboard/atoms/DashButton/DashButton';
import styles from './WeekForm.module.css';

function getNextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface WeekFormData {
  tipo: 'normal' | 'especial';
  fechaInicio: string;
  fechaFin: string;
  titulo?: string;
  mensaje?: string;
  mensajeImportante?: string;
}

interface WeekFormProps {
  onSave: (data: WeekFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function WeekForm({ onSave, onCancel, loading }: WeekFormProps) {
  const defaultStart = getNextMonday();
  const [tipo, setTipo] = useState<'normal' | 'especial'>('normal');
  const [fechaInicio, setFechaInicio] = useState(defaultStart);
  const [fechaFin, setFechaFin] = useState(addDays(defaultStart, 3));
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [mensajeImportante, setMensajeImportante] = useState('');

  const handleStartChange = (val: string) => {
    setFechaInicio(val);
    setFechaFin(addDays(val, 3));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: WeekFormData = { tipo, fechaInicio, fechaFin };
    if (tipo === 'especial') {
      data.titulo = titulo.trim();
      data.mensaje = mensaje.trim();
      if (mensajeImportante.trim()) data.mensajeImportante = mensajeImportante.trim();
    }
    onSave(data);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label>Tipo</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as 'normal' | 'especial')}>
          <option value="normal">Normal</option>
          <option value="especial">Especial (Semana Tec, Asueto, etc.)</option>
        </select>
      </div>

      <div className={styles.dateRow}>
        <div className={styles.field}>
          <label>Fecha inicio</label>
          <input type="date" value={fechaInicio} onChange={(e) => handleStartChange(e.target.value)} required />
        </div>
        <div className={styles.field}>
          <label>Fecha fin</label>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required />
        </div>
      </div>

      {tipo === 'especial' && (
        <>
          <div className={styles.field}>
            <label>Título</label>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Semana Tec" required />
          </div>
          <div className={styles.field}>
            <label>Mensaje</label>
            <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Descripción de la semana" required />
          </div>
          <div className={styles.field}>
            <label>Mensaje importante (opcional)</label>
            <textarea value={mensajeImportante} onChange={(e) => setMensajeImportante(e.target.value)} placeholder="Nota importante..." />
          </div>
        </>
      )}

      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton variant="primary" type="submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear semana'}
        </DashButton>
      </div>
    </form>
  );
}
