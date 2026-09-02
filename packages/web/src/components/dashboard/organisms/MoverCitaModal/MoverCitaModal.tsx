import { useMemo, useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import { fechaLarga, hora } from '../../../../utils/agenda';
import type { CitaProfesor, DiaProfesor } from '../../../../types/agenda';
import styles from './MoverCitaModal.module.css';

interface Props {
  cita: CitaProfesor;
  dias: DiaProfesor[];
  guardando: boolean;
  onMover: (diaId: string, inicio: string) => void;
  onCerrar: () => void;
}

/**
 * Cambiar una cita de hueco, incluso a otro día.
 *
 * Es lo que más se pide el día de las entrevistas: dos alumnos se cambian entre
 * ellos, uno llega tarde y se le pasa al final, hay que juntar a los de una
 * competencia. Antes había que cancelar y volver a apuntar —dos gestos, y por el
 * camino se perdía el sitio si alguien lo tomaba en medio—.
 *
 * Solo se ofrecen huecos LIBRES: el servidor rechaza los ocupados, y enseñarlos
 * sería ofrecer un camino que no existe. Para intercambiar a dos personas se
 * mueve primero una a un hueco libre.
 */
export default function MoverCitaModal({ cita, dias, guardando, onMover, onCerrar }: Props) {
  const [diaId, setDiaId] = useState(cita.diaId ?? dias[0]?.id ?? '');

  const dia = dias.find((d) => d.id === diaId) ?? null;

  /** Los huecos libres del día elegido. El suyo no cuenta: ahí ya está. */
  const libres = useMemo(
    () => (dia?.huecos ?? [])
      .filter((h) => !h.cita && h.inicio !== cita.inicio)
      .map((h) => h.inicio),
    [dia, cita.inicio],
  );

  const [inicio, setInicio] = useState('');
  const elegido = libres.includes(inicio) ? inicio : (libres[0] ?? '');

  return (
    <Modal isOpen onClose={onCerrar} title="Mover la cita">
      <div className={styles.caja}>
        <p className={styles.intro}>
          <strong>{cita.alumno?.name}</strong> está el {fechaLarga(cita.inicio)} a las{' '}
          <strong>{hora(cita.inicio)}</strong>. Elige a dónde lo pasas.
        </p>

        <div className={styles.campos}>
          <label className={styles.campo}>
            <span className={styles.etiqueta}>Día</span>
            <select
              className={styles.select}
              value={diaId}
              disabled={guardando}
              onChange={(e) => { setDiaId(e.target.value); setInicio(''); }}
            >
              {dias.map((d) => (
                <option key={d.id} value={d.id}>{fechaLarga(d.inicio)}</option>
              ))}
            </select>
          </label>

          <label className={styles.campo}>
            <span className={styles.etiqueta}>Hora</span>
            <select
              className={styles.select}
              value={elegido}
              disabled={guardando || libres.length === 0}
              onChange={(e) => setInicio(e.target.value)}
            >
              {libres.length === 0
                ? <option value="">Ese día no tiene huecos libres</option>
                : libres.map((h) => <option key={h} value={h}>{hora(h)}</option>)}
            </select>
          </label>
        </div>

        {/* El número de intento sale del ORDEN de sus citas, así que moverla
            puede cambiarlo. Se avisa porque es lo que decide qué pregunta le
            toca, y descubrirlo después sorprende. */}
        <p className={styles.aviso}>
          Si al moverla cambia el orden de sus entrevistas, cambia también el número de intento
          —y con él la pregunta que le toca—.
        </p>

        <div className={styles.pie}>
          <button
            type="button"
            className={styles.cancelar}
            disabled={guardando}
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.mover}
            disabled={guardando || !elegido}
            onClick={() => onMover(diaId, elegido)}
          >
            {guardando ? 'Moviendo…' : `Mover a las ${elegido ? hora(elegido) : '—'}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
