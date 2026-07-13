import { useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './GrupoForm.module.css';
import type { ColeccionRef } from '../../../../types/contenidos';

interface GrupoData {
  id?: string;
  name: string;
  fechaInicio?: string;
  fechaFin?: string;
  colecciones?: ColeccionRef[];
  urlAgendaEntrevistas?: string | null;
}

interface GrupoSavePayload {
  name: string;
  fechaInicio?: string;
  fechaFin?: string;
  colecciones?: string[];
  urlAgendaEntrevistas?: string;
}

interface GrupoFormProps {
  grupo?: GrupoData;
  /**
   * Colecciones del CMS Contenidos asignadas al grupo. Determinan tanto el
   * acceso del alumno a la documentación como la materia del grupo: son la
   * fuente única (antes había además un select de "Materia" que no hacía nada y
   * podía contradecir a este campo).
   */
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

export default function GrupoForm({ grupo, colecciones = [], onSave, onCancel, loading }: GrupoFormProps) {
  const [name, setName] = useState(grupo?.name ?? '');
  const [fechaInicio, setFechaInicio] = useState(toDateString(grupo?.fechaInicio));
  const [fechaFin, setFechaFin] = useState(toDateString(grupo?.fechaFin));
  const [coleccionesSel, setColeccionesSel] = useState<string[]>(
    (grupo?.colecciones ?? []).map((c) => c.id),
  );
  const [agendaUrl, setAgendaUrl] = useState(grupo?.urlAgendaEntrevistas ?? '');
  const [error, setError] = useState('');
  const [errorAgenda, setErrorAgenda] = useState('');


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
    // El servidor vuelve a validar esto (es el que manda); aquí es solo para no
    // hacer un viaje de ida y vuelta por una URL obviamente mal escrita.
    const url = agendaUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      setErrorAgenda('La URL debe empezar por http:// o https://');
      return;
    }
    setError('');
    setErrorAgenda('');
    onSave({
      name: name.trim(),
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      colecciones: coleccionesSel,
      // Cadena vacía = quitar el enlace del grupo.
      urlAgendaEntrevistas: url,
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
      <TextInput
        label="URL de la agenda de entrevistas (opcional)"
        placeholder="https://docs.google.com/spreadsheets/…"
        icon="event_available"
        value={agendaUrl}
        onChange={(v) => { setAgendaUrl(v); setErrorAgenda(''); }}
        error={errorAgenda}
        disabled={loading}
      />
      <p className={styles.hint}>
        Aparece como “Agendar Entrevistas” en el menú del grupo y en el de sus alumnos.
        Déjala vacía para no mostrar el enlace.
      </p>
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
