import styles from '../BlockEditor.module.css';

interface Props {
  datos: Record<string, unknown>;
  onChange: (datos: Record<string, unknown>) => void;
}

export default function EncabezadoBlock({ datos, onChange }: Props) {
  return (
    <div className={styles.blockFields}>
      <div className={styles.field}>
        <label>Subtítulo / Descripción</label>
        <input
          type="text"
          value={(datos.subtitulo as string) ?? ''}
          onChange={(e) => onChange({ ...datos, subtitulo: e.target.value })}
          placeholder="Descripción breve de la página"
        />
      </div>
      <div className={styles.field}>
        <label>Modalidad</label>
        <input
          type="text"
          value={(datos.modalidad as string) ?? ''}
          onChange={(e) => onChange({ ...datos, modalidad: e.target.value })}
          placeholder="ej. Individual, Colaborativa"
        />
      </div>
    </div>
  );
}
