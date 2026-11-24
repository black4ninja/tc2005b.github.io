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
import type { PersonaStaff } from '@/types/calendario';
import styles from './WeekForm.module.css';

/** «Eduardo López» → «Eduardo»: en los chips cabe el nombre de pila. */
function nombreCorto(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre;
}

export interface WeekFormData {
  tipo: 'normal' | 'especial';
  fechaInicio: string;
  fechaFin: string;
  diasActivos?: DiaKey[];
  /** Ids del staff por día; un día ausente lo imparten todos. */
  imparten?: Partial<Record<DiaKey, string[]>>;
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
  /** Staff del grupo: entre quiénes se elige quién imparte cada día. */
  staff?: PersonaStaff[];
}

export default function WeekForm({
  onSave,
  onCancel,
  loading,
  mode = 'create',
  initialData,
  diasBloqueados = [],
  staff = [],
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
  const [imparten, setImparten] = useState<Partial<Record<DiaKey, string[]>>>(initialData?.imparten ?? {});
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

  /** «Todos» vacía la lista del día; cada persona entra o sale de ella. */
  const toggleImparte = (dia: DiaKey, id: string | null) => {
    setImparten((prev) => {
      const actual = prev[dia] ?? [];
      const siguiente = id === null ? [] : actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id];
      // Marcar a todos uno por uno es lo mismo que «Todos».
      const lista = siguiente.length === staff.length ? [] : siguiente;
      return { ...prev, [dia]: lista };
    });
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
      // Solo los días con clase y con alguien elegido; el resto, «todos».
      if (staff.length > 1) {
        data.imparten = Object.fromEntries(
          diasActivos.filter((d) => (imparten[d]?.length ?? 0) > 0).map((d) => [d, imparten[d]!]),
        );
      }
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

      {/* Con un solo profesor no hay nada que repartir. */}
      {tipo === 'normal' && staff.length > 1 && diasActivos.length > 0 && (
        <div className={styles.field}>
          <label>Quién imparte</label>
          <span className={styles.ayuda}>
            Por día. «Todos» si la dan entre todos o no se ha decidido; si no, elige uno o varios.
          </span>
          <div className={styles.imparten}>
            {diasActivos.map((dia) => {
              const elegidos = imparten[dia] ?? [];
              return (
                <div key={dia} className={styles.imparteFila}>
                  <span className={styles.imparteDia}>{DIA_NOMBRES[dia]}</span>
                  <div className={styles.imparteOpciones} role="group" aria-label={`Quién imparte el ${DIA_NOMBRES[dia]}`}>
                    <button
                      type="button"
                      className={`${styles.personaChip} ${elegidos.length === 0 ? styles.personaChipActiva : ''}`}
                      aria-pressed={elegidos.length === 0}
                      onClick={() => toggleImparte(dia, null)}
                    >
                      Todos
                    </button>
                    {staff.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`${styles.personaChip} ${elegidos.includes(p.id) ? styles.personaChipActiva : ''}`}
                        aria-pressed={elegidos.includes(p.id)}
                        title={p.name}
                        onClick={() => toggleImparte(dia, p.id)}
                      >
                        {nombreCorto(p.name)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
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
