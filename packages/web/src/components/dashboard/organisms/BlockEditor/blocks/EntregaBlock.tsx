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
    </div>
  );
}
