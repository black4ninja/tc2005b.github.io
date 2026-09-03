import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import Modal from '../../atoms/Modal/Modal';
import ListaEvidencias from '../../molecules/ListaEvidencias/ListaEvidencias';
import {
  adelantar, estadoHueco, fechaCorta, fechaLarga, fechaYHora, hora, puedeSerOtroIntento, rangoHoras,
} from '../../../../utils/agenda';
import type { AgendaAlumno, DiaAlumno, HuecoAlumno } from '../../../../types/agenda';
import styles from './AgendaEntrevistasAlumnoPage.module.css';

const API_BASE = '/api';
/**
 * Cada cuánto se relee la agenda con la pantalla abierta.
 *
 * No es un capricho: el límite de las 24 horas hábiles lo calcula el SERVIDOR y
 * llega resuelto, así que con la página abierta se quedaba congelado. Un alumno
 * que la dejó puesta veía como libre un hueco que ya había cruzado el límite, y
 * se llevaba el rechazo con el clic dado. De paso se entera de los huecos que
 * otros van tomando, que el día que se abre la agenda pasa a cada rato.
 */
const PERIODO_REFRESCO = 60000;

/**
 * Cada cuánto corre el reloj de la pantalla entre refresco y refresco.
 *
 * El refresco trae los instantes buenos del servidor; esto los adelanta mientras
 * tanto, para que los huecos se vayan cerrando SOLOS en vez de en tandas de un
 * minuto. Diez segundos bastan: los huecos van de cinco en cinco minutos.
 */
const PERIODO_RELOJ = 10000;

/**
 * Cuánto se adelanta la pantalla al servidor al decidir si un hueco sigue
 * abierto.
 *
 * El error tiene que caer siempre del mismo lado: es mejor apagar un hueco medio
 * minuto antes de tiempo que dejar pulsar uno que el servidor va a rechazar. Lo
 * primero se explica solo —«ya no da tiempo»—; lo segundo parece una avería.
 */
const MARGEN_MS = 30000;

function mensajeDeError(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}

/**
 * Donde el alumno elige su hora de entrevista.
 *
 * Es lo ÚNICO del módulo "Preguntas" que el alumno ve: ni el banco, ni qué
 * pregunta le tocará, ni la de nadie más. De aquí sale el orden en que el
 * profesor proyecta el día de las entrevistas.
 *
 * Sustituye a una hoja de cálculo compartida en la que las reglas eran un texto
 * en la cabecera y el cumplimiento, voluntario. Aquí las aplica el servidor; la
 * pantalla se limita a explicarlas ANTES de que alguien pulse, que es lo que
 * evita el rechazo con el clic ya dado. Por eso los huecos que aún no cumplen la
 * antelación salen apagados y con su motivo, en vez de desaparecer.
 *
 * Los huecos de otros salen como «ocupado» y sin nombre: para elegir basta con
 * saber si está libre.
 */
