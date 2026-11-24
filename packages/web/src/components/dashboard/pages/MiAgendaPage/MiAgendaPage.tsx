import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import { useAgendaSidebar } from '../../../../context/AgendaSidebarContext';
import Icon from '../../atoms/Icon/Icon';
import {
  coloresDe, esVista, grupoVisible, hoyEnCurso, lunesDe, moverVista, rangoDeVista, sumarDias, traslapes, VISTAS,
  type EventoAgenda, type GrupoAgenda, type PreferenciaGrupo, type Vista,
} from '../../../../utils/miAgenda';
import PanelCalendarios from './PanelCalendarios';
import VistaHoras from './VistaHoras';
import VistaMes from './VistaMes';
import VistaAnio from './VistaAnio';
import DetalleEvento from './DetalleEvento';
import SuscripcionCalendario from './SuscripcionCalendario';
import styles from './MiAgendaPage.module.css';

const API_BASE = '/api';
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const fmt = (f: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${f}T12:00:00Z`).toLocaleDateString('es-MX', { timeZone: 'UTC', ...opts });

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** «Martes, 24 de noviembre de 2026», «23 al 29 de noviembre de 2026», «Noviembre de 2026», «2026». */
function etiquetaPeriodo(vista: Vista, fecha: string): string {
  switch (vista) {
    case 'dia':
      return mayuscula(fmt(fecha, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    case 'semana': {
      const lunes = lunesDe(fecha);
      const domingo = sumarDias(lunes, 6);
      const mismoMes = lunes.slice(0, 7) === domingo.slice(0, 7);
      const ini = mismoMes ? fmt(lunes, { day: 'numeric' }) : fmt(lunes, { day: 'numeric', month: 'long' });
      return `${ini} al ${fmt(domingo, { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
    case 'mes':
      return mayuscula(fmt(fecha, { month: 'long', year: 'numeric' }));
    case 'anio':
      return fecha.slice(0, 4);
  }
}

const EN_PERIODO: Record<Vista, string> = { dia: 'este día', semana: 'esta semana', mes: 'este mes', anio: 'este año' };

/**
 * «Mi agenda»: las sesiones y los días de entrevistas de todos los grupos del
 * profesor o admin, por día, semana, mes o año, como Google Calendar, para ver
 * de un vistazo lo que se traslapa entre grupos y cuánto de cada bloque de
 * entrevistas ya tomaron los alumnos.
 *
 * Solo consulta: tocar un evento abre su detalle (actividades de la sesión,
 * quién ocupa cada hueco de entrevista) y desde ahí se salta a su pantalla, que
 * es donde se edita. Lo único que se guarda desde aquí son los
 * colores y qué calendarios se ven, que son preferencias de la persona. Esos
 * calendarios se pintan en el sidebar (`AgendaSidebarContext`).
 */
export default function MiAgendaPage() {
  const { sessionToken, user } = useAuth();
  const esAdmin = user?.userType === 'admin';
  const hoy = hoyEnCurso();
  const sidebar = useAgendaSidebar();

  // Vista y fecha en la URL: el botón de volver del navegador funciona y el
  // enlace a un mes concreto se puede compartir.
  const [params, setParams] = useSearchParams();
  const vista: Vista = esVista(params.get('vista')) ? (params.get('vista') as Vista) : 'semana';
  const fecha = FECHA.test(params.get('fecha') ?? '') ? params.get('fecha')! : hoy;
  const ir = useCallback((v: Vista, f: string) => {
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set('vista', v);
      n.set('fecha', f);
      return n;
    });
  }, [setParams]);

  const [diaMovil, setDiaMovil] = useState(() => fecha);
  const [grupos, setGrupos] = useState<GrupoAgenda[]>([]);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [prefs, setPrefs] = useState<Record<string, PreferenciaGrupo>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const guardado = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Evento abierto en el modal de detalle.
  const [detalle, setDetalle] = useState<EventoAgenda | null>(null);
  const [suscripcion, setSuscripcion] = useState(false);

  const { desde, hasta } = rangoDeVista(vista, fecha);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError('');
    fetch(`${API_BASE}/admin/agenda?desde=${desde}&hasta=${hasta}`, {
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
  }, [desde, hasta, sessionToken]);

  // En la semana del celular se ve un día: se queda dentro del periodo.
  useEffect(() => {
    setDiaMovil((d) => (d >= desde && d <= hasta ? d : hoy >= desde && hoy <= hasta ? hoy : desde));
  }, [desde, hasta, hoy]);

  // Atajos como en Google Calendar: D, S, M, A cambian la vista; T vuelve a hoy.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (detalle || suscripcion || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName))) return;
      const tecla = e.key.toUpperCase();
      const v = VISTAS.find((x) => x.atajo === tecla);
      if (v) ir(v.clave, fecha);
      else if (tecla === 'T') ir(vista, hoy);
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [ir, fecha, vista, hoy, detalle, suscripcion]);

  const guardarPrefs = useCallback((cambios: Record<string, PreferenciaGrupo>) => {
    const nuevas = { ...prefs, ...cambios };
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
  }, [prefs, sessionToken]);

  const indice = useMemo(() => new Map(grupos.map((g, i) => [g.id, i])), [grupos]);
  const nombre = useMemo(() => new Map(grupos.map((g) => [g.id, g.name])), [grupos]);
  const porId = useMemo(() => new Map(grupos.map((g) => [g.id, g])), [grupos]);
  const mostrados = useMemo(
    () => eventos.filter((e) => {
      const g = porId.get(e.grupoId);
      return !!g && grupoVisible(g, prefs[g.id], e.tipo);
    }),
    [eventos, porId, prefs],
  );
  const choques = useMemo(() => traslapes(mostrados), [mostrados]);
  const enChoque = useMemo(() => new Set(choques.flatMap((c) => [c.a.id, c.b.id])), [choques]);
  const sinHorario = grupos.filter((g) => grupoVisible(g, prefs[g.id], 'sesion') && g.sinHoraConClase);

  const color = useCallback((ev: EventoAgenda) => {
    const c = coloresDe(indice.get(ev.grupoId) ?? 0, prefs[ev.grupoId]);
    return ev.tipo === 'sesion' ? c.sesiones : c.entrevistas;
  }, [indice, prefs]);

  // Tocar un evento abre su detalle aquí mismo; desde el modal se salta a su
  // pantalla (calendario o entrevistas) si hace falta editarlo.
  const abrir = (ev: EventoAgenda) => setDetalle(ev);
  const choquesDe = (ev: EventoAgenda) =>
    choques.flatMap((c) => (c.a.id === ev.id ? [c.b] : c.b.id === ev.id ? [c.a] : []));
  const abrirDia = (d: string) => ir('dia', d);

  const dias = vista === 'dia' ? [fecha] : Array.from({ length: 7 }, (_, i) => sumarDias(lunesDe(fecha), i));
  const conMes = vista === 'mes' || vista === 'anio';

  return (
    <div className={styles.page}>
      {sidebar.slot && createPortal(
        <PanelCalendarios
          grupos={grupos}
          prefs={prefs}
          indice={indice}
          onCambiar={guardarPrefs}
          onVerMenu={() => sidebar.setVerMenu(true)}
        />,
        sidebar.slot,
      )}

      <DetalleEvento
        evento={detalle}
        grupo={detalle ? nombre.get(detalle.grupoId) ?? '' : ''}
        color={detalle ? color(detalle) : ''}
        choques={detalle ? choquesDe(detalle) : []}
        nombre={nombre}
        onCerrar={() => setDetalle(null)}
      />

      <SuscripcionCalendario abierto={suscripcion} onCerrar={() => setSuscripcion(false)} grupos={grupos} />

      <header className={styles.header}>
        <div className={styles.navegacion}>
          {!sidebar.panelVisible && (
            <button type="button" className={styles.boton} onClick={sidebar.abrirCalendarios}>
              <Icon name="calendar_month" size="sm" /> Calendarios
            </button>
          )}
          <button type="button" className={styles.boton} onClick={() => ir(vista, hoy)} title="Hoy (T)">
            Hoy
          </button>
          <button type="button" className={styles.botonIcono} onClick={() => ir(vista, moverVista(vista, fecha, -1))} aria-label="Periodo anterior">
            <Icon name="chevron_left" />
          </button>
          <button type="button" className={styles.botonIcono} onClick={() => ir(vista, moverVista(vista, fecha, 1))} aria-label="Periodo siguiente">
            <Icon name="chevron_right" />
          </button>
          <h1 className={styles.rango}>{etiquetaPeriodo(vista, fecha)}</h1>
        </div>
        <div className={styles.navegacion}>
        <button
          type="button"
          className={styles.boton}
          onClick={() => setSuscripcion(true)}
          title="Ver esta agenda en Google Calendar u Outlook"
          aria-label="Ver esta agenda en Google Calendar u Outlook"
        >
          <Icon name="ios_share" size="sm" /> <span className={styles.textoSuscribir}>Google / Outlook</span>
        </button>
        <label className={styles.selectorVista}>
          <span className={styles.oculto}>Vista</span>
          <select value={vista} onChange={(e) => ir(e.target.value as Vista, fecha)}>
            {VISTAS.map((v) => <option key={v.clave} value={v.clave}>{v.nombre} ({v.atajo})</option>)}
          </select>
          <Icon name="expand_more" size="sm" />
        </label>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {choques.length > 0 && (
        <div className={styles.avisoChoques} role="status">
          <Icon name="warning" size="sm" />
          <div>
            <strong>{choques.length === 1 ? `1 traslape ${EN_PERIODO[vista]}` : `${choques.length} traslapes ${EN_PERIODO[vista]}`}</strong>
            <ul>
              {choques.slice(0, 5).map((c) => (
                <li key={`${c.a.id}|${c.b.id}`}>
                  <button type="button" className={styles.enlaceDia} onClick={() => abrirDia(c.a.fecha)}>
                    {fmt(c.a.fecha, { weekday: 'long', day: 'numeric', ...(conMes ? { month: 'short' } : {}) })}
                  </button>
                  : {nombre.get(c.a.grupoId)} ({c.a.tipo === 'sesion' ? 'sesión' : 'entrevistas'} {c.a.inicio}–{c.a.fin}) y{' '}
                  {nombre.get(c.b.grupoId)} ({c.b.tipo === 'sesion' ? 'sesión' : 'entrevistas'} {c.b.inicio}–{c.b.fin})
                </li>
              ))}
              {choques.length > 5 && <li>y {choques.length - 5} más.</li>}
            </ul>
          </div>
        </div>
      )}

      {sinHorario.length > 0 && (
        <div className={styles.avisoHorario}>
          <Icon name="schedule" size="sm" />
          <span>
            Sin horario de clase, las sesiones de estos grupos no salen aquí:{' '}
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

      <div className={styles.calendario} aria-busy={cargando}>
        {(vista === 'dia' || vista === 'semana') && (
          <VistaHoras
            dias={dias}
            eventos={mostrados}
            hoy={hoy}
            diaMovil={diaMovil}
            onDiaMovil={setDiaMovil}
            detallado={vista === 'dia'}
            enChoque={enChoque}
            nombre={nombre}
            color={color}
            onAbrir={abrir}
          />
        )}
        {vista === 'mes' && (
          <VistaMes fecha={fecha} eventos={mostrados} hoy={hoy} enChoque={enChoque} nombre={nombre} color={color} onAbrir={abrir} onDia={abrirDia} />
        )}
        {vista === 'anio' && (
          <VistaAnio anio={fecha.slice(0, 4)} eventos={mostrados} hoy={hoy} enChoque={enChoque} nombre={nombre} color={color} onDia={abrirDia} />
        )}
        {cargando && <p className={styles.cargando}>Cargando…</p>}
        {!cargando && mostrados.length === 0 && !error && (
          <p className={styles.vacio}>No hay sesiones ni entrevistas de tus calendarios visibles {EN_PERIODO[vista]}.</p>
        )}
      </div>
    </div>
  );
}
