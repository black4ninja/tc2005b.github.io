import styles from '../BlockEditor.module.css';

interface RecursoItem {
  texto: string;
  url: string;
  externo: boolean;
}

interface Props {
  datos: Record<string, unknown>;
  onChange: (datos: Record<string, unknown>) => void;
}

export default function RecursosBlock({ datos, onChange }: Props) {
  const items = (datos.items as RecursoItem[]) ?? [{ texto: '', url: '', externo: false }];

  function updateItem(index: number, field: keyof RecursoItem, value: string | boolean) {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange({ ...datos, items: next });
  }

  function addItem() {
    onChange({ ...datos, items: [...items, { texto: '', url: '', externo: false }] });
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index);
    onChange({ ...datos, items: next.length > 0 ? next : [{ texto: '', url: '', externo: false }] });
  }

  return (
    <div className={styles.blockFields}>
      <label>Recursos</label>
      {items.map((item, i) => (
        <div key={i} className={styles.recursoRow}>
          <div className={styles.recursoFields}>
            <input
              type="text"
              value={item.texto}
              onChange={(e) => updateItem(i, 'texto', e.target.value)}
              placeholder="Texto del enlace"
            />
            <input
              type="text"
              value={item.url}
              onChange={(e) => updateItem(i, 'url', e.target.value)}
              placeholder="URL"
            />
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={item.externo}
                onChange={(e) => updateItem(i, 'externo', e.target.checked)}
              />
              Externo
            </label>
          </div>
          <button type="button" className={styles.removeBtn} onClick={() => removeItem(i)} title="Eliminar">
            <span className="material-icons">close</span>
          </button>
        </div>
      ))}
      <button type="button" className={styles.addItemBtn} onClick={addItem}>
        <span className="material-icons">add</span>
        Agregar recurso
      </button>
    </div>
  );
}
