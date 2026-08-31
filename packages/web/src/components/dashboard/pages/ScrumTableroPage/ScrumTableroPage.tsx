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
  POLITICA_SIN_ETAPA, bloqueoAjeno, cuentaRegresiva, historiasDeOtraEpica,
  historiasVivasPorPersona, iniciales,
  necesitaResponsable,
  sumaPuntos,
  type Bloqueo, type Columna, type ColumnaRetro, type Dinamica, type Epica, type EquipoTablero,
  type Etapa, type Historia, type Sprint, type TarjetaRetro,
} from '../../../../utils/scrum';
import styles from './ScrumTableroPage.module.css';

const API = '/api';

/**
 * Red de seguridad del stream. Veinte segundos y no sesenta: en una dinámica
 * donde una etapa dura treinta segundos, enterarse un minuto tarde de que la
 * conexión se cayó es enterarse cuando ya pasó todo.
 */
const REFRESCO_MS = 20000;

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
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  // ¿Está llegando el stream? Si no, hay que recargar a mano tras cada cambio.
  const streamVivo = useRef(false);

  const base = `${API}/alumno/grupos/${grupoId}/scrum`;

  const cabeceras = useCallback(
    (): HeadersInit => ({
      'Content-Type': 'application/json',
      ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
    }),
    [sessionToken],
  );

  /**
   * Un cambio de etapa llega como PARCHE: solo la cabecera, sin equipos, y sin
   * que el servidor haya tenido que reconstruir nada. Fusionarlo en vez de
   * reemplazar el estado es lo que hace que la instrucción de la pantalla
   * cambie a la vez que el profesor pulsa.
   */
  const aplicar = useCallback((json: any) => {
    setDinamica(json?.dinamica ?? null);
    setEtapa(json?.etapa ?? null);
    // El parche de etapa no trae el sprint —no lo toca—: se conserva el que ya
    // hay. Antes venía a medias y el número y el objetivo se borraban durante
    // los dos segundos que tardaba en llegar el estado completo.
    if (json?.tipo === 'etapa') return;
    setSprint(json?.sprint ?? null);
    setEquipo(json?.equipo ?? null);
    setBloqueos(json?.bloqueos ?? []);
    setEditable(json?.editable === true);
  }, []);

  const cargar = useCallback(async () => {
    if (!grupoId || !sessionToken) return;
    try {
      const r = await fetch(base, { headers: cabeceras() });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.message ?? 'No se pudo cargar el tablero');
      aplicar(json);
      // El resumen se pide AQUÍ y no en un efecto aparte: así lo reintenta el
      // refresco de siempre. En un efecto suelto, un fallo de red al montar
      // dejaba «Preparando el resumen…» para siempre.
      if (json?.dinamica?.finalizada) {
        const rr = await fetch(`${base}/resumen`, { headers: cabeceras() });
        if (rr.ok) setResumen(await rr.json());
      }
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
      streamVivo.current = true;
      try { aplicar(JSON.parse(ev.data)); } catch { /* trama a medias: llega otra */ }
    };
    return () => { fuente.close(); streamVivo.current = false; };
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
    async (
      url: string,
      metodo: string,
      cuerpo?: unknown,
      /**
       * Qué hacer con la respuesta. Lo que el servidor devuelve suele bastar
       * para dejar la pantalla como debe quedar, y aplicarlo aquí se ve al
       * instante en vez de esperar a que el tablero entero baje por el stream.
       */
      fusionar?: (json: any) => void,
    ): Promise<boolean> => {
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
        fusionar?.(json);
        // Cuando el stream está vivo NO se recarga: el nuevo estado llega solo,
        // y pedirlo otra vez era duplicar el viaje más caro de cada gesto. Sin
        // stream —una pestaña vieja, un proxy que lo corta— sí hace falta.
        if (!streamVivo.current) await cargar();
        return true;
      } catch {
        await avisar({ titulo: 'Sin conexión', texto: 'No se pudo contactar al servidor', icono: 'error' });
        return false;
      }
    },
    [cabeceras, cargar],
  );

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

  // Sin etapa abierta el tablero se mira y no se toca; el servidor rechaza
  // igual lo que se intente, esto es para no enseñar mandos muertos.
  const politica = etapa?.politica ?? POLITICA_SIN_ETAPA;
  const reloj = useMemo(
    () => cuentaRegresiva(dinamica?.etapaIniciadaEn ?? null, politica.duracionSegundos, ahora),
    [dinamica?.etapaIniciadaEn, politica.duracionSegundos, ahora],
  );
  const intrusas = equipo ? historiasDeOtraEpica(equipo) : [];

  const yoId = user?.id ?? '';

  /**
   * Pide el candado de un recurso. `false` si lo tiene alguien más —y entonces
   * ya se dijo quién—. El servidor lo vuelve a comprobar al guardar: entre que
   * alguien abre una historia y a los demás les llega el aviso caben los
   * milisegundos justos para que dos crean que la tienen.
   */
  const tomarCandado = useCallback(
    async (recurso: string, latido = false): Promise<boolean> => {
      try {
        const r = await fetch(`${base}/bloqueos`, {
          method: 'PUT',
          headers: cabeceras(),
          body: JSON.stringify({ recurso, tomar: true, latido }),
        });
        if (r.ok) return true;
        const json = await r.json().catch(() => ({}));
        if (!latido) {
          await avisar({
            titulo: 'Ocupado',
            texto: json?.message ?? 'Alguien más lo está editando',
            icono: 'warning',
          });
        }
        return false;
      } catch {
        // Sin red no se bloquea a nadie: es preferible arriesgar un choque a
        // dejar el tablero inutilizable.
        return true;
      }
    },
    [base, cabeceras],
  );

  const soltarCandado = useCallback(
    (recurso: string) => {
      void fetch(`${base}/bloqueos`, {
        method: 'PUT',
        headers: cabeceras(),
        body: JSON.stringify({ recurso, tomar: false }),
        keepalive: true,
      }).catch(() => {});
    },
    [base, cabeceras],
  );

  // Mientras el formulario esté abierto se refresca el candado. Sin latido
  // caduca solo a los treinta segundos, que es lo que salva a la tarjeta de
  // quien cerró la pestaña con la historia abierta.
  const recursoAbierto = formAbierto && enEdicion ? `historia:${enEdicion.id}` : null;
  useEffect(() => {
    if (!recursoAbierto) return;
    const t = setInterval(() => { void tomarCandado(recursoAbierto, true); }, 10000);
    return () => clearInterval(t);
  }, [recursoAbierto, tomarCandado]);

  // Y al salir del tablero se sueltan todos: cerrar la pestaña no debería dejar
  // una tarjeta bloqueada medio minuto.
  useEffect(() => {
    const soltarTodo = () => {
      void fetch(`${base}/bloqueos`, { method: 'DELETE', headers: cabeceras(), keepalive: true })
        .catch(() => {});
    };
    window.addEventListener('pagehide', soltarTodo);
    return () => { window.removeEventListener('pagehide', soltarTodo); soltarTodo(); };
  }, [base, cabeceras]);

  async function abrirHistoria(historia: Historia) {
    const ajeno = bloqueoAjeno(bloqueos, `historia:${historia.id}`, yoId);
    if (ajeno) {
      await avisar({
        titulo: 'Ocupado',
        texto: `${ajeno.nombre.split(' ')[0]} está editando esta historia ahora mismo.`,
        icono: 'warning',
      });
      return;
    }
    if (!(await tomarCandado(`historia:${historia.id}`))) return;
    setEnEdicion(historia);
    setFormAbierto(true);
  }

  function cerrarHistoria() {
    if (enEdicion) soltarCandado(`historia:${enEdicion.id}`);
    setFormAbierto(false);
    setEnEdicion(null);
  }

  /**
   * Deja la historia que devuelve el servidor en su sitio del tablero.
   *
   * El servidor ya manda la historia guardada en la respuesta, pero la pantalla
   * esperaba a que el tablero entero bajara por el stream: entre el «Guardando…»
   * y ver el cambio se iban un par de segundos con el modal ya cerrado. Aquí se
   * fusiona y el resto del tablero se queda como está.
   */
  const fusionarHistoria = useCallback((json: any) => {
    const h = json?.historia as Historia | undefined;
    if (!h?.id) return;
    setEquipo((previo) => {
      if (!previo) return previo;
      const estaba = previo.historias.some((x) => x.id === h.id);
      return {
        ...previo,
        historias: estaba
          ? previo.historias.map((x) => (x.id === h.id ? h : x))
          : [...previo.historias, h],
      };
    });
  }, []);

  /** La tarjeta de retro que devuelve el servidor, en su columna. */
  const fusionarRetro = useCallback((t: TarjetaRetro) => {
    setEquipo((eq) => {
      if (!eq) return eq;
      const estaba = eq.retro.some((x) => x.id === t.id);
      return {
        ...eq,
        retro: estaba ? eq.retro.map((x) => (x.id === t.id ? t : x)) : [...eq.retro, t],
      };
    });
  }, []);

  /** Los compromisos vienen del sprint anterior y viven en su propia lista. */
  const fusionarCompromiso = useCallback((t: TarjetaRetro) => {
    setEquipo((eq) => (eq
      ? { ...eq, compromisos: eq.compromisos.map((x) => (x.id === t.id ? t : x)) }
      : eq));
  }, []);

  async function guardarHistoria(datos: DatosHistoria) {
    setGuardando(true);
    const ok = enEdicion
      ? await mandar(`${base}/historias/${enEdicion.id}`, 'PUT', datos, fusionarHistoria)
      : await mandar(`${base}/historias`, 'POST', datos, fusionarHistoria);
    setGuardando(false);
    if (ok) cerrarHistoria();
  }

  /** Mover se pinta ANTES de que conteste el servidor: es un gesto de arrastrar. */
  async function mover(historiaId: string, columna: Columna) {
    // La regla se dice aquí y también la impone el servidor. Aquí, para que se
    // lea al soltar en vez de ver la tarjeta irse y volver un segundo después;
    // allí, porque la lección es la regla y no el aviso.
    const suya = equipo?.historias.find((h) => h.id === historiaId);
    if (suya && !suya.responsable && necesitaResponsable(columna)) {
      await avisar({
        titulo: 'Falta el responsable',
        texto: 'Antes de moverla, alguien del equipo tiene que hacerse responsable de esta historia.',
        icono: 'warning',
      });
      return;
    }
    setEquipo((previo) =>
      previo
        ? {
            ...previo,
            historias: previo.historias.map((h) => (h.id === historiaId ? { ...h, columna } : h)),
          }
        : previo,
    );
    // La respuesta trae además el orden que le tocó y, si volvió al backlog, sin
    // responsable: se fusiona porque es más fiel que lo que se pintó al soltar.
    await mandar(`${base}/historias/${historiaId}`, 'PUT', { columna }, fusionarHistoria);
  }

  async function asignar(historiaId: string, alumnoId: string | null) {
    await mandar(`${base}/historias/${historiaId}`, 'PUT', { responsableId: alumnoId }, fusionarHistoria);
  }

  async function editarObjetivo() {
    const valor = await pedirTexto({
      titulo: 'Objetivo del sprint',
      html: 'Una frase: a qué se compromete la clase en este sprint. Es el mismo para todos '
        + 'los equipos.',
      valor: sprint?.objetivo ?? '',
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
            /* Sin etapa el tablero está en pausa, no roto: se dice qué se puede
               hacer —mirar— y de quién depende que se abra. */
            <div className={styles.bandaVacia}>
              <strong>La actividad no ha empezado.</strong>
              {' '}El profesor todavía no ha abierto ninguna etapa: por ahora el tablero se mira,
              no se toca.
            </div>
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

            {/* En la retro el tablero está oculto: avisar de una épica intrusa
                ahí es ruido, porque no hay nada que mover. */}
            {intrusas.length > 0 && !politica.retro && (
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
                  // Todas fusionan lo que devuelve el servidor: en la retro se
                  // escriben tarjetas a ráfagas y esperar a que baje el tablero
                  // entero por el stream era lo que la hacía sentir muerta.
                  onCrear={(columna: ColumnaRetro, texto, responsableId) =>
                    mandar(`${base}/retro`, 'POST', { columna, texto, responsableId }, (json) => {
                      if (json?.tarjeta?.id) fusionarRetro(json.tarjeta);
                    })}
                  onAsignar={(id, alumnoId) =>
                    mandar(`${base}/retro/${id}`, 'PUT', { responsableId: alumnoId }, (json) => {
                      if (json?.tarjeta?.id) fusionarRetro(json.tarjeta);
                    })}
                  onBorrar={(id) => mandar(`${base}/retro/${id}`, 'DELETE', undefined, () => {
                    setEquipo((eq) => (eq
                      ? { ...eq, retro: eq.retro.filter((t) => t.id !== id) }
                      : eq));
                  })}
                  onMarcar={(id, estado) =>
                    mandar(`${base}/compromisos/${id}`, 'PUT', { estado }, (json) => {
                      if (json?.tarjeta?.id) fusionarCompromiso(json.tarjeta);
                    })}
                />
              ) : (
                <TableroScrum
                  equipo={equipo}
                  escala="full"
                  editable={editable}
                  politica={politica}
                  archivadas={equipo.archivadas}
                  objetivo={sprint?.objetivo ?? ''}
                  bloqueos={bloqueos}
                  yoId={yoId}
                  onNuevaHistoria={() => { setEnEdicion(null); setFormAbierto(true); }}
                  onAbrirHistoria={abrirHistoria}
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
                  pasos={equipo.marcador?.pasos}
                  nota="Cada punto es un hito del sprint, del compromiso al cierre. Si la línea de color va por encima de la gris, van tarde."
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
        ocupados={historiasVivasPorPersona(equipo.historias)}
        epicas={equipo.epicas}
        guardando={guardando}
        onGuardar={guardarHistoria}
        onBorrar={async (id) => {
          const ok = await mandar(`${base}/historias/${id}`, 'DELETE');
          if (ok) cerrarHistoria();
        }}
        onCerrar={cerrarHistoria}
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
        // La épica nueva se pinta con lo que devuelve el POST. Esperar al
        // stream era medio tablero reconstruido para enseñar una línea más.
        onCrear={(nombre) => mandar(`${base}/epicas`, 'POST', { nombre }, (json) => {
          if (!json?.epica?.id) return;
          setEquipo((eq) => (eq
            ? {
              ...eq,
              epicas: eq.epicas.some((x) => x.id === json.epica.id)
                ? eq.epicas
                : [...eq.epicas, json.epica as Epica],
              epicaActual: json.epicaActual ?? eq.epicaActual,
            }
            : eq));
        })}
        onElegir={(epicaId) => mandar(`${base}/epica-actual`, 'PUT', { epicaId }, (json) => {
          setEquipo((eq) => (eq ? { ...eq, epicaActual: json?.epicaActual ?? null } : eq));
        })}
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
