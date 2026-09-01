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
  /** Quién lleva ya una historia sin terminar, y cuál. Una persona, una historia. */
  ocupados?: Map<string, Historia>;
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
  abierto, historia, miembros, ocupados, epicas, guardando, onGuardar, onBorrar, onCerrar,
}: Props) {
  const [datos, setDatos] = useState<DatosHistoria>(VACIA);

  /**
   * El formulario se rellena UNA VEZ por apertura, no cada vez que cambian las
   * props.
   *
   * Las dependencias son el «abierto» y el ID de la historia, a propósito:
   * `historia` y `epicas` son objetos nuevos en cada refresco del tablero —el
   * stream trae uno cada vez que alguien del equipo toca algo, y además hay un
   * sondeo—, y con ellos en la lista el efecto volvía a correr mientras se
   * escribía y devolvía los campos a lo que había guardado. Escribir tres
   * frases seguidas sin que llegara ningún refresco era cuestión de suerte.
   *
   * `epicas` se lee dentro y no está en la lista: no hace falta que vuelva a
   * correr cuando cambie, solo interesa la que hay al abrir.
   */
  const historiaId = historia?.id ?? null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, historiaId]);

  const editando = !!historia;
  // La épica es obligatoria: una historia es un trozo de un entregable, y sin
  // decir de cuál el backlog es una lista de tareas sueltas. El servidor lo
  // rechaza igual; esto evita el viaje en balde.
  const puedeGuardar = datos.porQue.trim() !== '' && !!datos.epicaId && !guardando;

  const epicaPrevia = epicas.find((e) => e.id === datos.epicaId) ?? null;
  // Una historia nueva nace en el backlog, así que el caso «sin historia» cuenta
  // igual: en ninguno de los dos hay a quién asignársela todavía.
  const enBacklog = (historia?.columna ?? 'backlog') === 'backlog';

  const previa: Historia = {
    id: historia?.id ?? 'previa',
    porQue: datos.porQue || 'Qué valor aporta',
    que: datos.que,
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
      texto: historia.porQue,
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

          {/* El único obligatorio, y se dice: es el valor que aporta la
              historia, no un preámbulo del «qué». */}
          <Campo
            etiqueta="¿Por qué?"
            pista="Qué valor aporta"
            valor={datos.porQue}
            onChange={(porQue) => setDatos((d) => ({ ...d, porQue }))}
            bloqueado={guardando}
            obligatorio
          />
          <Campo
            etiqueta="¿Qué?"
            pista="Qué tiene que poder hacer"
            valor={datos.que}
            onChange={(que) => setDatos((d) => ({ ...d, que }))}
            bloqueado={guardando}
          />
          <Campo
            etiqueta="¿Cómo?"
            pista="Con qué se piensa resolver"
            valor={datos.como}
            onChange={(como) => setDatos((d) => ({ ...d, como }))}
            bloqueado={guardando}
          />

          <div className={styles.tresBloques}>
            {epicas.length > 0 && (
              <div className={styles.bloque}>
                <div className={styles.bloqueTitulo}>
                  <span className={styles.etiqueta}>Épica</span>
                  <span className={styles.aclaracion}>· obligatorio</span>
                </div>
                {/* Sin «sin épica»: toda historia pertenece a un entregable. La
                    primera de la lista viene elegida, así que no hay forma de
                    dejarla en blanco sin querer. */}
                <select
                  className={styles.select}
                  disabled={guardando}
                  value={datos.epicaId ?? ''}
                  onChange={(e) => setDatos((d) => ({ ...d, epicaId: e.target.value || null }))}
                >
                  {epicas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* En el backlog no se reparte: la historia todavía no es de nadie
                porque el equipo no se ha comprometido a hacerla. En vez de un
                desplegable muerto se dice cuándo toca. */}
            <div className={styles.bloque}>
              <div className={styles.bloqueTitulo}>
                <span className={styles.etiqueta}>Responsable</span>
                <span className={styles.aclaracion}>
                  {enBacklog ? 'se asigna en el sprint' : 'una sola persona'}
                </span>
              </div>
              {enBacklog ? (
                <p className={styles.aviso}>
                  En el backlog las historias no llevan responsable. Métela al sprint y ahí se
                  reparte.
                </p>
              ) : (
                <select
                  className={styles.select}
                  disabled={guardando}
                  value={datos.responsableId ?? ''}
                  onChange={(e) =>
                    setDatos((d) => ({ ...d, responsableId: e.target.value || null }))}
                >
                  <option value="">Sin asignar</option>
                  {miembros.map((m) => {
                    const suya = ocupados?.get(m.id);
                    const ocupado = !!suya && suya.id !== historia?.id;
                    return (
                      <option key={m.id} value={m.id} disabled={ocupado}>
                        {m.name}{ocupado ? ' · ya lleva una' : ''}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            <div className={styles.bloque}>
              <span className={styles.etiqueta}>Estimación</span>
              <select
                className={styles.select}
                disabled={guardando}
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
                  disabled={guardando}
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
          <button type="button" className={styles.borrar} onClick={borrar} disabled={guardando}>
            <span className="material-icons">delete</span>
            Borrar
          </button>
        )}
        <div className={styles.accionesDerecha}>
          <button type="button" className={styles.cancelar} onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          {/* Mientras el guardado viaja, el formulario entero se queda quieto:
              lo que se escribiera a partir de aquí no iría dentro. */}
          <button
            type="button"
            className={styles.guardar}
            disabled={!puedeGuardar}
            aria-busy={guardando}
            onClick={() => onGuardar({ ...datos, porQue: datos.porQue.trim() })}
          >
            {guardando && <span className={styles.girando} aria-hidden />}
            {guardando ? 'Guardando…' : editando ? 'Guardar' : 'Guardar historia'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Campo({
  etiqueta, pista, valor, onChange, obligatorio = false, bloqueado = false,
}: {
  etiqueta: string;
  pista: string;
  valor: string;
  onChange: (v: string) => void;
  obligatorio?: boolean;
  /** Mientras el guardado viaja: lo que se escriba ahí ya no iría en él. */
  bloqueado?: boolean;
}) {
  return (
    <label className={styles.campo}>
      <span className={styles.etiqueta}>
        {etiqueta}
        {obligatorio && <span className={styles.obligatorio}> · obligatorio</span>}
      </span>
      <textarea
        className={styles.entrada}
        rows={2}
        maxLength={200}
        placeholder={pista}
        value={valor}
        disabled={bloqueado}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
