import { useState } from 'react';
import { confirmar } from '../../../../utils/dialogos';
import {
  iniciales, type ColumnaRetro, type EquipoTablero, type TarjetaRetro,
} from '../../../../utils/scrum';
import styles from './TableroRetro.module.css';

interface Props {
  equipo: EquipoTablero;
  /** Quién está mirando: solo el responsable marca su propio compromiso. */
  yoId: string;
  editable?: boolean;
  /** Devuelven la promesa del viaje para poder esperarla y decirlo en pantalla. */
  onCrear: (columna: ColumnaRetro, texto: string, responsableId: string | null) => Promise<unknown>;
  onAsignar: (tarjetaId: string, alumnoId: string | null) => void;
  onBorrar: (tarjetaId: string) => void;
  onMarcar: (tarjetaId: string, estado: 'cumplido' | 'fallado') => Promise<unknown>;
}

const COLUMNAS: { key: ColumnaRetro; titulo: string; pista: string }[] = [
  {
    key: 'bien',
    titulo: 'Qué hicimos bien',
    pista: 'Lo que hay que repetir. Sin responsable: es una observación.',
  },
  {
    key: 'mal',
    titulo: 'Qué hicimos mal',
    pista: 'Lo que estorbó. Tampoco lleva nombre: no se trata de repartir culpas.',
  },
  {
    key: 'mejorar',
    titulo: 'Qué podemos mejorar',
    pista: 'La única con responsable: cada una se convierte en un compromiso del próximo sprint.',
  },
];

/**
 * El tablero de la retrospectiva.
 *
 * Sale en lugar del kanban del sprint, no junto a él: la regla de la dinámica es
 * que aquí no se habla de los modelos, solo de cómo trabajó el equipo, y con el
 * tablero delante la conversación se va sola a las tarjetas.
 *
 * «Qué podemos mejorar» es la única columna con responsable porque es la única
 * que genera un compromiso. Y estar asignado a uno no significa tener que
 * hacerlo solo: significa responder de su seguimiento. Está escrito en la
 * columna porque es la confusión más común.
 */
