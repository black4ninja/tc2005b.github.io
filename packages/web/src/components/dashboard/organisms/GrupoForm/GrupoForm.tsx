import { useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './GrupoForm.module.css';
import type { MateriaRef } from '../../../../types/materia';
import type { ColeccionRef } from '../../../../types/contenidos';

interface GrupoData {
  id?: string;
  name: string;
  fechaInicio?: string;
  fechaFin?: string;
  materia?: MateriaRef | null;
  colecciones?: ColeccionRef[];
}

interface GrupoSavePayload {
  name: string;
  fechaInicio?: string;
  fechaFin?: string;
  materiaId?: string | null;
  colecciones?: string[];
}

interface GrupoFormProps {
  grupo?: GrupoData;
  materias?: MateriaRef[];
  /** Colecciones del CMS Contenidos disponibles para asignar (US-6). */
  colecciones?: ColeccionRef[];
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

export default function GrupoForm({ grupo, materias = [], colecciones = [], onSave, onCancel, loading }: GrupoFormProps) {
  const [name, setName] = useState(grupo?.name ?? '');
  const [fechaInicio, setFechaInicio] = useState(toDateString(grupo?.fechaInicio));
  const [fechaFin, setFechaFin] = useState(toDateString(grupo?.fechaFin));
  const [materiaId, setMateriaId] = useState(grupo?.materia?.id ?? '');
  const [coleccionesSel, setColeccionesSel] = useState<string[]>(
    (grupo?.colecciones ?? []).map((c) => c.id),
  );
  const [error, setError] = useState('');


  function toggleColeccion(id: string) {
    setColeccionesSel((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
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
      colecciones: coleccionesSel,
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
        <label className={styles.label}>Colecciones de Contenidos con acceso</label>
        <div className={styles.checkboxList}>
          {colecciones.length === 0 && (
            <span className={styles.hint}>No hay colecciones disponibles.</span>
          )}
          {colecciones.map((c) => {
            const clave = c.clave || c.slug.toUpperCase();
            const label = `${clave} — ${c.nombre}`;
            return (
              <label key={c.id} className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={coleccionesSel.includes(c.id)}
                  onChange={() => toggleColeccion(c.id)}
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
