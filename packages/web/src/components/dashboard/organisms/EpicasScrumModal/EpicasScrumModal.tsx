import { useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import type { Epica, Historia } from '../../../../utils/scrum';
import styles from './EpicasScrumModal.module.css';

interface Props {
  abierto: boolean;
  epicas: Epica[];
  epicaActual: string | null;
  historias: Historia[];
  editable?: boolean;
  onCrear: (nombre: string) => void;
  onElegir: (epicaId: string | null) => void;
  onCerrar: () => void;
}

/**
 * Las épicas del equipo: los entregables completos de los que cuelgan las
 * historias.
 *
 * Existe por una regla de la dinámica —«solo se puede trabajar en 1 modelo a la
 * vez»— que aquí se dice así: un sprint toca UNA épica. Sirve para enseñar que
 * la historia de usuario no es la unidad más grande, y que primero se define el
 * entregable y después se parte.
 */
export default function EpicasScrumModal({
  abierto, epicas, epicaActual, historias, editable = true, onCrear, onElegir, onCerrar,
}: Props) {
  const [nombre, setNombre] = useState('');

  function crear() {
    const limpio = nombre.trim();
    if (!limpio) return;
    onCrear(limpio);
    setNombre('');
  }

  const intrusas = epicaActual
    ? historias.filter((h) => h.columna !== 'backlog' && h.epica && h.epica !== epicaActual)
    : [];

  return (
    <Modal isOpen={abierto} onClose={onCerrar} title="Épicas del equipo">
      <div className={styles.cuerpo}>
        <p className={styles.intro}>
          Una épica es el entregable completo; las historias son sus partes. Primero se define la
          épica y después se le cuelgan historias — por eso la épica no es una historia más.
        </p>

        <ul className={styles.lista}>
          {epicas.map((e) => {
            const suyas = historias.filter((h) => h.epica === e.id);
            const puntos = suyas.reduce((t, h) => t + Math.max(0, h.puntos), 0);
            const activa = epicaActual === e.id;
            return (
              <li key={e.id} className={styles.fila}>
                <span className={styles.muestra} style={{ background: e.color }} />
                <span className={styles.textos}>
                  <span className={styles.nombre}>{e.nombre}</span>
                  <span className={styles.detalle}>
                    {suyas.length} {suyas.length === 1 ? 'historia' : 'historias'} · {puntos} pts
                  </span>
                </span>
                <button
                  type="button"
                  className={`${styles.elegir} ${activa ? styles.elegida : ''}`}
                  disabled={!editable}
                  onClick={() => onElegir(activa ? null : e.id)}
                >
                  {activa ? 'Épica del sprint' : 'Trabajar esta'}
                </button>
              </li>
            );
          })}
          {epicas.length === 0 && (
            <li className={styles.vacio}>Todavía no han definido ninguna.</li>
          )}
        </ul>

        {editable && (
          <div className={styles.alta}>
            <input
              className={styles.entrada}
              placeholder="Nombre de la épica"
              value={nombre}
              maxLength={60}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crear()}
            />
            <button type="button" className={styles.agregar} onClick={crear} disabled={!nombre.trim()}>
              <span className="material-icons">add</span>
              Nueva épica
            </button>
          </div>
        )}

        {intrusas.length > 0 && (
          <div className={styles.alerta} role="alert">
            <span className="material-icons">warning</span>
            <div>
              <strong>Restricción rota: hay más de una épica en el sprint.</strong>
              <p>
                {intrusas.length === 1 ? 'Esta historia no es' : 'Estas historias no son'} de la
                épica que están trabajando: {intrusas.map((h) => `«${h.que}»`).join(', ')}. Solo se
                trabaja un entregable a la vez: sáquenla del sprint o cambien la épica.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