export default function TableroRetro({
  equipo, yoId, editable = true, onCrear, onAsignar, onBorrar, onMarcar,
}: Props) {
  const [redactando, setRedactando] = useState<ColumnaRetro | null>(null);
  const [texto, setTexto] = useState('');
  // La retro se escribe a ráfagas, y hasta ahora al pulsar Enter el recuadro se
  // vaciaba y se cerraba al instante: la tarjeta no aparecía hasta un par de
  // segundos después y no se sabía si se había ido o se había perdido. Ahora se
  // queda ahí, apagado, hasta que el servidor confirma.
  const [guardando, setGuardando] = useState(false);
  // La tarjeta que se está marcando. Cerrar un compromiso también es un viaje, y
  // dos personas dándole al mismo botón porque «no pasó nada» es lo que había.
  const [marcando, setMarcando] = useState<string | null>(null);

  async function marcar(tarjetaId: string, estado: 'cumplido' | 'fallado') {
    if (marcando) return;
    setMarcando(tarjetaId);
    try {
      await onMarcar(tarjetaId, estado);
    } finally {
      setMarcando(null);
    }
  }

  async function guardar(columna: ColumnaRetro) {
    if (guardando) return;
    const limpio = texto.trim();
    if (!limpio) {
      setRedactando(null);
      return;
    }
    setGuardando(true);
    try {
      await onCrear(columna, limpio, null);
      // Si falla, el texto se queda escrito: reescribirlo de memoria es lo
      // último que hace falta con el cronómetro de la retro corriendo.
      setTexto('');
      setRedactando(null);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(t: TarjetaRetro) {
    const ok = await confirmar({
      titulo: '¿Borrar la tarjeta?',
      texto: t.texto,
      confirmar: 'Borrar',
      peligro: true,
    });
    if (ok) onBorrar(t.id);
  }

  function tarjeta(t: TarjetaRetro, conResponsable: boolean) {
    return (
      <article key={t.id} className={styles.tarjeta}>
        <div className={styles.tarjetaTexto}>{t.texto}</div>
        {conResponsable && (
          <div className={styles.responsable}>
            {t.responsable ? (
              <>
                <span className={styles.avatar}>{iniciales(t.responsable.name)}</span>
                <span className={styles.nombre}>{t.responsable.name}</span>
              </>
            ) : (
              <>
                <span className={styles.avatarVacio} />
                <span className={styles.sinAsignar}>Sin responsable</span>
              </>
            )}
            {editable && (
              <select
                className={styles.selector}
                value={t.responsable?.id ?? ''}
                onChange={(e) => onAsignar(t.id, e.target.value || null)}
                aria-label="Responsable del compromiso"
              >
                <option value="">Sin responsable</option>
                {equipo.miembros.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
        {editable && (
          <button type="button" className={styles.borrar} onClick={() => borrar(t)} title="Borrar">
            <span className="material-icons">close</span>
          </button>
        )}
      </article>
    );
  }

  /** Un compromiso que viene de la retro anterior, con sus dos botones. */
  function compromiso(t: TarjetaRetro) {
    const mio = t.responsable?.id === yoId || !t.responsable;
    return (
      <article key={t.id} className={`${styles.tarjeta} ${styles.compromiso}`}>
        <div className={styles.tarjetaTexto}>{t.texto}</div>
        <div className={styles.responsable}>
          {t.responsable ? (
            <>
              <span className={styles.avatar}>{iniciales(t.responsable.name)}</span>
              <span className={styles.nombre}>{t.responsable.name}</span>
            </>
          ) : (
            <>
              <span className={styles.avatarVacio} />
              <span className={styles.sinAsignar}>Sin responsable</span>
            </>
          )}
        </div>
        <div className={styles.marcar}>
          <button
            type="button"
            className={styles.si}
            disabled={!editable || !mio || marcando !== null}
            aria-busy={marcando === t.id}
            onClick={() => void marcar(t.id, 'cumplido')}
            title="Sí lo cumplimos: el compromiso se cierra"
          >
            {marcando === t.id
              ? <span className={styles.girando} aria-hidden />
              : <span className="material-icons">check</span>}
            Sí
          </button>
          <button
            type="button"
            className={styles.no}
            disabled={!editable || !mio || marcando !== null}
            aria-busy={marcando === t.id}
            onClick={() => void marcar(t.id, 'fallado')}
            title="No lo cumplimos: se cierra igual, pero queda registrado"
          >
            {marcando === t.id
              ? <span className={styles.girando} aria-hidden />
              : <span className="material-icons">close</span>}
            No
          </button>
        </div>
        {!mio && (
          <span className={styles.ajeno}>Lo marca {t.responsable?.name.split(' ')[0]}</span>
        )}
      </article>
    );
  }

  return (
    <div className={styles.tablero}>
      {equipo.compromisos.length > 0 && (
        <section className={`${styles.columna} ${styles.columnaCompromisos}`}>
          <header className={styles.cabecera}>
            <span className={styles.titulo}>Compromisos previos</span>
            <span className={styles.contador}>{equipo.compromisos.length}</span>
          </header>
          <p className={styles.pista}>
            Lo que se prometieron en la retro anterior. Marquen si lo cumplieron: los dos botones
            lo cierran, y lo que no se cierra sigue apareciendo aquí.
          </p>
          {equipo.compromisos.map(compromiso)}
        </section>
      )}

      {COLUMNAS.map(({ key, titulo, pista }) => {
        const tarjetas = equipo.retro.filter((t) => t.columna === key);
        return (
          <section
            key={key}
            className={`${styles.columna} ${key === 'mejorar' ? styles.columnaMejorar : ''}`}
          >
            <header className={styles.cabecera}>
              <span className={styles.titulo}>{titulo}</span>
              <span className={styles.contador}>{tarjetas.length}</span>
            </header>
            <p className={styles.pista}>{pista}</p>

            {tarjetas.map((t) => tarjeta(t, key === 'mejorar'))}

            {editable && (
              redactando === key ? (
                <div className={styles.redactando}>
                  <textarea
                    className={styles.entrada}
                    rows={2}
                    maxLength={200}
                    autoFocus
                    value={texto}
                    disabled={guardando}
                    placeholder="Escribe y pulsa Enter"
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void guardar(key);
                      }
                      if (e.key === 'Escape' && !guardando) { setTexto(''); setRedactando(null); }
                    }}
                    onBlur={() => void guardar(key)}
                  />
                  {guardando && (
                    <span className={styles.guardando}>
                      <span className={styles.girando} aria-hidden />
                      Guardando…
                    </span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.agregar}
                  onClick={() => { setTexto(''); setRedactando(key); }}
                >
                  <span className="material-icons">add</span>
                  Agregar
                </button>
              )
            )}
          </section>
        );
      })}
    </div>
  );
}
