import styles from '../BlockEditor.module.css';

interface Props {
  datos: Record<string, unknown>;
  onChange: (datos: Record<string, unknown>) => void;
}

export default function InstruccionesBlock({ datos, onChange }: Props) {
  return (
    <div className={styles.blockFields}>
      <div className={styles.field}>
        <label>Contenido HTML</label>
        <textarea
          className={styles.htmlTextarea}
          value={(datos.html as string) ?? ''}
          onChange={(e) => onChange({ ...datos, html: e.target.value })}
          placeholder='<ol class="lab-steps"><li>Paso 1...</li></ol>'
          rows={10}
        />
        <span className={styles.hint}>
          Soporta HTML: listas, código, imágenes, tablas, clases .lab-steps y .lab-card
        </span>
      </div>
    </div>
  );
}
