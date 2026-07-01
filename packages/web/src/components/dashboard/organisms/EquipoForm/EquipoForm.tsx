import { useState, useMemo } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './EquipoForm.module.css';

interface MiembroOption {
  id: string;
  name: string;
  email: string;
}

interface EquipoData {
  id?: string;
  nombre: string;
  repositorio: string;
  miembros: MiembroOption[];
}

interface EquipoFormProps {
  equipo?: EquipoData;
  alumnos: MiembroOption[];
  onSave: (data: { nombre: string; repositorio: string; miembros: string[] }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function EquipoForm({ equipo, alumnos, onSave, onCancel, loading }: EquipoFormProps) {
  const [nombre, setNombre] = useState(equipo?.nombre ?? '');
  const [repositorio, setRepositorio] = useState(equipo?.repositorio ?? '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(equipo?.miembros.map((m) => m.id) ?? []),
  );
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return alumnos;
    const q = search.toLowerCase();
    return alumnos.filter(
      (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q),
    );
  }, [alumnos, search]);

  function toggleMiembro(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (!nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setError('');
    onSave({
      nombre: nombre.trim(),
      repositorio: repositorio.trim(),
      miembros: Array.from(selectedIds),
    });
  }

  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <TextInput
        label="Nombre del equipo"
        placeholder="Ej: Equipo Alpha"
        icon="group_work"
        value={nombre}
        onChange={(v) => { setNombre(v); setError(''); }}
        disabled={loading}
        error={error && !nombre.trim() ? error : undefined}
      />
      <TextInput
        label="Repositorio"
        placeholder="https://github.com/org/repo"
        icon="link"
        value={repositorio}
        onChange={setRepositorio}
        disabled={loading}
      />
      <div className={styles.miembrosSection}>
        <span className={styles.miembrosLabel}>Miembros ({selectedIds.size} seleccionados)</span>
        {alumnos.length > 5 && (
          <input
            className={styles.miembrosSearch}
            type="text"
            placeholder="Buscar alumno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
          />
        )}
        <div className={styles.miembrosList}>
          {filtered.length === 0 ? (
            <div className={styles.emptyMiembros}>No hay alumnos disponibles</div>
          ) : (
            filtered.map((a) => (
              <label key={a.id} className={styles.miembroItem}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(a.id)}
                  onChange={() => toggleMiembro(a.id)}
                  disabled={loading}
                />
                <span className={styles.miembroName}>{a.name}</span>
                <span className={styles.miembroEmail}>{a.email}</span>
              </label>
            ))
          )}
        </div>
      </div>
      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton disabled={loading} onClick={handleSubmit}>
          {loading ? 'Guardando...' : equipo ? 'Actualizar' : 'Crear'}
        </DashButton>
      </div>
    </form>
  );
}
