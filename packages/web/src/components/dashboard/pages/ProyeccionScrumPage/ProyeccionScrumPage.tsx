import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import TableroScrum from '../../organisms/TableroScrum/TableroScrum';
import Burndown from '../../organisms/Burndown/Burndown';
import {
  POLITICA_SIN_ETAPA, rejillaProyeccion, serieProyecto, sumaPuntos,
  type Dinamica, type EquipoTablero, type Etapa, type Marcador, type Sprint,
} from '../../../../utils/scrum';
import styles from './ProyeccionScrumPage.module.css';

const API = '/api';

/** Red de seguridad del stream, por si la conexión muere sin avisar. */
const REFRESCO_MS = 20000;

type Vista = 'tableros' | 'resumen';

/**
 * La pantalla que se proyecta: los tableros de varios equipos a la vez.
 *
 * Va FUERA del layout del panel a propósito —se abre en otra pestaña, en el
 * cañón del aula— y es de solo lectura: el tablero es del equipo, aquí solo se
 * mira.
 *
 * Dos vistas. **Tableros** contesta «quién tiene qué»; con seis o nueve equipos
 * eso ya no cabe legible, así que **Resumen** contesta lo otro —«cómo van»— de
 * un vistazo. En el daily y en el review se usa la segunda.
 */
