import { useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './CompetenciaForm.module.css';

interface DependenciaRef {
  id: string;
  competencia: string;
}

interface CompetenciaData {
  id?: string;
  orden?: number;
  competencia: string;
  nivel: string;
  descripcionNivel?: string;
  guiaEvidencias?: string;
  incipienteB?: string;
  incipienteA?: string;
  basico?: string;
  solido?: string;
  destacado?: string;
  fechaIdealEvaluacion?: string;
  esCalculada?: boolean;
  dependencias?: DependenciaRef[];
  coleccionId?: string | null;
}

interface CompetenciaOption {
  id: string;
  competencia: string;
  esCalculada?: boolean;
  coleccionId?: string | null;
}

interface ColeccionOption {
  id: string;
  nombre: string;
  slug: string;
  clave: string | null;
}

interface CompetenciaFormProps {
  competencia?: CompetenciaData;
  allCompetencias?: CompetenciaOption[];
  colecciones?: ColeccionOption[];
  /** Preselecciona la colección (p. ej. si se entró filtrando por una). */
  coleccionInicial?: string;
  onSave: (data: Omit<CompetenciaData, 'id'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function CompetenciaForm({
  competencia,
  allCompetencias = [],
  colecciones = [],
  coleccionInicial,
  onSave,
  onCancel,
  loading,
}: CompetenciaFormProps) {
  const [coleccionId, setColeccionId] = useState(
    competencia?.coleccionId ?? coleccionInicial ?? '',
  );
  const [orden, setOrden] = useState<number | ''>(competencia?.orden ?? '');
  const [nombre, setNombre] = useState(competencia?.competencia ?? '');
  const [nivel, setNivel] = useState(competencia?.nivel ?? '');
  const [descripcionNivel, setDescripcionNivel] = useState(competencia?.descripcionNivel ?? '');
  const [guiaEvidencias, setGuiaEvidencias] = useState(competencia?.guiaEvidencias ?? '');
  const [incipienteB, setIncipienteB] = useState(competencia?.incipienteB ?? '');
  const [incipienteA, setIncipienteA] = useState(competencia?.incipienteA ?? '');
  const [basico, setBasico] = useState(competencia?.basico ?? '');
  const [solido, setSolido] = useState(competencia?.solido ?? '');
  const [destacado, setDestacado] = useState(competencia?.destacado ?? '');
  const [fechaIdealEvaluacion, setFechaIdealEvaluacion] = useState(competencia?.fechaIdealEvaluacion ?? '');
  const [esCalculada, setEsCalculada] = useState(competencia?.esCalculada ?? false);
  const [selectedDeps, setSelectedDeps] = useState<string[]>(
    (competencia?.dependencias ?? []).map((d) => d.id),
  );
  const [error, setError] = useState('');

  // Dependencias posibles: directas, no ella misma, y **de la misma colección**.
  // Una calculada que dependiera de una competencia de otra materia quedaría sin
  // evaluar para siempre: el alumno no tendría celda para esa dependencia. El
  // servidor también lo rechaza; aquí simplemente no se ofrece.
  const availableDeps = allCompetencias.filter(
    (c) =>
      !c.esCalculada &&
      c.id !== competencia?.id &&
      (c.coleccionId ?? '') === coleccionId,
  );

  function handleSubmit() {
    if (!coleccionId) {
      setError('La colección es requerida: sin ella la competencia no aparece en ninguna malla');
      return;
    }
    if (!nombre.trim()) {
      setError('La competencia es requerida');
      return;
    }
    if (!nivel.trim()) {
      setError('El nivel es requerido');
      return;
    }
    if (esCalculada && selectedDeps.length === 0) {
      setError('Una competencia calculada debe tener al menos 1 dependencia');
      return;
    }
    setError('');
    onSave({
      coleccionId,
      orden: orden !== '' ? Number(orden) : undefined,
      competencia: nombre.trim(),
      nivel: nivel.trim(),
      descripcionNivel: descripcionNivel.trim() || undefined,
      guiaEvidencias: guiaEvidencias.trim() || undefined,
      incipienteB: incipienteB.trim() || undefined,
      incipienteA: incipienteA.trim() || undefined,
      basico: basico.trim() || undefined,
      solido: solido.trim() || undefined,
      destacado: destacado.trim() || undefined,
      fechaIdealEvaluacion: fechaIdealEvaluacion.trim() || undefined,
      esCalculada,
      dependencias: esCalculada ? selectedDeps.map((id) => ({ id, competencia: '' })) : [],
    } as any);
  }

  function toggleDep(id: string) {
    setSelectedDeps((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  }

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>Colección (materia) *</label>
        <select
          className={styles.select}
          value={coleccionId}
          onChange={(e) => {
            // Al cambiar de colección, las dependencias elegidas pueden haber
            // quedado fuera: se limpian en vez de guardarse inválidas.
            setColeccionId(e.target.value);
            setSelectedDeps([]);
            setError('');
          }}
          disabled={loading}
        >
          <option value="">Selecciona una colección…</option>
          {colecciones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.clave ? `${c.clave} — ${c.nombre}` : c.nombre}
            </option>
          ))}
        </select>
        <span className={styles.hint}>
          La malla de un alumno se arma con las competencias de las colecciones de su grupo.
        </span>
      </div>
      <TextInput
        label="Orden"
        placeholder="Ej: 0"
        icon="sort"
        value={orden === '' ? '' : String(orden)}
        onChange={(v) => { setOrden(v === '' ? '' : Number(v)); setError(''); }}
        disabled={loading}
      />
      <TextInput
        label="Competencia"
        placeholder="Ej: SICT0201 Determinación de patrones"
        icon="school"
        value={nombre}
        onChange={(v) => { setNombre(v); setError(''); }}
        disabled={loading}
      />
      <TextInput
        label="Nivel"
        placeholder="Ej: C"
        icon="signal_cellular_alt"
        value={nivel}
        onChange={(v) => { setNivel(v); setError(''); }}
        disabled={loading}
      />
      <div className={styles.field}>
        <label className={styles.label}>Descripción del nivel</label>
        <textarea
          className={styles.textarea}
          placeholder="Descripción del nivel de la competencia..."
          value={descripcionNivel}
          onChange={(e) => setDescripcionNivel(e.target.value)}
          disabled={loading}
          rows={3}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Guía de evidencias</label>
        <textarea
          className={styles.textarea}
          placeholder="Guía de evidencias..."
          value={guiaEvidencias}
          onChange={(e) => setGuiaEvidencias(e.target.value)}
          disabled={loading}
          rows={3}
        />
      </div>

      <div className={styles.rubricaGrid}>
        <div className={styles.field}>
          <label className={styles.label}>Incipiente B (0%)</label>
          <textarea
            className={styles.textarea}
            placeholder="Criterio para Incipiente B..."
            value={incipienteB}
            onChange={(e) => setIncipienteB(e.target.value)}
            disabled={loading}
            rows={3}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Incipiente A (15%)</label>
          <textarea
            className={styles.textarea}
            placeholder="Criterio para Incipiente A..."
            value={incipienteA}
            onChange={(e) => setIncipienteA(e.target.value)}
            disabled={loading}
            rows={3}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Básico (70%)</label>
          <textarea
            className={styles.textarea}
            placeholder="Criterio para Básico..."
            value={basico}
            onChange={(e) => setBasico(e.target.value)}
            disabled={loading}
            rows={3}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Sólido (85%)</label>
          <textarea
            className={styles.textarea}
            placeholder="Criterio para Sólido..."
            value={solido}
            onChange={(e) => setSolido(e.target.value)}
            disabled={loading}
            rows={3}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Destacado (100%)</label>
          <textarea
            className={styles.textarea}
            placeholder="Criterio para Destacado..."
            value={destacado}
            onChange={(e) => setDestacado(e.target.value)}
            disabled={loading}
            rows={3}
          />
        </div>
      </div>

      <TextInput
        label="Fecha ideal de evaluación"
        placeholder="Ej: Semana 9"
        icon="event"
        value={fechaIdealEvaluacion}
        onChange={(v) => setFechaIdealEvaluacion(v)}
        disabled={loading}
      />

      <div className={styles.field}>
        <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={esCalculada}
            onChange={(e) => {
              setEsCalculada(e.target.checked);
              if (!e.target.checked) setSelectedDeps([]);
            }}
            disabled={loading}
          />
          Es calculada (valor derivado del MIN de otras competencias)
        </label>
      </div>

      {esCalculada && (
        <div className={styles.field}>
          <label className={styles.label}>Dependencias (competencias directas)</label>
          {availableDeps.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No hay competencias directas disponibles</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px' }}>
              {availableDeps.map((dep) => (
                <label key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedDeps.includes(dep.id)}
                    onChange={() => toggleDep(dep.id)}
                    disabled={loading}
                  />
                  {dep.competencia}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <span className={styles.error}>{error}</span>}

      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton disabled={loading} onClick={handleSubmit}>
          {loading ? 'Guardando...' : competencia ? 'Actualizar' : 'Crear'}
        </DashButton>
      </div>
    </div>
  );
}
