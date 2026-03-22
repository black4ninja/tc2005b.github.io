import styles from '../BlockEditor.module.css';

interface Props {
  datos: Record<string, unknown>;
  onChange: (datos: Record<string, unknown>) => void;
}

export default function TextoBlock({ datos, onChange }: Props) {
  return (
    <div className={styles.blockFields}>
      <div className={styles.field}>
        <label>Título de sección (opcional)</label>
        <input
          type="text"
          value={(datos.tituloSeccion as string) ?? ''}
          onChange={(e) => onChange({ ...datos, tituloSeccion: e.target.value })}
          placeholder="ej. Notas importantes"
        />
      </div>
      <div className={styles.field}>
        <label>Contenido HTML</label>
        <textarea
          className={styles.htmlTextarea}
          value={(datos.html as string) ?? ''}
          onChange={(e) => onChange({ ...datos, html: e.target.value })}
          placeholder="<p>Escribe el contenido aquí...</p>"
          rows={8}
        />
        <span className={styles.hint}>
          Soporta HTML: párrafos, listas, enlaces, código, imágenes
        </span>
      </div>
    </div>
  );
}
