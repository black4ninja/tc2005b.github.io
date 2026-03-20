import { useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './CompetenciaForm.module.css';

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
}

interface CompetenciaFormProps {
  competencia?: CompetenciaData;
  onSave: (data: Omit<CompetenciaData, 'id'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function CompetenciaForm({ competencia, onSave, onCancel, loading }: CompetenciaFormProps) {
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
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!nombre.trim()) {
      setError('La competencia es requerida');
      return;
    }
    if (!nivel.trim()) {
      setError('El nivel es requerido');
      return;
    }
    setError('');
    onSave({
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
    });
  }

  return (
    <div className={styles.form}>
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
