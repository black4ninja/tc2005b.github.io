import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import TableroScrum from '../../organisms/TableroScrum/TableroScrum';
import TableroRetro from '../../organisms/TableroRetro/TableroRetro';
import Burndown from '../../organisms/Burndown/Burndown';
import HistoriaForm, { type DatosHistoria } from '../../organisms/HistoriaForm/HistoriaForm';
import RolesScrumModal from '../../organisms/RolesScrumModal/RolesScrumModal';
import EpicasScrumModal from '../../organisms/EpicasScrumModal/EpicasScrumModal';
import ReglasScrumModal from '../../organisms/ReglasScrumModal/ReglasScrumModal';
import ResumenEquipo, { type DatosResumen } from './ResumenEquipo';
import { avisar, pedirTexto } from '../../../../utils/dialogos';
import {
  POLITICA_POR_DEFECTO, cuentaRegresiva, historiasDeOtraEpica, iniciales, sumaPuntos,
  type Columna, type ColumnaRetro, type Dinamica, type EquipoTablero, type Etapa,
  type Historia, type Sprint,
} from '../../../../utils/scrum';
import styles from './ScrumTableroPage.module.css';

const API = '/api';

/** Red de seguridad del stream: si la conexión muere sin avisar, esto lo salva. */
const REFRESCO_MS = 60000;

/**
 * El tablero del alumno.
 *
 * Cinco personas mueven el mismo tablero a la vez, así que la pantalla ESCUCHA
 * en vez de preguntar: quien arrastra una tarjeta la mueve también en la de sus
 * compañeros.
 *
 * Lo que se ve y lo que se puede tocar lo decide la ETAPA que el profesor tiene
 * puesta: en planning el sprint backlog está apagado con su candado, en la daily
 * se pliega el backlog y salen los burndown, en la retrospectiva desaparece el
 * kanban entero y sale el suyo. La pantalla no explica el ciclo, lo impone — que
 * es la única manera de que se aprenda.
 */
