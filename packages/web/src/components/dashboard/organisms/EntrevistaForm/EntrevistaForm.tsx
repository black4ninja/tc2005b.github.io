import { useState, useMemo } from 'react';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './EntrevistaForm.module.css';

interface EquipoOption {
  id: string;
  nombre: string;
  miembros: { id: string; name: string; email: string }[];
}

interface ProfesorOption {
  id: string;
  name: string;
  email: string;
}

interface CompetenciaOption {
  id: string;
  competencia: string;
  nivel: string;
}

interface EntrevistaData {
  id?: string;
  fecha: string;
  equipo: { id: string; nombre: string; miembros: { id: string; name: string; email: string }[] };
  profesores: { id: string; name: string; email: string }[];
  competencias: { id: string; competencia: string; nivel: string }[];
}

interface EntrevistaFormProps {
  entrevista?: EntrevistaData;
  equipos: EquipoOption[];
  profesores: ProfesorOption[];
  competencias: CompetenciaOption[];
  onSave: (data: { equipoId: string; profesores: string[]; competencias: string[]; fecha: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function EntrevistaForm({
  entrevista,
  equipos,
  profesores,
  competencias,
  onSave,
  onCancel,
  loading,
}: EntrevistaFormProps) {
  const [fecha, setFecha] = useState(entrevista?.fecha ?? '');
  const [equipoId, setEquipoId] = useState(entrevista?.equipo?.id ?? '');
  const [selectedProfesores, setSelectedProfesores] = useState<Set<string>>(
    new Set(entrevista?.profesores.map((p) => p.id) ?? []),
  );
  const [selectedCompetencias, setSelectedCompetencias] = useState<Set<string>>(
    new Set(entrevista?.competencias.map((c) => c.id) ?? []),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedEquipo = useMemo(
    () => equipos.find((e) => e.id === equipoId),
    [equipos, equipoId],
  );

  function toggleProfesor(id: string) {
    setSelectedProfesores((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCompetencia(id: string) {
    setSelectedCompetencias((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllCompetencias() {
    if (selectedCompetencias.size === competencias.length) {
      setSelectedCompetencias(new Set());
    } else {
      setSelectedCompetencias(new Set(competencias.map((c) => c.id)));
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!fecha) errs.fecha = 'La fecha es requerida';
    if (!equipoId) errs.equipo = 'El equipo es requerido';
    if (selectedProfesores.size === 0) errs.profesores = 'Al menos un profesor es requerido';
    if (selectedCompetencias.size === 0) errs.competencias = 'Al menos una competencia es requerida';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      equipoId,
      profesores: Array.from(selectedProfesores),
      competencias: Array.from(selectedCompetencias),
      fecha,
    });
  }

  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      {/* Fecha */}
      <div className={styles.fieldGroup}>
        <span className={styles.fieldLabel}>Fecha</span>
        <input
          type="date"
          className={styles.dateInput}
          value={fecha}
          onChange={(e) => { setFecha(e.target.value); setErrors((prev) => ({ ...prev, fecha: '' })); }}
          disabled={loading}
        />
        {errors.fecha && <span className={styles.fieldError}>{errors.fecha}</span>}
      </div>

      {/* Equipo */}
      <div className={styles.fieldGroup}>
        <span className={styles.fieldLabel}>Equipo</span>
        <select
          className={styles.selectInput}
          value={equipoId}
          onChange={(e) => { setEquipoId(e.target.value); setErrors((prev) => ({ ...prev, equipo: '' })); }}
          disabled={loading}
        >
          <option value="">Seleccionar equipo...</option>
          {equipos.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.nombre}</option>
          ))}
        </select>
        {errors.equipo && <span className={styles.fieldError}>{errors.equipo}</span>}
        {selectedEquipo && selectedEquipo.miembros.length > 0 && (
          <div className={styles.miembrosChips}>
            {selectedEquipo.miembros.map((m) => (
              <span key={m.id} className={styles.chip} title={m.email}>{m.name}</span>
            ))}
          </div>
        )}
      </div>

      {/* Profesores */}
      <div className={styles.checkboxSection}>
        <span className={styles.fieldLabel}>Profesores ({selectedProfesores.size} seleccionados)</span>
        <div className={styles.checkboxList}>
          {profesores.length === 0 ? (
            <div className={styles.emptyList}>No hay profesores disponibles</div>
          ) : (
            profesores.map((p) => (
              <label key={p.id} className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={selectedProfesores.has(p.id)}
                  onChange={() => toggleProfesor(p.id)}
                  disabled={loading}
                />
                <span className={styles.checkboxName}>{p.name}</span>
                <span className={styles.checkboxDetail}>{p.email}</span>
              </label>
            ))
          )}
        </div>
        {errors.profesores && <span className={styles.fieldError}>{errors.profesores}</span>}
      </div>

      {/* Competencias */}
      <div className={styles.checkboxSection}>
        <span className={styles.fieldLabel}>Competencias ({selectedCompetencias.size} seleccionadas)</span>
        <div className={styles.checkboxList}>
          {competencias.length === 0 ? (
            <div className={styles.emptyList}>No hay competencias disponibles</div>
          ) : (
            <>
              <label className={styles.selectAllItem}>
                <input
                  type="checkbox"
                  checked={selectedCompetencias.size === competencias.length && competencias.length > 0}
                  onChange={toggleAllCompetencias}
                  disabled={loading}
                />
                <span className={styles.checkboxName}>Seleccionar todas</span>
              </label>
              {competencias.map((c) => (
                <label key={c.id} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    checked={selectedCompetencias.has(c.id)}
                    onChange={() => toggleCompetencia(c.id)}
                    disabled={loading}
                  />
                  <span className={styles.checkboxName}>{c.competencia}</span>
                  <span className={styles.checkboxDetail}>{c.nivel}</span>
                </label>
              ))}
            </>
          )}
        </div>
        {errors.competencias && <span className={styles.fieldError}>{errors.competencias}</span>}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton disabled={loading} onClick={handleSubmit}>
          {loading ? 'Guardando...' : entrevista ? 'Actualizar' : 'Crear'}
        </DashButton>
      </div>
    </form>
  );
}
