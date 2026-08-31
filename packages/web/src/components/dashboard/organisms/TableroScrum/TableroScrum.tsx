import { useCallback, useMemo, useRef, useState } from 'react';
import PostItHistoria from '../PostItHistoria/PostItHistoria';
import { useArrastre } from '../../../../hooks/useArrastre';
import {
  COLUMNAS, COLUMNAS_SPRINT, POLITICA_POR_DEFECTO, agruparPorColumna, bloqueoAjeno,
  historiasVivasPorPersona, permiteMover, sumaPuntos,
  type Bloqueo, type Columna, type Escala, type EquipoTablero, type Historia,
  type PoliticaEtapa, type Visibilidad,
} from '../../../../utils/scrum';
import styles from './TableroScrum.module.css';

interface Props {
  equipo: EquipoTablero;
  escala?: Escala;
  /** Sin esto el tablero es de lectura: es como lo ve la proyección. */
  editable?: boolean;
  /** Qué deja tocar la etapa en curso. */
  politica?: PoliticaEtapa;
  /** Cuántas historias hay archivadas de sprints anteriores. */
  archivadas?: number;
  /**
   * El objetivo del SPRINT, que es uno solo para toda la clase. No vive en el
   * equipo: todos trabajan contra el mismo y por eso llega de fuera.
   */
  objetivo?: string;
  /** Quién está editando qué: la tarjeta ocupada no se abre ni se arrastra. */
  bloqueos?: Bloqueo[];
  yoId?: string;
  onNuevaHistoria?: () => void;
  onAbrirHistoria?: (historia: Historia) => void;
  onMover?: (historiaId: string, columna: Columna) => void;
  onAsignar?: (historiaId: string, alumnoId: string | null) => void;
  onEditarObjetivo?: () => void;
}

const CLAVES = new Set<string>(COLUMNAS.map((c) => c.key));

/**
 * El tablero de un equipo.
 *
 * La forma es la enseñanza: `backlog` queda FUERA del recuadro punteado y las
 * otras cuatro dentro. Ese recuadro es el sprint backlog —a lo que el equipo se
 * comprometió— y lleva el objetivo del sprint dentro, no encima.
 *
 * Y lo que se puede tocar lo decide la ETAPA, no el componente: en planning el
 * sprint backlog se ve apagado con su candado, en grooming se pliega, en la
 * daily se pliega el backlog. La regla deja de ser algo que el profesor repite
 * y pasa a ser algo que la pantalla hace.
 */
