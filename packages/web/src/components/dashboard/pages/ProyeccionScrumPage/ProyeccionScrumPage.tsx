import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import TableroScrum from '../../organisms/TableroScrum/TableroScrum';
import { rejillaProyeccion, type Dinamica, type EquipoTablero } from '../../../../utils/scrum';
import styles from './ProyeccionScrumPage.module.css';

const API = '/api';

/** Red de seguridad del stream, por si la conexión muere sin avisar. */
const REFRESCO_MS = 45000;

/**
 * La pantalla que se proyecta: los tableros de varios equipos a la vez.
 *
 * Va FUERA del layout del panel a propósito —se abre en otra pestaña, en el
 * cañón del aula, y ahí sobran el menú y la cabecera— y es de solo lectura: el
 * tablero es del equipo, aquí solo se mira.
 *
 * Qué equipos se ven viaja en la URL y no en la base de datos. Así el profesor
 * puede tener dos proyecciones distintas abiertas, y cerrar la pestaña no deja
 * estado que limpiar.
 *
 * A partir de cuatro equipos deja de repartirse en columnas: seguir estirando la
 * fila deja tarjetas que nadie lee desde el fondo del aula, así que se pasa a
 * rejilla y con ella baja el detalle de cada post-it. Nueve es el tope.
 */
export default function ProyeccionScrumPage() {
  const { id: grupoId, dinamicaId } = useParams<{ id: string; dinamicaId: string }>();
  const [params] = useSearchParams();
  const { sessionToken } = useAuth();

  const [dinamica, setDinamica] = useState<Dinamica | null>(null);
  const [equipos, setEquipos] = useState<EquipoTablero[]>([]);
  const [error, setError] = useState<string | null>(null);

  const elegidos = useMemo(() => {
    const crudo = params.get('equipos');
    return crudo ? crudo.split(',').filter(Boolean) : [];
  }, [params]);

  const base = `${API}/admin/grupos/${grupoId}/scrum/dinamicas/${dinamicaId}/proyeccion`;

  const aplicar = useCallback((json: any) => {
    setDinamica(json?.dinamica ?? null);
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
  const etapa = dinamica?.etapaActual ?? null;

  return (
    <div className={styles.pantalla}>
      <header className={styles.barra}>
        <div className={styles.identidad}>
          <span className={styles.dinamica}>{dinamica?.nombre ?? 'Actividad de Scrum'}</span>
          <span className={styles.cuenta}>
            {visibles.length} {visibles.length === 1 ? 'equipo' : 'equipos'}
          </span>
        </div>
        {etapa && (
          <span className={styles.etapa} style={{ background: etapa.color }}>
            {etapa.nombre}
          </span>
        )}
      </header>

      {error ? (
        <p className={styles.aviso}>{error}</p>
      ) : visibles.length === 0 ? (
        <p className={styles.aviso}>No hay equipos que proyectar.</p>
      ) : (
        <div
          className={styles.rejilla}
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${filas}, minmax(0, 1fr))`,
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
                {escala === 'full' && (
                  <span className={styles.panelMiembros}>
                    {equipo.miembros.length}{' '}
                    {equipo.miembros.length === 1 ? 'integrante' : 'integrantes'}
                  </span>
                )}
              </header>
              <TableroScrum equipo={equipo} escala={escala} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
