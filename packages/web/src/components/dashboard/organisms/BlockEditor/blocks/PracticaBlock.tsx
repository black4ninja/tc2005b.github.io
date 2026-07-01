import styles from '../BlockEditor.module.css';

interface Props {
  datos: Record<string, unknown>;
  onChange: (datos: Record<string, unknown>) => void;
}

export default function PracticaBlock({ datos, onChange }: Props) {
  return (
    <div className={styles.blockFields}>
      <div className={styles.field}>
        <label>Título de la práctica</label>
        <input
          type="text"
          value={(datos.titulo as string) ?? ''}
          onChange={(e) => onChange({ ...datos, titulo: e.target.value })}
          placeholder="ej. Práctica: Intro a Desarrollo Web"
        />
      </div>
      <div className={styles.field}>
        <label>Descripción</label>
        <input
          type="text"
          value={(datos.descripcion as string) ?? ''}
          onChange={(e) => onChange({ ...datos, descripcion: e.target.value })}
          placeholder="Descripción breve de la práctica"
        />
      </div>
      <div className={styles.field}>
        <label>Enlace</label>
        <input
          type="text"
          value={(datos.enlace as string) ?? ''}
          onChange={(e) => onChange({ ...datos, enlace: e.target.value })}
          placeholder="URL o ruta interna"
        />
      </div>
    </div>
  );
}
