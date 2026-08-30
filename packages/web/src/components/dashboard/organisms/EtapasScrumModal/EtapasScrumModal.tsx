import { useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import { confirmar } from '../../../../utils/dialogos';
import type { Etapa } from '../../../../utils/scrum';
import styles from './EtapasScrumModal.module.css';

interface Props {
  abierto: boolean;
  etapas: Etapa[];
  paleta: string[];
  onCrear: (datos: { nombre: string; color: string; pista: string }) => void;
  onActualizar: (id: string, datos: Partial<{ nombre: string; color: string; pista: string }>) => void;
  onBorrar: (id: string) => void;
  onCerrar: () => void;
}

/**
 * El catálogo de etapas del grupo.
 *
 * Es un catálogo y no una lista fija de cinco porque cada materia corre su
 * versión del ciclo: unos hacen grooming, otros parten la review en dos. El
 * color es el dato importante —es el fondo de la banda que el alumno ve sobre su
 * tablero— y por eso se elige aquí y no se deduce del nombre.
 *
 * Se guarda al salir del campo, sin botón: son cambios de una palabra y un botón
 * "guardar" por fila convertía cinco retoques en diez clics.
 */
export default function EtapasScrumModal({
  abierto, etapas, paleta, onCrear, onActualizar, onBorrar, onCerrar,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [pista, setPista] = useState('');
  const [color, setColor] = useState('');

  const colorElegido = color || paleta[etapas.length % Math.max(paleta.length, 1)] || '#2563eb';

  async function borrar(etapa: Etapa) {
    const ok = await confirmar({
      titulo: `¿Borrar «${etapa.nombre}»?`,
      texto: 'Las dinámicas que la tuvieran señalada se quedarán sin etapa.',
      confirmar: 'Borrar',
      peligro: true,
    });
    if (ok) onBorrar(etapa.id);
  }

  function crear() {
    const limpio = nombre.trim();
    if (!limpio) return;
    onCrear({ nombre: limpio, color: colorElegido, pista: pista.trim() });
    setNombre('');
    setPista('');
    setColor('');
  }

  return (
    <Modal isOpen={abierto} onClose={onCerrar} title="Etapas del Scrum" wide>
      <div className={styles.cuerpo}>
        <p className={styles.intro}>
          La etapa es el momento del Scrum que la clase está trabajando. Su color es lo que el
          alumno ve de fondo en su tablero, así que conviene que se distingan entre sí de lejos.
        </p>

        <ul className={styles.lista}>
          {etapas.map((etapa) => (
            <li key={etapa.id} className={styles.fila}>
              <label className={styles.muestra} style={{ background: etapa.color }}>
                <input
                  type="color"
                  className={styles.colorOculto}
                  value={etapa.color}
                  onChange={(e) => onActualizar(etapa.id, { color: e.target.value })}
                  aria-label={`Color de ${etapa.nombre}`}
                />
              </label>
              <div className={styles.textos}>
                <input
                  className={styles.nombre}
                  defaultValue={etapa.nombre}
                  maxLength={40}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== etapa.nombre) onActualizar(etapa.id, { nombre: v });
                    else e.target.value = etapa.nombre;
                  }}
                />
                <input
                  className={styles.pista}
                  defaultValue={etapa.pista}
                  maxLength={120}
                  placeholder="Qué se hace en esta etapa"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== etapa.pista) onActualizar(etapa.id, { pista: v });
                  }}
                />
              </div>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => borrar(etapa)}
                title={`Borrar ${etapa.nombre}`}
              >
                <span className="material-icons">delete</span>
              </button>
            </li>
          ))}
          {etapas.length === 0 && <li className={styles.vacio}>Este grupo no tiene etapas.</li>}
        </ul>

        <div className={styles.alta}>
          <span className={styles.etiqueta}>Nueva etapa</span>
          <div className={styles.altaFila}>
            <input
              className={styles.entrada}
              placeholder="Nombre de la etapa"
              value={nombre}
              maxLength={40}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crear()}
            />
            <input
              className={styles.entrada}
              placeholder="Qué se hace en ella (opcional)"
              value={pista}
              maxLength={120}
              onChange={(e) => setPista(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crear()}
            />
            <button type="button" className={styles.agregar} onClick={crear} disabled={!nombre.trim()}>
              <span className="material-icons">add</span>
              Agregar
            </button>
          </div>
          <div className={styles.paleta}>
            {paleta.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.muestra} ${colorElegido === c ? styles.muestraActiva : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Elegir ${c}`}
                aria-pressed={colorElegido === c}
              />
            ))}
            <label className={styles.muestraPropia} title="Otro color…">
              <span className="material-icons">edit</span>
              <input
                type="color"
                className={styles.colorOculto}
                value={colorElegido}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Elegir otro color"
              />
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}
