import styles from '../BlockEditor.module.css';

interface Props {
  datos: Record<string, unknown>;
  onChange: (datos: Record<string, unknown>) => void;
}

export default function EntregaBlock({ datos, onChange }: Props) {
  return (
    <div className={styles.blockFields}>
      <div className={styles.field}>
        <label>Instrucciones de entrega</label>
        <textarea
          value={(datos.contenido as string) ?? ''}
          onChange={(e) => onChange({ ...datos, contenido: e.target.value })}
          placeholder="Describe cómo deben entregar los alumnos..."
          rows={4}
        />
      </div>
      <div className={styles.field}>
        <label>Tag de Git (opcional)</label>
        <input
          type="text"
          value={(datos.tag as string) ?? ''}
          onChange={(e) => onChange({ ...datos, tag: e.target.value })}
          placeholder="ej. avance2"
        />
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!!datos.video}
            onChange={(e) => onChange({ ...datos, video: e.target.checked })}
          />
          Requiere video
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!!datos.coevaluacion}
            onChange={(e) => onChange({ ...datos, coevaluacion: e.target.checked })}
          />
          Requiere coevaluación
        </label>
      </div>
      {!!datos.coevaluacion && (
        <div className={styles.field}>
          <label>URL del formulario de coevaluación</label>
          <input
            type="text"
            value={(datos.coevaluacionUrl as string) ?? ''}
            onChange={(e) => onChange({ ...datos, coevaluacionUrl: e.target.value })}
            placeholder="ej. documentos/Coevaluacion.docx"
          />
        </div>
      )}
    </div>
  );
}