export default function TableroScrum({
  equipo,
  escala = 'full',
  editable = false,
  politica = POLITICA_POR_DEFECTO,
  archivadas = 0,
  objetivo = '',
  bloqueos = [],
  yoId = '',
  onNuevaHistoria,
  onAbrirHistoria,
  onMover,
  onAsignar,
  onEditarObjetivo,
}: Props) {
  const porColumna = agruparPorColumna(equipo.historias ?? []);
  const tablero = useRef<HTMLDivElement>(null);
  // Con `?? []` a propósito: un equipo sin épicas es un caso normal, y que a
  // esta lista le faltara el campo tumbaba la pestaña entera en vez de pintar
  // un tablero sin colores de épica.
  // Quién lleva ya una historia sin terminar: se calcula una vez para todo el
  // tablero, no una por tarjeta.
  const ocupados = useMemo(
    () => historiasVivasPorPersona(equipo.historias ?? []),
    [equipo.historias],
  );
  const epicas = useMemo(
    () => new Map((equipo.epicas ?? []).map((e) => [e.id, e])),
    [equipo.epicas],
  );

  // Plegar a mano lo que la etapa no pliega sola: en una pantalla pequeña con
  // muchos equipos es la diferencia entre leer las tarjetas y adivinarlas.
  const [plegadasManual, setPlegadasManual] = useState<Set<Columna>>(new Set());

  const soltar = useCallback(
    (historia: Historia, zona: string) => {
      if (!CLAVES.has(zona) || zona === historia.columna) return;
      if (!permiteMover(politica.movimientos, historia.columna, zona as Columna)) return;
      onMover?.(historia.id, zona as Columna);
    },
    [onMover, politica.movimientos],
  );

  const { iniciar, arrastrando, posicion, zona } = useArrastre<Historia>({
    alSoltar: soltar,
    contenedor: tablero,
  });

  const visBacklog: Visibilidad = politica.backlog;
  const visSprint: Visibilidad = politica.sprint;

  function plegada(key: Columna, vis: Visibilidad): boolean {
    return vis === 'plegado' || plegadasManual.has(key);
  }

  function alternarPliegue(key: Columna) {
    setPlegadasManual((previas) => {
      const copia = new Set(previas);
      if (copia.has(key)) copia.delete(key);
      else copia.add(key);
      return copia;
    });
  }

  function columna(key: Columna, label: string, vis: Visibilidad) {
    const historias = porColumna[key];
    const puntos = sumaPuntos(historias);
    const seTocan = editable && vis === 'editable' && !!onMover;
    const destino = !!arrastrando
      && zona === key
      && key !== arrastrando.columna
      && permiteMover(politica.movimientos, arrastrando.columna, key);

    if (plegada(key, vis)) {
      return (
        <button
          key={key}
          type="button"
          className={styles.plegada}
          onClick={() => alternarPliegue(key)}
          title={`Desplegar ${label}`}
        >
          <span className="material-icons">chevron_right</span>
          <span className={styles.plegadaTitulo}>{label}</span>
          <span className={styles.contador}>{historias.length}</span>
        </button>
      );
    }

    return (
      <section
        key={key}
        data-zona={key}
        className={[
          styles.columna,
          destino ? styles.columnaDestino : '',
          vis === 'lectura' ? styles.columnaApagada : '',
        ].filter(Boolean).join(' ')}
      >
        <header className={styles.columnaCabecera}>
          <button
            type="button"
            className={styles.plegar}
            onClick={() => alternarPliegue(key)}
            title={`Plegar ${label}`}
          >
            <span className="material-icons">expand_more</span>
          </button>
          <span className={styles.columnaTitulo}>{label}</span>
          <span className={styles.contador}>
            {historias.length}
            {puntos > 0 && escala === 'full' && (
              <span className={styles.puntosCol}>{`· ${puntos} pts`}</span>
            )}
          </span>
        </header>

        {historias.map((h) => {
          const ajeno = bloqueoAjeno(bloqueos, `historia:${h.id}`, yoId);
          return (
            <PostItHistoria
              key={h.id}
              historia={h}
              escala={escala}
              epica={h.epica ? epicas.get(h.epica) ?? null : null}
              miembros={equipo.miembros}
              ocupados={ocupados}
              bloqueadaPor={ajeno?.nombre}
              onAbrir={editable && onAbrirHistoria ? onAbrirHistoria : undefined}
              onAsignar={seTocan && !ajeno ? onAsignar : undefined}
              onPointerDown={seTocan && !ajeno ? iniciar(h) : undefined}
              atenuada={arrastrando?.id === h.id}
            />
          );
        })}

        {/* El alta va SOLO en Backlog: las historias nacen ahí y de ahí se
            mueven. Meterlas directamente en «doing» es el hábito contra el que
            existe el sprint backlog. */}
        {key === 'backlog' && seTocan && onNuevaHistoria && (
          <button type="button" className={styles.alta} onClick={onNuevaHistoria}>
            <span className="material-icons">add</span>
            Nueva historia
          </button>
        )}
      </section>
    );
  }

  const bloqueado = visSprint === 'lectura';

  return (
    <div
      ref={tablero}
      className={`${styles.tablero} ${styles[escala]} ${arrastrando ? styles.enArrastre : ''}`}
    >
      {visBacklog !== 'oculto' && columna('backlog', 'Backlog', visBacklog)}

      {visSprint !== 'oculto' && (
        <div className={`${styles.sprint} ${bloqueado ? styles.sprintBloqueado : ''}`}>
          <span className={styles.leyenda}>
            Sprint backlog
            {bloqueado && (
              <span className={styles.candado}>
                <span className="material-icons">lock</span>
                {politica.movimientos === 'backlog-a-planned'
                  ? 'Solo entra de Backlog a Planned'
                  : 'No se toca en esta etapa'}
              </span>
            )}
          </span>

          <div className={styles.objetivo}>
            <span className={styles.objetivoEtiqueta}>Objetivo del sprint</span>
            <span className={objetivo ? styles.objetivoTexto : styles.objetivoVacio}>
              {objetivo || 'Sin definir'}
            </span>
            {editable && onEditarObjetivo && politica.cobraDeuda ? (
              <button
                type="button"
                className={styles.objetivoBtn}
                onClick={onEditarObjetivo}
                title="Editar el objetivo del sprint"
              >
                <span className="material-icons">edit</span>
              </button>
            ) : (
              escala === 'full' && <span className={styles.objetivoNota}>se ajusta en el planning</span>
            )}
          </div>

          <div className={styles.columnas}>
            {COLUMNAS_SPRINT.map((c) => columna(c.key, c.label, visSprint))}
          </div>
        </div>
      )}

      {/* Siempre plegada: es el histórico, no trabajo en curso. */}
      {archivadas > 0 && (
        <div className={styles.archivada} title="Historias terminadas en sprints anteriores">
          <span className="material-icons">inventory_2</span>
          <span className={styles.plegadaTitulo}>Archived</span>
          <span className={styles.contador}>{archivadas}</span>
        </div>
      )}

      {arrastrando && posicion && (
        <div
          className={styles.capaFantasma}
          style={{ transform: `translate(${posicion.x - 116}px, ${posicion.y - 40}px)` }}
        >
          <PostItHistoria
            historia={arrastrando}
            escala="full"
            epica={arrastrando.epica ? epicas.get(arrastrando.epica) ?? null : null}
            fantasma
          />
        </div>
      )}
    </div>
  );
}