export default function AgendaEntrevistasAlumnoPage() {
  const { grupoId } = useParams();
  const { sessionToken } = useAuth();

  const [agenda, setAgenda] = useState<AgendaAlumno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);
  /** El enlace que se está escribiendo, por cita. */
  const [enlaces, setEnlaces] = useState<Record<string, string>>({});
  /** Qué evidencia está en vuelo, para apagar solo su fila. */
  const [subiendo, setSubiendo] = useState<string | null>(null);
  /** Hueco elegido, a la espera de que diga qué competencia viene a evaluar. */
  const [eligiendo, setEligiendo] = useState<{ dia: DiaAlumno; hueco: HuecoAlumno } | null>(null);
  /** Cuándo llegó la agenda que se está enseñando, para adelantar sus relojes. */
  const recibidaEn = useRef(Date.now());
  const [ahoraLocal, setAhoraLocal] = useState(() => Date.now());

  const headers = useMemo<Record<string, string>>(() => ({
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  }), [sessionToken]);

  const cargar = useCallback(async (silencioso = false) => {
    if (!grupoId) return;
    try {
      if (!silencioso) setLoading(true);
      const res = await fetch(`${API_BASE}/alumno/grupos/${grupoId}/agenda-entrevistas`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('No se pudo cargar la agenda');
      setAgenda(await res.json() as AgendaAlumno);
      recibidaEn.current = Date.now();
      setAhoraLocal(Date.now());
    } catch (err: unknown) {
      // Un refresco que falla no borra lo que ya se ve: se reintenta al minuto.
      if (!silencioso) setError(mensajeDeError(err, 'No se pudo cargar la agenda'));
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [grupoId, sessionToken]);

  useEffect(() => { cargar(); }, [cargar]);

  // El reloj de la pantalla. Sin esto los huecos se cerraban de golpe al llegar
  // el refresco; con esto se van apagando a su hora.
  useEffect(() => {
    const id = window.setInterval(() => setAhoraLocal(Date.now()), PERIODO_RELOJ);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => cargar(true), PERIODO_REFRESCO);
    // Y al volver a la pestaña, en el acto: es cuando el retraso se nota.
    function alVolver() { if (document.visibilityState === 'visible') cargar(true); }
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [cargar]);

  async function reservar(competenciaId: string) {
    if (!eligiendo || !grupoId) return;
    setError('');
    setGuardando(true);
    try {
      const res = await fetch(`${API_BASE}/alumno/grupos/${grupoId}/agenda-entrevistas/citas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          diaId: eligiendo.dia.id, inicio: eligiendo.hueco.inicio, competenciaId,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'No se pudo agendar');
      }
      setEligiendo(null);
      setAviso(`Listo: ${fechaYHora(eligiendo.hueco.inicio)}.`);
      // Se recarga entera y no se pinta por adelantado: un hueco lo puede tomar
      // otro entre que se ve y se pulsa, y lo que manda es lo que quedó.
      await cargar();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo agendar'));
      // Y se recarga: si el servidor dijo que no, la pantalla estaba enseñando
      // algo que ya no era verdad —el hueco lo tomaron, o cruzó el límite—.
      // Dejar el error sin refrescar es lo que hacía que pareciera una avería.
      setEligiendo(null);
      await cargar(true);
    } finally {
      setGuardando(false);
    }
  }

  /* ── Evidencias ─────────────────────────────────────────────────────── */

  async function agregarEvidencia(citaId: string) {
    if (!grupoId) return;
    const url = (enlaces[citaId] ?? '').trim();
    if (!url) return;
    setError('');
    setSubiendo(citaId);
    try {
      const res = await fetch(`${API_BASE}/alumno/grupos/${grupoId}/agenda-entrevistas/evidencias`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ citaId, url }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'No se pudo guardar la evidencia');
      }
      setEnlaces((e) => ({ ...e, [citaId]: '' }));
      await cargar();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo guardar la evidencia'));
    } finally {
      setSubiendo(null);
    }
  }

  async function quitarEvidencia(evidenciaId: string) {
    if (!grupoId) return;
    setError('');
    setSubiendo(evidenciaId);
    try {
      const res = await fetch(
        `${API_BASE}/alumno/grupos/${grupoId}/agenda-entrevistas/evidencias/${evidenciaId}`,
        { method: 'DELETE', headers },
      );
      if (!res.ok) throw new Error('No se pudo quitar la evidencia');
      await cargar();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo quitar la evidencia'));
    } finally {
      setSubiendo(null);
    }
  }

  async function cancelar(citaId: string) {
    if (!grupoId) return;
    setError('');
    setGuardando(true);
    try {
      const res = await fetch(
        `${API_BASE}/alumno/grupos/${grupoId}/agenda-entrevistas/citas/${citaId}`,
        { method: 'DELETE', headers },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'No se pudo cancelar');
      }
      await cargar();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo cancelar'));
    } finally {
      setGuardando(false);
    }
  }

  if (loading) return <div className={styles.page}><p>Cargando…</p></div>;

  if (!agenda || agenda.dias.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.titulo}>Agendar entrevistas</h1>
        <div className={styles.apagado}>
          <Icon name="event_busy" size="lg" />
          <p>Todavía no hay días abiertos para entrevistas.</p>
          <p className={styles.hint}>Tu profesor los publicará aquí; vuelve a mirar más adelante.</p>
        </div>
      </div>
    );
  }

  const { reglas } = agenda;
  const sinOportunidades = agenda.competencias.every((c) => c.usados >= reglas.maxIntentos);

  /*
   * Los dos relojes del servidor, adelantados lo que lleva la pantalla abierta.
   *
   * El de «desde cuándo se puede agendar» va con MARGEN_MS de propina: entre
   * semana ese umbral avanza un minuto por minuto igual que el reloj, así que
   * adelantarlo así es exacto, y el margen deja el error siempre del lado
   * seguro —apagar un hueco un poco antes, nunca dejar pulsar uno muerto—.
   */
  const transcurrido = Math.max(0, ahoraLocal - recibidaEn.current);
  const ahoraServidor = adelantar(agenda.serverNow, transcurrido);
  const agendableAhora = adelantar(agenda.agendableDesde, transcurrido + MARGEN_MS);

  return (
    <div className={styles.page}>
      <h1 className={styles.titulo}>Agendar entrevistas</h1>

      {/* Las reglas ARRIBA y siempre, como en la cabecera de la hoja: son la
          parte que se reclama después si no se leyó antes. */}
      <ul className={styles.reglas}>
        <li>
          Cada hueco es <strong>una competencia</strong>. Si quieres evaluar dos, aparta dos huecos.
        </li>
        <li>
          Tienes <strong>{reglas.maxIntentos} oportunidades por competencia</strong>.
        </li>
        <li>
          Hay que agendar con al menos <strong>{reglas.horasHabilesAntelacion} horas hábiles</strong>{' '}
          de anticipación: el fin de semana no cuenta.
        </li>
        <li>
          Puedes cancelar hasta <strong>{reglas.margenCancelacionMinutos} minutos antes</strong> de tu
          hora. Después cuenta como celebrada, aunque no te presentes.
        </li>
      </ul>

      {/* Debajo de las reglas: es lo que hay que leerse ANTES de agendar, y ahí
          es donde se está mirando qué hace falta para venir. Sin manual puesto
          no se enseña nada: un enlace vacío es peor que ninguno. */}
      {agenda.manualUrl && (
        <a
          className={styles.manual}
          href={agenda.manualUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="menu_book" size="sm" />
          Manual de competencias
          <Icon name="open_in_new" size="sm" />
        </a>
      )}

      {error && <div className={styles.error} onClick={() => setError('')}>{error}</div>}
      {aviso && <div className={styles.aviso} onClick={() => setAviso('')}>{aviso}</div>}

      <section className={styles.bloque}>
        <h2 className={styles.subtitulo}>Tus citas</h2>
        {agenda.misCitas.length === 0 ? (
          <p className={styles.hint}>Todavía no tienes ninguna. Elige un hueco libre abajo.</p>
        ) : (
          <ul className={styles.misCitas}>
            {agenda.misCitas.map((cita) => (
              <li key={cita.id} className={styles.miCita}>
                <div className={styles.citaCabecera}>
                  <div>
                    <span className={styles.citaHora}>{fechaYHora(cita.inicio)}</span>
                    <span className={styles.citaCompetencia}>
                      {cita.competencia?.nombre ?? 'Sin competencia'} · {cita.intento}.º intento
                    </span>
                    {cita.diaNota && <span className={styles.citaNota}>{cita.diaNota}</span>}
                  </div>
                  <DashButton
                    variant="outline"
                    disabled={!cita.cancelable || guardando}
                    onClick={() => cancelar(cita.id)}
                    title={cita.cancelable
                      ? 'Cancelar esta cita'
                      : `Ya pasó el margen de ${reglas.margenCancelacionMinutos} minutos`}
                  >
                    Cancelar
                  </DashButton>
                </div>

                {/* Las evidencias van AQUÍ, dentro de la cita, y no en una
                    sección aparte: son de esta entrevista, y verlas al lado de
                    su hora es lo que dice si falta algo por entregar. */}
                <ListaEvidencias
                  evidencias={cita.evidencias}
                  enVuelo={subiendo}
                  onQuitar={quitarEvidencia}
                />
                <div className={styles.evidenciaAlta}>
                  <input
                    type="url"
                    className={styles.evidenciaInput}
                    placeholder="https://… enlace a tu repo, documento o vídeo"
                    value={enlaces[cita.id] ?? ''}
                    disabled={subiendo === cita.id}
                    onChange={(e) => setEnlaces((x) => ({ ...x, [cita.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') void agregarEvidencia(cita.id); }}
                  />
                  <DashButton
                    variant="outline"
                    disabled={!(enlaces[cita.id] ?? '').trim() || subiendo === cita.id}
                    onClick={() => void agregarEvidencia(cita.id)}
                  >
                    {subiendo === cita.id ? 'Guardando…' : 'Agregar evidencia'}
                  </DashButton>
                </div>
              </li>
            ))}
          </ul>
        )}

        {agenda.evidenciasSueltas.length > 0 && (
          /* Cancelar una cita no se lleva lo que ya habías entregado: se queda
             aquí y vuelve sola a la próxima que reserves de esa competencia. */
          <div className={styles.sueltas}>
            <span className={styles.sueltasTitulo}>
              <Icon name="link_off" size="sm" /> Evidencias de citas que cancelaste
            </span>
            <p className={styles.hint}>
              No se han perdido. Vuelven solas a tu próxima cita de esa competencia.
            </p>
            <ListaEvidencias
              evidencias={agenda.evidenciasSueltas}
              enVuelo={subiendo}
              conCompetencia
              onQuitar={quitarEvidencia}
            />
          </div>
        )}
      </section>

      <section className={styles.bloque}>
        <h2 className={styles.subtitulo}>Oportunidades que te quedan</h2>
        <ul className={styles.competencias}>
          {agenda.competencias.map((c) => (
            <li key={c.id} className={c.usados >= reglas.maxIntentos ? styles.compAgotada : ''}>
              <span>{c.nombre}</span>
              <span className={styles.compCuenta}>{c.usados}/{reglas.maxIntentos}</span>
            </li>
          ))}
        </ul>
      </section>

      {agenda.dias.map((dia) => (
        <section key={dia.id} className={styles.bloque}>
          <h2 className={styles.subtitulo}>
            {fechaLarga(dia.inicio)}
            <span className={styles.diaRango}>{rangoHoras(dia.inicio, dia.fin)}</span>
            {dia.cerrado && <span className={styles.cerrado}>cerrado</span>}
          </h2>
          {dia.nota && <p className={styles.diaNota}>{dia.nota}</p>}
          <div className={styles.huecos}>
            {dia.huecos.map((hueco) => {
              const estado = estadoHueco(hueco, agendableAhora, ahoraServidor);
              const puedo = estado === 'libre' && !dia.cerrado && !sinOportunidades;
              return (
                <button
                  key={hueco.inicio}
                  // `libre` no tiene clase propia —es el aspecto de base—, y sin
                  // el `?? ''` acababa un "undefined" en el atributo.
                  className={`${styles.hueco} ${styles[`hueco_${estado}`] ?? ''}`}
                  disabled={!puedo || guardando}
                  onClick={() => setEligiendo({ dia, hueco })}
                  title={{
                    libre: 'Libre: pulsa para apartarlo',
                    mio: `Tuyo: ${hueco.mia?.competencia ?? ''}`,
                    ocupado: 'Ya lo tomó alguien',
                    pronto: `Demasiado justo: hay que agendar con ${reglas.horasHabilesAntelacion} horas hábiles`,
                    pasado: 'Ya pasó',
                  }[estado]}
                >
                  {hora(hueco.inicio)}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {eligiendo && (
        <Modal isOpen onClose={() => setEligiendo(null)} title={`Entrevista de ${fechaYHora(eligiendo.hueco.inicio)}`}>
          <p className={styles.hint}>¿Qué competencia vienes a evaluar?</p>
          <div className={styles.elegirComp}>
            {agenda.competencias.map((c) => {
              const agotada = c.usados >= reglas.maxIntentos;
              // El siguiente intento va en un día POSTERIOR al que ya tiene: el
              // mismo día es la misma entrevista repetida, y antes haría que el
              // «segundo» pasara primero. Lo decide el servidor; aquí solo se
              // evita ofrecer un botón que va a decir que no.
              const suyas = agenda.misCitas.filter((m) => m.competencia?.id === c.id);
              // Cuál de ellas estorba, para poder decir la fecha en el botón.
              const estorba = agotada ? undefined : suyas.find(
                (m) => !puedeSerOtroIntento([m.inicio], eligiendo.hueco.inicio),
              );
              const bloqueada = agotada || !!estorba;
              return (
                <button
                  key={c.id}
                  className={styles.opcionComp}
                  disabled={bloqueada || guardando}
                  onClick={() => reservar(c.id)}
                  title={agotada
                    ? 'Ya usaste tus dos oportunidades en esta competencia'
                    : estorba
                      ? 'Tu otra entrevista de esta competencia es ese día o después:'
                        + ' el siguiente intento va en un día posterior'
                      : undefined}
                >
                  <span>{c.nombre}</span>
                  <span className={styles.compCuenta}>
                    {agotada
                      ? 'sin oportunidades'
                      : estorba
                        ? `ya tienes una el ${fechaCorta(estorba.inicio)}`
                        : `${c.usados + 1}.º intento`}
                  </span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}
