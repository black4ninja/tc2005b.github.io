import { useEffect, useRef } from 'react';
import Icon from '../../atoms/Icon/Icon';
import { acomodarDia, aMinutos, rangoHoras, textoSobre, type EventoAgenda } from '../../../../utils/miAgenda';
import styles from './MiAgendaPage.module.css';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const ALTO_HORA_BASE = 48;
/** Alto mínimo de un hueco de entrevista en la vista del día, para que quepa un nombre. */
const ALTO_HUECO_LEGIBLE = 22;
const ALTO_HORA_MAX = 264;

function diaSemana(fecha: string): number {
  const d = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return d === 0 ? 6 : d - 1;
}

interface Props {
  dias: string[];
  eventos: EventoAgenda[];
  hoy: string;
  /** Día que se ve en el celular cuando la vista es de semana. */
  diaMovil: string;
  onDiaMovil: (d: string) => void;
  /** En la vista del día los huecos de entrevista se abren con nombre. */
  detallado: boolean;
  enChoque: Set<string>;
  nombre: Map<string, string>;
  color: (ev: EventoAgenda) => string;
  onAbrir: (ev: EventoAgenda) => void;
}

function horaLegible(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

/**
 * La rejilla de horas, de uno o de siete días. Los días de entrevistas se
 * pintan como el bloque que el profesor apartó (rayado, sin rellenar) y, encima,
 * los huecos que ya tomó un alumno (macizos) y los que cerró el profesor
 * (grises): así se ve qué parte del bloque está comprometida y cuál sigue libre.
 */
export default function VistaHoras({
  dias, eventos, hoy, diaMovil, onDiaMovil, detallado, enChoque, nombre, color, onAbrir,
}: Props) {
  const { desde, hasta } = rangoHoras(eventos);
  const scroll = useRef<HTMLDivElement>(null);
  const semana = dias.length > 1;

  // En la vista del día se amplía la hora hasta que el hueco más corto quepa
  // con un nombre dentro; en la semana manda la vista de conjunto.
  const huecoMin = Math.min(
    ...eventos.filter((e) => e.huecos && e.huecos.total > 0).map((e) => e.huecos!.duracionMin),
    Infinity,
  );
  const altoHora = detallado && Number.isFinite(huecoMin)
    ? Math.min(ALTO_HORA_MAX, Math.max(ALTO_HORA_BASE, Math.ceil((ALTO_HUECO_LEGIBLE * 60) / huecoMin)))
    : ALTO_HORA_BASE;

  // Al cambiar de periodo, se baja hasta el primer evento (como Google).
  const primero = eventos.reduce((m, e) => Math.min(m, aMinutos(e.inicio)), Infinity);
  // `primero` entra en la clave: los datos llegan después de cambiar de periodo.
  const clave = `${dias[0]}|${dias.length}|${altoHora}|${primero}`;
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    el.scrollTop = Number.isFinite(primero) ? Math.max(0, ((primero - desde * 60) / 60) * altoHora - 24) : 0;
    // Solo al cambiar de periodo o de escala: no al editar un color.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  return (
    <>
      {semana && (
        // En el celular cabe un día: se elige con estas pestañas.
        <div className={styles.pestanasDia} role="tablist" aria-label="Día">
          {dias.map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === diaMovil}
              className={`${styles.pestanaDia} ${d === diaMovil ? styles.pestanaActiva : ''} ${d === hoy ? styles.pestanaHoy : ''}`}
              onClick={() => onDiaMovil(d)}
            >
              <span>{DIAS[diaSemana(d)]}</span>
              <strong>{Number(d.slice(8))}</strong>
            </button>
          ))}
        </div>
      )}

      <div ref={scroll} className={styles.scrollHoras}>
        <div
          className={`${styles.rejilla} ${semana ? '' : styles.rejillaDia}`}
          style={{
            '--horas': hasta - desde,
            '--alto-hora': `${altoHora}px`,
            '--columnas': dias.length,
          } as React.CSSProperties}
        >
          <div className={styles.cabeceraVacia} />
          {dias.map((d) => (
            <div key={d} className={`${styles.cabeceraDia} ${d === hoy ? styles.esHoy : ''}`}>
              <span>{DIAS[diaSemana(d)]}</span>
              <strong>{Number(d.slice(8))}</strong>
            </div>
          ))}

          <div className={styles.columnaHoras}>
            {Array.from({ length: hasta - desde }, (_, i) => (
              <div key={i} className={styles.hora}>{horaLegible(desde + i)}</div>
            ))}
          </div>

          {dias.map((d) => (
            <div
              key={d}
              className={`${styles.columnaDia} ${d === hoy ? styles.esHoy : ''} ${!semana || d === diaMovil ? styles.diaMovil : ''}`}
            >
              {Array.from({ length: hasta - desde }, (_, i) => <div key={i} className={styles.lineaHora} />)}
              {acomodarDia(eventos.filter((e) => e.fecha === d)).map(({ evento: ev, columna, columnas }) => (
                <Evento
                  key={ev.id}
                  ev={ev}
                  top={((aMinutos(ev.inicio) - desde * 60) / 60) * altoHora}
                  alto={Math.max(((aMinutos(ev.fin) - aMinutos(ev.inicio)) / 60) * altoHora, 20)}
                  columna={columna}
                  columnas={columnas}
                  fondo={color(ev)}
                  grupo={nombre.get(ev.grupoId) ?? ''}
                  choca={enChoque.has(ev.id)}
                  detallado={detallado}
                  onAbrir={onAbrir}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

interface EventoProps {
  ev: EventoAgenda;
  top: number;
  alto: number;
  columna: number;
  columnas: number;
  fondo: string;
  grupo: string;
  choca: boolean;
  detallado: boolean;
  onAbrir: (ev: EventoAgenda) => void;
}

function Evento({ ev, top, alto, columna, columnas, fondo, grupo, choca, detallado, onAbrir }: EventoProps) {
  const h = ev.huecos;
  const libres = h ? h.total - h.cerrados.length : 0;
  const ocupacion = h ? `${h.citas.length}/${libres} ocupados` : '';
  const etiqueta =
    `${grupo} · ${ev.tipo === 'sesion' ? 'Sesión' : 'Entrevistas'} · ${ev.inicio}–${ev.fin}` +
    (ocupacion ? ` · ${ocupacion}` : '') +
    (ev.titulo ? ` · ${ev.titulo}` : '') +
    (choca ? ' · se traslapa con otro evento' : '');

  // Entrevistas con huecos: el bloque es el apartado (claro y rayado) y los
  // huecos tomados van macizos encima. Sin datos de huecos, bloque macizo.
  const conHuecos = ev.tipo === 'entrevista' && !!h && h.total > 0;
  const minutosBloque = aMinutos(ev.fin) - aMinutos(ev.inicio);
  const pos = (inicio: string, minutos: number) => ({
    top: `${((aMinutos(inicio) - aMinutos(ev.inicio)) / minutosBloque) * 100}%`,
    height: `${(minutos / minutosBloque) * 100}%`,
  });

  return (
    <button
      type="button"
      className={[
        styles.evento,
        choca ? styles.choque : '',
        ev.cerrado ? styles.cerrado : '',
        conHuecos ? styles.bloqueEntrevistas : '',
        conHuecos && detallado ? styles.bloqueDetallado : '',
      ].join(' ')}
      style={{
        top, height: alto,
        left: `calc(${(columna / columnas) * 100}% + 2px)`,
        width: `calc(${100 / columnas}% - 4px)`,
        '--c': fondo,
        '--c-texto': textoSobre(fondo),
        ...(conHuecos ? {} : { background: fondo, color: textoSobre(fondo) }),
      } as React.CSSProperties}
      onClick={() => onAbrir(ev)}
      title={etiqueta}
      aria-label={
        conHuecos && h!.citas.length > 0
          ? `${etiqueta} · citas: ${h!.citas.map((c) => `${c.inicio} ${c.alumno}`).join(', ')}`
          : etiqueta
      }
    >
      <span className={styles.eventoTexto}>
        <span className={styles.eventoGrupo}>
          {choca && <Icon name="warning" size="sm" />}
          {grupo}
        </span>
        <span className={styles.eventoHora}>
          {ev.tipo === 'sesion' ? 'Sesión' : 'Entrevistas'} · {ev.inicio}–{ev.fin}
        </span>
        {conHuecos && <span className={styles.eventoHora}>{ocupacion}</span>}
        {ev.titulo && alto >= 60 && <span className={styles.eventoTitulo}>{ev.titulo}</span>}
      </span>

      {conHuecos && (
        <span className={styles.carril} aria-hidden="true">
          {h!.cerrados.map((ini) => (
            <span key={`x${ini}`} className={styles.huecoCerrado} style={pos(ini, h!.duracionMin)} title={`${ini} · cerrado`} />
          ))}
          {h!.citas.map((c) => (
            <span
              key={`c${c.inicio}`}
              className={styles.huecoOcupado}
              style={pos(c.inicio, h!.duracionMin)}
              title={`${c.inicio}–${c.fin} · ${c.alumno}${c.competencia ? ` · ${c.competencia}` : ''}`}
            >
              {detallado && (
                <>
                  <strong>{c.inicio}</strong> {c.alumno}
                  {c.competencia && <span className={styles.huecoCompetencia}> · {c.competencia}</span>}
                </>
              )}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
