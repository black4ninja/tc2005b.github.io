import { useEffect, useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import PostItHistoria from '../PostItHistoria/PostItHistoria';
import { confirmar } from '../../../../utils/dialogos';
import {
  ESTIMACIONES, PRIORIDADES,
  type Epica, type Historia, type Persona, type Prioridad,
} from '../../../../utils/scrum';
import styles from './HistoriaForm.module.css';

export interface DatosHistoria {
  porQue: string;
  que: string;
  como: string;
  puntos: number;
  prioridad: Prioridad;
  responsableId: string | null;
  epicaId: string | null;
}

interface Props {
  abierto: boolean;
  /** `null` = alta. Las altas nacen siempre en Backlog. */
  historia: Historia | null;
  miembros: Persona[];
  epicas: Epica[];
  guardando?: boolean;
  onGuardar: (datos: DatosHistoria) => void;
  onBorrar?: (historiaId: string) => void;
  onCerrar: () => void;
}

const VACIA: DatosHistoria = {
  porQue: '',
  que: '',
  como: '',
  puntos: 0,
  prioridad: 'should',
  responsableId: null,
  epicaId: null,
};

/**
 * Alta y edición de una historia de usuario.
 *
 * Dos cosas que la forma del formulario impone y que el texto libre no impondría:
 *  - los tres campos van SEPARADOS, así que el «por qué» —el valor que aporta—
 *    no se puede omitir sin que se note;
 *  - el responsable es una lista de UNA sola opción. En Scrum una historia la
 *    lleva una persona, y dejar marcar a varias es la manera silenciosa de que
 *    al final no la lleve nadie.
 *
 * Responsable y estimación son desplegables y no filas de fichas: con cinco
 * compañeros y ocho cifras, las fichas ocupaban media pantalla y empujaban los
 * campos de texto —lo importante— fuera de la vista.
 *
 * La vista previa al lado no es adorno: lo que se escribe acaba en un post-it de
 * cuatro centímetros, y verlo mientras se escribe es lo que hace que la gente
 * acorte la frase antes de guardarla.
 */
export default function HistoriaForm({
  abierto, historia, miembros, epicas, guardando, onGuardar, onBorrar, onCerrar,
}: Props) {
  const [datos, setDatos] = useState<DatosHistoria>(VACIA);

  useEffect(() => {
    if (!abierto) return;
    setDatos(
      historia
        ? {
            porQue: historia.porQue,
            que: historia.que,
            como: historia.como,
            puntos: historia.puntos,
            prioridad: historia.prioridad,
            responsableId: historia.responsable?.id ?? null,
            epicaId: historia.epica ?? null,
          }
        // Una historia nueva nace en la épica que el equipo está trabajando: es
        // lo que quiere el 90 % de las veces y evita el error más común.
        : { ...VACIA, epicaId: epicas[0]?.id ?? null },
    );
  }, [abierto, historia, epicas]);

  const editando = !!historia;
  const puedeGuardar = datos.que.trim() !== '' && !guardando;

  const epicaPrevia = epicas.find((e) => e.id === datos.epicaId) ?? null;

  const previa: Historia = {
    id: historia?.id ?? 'previa',
    porQue: datos.porQue,
    que: datos.que || 'Qué tiene que poder hacer',
    como: datos.como,
    puntos: datos.puntos,
    prioridad: datos.prioridad,
    columna: historia?.columna ?? 'backlog',
    orden: 0,
    epica: datos.epicaId,
    archivada: false,
    responsable: datos.responsableId
      ? miembros.find((m) => m.id === datos.responsableId) ?? null
      : null,
  };

  async function borrar() {
    if (!historia || !onBorrar) return;
    const ok = await confirmar({
      titulo: '¿Borrar la historia?',
      texto: historia.que,
      confirmar: 'Borrar',
      peligro: true,
    });
    if (ok) onBorrar(historia.id);
  }

  return (
    <Modal
      isOpen={abierto}
      onClose={onCerrar}
      title={editando ? 'Historia de usuario' : 'Nueva historia'}
      wide
    >
      <div className={styles.cuerpo}>
        <div className={styles.campos}>
          {!editando && (
            <p className={styles.nota}>
              Se crea en el <strong>backlog</strong> del equipo. Desde ahí la arrastras al sprint
              cuando toque.
            </p>
          )}

          <Campo
            etiqueta="¿Por qué?"
            pista="Qué valor aporta"
            valor={datos.porQue}
            onChange={(porQue) => setDatos((d) => ({ ...d, porQue }))}
          />
          <Campo
            etiqueta="¿Qué?"
            pista="Qué tiene que poder hacer"
            valor={datos.que}
            onChange={(que) => setDatos((d) => ({ ...d, que }))}
          />
          <Campo
            etiqueta="¿Cómo?"
            pista="Con qué se piensa resolver"
            valor={datos.como}
            onChange={(como) => setDatos((d) => ({ ...d, como }))}
          />

          <div className={styles.tresBloques}>
            {epicas.length > 0 && (
              <div className={styles.bloque}>
                <div className={styles.bloqueTitulo}>
                  <span className={styles.etiqueta}>Épica</span>
                  <span className={styles.aclaracion}>de qué entregable es</span>
                </div>
                <select
                  className={styles.select}
                  value={datos.epicaId ?? ''}
                  onChange={(e) => setDatos((d) => ({ ...d, epicaId: e.target.value || null }))}
                >
                  <option value="">Sin épica</option>
                  {epicas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.bloque}>
              <div className={styles.bloqueTitulo}>
                <span className={styles.etiqueta}>Responsable</span>
                <span className={styles.aclaracion}>una sola persona</span>
              </div>
              <select
                className={styles.select}
                value={datos.responsableId ?? ''}
                onChange={(e) =>
                  setDatos((d) => ({ ...d, responsableId: e.target.value || null }))}
              >
                <option value="">Sin asignar</option>
                {miembros.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.bloque}>
              <span className={styles.etiqueta}>Estimación</span>
              <select
                className={styles.select}
                value={datos.puntos}
                onChange={(e) => setDatos((d) => ({ ...d, puntos: Number(e.target.value) }))}
              >
                {ESTIMACIONES.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.etiqueta} · {e.descripcion}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.bloque}>
            <span className={styles.etiqueta}>Prioridad MoSCoW</span>
            <div className={styles.fichas}>
              {PRIORIDADES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`${styles.ficha} ${styles[p.key]} ${
                    datos.prioridad === p.key ? styles.fichaPrioridadActiva : ''
                  }`}
                  onClick={() => setDatos((d) => ({ ...d, prioridad: p.key }))}
                  aria-pressed={datos.prioridad === p.key}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        <aside className={styles.previa}>
          <span className={styles.etiqueta}>Así queda en el tablero</span>
          <PostItHistoria historia={previa} epica={epicaPrevia} />
          <p className={styles.pista}>
            El responsable se cambia desde la propia tarjeta, sin abrirla. El borde de arriba
            es el color de su épica.
          </p>
        </aside>
      </div>

      <div className={styles.acciones}>
        {editando && onBorrar && (
          <button type="button" className={styles.borrar} onClick={borrar}>
            <span className="material-icons">delete</span>
            Borrar
          </button>
        )}
        <div className={styles.accionesDerecha}>
          <button type="button" className={styles.cancelar} onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.guardar}
            disabled={!puedeGuardar}
            onClick={() => onGuardar({ ...datos, que: datos.que.trim() })}
          >
            {guardando ? 'Guardando…' : editando ? 'Guardar' : 'Guardar historia'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Campo({
  etiqueta, pista, valor, onChange,
}: {
  etiqueta: string;
  pista: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className={styles.campo}>
      <span className={styles.etiqueta}>{etiqueta}</span>
      <textarea
        className={styles.entrada}
        rows={2}
        maxLength={200}
        placeholder={pista}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
