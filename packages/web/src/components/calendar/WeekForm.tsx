import { useState } from 'react';
import DashButton from '@/components/dashboard/atoms/DashButton/DashButton';
import {
  DIA_KEYS,
  DIA_NOMBRES,
  DIAS_POR_DEFECTO,
  fechaFinDeDias,
  lunesDe,
  lunesSiguiente,
  ordenarDias,
  diaDelMes,
  type DiaKey,
} from '@/utils/diasSemana';
import styles from './WeekForm.module.css';

export interface WeekFormData {
  tipo: 'normal' | 'especial';
  fechaInicio: string;
  fechaFin: string;
  diasActivos?: DiaKey[];
  titulo?: string;
  mensaje?: string;
  mensajeImportante?: string;
}

interface WeekFormProps {
  onSave: (data: WeekFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
  initialData?: WeekFormData;
  /** Días que no se pueden desmarcar porque ya tienen actividades. */
  diasBloqueados?: DiaKey[];
}

export default function WeekForm({
  onSave,
  onCancel,
  loading,
  mode = 'create',
  initialData,
  diasBloqueados = [],
}: WeekFormProps) {
  const defaultStart = initialData?.fechaInicio ?? lunesSiguiente();
  const [tipo, setTipo] = useState<'normal' | 'especial'>(initialData?.tipo ?? 'normal');
  const [fechaInicio, setFechaInicio] = useState(defaultStart);
  const [diasActivos, setDiasActivos] = useState<DiaKey[]>(
    ordenarDias(initialData?.diasActivos ?? DIAS_POR_DEFECTO),
  );
  const [fechaFinEspecial, setFechaFinEspecial] = useState(
    initialData?.fechaFin ?? fechaFinDeDias(defaultStart, DIAS_POR_DEFECTO),
  );
  const [titulo, setTitulo] = useState(initialData?.titulo ?? '');
  const [mensaje, setMensaje] = useState(initialData?.mensaje ?? '');
  const [mensajeImportante, setMensajeImportante] = useState(initialData?.mensajeImportante ?? '');

  const handleStartChange = (val: string) => {
    if (!val) return;
    // El inicio ancla los días de la semana: siempre se guarda el lunes.
    setFechaInicio(tipo === 'normal' ? lunesDe(val) : val);
  };

  const toggleDia = (dia: DiaKey) => {
    if (diasBloqueados.includes(dia)) return;
    setDiasActivos((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : ordenarDias([...prev, dia]),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tipo === 'normal' && diasActivos.length === 0) return;

    const data: WeekFormData = {
      tipo,
      fechaInicio,
      fechaFin: tipo === 'normal' ? fechaFinDeDias(fechaInicio, diasActivos) : fechaFinEspecial,
    };
    if (tipo === 'normal') {
      data.diasActivos = diasActivos;
    } else {
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
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as 'normal' | 'especial')}
          disabled={mode === 'edit'}
        >
          <option value="normal">Normal</option>
          <option value="especial">Especial (Semana Tec, Asueto, etc.)</option>
        </select>
      </div>

      <div className={styles.dateRow}>
        <div className={styles.field}>
          <label>{tipo === 'normal' ? 'Lunes de la semana' : 'Fecha inicio'}</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => handleStartChange(e.target.value)}
            required
          />
        </div>
        {tipo === 'especial' && (
          <div className={styles.field}>
            <label>Fecha fin</label>
            <input
              type="date"
              value={fechaFinEspecial}
              onChange={(e) => setFechaFinEspecial(e.target.value)}
              required
            />
          </div>
        )}
      </div>

      {tipo === 'normal' && (
        <div className={styles.field}>
          <label>Días con clase</label>
          <div className={styles.dayPicker}>
            {DIA_KEYS.map((dia) => {
              const activo = diasActivos.includes(dia);
              const bloqueado = diasBloqueados.includes(dia);
              return (
                <button
                  key={dia}
                  type="button"
                  className={`${styles.dayChip} ${activo ? styles.dayChipActive : ''}`}
                  aria-pressed={activo}
                  disabled={bloqueado}
                  title={bloqueado ? 'Este día tiene actividades; elimínalas para quitarlo' : undefined}
                  onClick={() => toggleDia(dia)}
                >
                  <span className={styles.dayChipName}>{DIA_NOMBRES[dia]}</span>
                  <span className={styles.dayChipDate}>{diaDelMes(fechaInicio, dia)}</span>
                </button>
              );
            })}
          </div>
          {diasActivos.length === 0 && (
            <span className={styles.hint}>Selecciona al menos un día.</span>
          )}
        </div>
      )}

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
        <DashButton
          variant="primary"
          type="submit"
          disabled={loading || (tipo === 'normal' && diasActivos.length === 0)}
        >
          {loading
            ? (mode === 'edit' ? 'Guardando...' : 'Creando...')
            : (mode === 'edit' ? 'Guardar cambios' : 'Crear semana')}
        </DashButton>
      </div>
    </form>
  );
}
