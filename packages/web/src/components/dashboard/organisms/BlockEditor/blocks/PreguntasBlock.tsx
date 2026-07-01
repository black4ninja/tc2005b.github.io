import styles from '../BlockEditor.module.css';

interface Props {
  datos: Record<string, unknown>;
  onChange: (datos: Record<string, unknown>) => void;
}

export default function PreguntasBlock({ datos, onChange }: Props) {
  const items = (datos.items as string[]) ?? [''];

  function updateItem(index: number, value: string) {
    const next = [...items];
    next[index] = value;
    onChange({ ...datos, items: next });
  }

  function addItem() {
    onChange({ ...datos, items: [...items, ''] });
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index);
    onChange({ ...datos, items: next.length > 0 ? next : [''] });
  }

  return (
    <div className={styles.blockFields}>
      <label>Preguntas</label>
      {items.map((item, i) => (
        <div key={i} className={styles.listItem}>
          <span className={styles.listNumber}>{i + 1}</span>
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={`Pregunta ${i + 1}`}
          />
          <button type="button" className={styles.removeBtn} onClick={() => removeItem(i)} title="Eliminar">
            <span className="material-icons">close</span>
          </button>
        </div>
      ))}
      <button type="button" className={styles.addItemBtn} onClick={addItem}>
        <span className="material-icons">add</span>
        Agregar pregunta
      </button>
    </div>
  );
}
