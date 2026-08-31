import { useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import { confirmar } from '../../../../utils/dialogos';
import {
  MOVIMIENTOS, VISIBILIDADES,
  type Etapa, type Movimiento, type PoliticaEtapa, type Visibilidad,
} from '../../../../utils/scrum';
import styles from './EtapasScrumModal.module.css';

interface Props {
  abierto: boolean;
  etapas: Etapa[];
  paleta: string[];
  onCrear: (datos: { nombre: string; color: string; pista: string }) => void;
  onActualizar: (
    id: string,
    datos: Partial<{ nombre: string; color: string; pista: string; politica: Partial<PoliticaEtapa> }>,
  ) => void;
  onBorrar: (id: string) => void;
  onCerrar: () => void;
}

/** `mm:ss` a segundos y al revés, para el campo del cronómetro. */
function aTexto(segundos: number | null): string {
  if (!segundos) return '';
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

function aSegundos(texto: string): number | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  const partes = limpio.split(':').map((p) => Number(p));
  if (partes.some((n) => Number.isNaN(n))) return null;
  const segundos = partes.length === 2 ? partes[0] * 60 + partes[1] : partes[0];
  return segundos > 0 ? Math.trunc(segundos) : null;
}

/**
 * El catálogo de etapas del grupo y —lo importante— QUÉ DEJA TOCAR cada una.
 *
 * Es la pieza que convierte el tablero en la explicación del ciclo: en planning
 * el sprint backlog se ve pero no se toca, en grooming se pliega, en la daily se
 * pliega el backlog, en la retrospectiva se esconde el kanban entero. La regla
 * deja de ser algo que el profesor repite y pasa a ser algo que la pantalla
 * hace.
 *
 * Se guarda al salir del campo, sin botón: son cambios de una palabra y un
 * «guardar» por fila convertía cinco retoques en diez clics.
 */
export default function EtapasScrumModal({
  abierto, etapas, paleta, onCrear, onActualizar, onBorrar, onCerrar,
}: Props) {
  const [nombre, setNombre] = useState('');
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
    onCrear({ nombre: limpio, color: colorElegido, pista: '' });
    setNombre('');
    setColor('');
  }

  return (
    <Modal isOpen={abierto} onClose={onCerrar} title="Etapas del Scrum" extraWide>
      <div className={styles.cuerpo}>
        <p className={styles.intro}>
          Cada etapa lleva su color, su descripción, su tiempo y qué deja tocar del tablero. Así la
          regla no hay que repetirla: en planning el sprint backlog se ve pero no se toca, en
          grooming se pliega, y en la daily se pliega el backlog para que solo quede lo
          comprometido.
        </p>

        <div className={styles.tablaCaja}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Etapa</th>
                <th className={styles.corta}>Tiempo</th>
                <th className={styles.media}>Backlog</th>
                <th className={styles.media}>Sprint backlog</th>
                <th className={styles.media}>Movimientos</th>
                <th className={styles.corta}>Burndown</th>
                <th className={styles.corta}>Retro</th>
                <th className={styles.corta}>Cobra deuda</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {etapas.map((etapa) => (
                <tr key={etapa.id}>
                  <td>
                    <div className={styles.identidad}>
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
                        <textarea
                          className={styles.pista}
                          defaultValue={etapa.pista}
                          maxLength={400}
                          rows={2}
                          placeholder="Qué hay que hacer en esta etapa"
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== etapa.pista) onActualizar(etapa.id, { pista: v });
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td>
                    <input
                      className={styles.tiempo}
                      defaultValue={aTexto(etapa.politica.duracionSegundos)}
                      placeholder="—"
                      onBlur={(e) => {
                        const segundos = aSegundos(e.target.value);
                        if (segundos !== etapa.politica.duracionSegundos) {
                          onActualizar(etapa.id, { politica: { duracionSegundos: segundos } });
                        }
                        e.target.value = aTexto(segundos);
                      }}
                    />
                  </td>

                  <td>{selectVisibilidad(etapa, 'backlog', onActualizar)}</td>
                  <td>{selectVisibilidad(etapa, 'sprint', onActualizar)}</td>

                  <td>
                    <select
                      className={styles.select}
                      value={etapa.politica.movimientos}
                      onChange={(e) =>
                        onActualizar(etapa.id, {
                          politica: { movimientos: e.target.value as Movimiento },
                        })}
                    >
                      {MOVIMIENTOS.map((m) => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                  </td>

                  {(['burndown', 'retro', 'cobraDeuda'] as const).map((campo) => (
                    <td key={campo}>
                      <label className={styles.interruptor}>
                        <input
                          type="checkbox"
                          checked={etapa.politica[campo]}
                          onChange={(e) =>
                            onActualizar(etapa.id, { politica: { [campo]: e.target.checked } })}
                        />
                        <span className={styles.palanca} />
                      </label>
                    </td>
                  ))}

                  <td className={styles.acciones}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => borrar(etapa)}
                      title={`Borrar ${etapa.nombre}`}
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
              {etapas.length === 0 && (
                <tr><td colSpan={9} className={styles.vacio}>Este grupo no tiene etapas.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pie}>
          <p className={styles.nota}>
            <strong>Cobra deuda</strong> marca cuál es el planning: al salir de esa etapa se fija lo
            que cada equipo se comprometió y se le devuelven al backlog las historias que no le
            caben por el bloqueo que arrastra.
          </p>
          <div className={styles.alta}>
            <input
              className={styles.entrada}
              placeholder="Nombre de la etapa"
              value={nombre}
              maxLength={40}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crear()}
            />
            <div className={styles.paleta}>
              {paleta.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.muestra} ${colorElegido === c ? styles.muestraActiva : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Elegir ${c}`}
                />
              ))}
            </div>
            <button type="button" className={styles.agregar} onClick={crear} disabled={!nombre.trim()}>
              <span className="material-icons">add</span>
              Nueva etapa
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function selectVisibilidad(
  etapa: Etapa,
  campo: 'backlog' | 'sprint',
  onActualizar: Props['onActualizar'],
) {
  return (
    <select
      className={`${styles.select} ${styles[etapa.politica[campo]]}`}
      value={etapa.politica[campo]}
      onChange={(e) =>
        onActualizar(etapa.id, { politica: { [campo]: e.target.value as Visibilidad } })}
    >
      {VISIBILIDADES.map((v) => (
        <option key={v.key} value={v.key}>{v.label}</option>
      ))}
    </select>
  );
}