export default function ProyeccionScrumPage() {
  const { id: grupoId, dinamicaId } = useParams<{ id: string; dinamicaId: string }>();
  const [params] = useSearchParams();
  const { sessionToken } = useAuth();

  const [dinamica, setDinamica] = useState<Dinamica | null>(null);
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [equipos, setEquipos] = useState<EquipoTablero[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>('tableros');
  // El histórico de todos los equipos. No viaja en el stream —solo cambia al
  // cerrar un sprint—, así que se guarda aparte y se vuelve a pedir cuando el
  // sprint cambia de número.
  const [historico, setHistorico] = useState<Marcador[]>([]);
  const sprintDelHistorico = useRef<string | null>(null);

  const elegidos = useMemo(() => {
    const crudo = params.get('equipos');
    return crudo ? crudo.split(',').filter(Boolean) : [];
  }, [params]);

  const base = `${API}/admin/grupos/${grupoId}/scrum/dinamicas/${dinamicaId}/proyeccion`;

  /** El parche de etapa no trae equipos: se fusiona la cabecera y ya. */
  const aplicar = useCallback((json: any) => {
    setDinamica(json?.dinamica ?? null);
    setEtapa(json?.etapa ?? null);
    setSprint(json?.sprint ?? null);
    if (json?.tipo === 'etapa') return;
    setEquipos(json?.equipos ?? []);
  }, []);

  const cargar = useCallback(async () => {
    if (!grupoId || !dinamicaId) return;
    try {
      const r = await fetch(base, {
        headers: sessionToken ? { 'x-session-token': sessionToken } : undefined,
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.message ?? 'No se pudo cargar la proyección');
      aplicar(json);
      setHistorico(json?.historico ?? []);
      sprintDelHistorico.current = json?.sprint?.id ?? null;
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    }
  }, [base, grupoId, dinamicaId, sessionToken, aplicar]);

  useEffect(() => { void cargar(); }, [cargar]);

  useEffect(() => {
    if (!grupoId || !dinamicaId) return;
    const fuente = new EventSource(`${base}/stream`, { withCredentials: true });
    fuente.onmessage = (ev) => {
      try {
        const json = JSON.parse(ev.data);
        aplicar(json);
        // Se cerró un sprint: el histórico tiene una fila más y hay que pedirlo.
        if (json?.tipo !== 'etapa' && (json?.sprint?.id ?? null) !== sprintDelHistorico.current) {
          void cargar();
        }
      } catch { /* trama a medias: llega otra */ }
    };
    return () => fuente.close();
  }, [base, grupoId, dinamicaId, aplicar]);

  useEffect(() => {
    const t = setInterval(() => { void cargar(); }, REFRESCO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  // Si la URL no dice cuáles, se proyectan todos: es lo que se espera al abrir
  // la dirección a mano.
  const visibles = elegidos.length
    ? equipos.filter((e) => elegidos.includes(e.id))
    : equipos;

  const { cols, filas, escala } = rejillaProyeccion(visibles.length);
  // Sin etapa abierta el tablero se mira y no se toca; el servidor rechaza
  // igual lo que se intente, esto es para no enseñar mandos muertos.
  const politica = etapa?.politica ?? POLITICA_SIN_ETAPA;

  return (
    <div className={styles.pantalla}>
      <header className={styles.barra}>
        <div className={styles.identidad}>
          <span className={styles.dinamica}>
            {sprint ? `Sprint ${sprint.numero}` : dinamica?.nombre ?? 'Actividad de Scrum'}
            {sprint?.objetivo && <span className={styles.objetivo}> · {sprint.objetivo}</span>}
          </span>
        </div>
        <div className={styles.controles}>
          <div className={styles.interruptor} role="tablist">
            {(['tableros', 'resumen'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={vista === v}
                className={`${styles.opcion} ${vista === v ? styles.opcionActiva : ''}`}
                onClick={() => setVista(v)}
              >
                {v === 'tableros' ? 'Tableros' : 'Resumen'}
              </button>
            ))}
          </div>
          <span className={styles.cuenta}>
            {visibles.length} {visibles.length === 1 ? 'equipo' : 'equipos'}
          </span>
          {etapa && (
            <span className={styles.etapa} style={{ background: etapa.color }}>
              {etapa.nombre}
            </span>
          )}
        </div>
      </header>

      {error ? (
        <p className={styles.aviso}>{error}</p>
      ) : visibles.length === 0 ? (
        <p className={styles.aviso}>No hay equipos que proyectar.</p>
      ) : (
        <div
          className={styles.rejilla}
          style={{
            gridTemplateColumns: `repeat(${vista === 'resumen' ? Math.min(3, visibles.length) : cols}, minmax(0, 1fr))`,
            gridTemplateRows: vista === 'resumen'
              ? `repeat(${Math.ceil(visibles.length / Math.min(3, visibles.length))}, minmax(0, 1fr))`
              : `repeat(${filas}, minmax(0, 1fr))`,
          }}
        >
          {visibles.map((equipo) => (
            <section
              key={equipo.id}
              className={styles.panel}
              style={{ borderTopColor: equipo.color }}
            >
              <header className={styles.panelCabecera}>
                <span className={styles.punto} style={{ background: equipo.color }} />
                <span className={`${styles.panelNombre} ${styles[escala]}`}>{equipo.nombre}</span>
                {equipo.bloqueoPendiente > 0 && (
                  <span className={styles.bloqueo}>{equipo.bloqueoPendiente} de bloqueo</span>
                )}
              </header>

              {vista === 'tableros' ? (
                <TableroScrum
                  equipo={equipo}
                  escala={escala}
                  politica={politica}
                  archivadas={equipo.archivadas}
                  objetivo={sprint?.objetivo ?? ''}
                />
              ) : (
                <ResumenPanel
                  equipo={equipo}
                  historico={historico.filter((m) => m.equipo === equipo.id)}
                  sprint={sprint}
                />
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * El otro lado del interruptor: cómo va el equipo, sin leer las tarjetas.
 *
 * Las gráficas van en una fila que se arrastra, no apiladas: proyectando con
 * seis equipos a la vez el alto es lo que falta, y el ancho sobra. Es el mismo
 * gesto que las columnas del kanban.
 */
function ResumenPanel({ equipo, historico, sprint }: {
  equipo: EquipoTablero;
  historico: Marcador[];
  sprint: Sprint | null;
}) {
  const enSprint = equipo.historias.filter((h) => h.columna !== 'backlog');
  const cerrados = sumaPuntos(equipo.historias.filter((h) => h.columna === 'done'));
  const planeados = equipo.marcador?.planeados || sumaPuntos(enSprint);
  // Lo que queda se cuenta del tablero, no restando: después de que la deuda
  // devuelve historias al backlog, lo planeado y lo que hay dejan de cuadrar.
  const sinCerrar = sumaPuntos(enSprint.filter((h) => h.columna !== 'done'));

  // El sprint en curso todavía no está en el histórico, así que se enseña
  // aparte y al final: la fila se lee de izquierda a derecha, del proyecto
  // entero al sprint de ahora.
  const enCurso = equipo.marcador;
  const cerrados_ = historico.filter((m) => m.id !== enCurso?.id);
  const pendienteBacklog = sumaPuntos(equipo.historias.filter((h) => h.columna === 'backlog'));
  const proyecto = serieProyecto(historico, pendienteBacklog);

  return (
    <div className={styles.resumen}>
      <div className={styles.datos}>
        <Dato valor={planeados} etiqueta="planeado" />
        <Dato valor={cerrados} etiqueta="cerrado" tono="ok" />
        <Dato valor={Math.max(0, sinCerrar)} etiqueta="sin cerrar" tono={sinCerrar > 0 ? 'aviso' : undefined} />
      </div>

      <div className={styles.tiraGraficas}>
        {historico.length > 0 && (
          <div className={styles.grafica}>
            <Burndown
              titulo="Todo el proyecto"
              cortes={proyecto.cortes}
              planeados={proyecto.total}
              pasos={proyecto.cortes.length}
              secundario
            />
          </div>
        )}
        {cerrados_.map((m) => (
          <div className={styles.grafica} key={m.id}>
            <Burndown
              titulo={`Sprint ${m.numero ?? ''}`}
              cortes={m.cortes}
              planeados={m.planeados}
              pasos={m.pasos}
            />
          </div>
        ))}
        <div className={styles.grafica}>
          <Burndown
            titulo={sprint ? `Sprint ${sprint.numero}` : 'Sprint en curso'}
            cortes={enCurso?.cortes ?? []}
            planeados={planeados}
            pasos={enCurso?.pasos}
          />
        </div>
      </div>
    </div>
  );
}

function Dato({ valor, etiqueta, tono }: { valor: number; etiqueta: string; tono?: 'ok' | 'aviso' }) {
  return (
    <div className={styles.dato}>
      <span className={`${styles.datoValor} ${tono ? styles[tono] : ''}`}>{valor}</span>
      <span className={styles.datoEtiqueta}>{etiqueta}</span>
    </div>
  );
}
