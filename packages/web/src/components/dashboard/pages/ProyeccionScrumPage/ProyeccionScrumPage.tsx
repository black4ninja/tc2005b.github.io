import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import TableroScrum from '../../organisms/TableroScrum/TableroScrum';
import Burndown from '../../organisms/Burndown/Burndown';
import {
  POLITICA_POR_DEFECTO, rejillaProyeccion, sumaPuntos,
  type Dinamica, type EquipoTablero, type Etapa, type Sprint,
} from '../../../../utils/scrum';
import styles from './ProyeccionScrumPage.module.css';

const API = '/api';

/** Red de seguridad del stream, por si la conexión muere sin avisar. */
const REFRESCO_MS = 45000;

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

  const elegidos = useMemo(() => {
    const crudo = params.get('equipos');
    return crudo ? crudo.split(',').filter(Boolean) : [];
  }, [params]);

  const base = `${API}/admin/grupos/${grupoId}/scrum/dinamicas/${dinamicaId}/proyeccion`;

  const aplicar = useCallback((json: any) => {
    setDinamica(json?.dinamica ?? null);
    setEtapa(json?.etapa ?? null);
    setSprint(json?.sprint ?? null);
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
      try { aplicar(JSON.parse(ev.data)); } catch { /* trama a medias: llega otra */ }
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
  const politica = etapa?.politica ?? POLITICA_POR_DEFECTO;

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
                />
              ) : (
                <ResumenPanel equipo={equipo} />
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** El otro lado del interruptor: cómo va el equipo, sin leer las tarjetas. */
function ResumenPanel({ equipo }: { equipo: EquipoTablero }) {
  const enSprint = equipo.historias.filter((h) => h.columna !== 'backlog');
  const cerrados = sumaPuntos(equipo.historias.filter((h) => h.columna === 'done'));
  const planeados = equipo.marcador?.planeados || sumaPuntos(enSprint);
  // Lo que queda se cuenta del tablero, no restando: después de que la deuda
  // devuelve historias al backlog, lo planeado y lo que hay dejan de cuadrar.
  const sinCerrar = sumaPuntos(enSprint.filter((h) => h.columna !== 'done'));

  return (
    <div className={styles.resumen}>
      <div className={styles.datos}>
        <Dato valor={planeados} etiqueta="planeado" />
        <Dato valor={cerrados} etiqueta="cerrado" tono="ok" />
        <Dato valor={Math.max(0, sinCerrar)} etiqueta="sin cerrar" tono={sinCerrar > 0 ? 'aviso' : undefined} />
      </div>
      <Burndown
        titulo="Sprint"
        cortes={equipo.marcador?.cortes ?? []}
        planeados={planeados}
      />
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