export default function ScrumTableroPage() {
  const { grupoId } = useParams<{ grupoId: string }>();
  const { sessionToken, user } = useAuth();

  const [dinamica, setDinamica] = useState<Dinamica | null>(null);
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [equipo, setEquipo] = useState<EquipoTablero | null>(null);
  const [editable, setEditable] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const [formAbierto, setFormAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Historia | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [rolesAbierto, setRolesAbierto] = useState(false);
  const [epicasAbierto, setEpicasAbierto] = useState(false);
  const [reglas, setReglas] = useState<'done' | 'restricciones' | null>(null);
  const [resumen, setResumen] = useState<DatosResumen | null>(null);
  const [cobro, setCobro] = useState<number | null>(null);
  const bloqueoPrevio = useRef<number | null>(null);

  const base = `${API}/alumno/grupos/${grupoId}/scrum`;

  const cabeceras = useCallback(
    (): HeadersInit => ({
      'Content-Type': 'application/json',
      ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
    }),
    [sessionToken],
  );

  const aplicar = useCallback((json: any) => {
    setDinamica(json?.dinamica ?? null);
    setEtapa(json?.etapa ?? null);
    setSprint(json?.sprint ?? null);
    setEquipo(json?.equipo ?? null);
    setEditable(json?.editable === true);
  }, []);

  const cargar = useCallback(async () => {
    if (!grupoId || !sessionToken) return;
    try {
      const r = await fetch(base, { headers: cabeceras() });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.message ?? 'No se pudo cargar el tablero');
      aplicar(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [base, grupoId, sessionToken, cabeceras, aplicar]);

  useEffect(() => { void cargar(); }, [cargar]);

  // El stream. `EventSource` no manda cabeceras propias: la sesión viaja en la
  // cookie que ya existe, nunca en la URL.
  useEffect(() => {
    if (!grupoId || !sessionToken) return;
    const fuente = new EventSource(`${base}/stream`, { withCredentials: true });
    fuente.onmessage = (ev) => {
      try { aplicar(JSON.parse(ev.data)); } catch { /* trama a medias: llega otra */ }
    };
    return () => fuente.close();
  }, [base, grupoId, sessionToken, aplicar]);

  useEffect(() => {
    const t = setInterval(() => { void cargar(); }, REFRESCO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  // El reloj de la etapa lo lleva el cliente: el servidor sella la hora de
  // arranque y aquí se cuenta, para que una pantalla que entra a mitad enseñe el
  // número correcto sin preguntar.
  useEffect(() => {
    if (!etapa?.politica.duracionSegundos || !dinamica?.etapaIniciadaEn) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [etapa?.politica.duracionSegundos, dinamica?.etapaIniciadaEn]);

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
          await avisar({ titulo: 'No se pudo', texto: json?.message ?? 'Inténtalo de nuevo', icono: 'warning' });
          await cargar();
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

  // Al finalizar la dinámica el tablero desaparece y queda el resumen: es lo
  // último que se ve y lo que contesta las preguntas de las conclusiones.
  useEffect(() => {
    if (!dinamica?.finalizada || !sessionToken) return;
    fetch(`${base}/resumen`, { headers: cabeceras() })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (json) setResumen(json); })
      .catch(() => {});
  }, [dinamica?.finalizada, base, cabeceras, sessionToken]);

  /**
   * El cobro de la deuda tiene que VERSE.
   *
   * Ocurre en el servidor al salir del planning y llega por el stream como
   * tarjetas que se mueven solas: sin aviso, el equipo se encuentra el sprint
   * medio vacío y no sabe por qué. Aquí se detecta el momento —el bloqueo pasa
   * de N a cero— y se dice cuántos puntos se llevó.
   */
  useEffect(() => {
    const bloqueo = equipo?.bloqueoPendiente ?? 0;
    const previo = bloqueoPrevio.current;
    if (previo !== null && previo > 0 && bloqueo === 0) setCobro(previo);
    bloqueoPrevio.current = bloqueo;
  }, [equipo?.bloqueoPendiente]);

  const politica = etapa?.politica ?? POLITICA_POR_DEFECTO;
  const reloj = useMemo(
    () => cuentaRegresiva(dinamica?.etapaIniciadaEn ?? null, politica.duracionSegundos, ahora),
    [dinamica?.etapaIniciadaEn, politica.duracionSegundos, ahora],
  );
  const intrusas = equipo ? historiasDeOtraEpica(equipo) : [];

  async function guardarHistoria(datos: DatosHistoria) {
    setGuardando(true);
    const ok = enEdicion
      ? await mandar(`${base}/historias/${enEdicion.id}`, 'PUT', datos)
      : await mandar(`${base}/historias`, 'POST', datos);
    setGuardando(false);
    if (ok) { setFormAbierto(false); setEnEdicion(null); }
  }

  /** Mover se pinta ANTES de que conteste el servidor: es un gesto de arrastrar. */
  async function mover(historiaId: string, columna: Columna) {
    setEquipo((previo) =>
      previo
        ? {
            ...previo,
            historias: previo.historias.map((h) => (h.id === historiaId ? { ...h, columna } : h)),
          }
        : previo,
    );
    await mandar(`${base}/historias/${historiaId}`, 'PUT', { columna });
  }

  async function asignar(historiaId: string, alumnoId: string | null) {
    await mandar(`${base}/historias/${historiaId}`, 'PUT', { responsableId: alumnoId });
  }

  async function editarObjetivo() {
    const valor = await pedirTexto({
      titulo: 'Objetivo del sprint',
      html: 'Una frase: a qué se compromete el equipo en este sprint.',
      valor: equipo?.objetivo ?? '',
      placeholder: 'Terminar el modelo con todos sus detalles…',
      confirmar: 'Guardar',
    });
    if (valor === null) return;
    await mandar(`${base}/objetivo`, 'PUT', { objetivo: valor });
  }

  if (cargando) return <p className={styles.cargando}>Cargando tu tablero…</p>;

  if (error) {
    return <div className={styles.page}><div className={styles.error} role="alert">{error}</div></div>;
  }

  if (!dinamica) {
    return (
      <div className={styles.page}>
        <Apagado icono="view_kanban" titulo="Todavía no hay ninguna dinámica abierta"
          detalle="Cuando tu profesor abra una y te asigne un equipo, tu tablero aparecerá aquí." />
      </div>
    );
  }

  if (!equipo) {
    return (
      <div className={styles.page}>
        <header className={styles.header}><h1 className={styles.pageTitle}>{dinamica.nombre}</h1></header>
        <Apagado icono="groups" titulo="Todavía no tienes equipo"
          detalle="Tu profesor está armando los equipos de esta dinámica. En cuanto te asigne uno, verás su tablero." />
      </div>
    );
  }

  const po = equipo.miembros.find((m) => m.id === equipo.po) ?? null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>{equipo.nombre}</h1>
          <p className={styles.subtitulo}>
            {dinamica.nombre}
            {sprint && ` · Sprint ${sprint.numero}`}
            {sprint?.objetivo && ` — ${sprint.objetivo}`}
          </p>
        </div>
        <button
          type="button"
          className={styles.miembros}
          onClick={() => setRolesAbierto(true)}
          title="Roles del equipo"
        >
          {equipo.miembros.map((m) => (
            <span key={m.id} className={styles.miembro}>
              <span className={`${styles.avatar} ${m.id === equipo.po ? styles.avatarPo : ''}`}>
                {iniciales(m.name)}
              </span>
              {m.id === equipo.po && <span className={styles.insigniaPo}>PO</span>}
            </span>
          ))}
        </button>
      </header>

      {dinamica.finalizada ? (
        resumen
          ? <ResumenEquipo datos={resumen} />
          : <p className={styles.cargando}>Preparando el resumen…</p>
      ) : (
        <>
          {etapa ? (
            <div className={styles.banda} style={{ background: etapa.color }}>
              <div className={styles.bandaTitulo}>
                <span className={styles.bandaEtiqueta}>Etapa en curso</span>
                <span className={styles.bandaNombre}>{etapa.nombre}</span>
              </div>
              {etapa.pista && <p className={styles.bandaPista}>{etapa.pista}</p>}
              {reloj ? (
                <div className={`${styles.reloj} ${reloj.agotado ? styles.relojAgotado : ''}`}>
                  <span className={styles.relojEtiqueta}>{reloj.agotado ? 'De más' : 'Queda'}</span>
                  <span className={styles.relojCifra}>{reloj.texto}</span>
                </div>
              ) : (
                <span className={styles.bandaNota}>La cambia el profesor</span>
              )}
            </div>
          ) : (
            <div className={styles.bandaVacia}>El profesor todavía no ha señalado ninguna etapa.</div>
          )}

          <div className={styles.barraReglas}>
            <button type="button" className={styles.chipEpica} onClick={() => setEpicasAbierto(true)}>
              <span className={styles.chipEtiqueta}>Épica</span>
              {equipo.epicaActual ? (
                <>
                  <span
                    className={styles.punto}
                    style={{
                      background: equipo.epicas.find((e) => e.id === equipo.epicaActual)?.color,
                    }}
                  />
                  {equipo.epicas.find((e) => e.id === equipo.epicaActual)?.nombre}
                </>
              ) : (
                <span className={styles.sinEpica}>Sin definir</span>
              )}
              <span className="material-icons">expand_more</span>
            </button>

            <button type="button" className={styles.chip} onClick={() => setReglas('done')}>
              <span className="material-icons">check_circle</span>
              Definición de terminado
            </button>
            <button type="button" className={styles.chip} onClick={() => setReglas('restricciones')}>
              <span className="material-icons">rule</span>
              Restricciones
            </button>

            {intrusas.length > 0 && (
              <button type="button" className={styles.chipAlerta} onClick={() => setEpicasAbierto(true)}>
                <span className="material-icons">warning</span>
                Hay historias de otra épica en el sprint
              </button>
            )}

            {equipo.bloqueoPendiente > 0 && (
              <span className={styles.chipDeuda} title="Se cobrará al terminar el planning">
                <span className="material-icons">history</span>
                Arrastran {equipo.bloqueoPendiente} pts de bloqueo
              </span>
            )}
          </div>

          {cobro !== null && (
            <div className={styles.cobro} role="alert">
              <span className="material-icons">history</span>
              <div className={styles.cobroTexto}>
                <strong>La deuda técnica se cobró.</strong> Arrastraban {cobro} puntos de bloqueo
                —historias sin terminar y restricciones incumplidas— y el sistema devolvió al
                backlog historias al azar hasta cubrirlos. Si se llevó todo lo que habían planeado,
                solo les queda lo que dejaron abierto del sprint anterior.
              </div>
              <button type="button" className={styles.cobroCerrar} onClick={() => setCobro(null)}>
                <span className="material-icons">close</span>
              </button>
            </div>
          )}

          {dinamica.cerrada && !dinamica.finalizada && (
            <div className={styles.cerrada} role="status">
              Esta dinámica está cerrada: el tablero se puede consultar, pero ya no se toca.
            </div>
          )}

          <div className={styles.cuerpo}>
            <div className={styles.tableroCaja}>
              {politica.retro ? (
                <TableroRetro
                  equipo={equipo}
                  yoId={user?.id ?? ''}
                  editable={editable}
                  onCrear={(columna: ColumnaRetro, texto, responsableId) =>
                    void mandar(`${base}/retro`, 'POST', { columna, texto, responsableId })}
                  onAsignar={(id, alumnoId) =>
                    void mandar(`${base}/retro/${id}`, 'PUT', { responsableId: alumnoId })}
                  onBorrar={(id) => void mandar(`${base}/retro/${id}`, 'DELETE')}
                  onMarcar={(id, estado) =>
                    void mandar(`${base}/compromisos/${id}`, 'PUT', { estado })}
                />
              ) : (
                <TableroScrum
                  equipo={equipo}
                  escala="full"
                  editable={editable}
                  politica={politica}
                  archivadas={equipo.archivadas}
                  onNuevaHistoria={() => { setEnEdicion(null); setFormAbierto(true); }}
                  onAbrirHistoria={(h) => { setEnEdicion(h); setFormAbierto(true); }}
                  onMover={mover}
                  onAsignar={asignar}
                  onEditarObjetivo={editarObjetivo}
                />
              )}
            </div>

            {politica.burndown && !politica.retro && (
              <aside className={styles.lateral}>
                <Burndown
                  titulo={sprint ? `Sprint ${sprint.numero}` : 'Sprint'}
                  cortes={equipo.marcador?.cortes ?? []}
                  planeados={equipo.marcador?.planeados || sumaPuntos(
                    equipo.historias.filter((h) => h.columna !== 'backlog'),
                  )}
                  nota="Cada punto es un cambio de etapa. Si la línea de color va por encima de la gris, van tarde."
                />
              </aside>
            )}
          </div>

          {/* Lo que el equipo se prometió en la última retro, siempre a la vista.
              Una retro que se olvida al minuto siguiente no cambia nada. */}
          {!politica.retro && equipo.compromisos.length > 0 && (
            <div className={styles.compromisos}>
              <span className={styles.compromisosTitulo}>Nos comprometimos a</span>
              <div className={styles.compromisosLista}>
                {equipo.compromisos.map((c) => (
                  <span key={c.id} className={styles.compromiso}>
                    {c.responsable
                      ? <span className={styles.avatarMini}>{iniciales(c.responsable.name)}</span>
                      : <span className={styles.avatarVacio} />}
                    {c.texto}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <HistoriaForm
        abierto={formAbierto}
        historia={enEdicion}
        miembros={equipo.miembros}
        epicas={equipo.epicas}
        guardando={guardando}
        onGuardar={guardarHistoria}
        onBorrar={async (id) => {
          const ok = await mandar(`${base}/historias/${id}`, 'DELETE');
          if (ok) { setFormAbierto(false); setEnEdicion(null); }
        }}
        onCerrar={() => { setFormAbierto(false); setEnEdicion(null); }}
      />

      <RolesScrumModal
        abierto={rolesAbierto}
        miembros={equipo.miembros}
        poId={equipo.po}
        editable={editable}
        onElegir={(alumnoId) => void mandar(`${base}/po`, 'PUT', { alumnoId })}
        onCerrar={() => setRolesAbierto(false)}
      />

      <EpicasScrumModal
        abierto={epicasAbierto}
        epicas={equipo.epicas}
        epicaActual={equipo.epicaActual}
        historias={equipo.historias}
        editable={editable}
        onCrear={(nombre) => void mandar(`${base}/epicas`, 'POST', { nombre })}
        onElegir={(epicaId) => void mandar(`${base}/epica-actual`, 'PUT', { epicaId })}
        onCerrar={() => setEpicasAbierto(false)}
      />

      <ReglasScrumModal
        abierto={reglas !== null}
        tipo={reglas ?? 'done'}
        items={reglas === 'restricciones' ? dinamica.restricciones : dinamica.definicionDone}
        onCerrar={() => setReglas(null)}
      />

      {po && <span className={styles.oculto}>Product Owner: {po.name}</span>}
    </div>
  );
}

function Apagado({ icono, titulo, detalle }: { icono: string; titulo: string; detalle: string }) {
  return (
    <div className={styles.apagado}>
      <span className="material-icons">{icono}</span>
      <p className={styles.apagadoTitulo}>{titulo}</p>
      <span className={styles.hint}>{detalle}</span>
    </div>
  );
}
