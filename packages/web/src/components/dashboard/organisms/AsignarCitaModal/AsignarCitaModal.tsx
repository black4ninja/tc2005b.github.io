import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import { hora } from '../../../../utils/agenda';
import type { AlumnoConPregunta } from '../../../../types/preguntas';
import styles from './AsignarCitaModal.module.css';

interface Props {
  /** Los huecos LIBRES del día, en ISO y en orden. */
  libres: string[];
  /** Cuál viene elegido: el que el profesor pulsó. */
  inicioSugerido: string;
  competencias: { id: string; nombre: string }[];
  alumnos: AlumnoConPregunta[];
  /** Cuántas citas lleva cada alumno por competencia. Clave `alumnoId::compId`. */
  usados: Map<string, number>;
  maxIntentos: number;
  guardando: boolean;
  onAsignar: (inicio: string, alumnoId: string, competenciaId: string) => void;
  onCerrar: () => void;
}

/**
 * Apuntar a un alumno en un hueco, desde el lado del profesor.
 *
 * La agenda la escriben los alumnos, y esa es la gracia: eligen su hora y se
 * organizan. Pero el día de las entrevistas siempre pasa algo que la hoja no
 * previó —alguien no se apuntó, alguien llega y hay un hueco, dos se cambian
 * entre ellos—, y hasta ahora el profesor no tenía forma de arreglarlo desde
 * aquí. El endpoint existía; lo que faltaba era esta pantalla.
 *
 * Se elige la hora primero porque es lo que el profesor ya tiene en la cabeza
 * cuando abre esto: viene de mirar un hueco libre en la tabla.
 */
export default function AsignarCitaModal({
  libres, inicioSugerido, competencias, alumnos, usados, maxIntentos,
  guardando, onAsignar, onCerrar,
}: Props) {
  const [inicio, setInicio] = useState(inicioSugerido);
  const [competenciaId, setCompetenciaId] = useState(competencias[0]?.id ?? '');
  const [texto, setTexto] = useState('');
  const buscador = useRef<HTMLInputElement>(null);

  useEffect(() => { buscador.current?.focus(); }, []);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return alumnos;
    return alumnos.filter(
      (a) => a.name.toLowerCase().includes(q) || a.matricula.toLowerCase().includes(q),
    );
  }, [alumnos, texto]);

  return (
    <Modal isOpen onClose={onCerrar} title="Apuntar a alguien en un hueco">
      <div className={styles.caja}>
        <p className={styles.intro}>
          Lo normal es que se apunten ellos. Esto es para el día de las entrevistas: alguien que
          no reservó, un cambio de última hora, un hueco que se quedó suelto.
        </p>

        <div className={styles.campos}>
          <label className={styles.campo}>
            <span className={styles.etiqueta}>Hora</span>
            <select
              className={styles.select}
              value={inicio}
              disabled={guardando}
              onChange={(e) => setInicio(e.target.value)}
            >
              {libres.map((h) => (
                <option key={h} value={h}>{hora(h)}</option>
              ))}
            </select>
          </label>

          <label className={styles.campo}>
            <span className={styles.etiqueta}>Competencia</span>
            <select
              className={styles.select}
              value={competenciaId}
              disabled={guardando}
              onChange={(e) => setCompetenciaId(e.target.value)}
            >
              {competencias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.buscadorFila}>
          <Icon name="search" size="sm" />
          <input
            ref={buscador}
            className={styles.buscador}
            type="text"
            value={texto}
            disabled={guardando}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por nombre o matrícula…"
          />
        </div>

        {competencias.length === 0 ? (
          <p className={styles.vacio}>
            El banco de este grupo no tiene ninguna competencia todavía.
          </p>
        ) : filtrados.length === 0 ? (
          <p className={styles.vacio}>Ningún alumno coincide.</p>
        ) : (
          <ul className={styles.lista}>
            {filtrados.map((a) => {
              // A quien ya agotó sus oportunidades se le APAGA en vez de
              // esconderlo: hay que verlo para entender por qué no está, y el
              // camino para cambiárselo es cancelarle una cita.
              const lleva = usados.get(`${a.id}::${competenciaId}`) ?? 0;
              const lleno = lleva >= maxIntentos;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className={`${styles.opcion} ${lleno ? styles.opcionApagada : ''}`}
                    disabled={guardando || lleno}
                    onClick={() => onAsignar(inicio, a.id, competenciaId)}
                    title={lleno
                      ? 'Ya tiene todas sus oportunidades en esta competencia'
                      : `Apuntarlo a las ${hora(inicio)}`}
                  >
                    <span className={styles.nombre}>{a.name}</span>
                    <span className={styles.matricula}>{a.matricula}</span>
                    <span className={lleno ? styles.contadorLleno : styles.contador}>
                      {lleva} de {maxIntentos}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
