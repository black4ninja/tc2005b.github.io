import { useState } from 'react';
import styles from '../BlockEditor.module.css';
import ContenidoPicker from '../../ContenidoPicker/ContenidoPicker';

interface Props {
  datos: Record<string, unknown>;
  onChange: (datos: Record<string, unknown>) => void;
}

export default function PracticaBlock({ datos, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

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
        <div className={styles.inputWithButton}>
          <input
            type="text"
            value={(datos.enlace as string) ?? ''}
            onChange={(e) => onChange({ ...datos, enlace: e.target.value })}
            placeholder="Selecciona del CMS o pega una URL"
          />
          <button type="button" className={styles.pickerBtn} onClick={() => setPickerOpen(true)}>
            <span className="material-icons">menu_book</span>
            Seleccionar del CMS
          </button>
        </div>
        <p className={styles.fieldHint}>
          Elige una página del CMS "Contenidos" o pega una URL externa manualmente.
        </p>
      </div>

      <ContenidoPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(enlace) => onChange({ ...datos, enlace })}
      />
    </div>
  );
}
