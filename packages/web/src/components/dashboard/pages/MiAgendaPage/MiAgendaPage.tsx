import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import Icon from '../../atoms/Icon/Icon';
import {
  acomodarDia, aMinutos, coloresDe, grupoVisible, hoyEnCurso, lunesDe, rangoHoras, sumarDias, textoSobre, traslapes,
  type EventoAgenda, type GrupoAgenda, type PreferenciaGrupo,
} from '../../../../utils/miAgenda';
import styles from './MiAgendaPage.module.css';

const API_BASE = '/api';
const ALTO_HORA = 48;
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** «23 al 29 de noviembre de 2026» (o con mes en las dos puntas si cambia). */
function etiquetaSemana(lunes: string): string {
  const fmt = (f: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${f}T12:00:00Z`).toLocaleDateString('es-MX', { timeZone: 'UTC', ...opts });
  const domingo = sumarDias(lunes, 6);
  const mismoMes = lunes.slice(0, 7) === domingo.slice(0, 7);
  const ini = mismoMes ? fmt(lunes, { day: 'numeric' }) : fmt(lunes, { day: 'numeric', month: 'long' });
  return `${ini} al ${fmt(domingo, { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

function horaLegible(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

/**
 * «Mi agenda»: las sesiones y los días de entrevistas de todos los grupos del
 * profesor o admin, en una semana tipo Google Calendar, para ver de un vistazo
 * lo que se traslapa entre grupos.
 *
 * Solo consulta: tocar un evento lleva al calendario o a las entrevistas de su
 * grupo, que es donde se edita. Lo único que se guarda desde aquí son los
 * colores y qué grupos se ven, que son preferencias de la persona.
 */
export default function MiAgendaPage() {
  const { sessionToken, user } = useAuth();
  const esAdmin = user?.userType === 'admin';
  const navigate = useNavigate();
  const hoy = hoyEnCurso();
  const [lunes, setLunes] = useState(() => lunesDe(hoy));
  const [diaMovil, setDiaMovil] = useState(() => hoy);
  const [grupos, setGrupos] = useState<GrupoAgenda[]>([]);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [prefs, setPrefs] = useState<Record<string, PreferenciaGrupo>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [verGrupos, setVerGrupos] = useState(false);
  const guardado = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError('');
    fetch(`${API_BASE}/admin/agenda?desde=${lunes}&hasta=${sumarDias(lunes, 6)}`, {
      headers: { 'x-session-token': sessionToken ?? '' },
    })
      .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
      .then(({ ok, b }) => {
        if (cancelado) return;
        if (!ok) throw new Error(b?.message ?? 'No se pudo cargar la agenda');
        setGrupos(b.grupos ?? []);
        setEventos(b.eventos ?? []);
        setPrefs(b.preferencias ?? {});
      })
      .catch((e) => { if (!cancelado) setError(e.message); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [lunes, sessionToken]);

  // Al cambiar de semana, el día del celular se queda dentro de ella.
  useEffect(() => {
    setDiaMovil((d) => (d >= lunes && d <= sumarDias(lunes, 6) ? d : (hoy >= lunes && hoy <= sumarDias(lunes, 6) ? hoy : lunes)));
  }, [lunes, hoy]);

  const guardarPrefs = useCallback((nuevas: Record<string, PreferenciaGrupo>) => {
    setPrefs(nuevas);
    // Un color se arrastra por la paleta: se guarda cuando el usuario suelta.
    if (guardado.current) clearTimeout(guardado.current);
    guardado.current = setTimeout(() => {
      fetch(`${API_BASE}/me/preferencias/agenda`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken ?? '' },
        body: JSON.stringify({ preferencias: nuevas }),
      }).catch(() => { /* la vista sigue con lo elegido; se reintenta en el siguiente cambio */ });
    }, 600);
  }, [sessionToken]);

  const indice = useMemo(() => new Map(grupos.map((g, i) => [g.id, i])), [grupos]);
  const nombre = useMemo(() => new Map(grupos.map((g) => [g.id, g.name])), [grupos]);
  const visibles = useMemo(
    () => new Set(grupos.filter((g) => grupoVisible(g, prefs[g.id])).map((g) => g.id)),
    [grupos, prefs],
  );
  const mostrados = useMemo(() => eventos.filter((e) => visibles.has(e.grupoId)), [eventos, visibles]);
  const choques = useMemo(() => traslapes(mostrados), [mostrados]);
  const enChoque = useMemo(() => new Set(choques.flatMap((c) => [c.a.id, c.b.id])), [choques]);
  const { desde, hasta } = useMemo(() => rangoHoras(mostrados), [mostrados]);
  const sinHorario = grupos.filter((g) => visibles.has(g.id) && g.sinHoraConClase);

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

  const cambiarPref = (grupoId: string, cambio: PreferenciaGrupo) =>
    guardarPrefs({ ...prefs, [grupoId]: { ...prefs[grupoId], ...cambio } });

  const abrir = (ev: EventoAgenda) =>
    navigate(`/admin/grupos/${ev.grupoId}/${ev.tipo === 'sesion' ? 'calendario' : 'entrevistas'}`);

  const etiquetaEvento = (ev: EventoAgenda) =>
    `${nombre.get(ev.grupoId) ?? ''} · ${ev.tipo === 'sesion' ? 'Sesión' : 'Entrevistas'} · ${ev.inicio}–${ev.fin}` +
    (ev.titulo ? ` · ${ev.titulo}` : '') + (enChoque.has(ev.id) ? ' · se traslapa con otro evento' : '');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Mi agenda</h1>
          <p className={styles.subtitulo}>
            Sesiones y entrevistas de todos tus grupos, en hora del centro de México. Toca un evento para abrirlo en su grupo.
          </p>
        </div>
        <div className={styles.navegacion}>
          <button type="button" className={styles.botonIcono} onClick={() => setLunes(sumarDias(lunes, -7))} aria-label="Semana anterior">
            <Icon name="chevron_left" />
          </button>
          <button type="button" className={styles.boton} onClick={() => { setLunes(lunesDe(hoy)); setDiaMovil(hoy); }}>
            Hoy
          </button>
          <button type="button" className={styles.botonIcono} onClick={() => setLunes(sumarDias(lunes, 7))} aria-label="Semana siguiente">
            <Icon name="chevron_right" />
          </button>
          <span className={styles.rango}>{etiquetaSemana(lunes)}</span>
          <button
            type="button"
            className={`${styles.boton} ${styles.botonGrupos}`}
            onClick={() => setVerGrupos((v) => !v)}
            aria-expanded={verGrupos}
          >
            <Icon name="palette" size="sm" /> Grupos y colores
          </button>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {choques.length > 0 && (
        <div className={styles.avisoChoques} role="status">
          <Icon name="warning" size="sm" />
          <div>
            <strong>{choques.length === 1 ? '1 traslape esta semana' : `${choques.length} traslapes esta semana`}</strong>
            <ul>
              {choques.slice(0, 6).map((c) => (
                <li key={`${c.a.id}|${c.b.id}`}>
                  {new Date(`${c.a.fecha}T12:00:00Z`).toLocaleDateString('es-MX', { timeZone: 'UTC', weekday: 'long', day: 'numeric' })}:{' '}
                  {nombre.get(c.a.grupoId)} ({c.a.tipo === 'sesion' ? 'sesión' : 'entrevistas'} {c.a.inicio}–{c.a.fin}) y{' '}
                  {nombre.get(c.b.grupoId)} ({c.b.tipo === 'sesion' ? 'sesión' : 'entrevistas'} {c.b.inicio}–{c.b.fin})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {sinHorario.length > 0 && (
        <div className={styles.avisoHorario}>
          <Icon name="schedule" size="sm" />
          <span>
            Estos grupos dan clase esta semana, pero sin horario sus sesiones no salen aquí:{' '}
            {/* El horario se edita en el formulario del grupo, que vive en la
                lista de Grupos del admin; el profesor no tiene esa pantalla. */}
            {sinHorario.map((g, i) => (
              <span key={g.id}>
                {i > 0 && ', '}
                {esAdmin ? <Link to="/admin/grupos">{g.name}</Link> : <strong>{g.name}</strong>}
              </span>
            ))}
            .{' '}
            {esAdmin
              ? 'Se define en Grupos, al editar el grupo («Horario de clase»).'
              : 'Pídele al administrador que defina su horario de clase.'}
          </span>
        </div>
      )}

      <div className={styles.cuerpo}>
        <aside className={`${styles.panelGrupos} ${verGrupos ? styles.panelAbierto : ''}`} aria-label="Grupos y colores">
          <h2 className={styles.panelTitulo}>Grupos</h2>
          {grupos.length === 0 && !cargando && <p className={styles.vacio}>No administras ningún grupo activo.</p>}
          <ul className={styles.listaGrupos}>
            {grupos.map((g) => {
              const c = coloresDe(indice.get(g.id) ?? 0, prefs[g.id]);
              const visible = visibles.has(g.id);
              return (
                <li key={g.id} className={styles.filaGrupo}>
                  <label className={styles.checkGrupo}>
                    <input type="checkbox" checked={visible} onChange={(e) => cambiarPref(g.id, { oculto: !e.target.checked })} />
                    <span className={styles.nombreGrupo} title={g.name}>{g.name}</span>
                  </label>
                  <div className={styles.colores}>
                    <label className={styles.color} title="Color de las sesiones">
                      <input type="color" value={c.sesiones} onChange={(e) => cambiarPref(g.id, { sesiones: e.target.value })} aria-label={`Color de las sesiones de ${g.name}`} />
                      <span>Sesiones</span>
                    </label>
                    <label className={styles.color} title="Color de las entrevistas">
                      <input type="color" value={c.entrevistas} onChange={(e) => cambiarPref(g.id, { entrevistas: e.target.value })} aria-label={`Color de las entrevistas de ${g.name}`} />
                      <span>Entrevistas</span>
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className={styles.calendario}>
          {/* En el celular cabe un día: se elige con estas pestañas. */}
          <div className={styles.pestanasDia} role="tablist" aria-label="Día">
            {dias.map((d, i) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={d === diaMovil}
                className={`${styles.pestanaDia} ${d === diaMovil ? styles.pestanaActiva : ''} ${d === hoy ? styles.pestanaHoy : ''}`}
                onClick={() => setDiaMovil(d)}
              >
                <span>{DIAS[i]}</span>
                <strong>{Number(d.slice(8))}</strong>
              </button>
            ))}
          </div>

          <div className={styles.rejilla} style={{ '--horas': hasta - desde, '--alto-hora': `${ALTO_HORA}px` } as React.CSSProperties}>
            <div className={styles.cabeceraVacia} />
            {dias.map((d, i) => (
              <div key={d} className={`${styles.cabeceraDia} ${d === hoy ? styles.esHoy : ''} ${d === diaMovil ? styles.diaMovil : ''}`}>
                <span>{DIAS[i]}</span>
                <strong>{Number(d.slice(8))}</strong>
              </div>
            ))}

            <div className={styles.columnaHoras}>
              {Array.from({ length: hasta - desde }, (_, i) => (
                <div key={i} className={styles.hora}>{horaLegible(desde + i)}</div>
              ))}
            </div>

            {dias.map((d) => (
              <div key={d} className={`${styles.columnaDia} ${d === hoy ? styles.esHoy : ''} ${d === diaMovil ? styles.diaMovil : ''}`}>
                {Array.from({ length: hasta - desde }, (_, i) => <div key={i} className={styles.lineaHora} />)}
                {acomodarDia(mostrados.filter((e) => e.fecha === d)).map(({ evento: ev, columna, columnas }) => {
                  const c = coloresDe(indice.get(ev.grupoId) ?? 0, prefs[ev.grupoId]);
                  const fondo = ev.tipo === 'sesion' ? c.sesiones : c.entrevistas;
                  const top = ((aMinutos(ev.inicio) - desde * 60) / 60) * ALTO_HORA;
                  const alto = Math.max(((aMinutos(ev.fin) - aMinutos(ev.inicio)) / 60) * ALTO_HORA, 20);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      className={`${styles.evento} ${enChoque.has(ev.id) ? styles.choque : ''} ${ev.cerrado ? styles.cerrado : ''}`}
                      style={{
                        top, height: alto,
                        left: `calc(${(columna / columnas) * 100}% + 2px)`,
                        width: `calc(${100 / columnas}% - 4px)`,
                        background: fondo,
                        color: textoSobre(fondo),
                      }}
                      onClick={() => abrir(ev)}
                      title={etiquetaEvento(ev)}
                      aria-label={etiquetaEvento(ev)}
                    >
                      <span className={styles.eventoGrupo}>
                        {enChoque.has(ev.id) && <Icon name="warning" size="sm" />}
                        {nombre.get(ev.grupoId)}
                      </span>
                      <span className={styles.eventoHora}>
                        {ev.tipo === 'sesion' ? 'Sesión' : 'Entrevistas'} · {ev.inicio}–{ev.fin}
                      </span>
                      {ev.titulo && alto >= 60 && <span className={styles.eventoTitulo}>{ev.titulo}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {cargando && <p className={styles.cargando}>Cargando…</p>}
          {!cargando && mostrados.length === 0 && !error && (
            <p className={styles.vacio}>No hay sesiones ni entrevistas de tus grupos visibles esta semana.</p>
          )}
        </div>
      </div>
    </div>
  );
}
