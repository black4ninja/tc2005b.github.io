import { useEffect, useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import styles from './ReglasScrumModal.module.css';

interface Props {
  abierto: boolean;
  tipo: 'done' | 'restricciones';
  items: string[];
  /** El profesor las edita; el alumno solo las consulta. */
  editable?: boolean;
  onGuardar?: (items: string[]) => void;
  onCerrar: () => void;
}

/**
 * La definición de terminado y las restricciones, para consultarlas sin salirse
 * del tablero.
 *
 * Son el corazón del ejercicio —«para que el modelo sea válido deberá contar con
 * TODA la definición de DONE»— y hasta ahora vivían en una diapositiva que nadie
 * tiene delante mientras trabaja. Aquí están a un botón de distancia.
 */
export default function ReglasScrumModal({
  abierto, tipo, items, editable, onGuardar, onCerrar,
}: Props) {
  const esDone = tipo === 'done';
  const [lista, setLista] = useState<string[]>(items);
  const [nuevo, setNuevo] = useState('');

  useEffect(() => { if (abierto) { setLista(items); setNuevo(''); } }, [abierto, items]);

  function guardar(siguiente: string[]) {
    setLista(siguiente);
    onGuardar?.(siguiente);
  }

  return (
    <Modal
      isOpen={abierto}
      onClose={onCerrar}
      title={esDone ? 'Definición de terminado' : 'Restricciones'}
    >
      <div className={styles.cuerpo}>
        <p className={styles.intro}>
          {esDone
            ? 'Una historia no está hecha hasta que cumple TODO esto. Repásenlo antes de mover una tarjeta a Done: lo que se dé por terminado sin cumplirlo vuelve como deuda.'
            : 'Requisitos no funcionales del ejercicio. Cada uno que no se cumpla lo reporta el Product Owner en el review y suma un punto de bloqueo al siguiente sprint.'}
        </p>

        <ol className={styles.lista}>
          {(editable ? lista : items).map((t, i) => (
            <li key={`${i}-${t}`} className={styles.item}>
              <span className={styles.numero}>{i + 1}</span>
              {editable ? (
                <>
                  <input
                    className={styles.campo}
                    defaultValue={t}
                    maxLength={160}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== t) guardar(lista.map((x, j) => (j === i ? v : x)));
                      else if (!v) e.target.value = t;
                    }}
                  />
                  <button
                    type="button"
                    className={styles.quitar}
                    onClick={() => guardar(lista.filter((_, j) => j !== i))}
                    title="Quitar"
                  >
                    <span className="material-icons">close</span>
                  </button>
                </>
              ) : (
                <span className={styles.texto}>{t}</span>
              )}
            </li>
          ))}
          {(editable ? lista : items).length === 0 && (
            <li className={styles.vacio}>Todavía no hay ninguna.</li>
          )}
        </ol>

        {editable && (
          <div className={styles.alta}>
            <input
              className={styles.campo}
              placeholder={esDone ? 'Otro punto de la definición…' : 'Otra restricción…'}
              value={nuevo}
              maxLength={160}
              onChange={(e) => setNuevo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || !nuevo.trim()) return;
                guardar([...lista, nuevo.trim()]);
                setNuevo('');
              }}
            />
            <button
              type="button"
              className={styles.agregar}
              disabled={!nuevo.trim()}
              onClick={() => { guardar([...lista, nuevo.trim()]); setNuevo(''); }}
            >
              <span className="material-icons">add</span>
              Agregar
            </button>
          </div>
        )}

        <p className={styles.pie}>
          {esDone
            ? 'El visto bueno del Product Owner es un acuerdo del equipo, no un candado del sistema: la lista la marca cualquiera.'
            : 'Las escribe el profesor por dinámica.'}
        </p>
      </div>
    </Modal>
  );
}
