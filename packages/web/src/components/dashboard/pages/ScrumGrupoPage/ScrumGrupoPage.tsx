import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import EtapasScrumModal from '../../organisms/EtapasScrumModal/EtapasScrumModal';
import { avisar, confirmar, pedirTexto } from '../../../../utils/dialogos';
import { rangoFechas, type Dinamica, type Etapa } from '../../../../utils/scrum';
import styles from './ScrumGrupoPage.module.css';

const API = '/api';

/**
 * Actividad de Scrum: la pantalla de entrada del profesor.
 *
 * Dos cosas y en este orden: el listado de dinámicas y, sobre él, la etapa que
 * la clase está trabajando. La etapa va arriba porque es lo único que se toca
 * DURANTE la clase —cada vez que se cambia, a treinta tableros les cambia la
 * banda de color— mientras que las dinámicas se crean una vez y se olvidan.
 */
export default function ScrumGrupoPage() {
  const { id: grupoId } = useParams<{ id: string }>();
  const { sessionToken } = useAuth();
  const navigate = useNavigate();

  const [dinamicas, setDinamicas] = useState<Dinamica[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [paleta, setPaleta] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [etapasAbierto, setEtapasAbierto] = useState(false);
  // Qué etapa se está aplicando. Sin esto el profesor pulsa y no pasa nada
  // visible durante medio segundo, así que vuelve a pulsar.
  const [aplicando, setAplicando] = useState<string | null>(null);

  const cabeceras = useCallback(
    (): HeadersInit => ({
      'Content-Type': 'application/json',
      ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
    }),
    [sessionToken],
  );

  const cargar = useCallback(async () => {
    if (!grupoId || !sessionToken) return;
    try {
      const r = await fetch(`${API}/admin/grupos/${grupoId}/scrum`, { headers: cabeceras() });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.message ?? 'No se pudo cargar');
      setDinamicas(json.dinamicas ?? []);
      setEtapas(json.etapas ?? []);
      setPaleta(json.paleta ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [grupoId, sessionToken, cabeceras]);

  useEffect(() => { void cargar(); }, [cargar]);

  /** Envuelve una llamada que cambia algo: recarga al terminar y avisa si falla. */
  const mandar = useCallback(
    async (url: string, metodo: string, cuerpo?: unknown): Promise<boolean> => {
      try {
        const r = await fetch(url, {
          method: metodo,
          headers: cabeceras(),
          body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        });
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          await avisar({ titulo: 'No se pudo', texto: json?.message ?? 'Inténtalo de nuevo', icono: 'error' });
          return false;
        }
        await cargar();
        return true;
      } catch {
        await avisar({ titulo: 'Sin conexión', texto: 'No se pudo contactar al servidor', icono: 'error' });
        return false;
      }
    },
    [cabeceras, cargar],
  );

  // La dinámica que rige la barra de etapa: la abierta más reciente, que es la
  // misma que ve el alumno al entrar en su tablero.
  const vigente = dinamicas.find((d) => !d.cerrada) ?? null;

  async function nuevaDinamica() {
    const nombre = await pedirTexto({
      titulo: 'Nueva dinámica',
      html: 'Un sprint o un taller. Por ejemplo, <strong>Sprint 1 — Product backlog inicial</strong>.',
      placeholder: 'Nombre de la dinámica',
      confirmar: 'Crear',
      validar: (v) => (v.trim() === '' ? 'Escribe un nombre' : null),
    });
    if (!nombre) return;
    await mandar(`${API}/admin/grupos/${grupoId}/scrum/dinamicas`, 'POST', { nombre });
  }

  async function cambiarEtapa(etapaId: string | null) {
    if (!vigente || aplicando) return;
    setAplicando(etapaId ?? 'ninguna');
    // Optimista: la etapa se pulsa delante de la clase y esperar al servidor
    // para repintar el botón hace dudar de si se registró.
    setDinamicas((ds) =>
      ds.map((d) =>
        d.id === vigente.id
          ? { ...d, etapaActual: etapaId ? etapas.find((e) => e.id === etapaId) ?? null : null }
          : d,
      ),
    );
    await mandar(`${API}/admin/grupos/${grupoId}/scrum/dinamicas/${vigente.id}/etapa`, 'PUT', { etapaId });
    setAplicando(null);
  }

  async function alternarCierre(d: Dinamica) {
    const ok = await confirmar({
      titulo: d.cerrada ? `¿Reabrir «${d.nombre}»?` : `¿Cerrar «${d.nombre}»?`,
      texto: d.cerrada
        ? 'Los equipos podrán volver a mover sus tarjetas.'
        : 'Los tableros se podrán seguir viendo, pero ya no se tocan.',
      confirmar: d.cerrada ? 'Reabrir' : 'Cerrar',
    });
    if (!ok) return;
    await mandar(`${API}/admin/grupos/${grupoId}/scrum/dinamicas/${d.id}`, 'PUT', { cerrada: !d.cerrada });
  }

  async function borrarDinamica(d: Dinamica) {
    const ok = await confirmar({
      titulo: `¿Borrar «${d.nombre}»?`,
      texto: 'Se van con ella sus equipos y todas sus historias. No se puede deshacer.',
      confirmar: 'Borrar',
      peligro: true,
    });
    if (!ok) return;
    await mandar(`${API}/admin/grupos/${grupoId}/scrum/dinamicas/${d.id}`, 'DELETE');
  }

  if (cargando) return <p className={styles.cargando}>Cargando…</p>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Actividad de Scrum</h1>
          <p className={styles.subtitulo}>
            Cada dinámica tiene sus equipos, su tablero y la etapa del Scrum que se está
            trabajando. Los alumnos entran al tablero de su equipo en cuanto se les asigna uno.
          </p>
        </div>
        <button type="button" className={styles.primario} onClick={nuevaDinamica}>
          <span className="material-icons">add</span>
          Nueva dinámica
        </button>
      </header>

      {error && (
        <div className={styles.error} onClick={() => setError(null)} role="alert">
          {error}
        </div>
      )}

      <section className={styles.barra}>
        <div className={styles.barraIzquierda}>
          <span className={styles.barraTitulo}>Etapa en curso</span>
          <div className={styles.etapas}>
            {etapas.map((e) => {
              const activa = vigente?.etapaActual?.id === e.id;
              const enMarcha = aplicando === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  className={`${styles.etapa} ${activa ? styles.etapaActiva : ''}`}
                  style={activa ? { background: e.color, borderColor: e.color } : undefined}
                  onClick={() => cambiarEtapa(activa ? null : e.id)}
                  disabled={!vigente || !!aplicando}
                  title={e.pista || e.nombre}
                  aria-pressed={activa}
                  aria-busy={enMarcha}
                >
                  {enMarcha
                    ? <span className={styles.girando} aria-hidden />
                    : !activa && <span className={styles.punto} style={{ background: e.color }} />}
                  {e.nombre}
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.barraDerecha}>
          {vigente ? (
            <span className={styles.aplicaA}>
              Se aplica a <strong>{vigente.nombre}</strong>
            </span>
          ) : (
            <span className={styles.aplicaA}>Sin dinámica abierta</span>
          )}
          <button type="button" className={styles.enlaceBtn} onClick={() => setEtapasAbierto(true)}>
            Configurar etapas
          </button>
        </div>
      </section>

      {dinamicas.length === 0 ? (
        <div className={styles.apagado}>
          <span className="material-icons">view_kanban</span>
          <p>Este grupo todavía no tiene ninguna dinámica.</p>
          <span className={styles.hint}>
            Crea una, arma los equipos y los alumnos verán su tablero.
          </span>
        </div>
      ) : (
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Dinámica</th>
              <th className={styles.colCorta}>Equipos</th>
              <th className={styles.colCorta}>Alumnos</th>
              <th className={styles.colEtapa}>Etapa</th>
              <th className={styles.colCorta}>Estado</th>
              <th className={styles.colAcciones} />
            </tr>
          </thead>
          <tbody>
            {dinamicas.map((d) => (
              <tr key={d.id}>
                <td>
                  <button
                    type="button"
                    className={styles.nombreBtn}
                    onClick={() => navigate(`/admin/grupos/${grupoId}/scrum/${d.id}`)}
                  >
                    {d.nombre}
                  </button>
                  {rangoFechas(d.inicio, d.fin) && (
                    <span className={styles.rango}>{rangoFechas(d.inicio, d.fin)}</span>
                  )}
                </td>
                <td>{d.equipos ?? 0}</td>
                <td>{d.alumnos ?? 0}</td>
                <td>
                  {d.etapaActual ? (
                    <span className={styles.etapaTag} style={{ background: d.etapaActual.color }}>
                      {d.etapaActual.nombre}
                    </span>
                  ) : (
                    <span className={styles.vacioCelda}>—</span>
                  )}
                </td>
                <td>
                  <span className={d.cerrada ? styles.tagCerrada : styles.tagAbierta}>
                    {d.cerrada ? 'Cerrada' : 'En curso'}
                  </span>
                </td>
                <td className={styles.acciones}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => navigate(`/admin/grupos/${grupoId}/scrum/${d.id}`)}
                    title="Equipos y tableros"
                  >
                    <span className="material-icons">groups</span>
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => alternarCierre(d)}
                    title={d.cerrada ? 'Reabrir' : 'Cerrar'}
                  >
                    <span className="material-icons">{d.cerrada ? 'lock_open' : 'lock'}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => borrarDinamica(d)}
                    title="Borrar"
                  >
                    <span className="material-icons">delete</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <EtapasScrumModal
        abierto={etapasAbierto}
        etapas={etapas}
        paleta={paleta}
        onCerrar={() => setEtapasAbierto(false)}
        onCrear={(datos) => void mandar(`${API}/admin/grupos/${grupoId}/scrum/etapas`, 'POST', datos)}
        onActualizar={(id, datos) =>
          void mandar(`${API}/admin/grupos/${grupoId}/scrum/etapas/${id}`, 'PUT', datos)}
        onBorrar={(id) => void mandar(`${API}/admin/grupos/${grupoId}/scrum/etapas/${id}`, 'DELETE')}
      />
    </div>
  );
}
