import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import { confirmar } from '../../../../utils/dialogos';
import {
  ESTADOS_HAPPINESS, TEXTO_HAPPINESS_MAX, fechaLargaDia, fechaSesion, temasSesion,
} from '../../../../utils/happiness';
import type { EntradaHappiness, EstadoHappiness, SesionHappiness } from '../../../../types/happiness';
import styles from './HappinessMisEntradas.module.css';

interface Props {
  /** Base del API de las entradas propias: la del alumno o la del staff. */
  apiBase: string;
}

interface Borrador {
  /** null = entrada nueva. */
  id: string | null;
  estado: EstadoHappiness | null;
  texto: string;
  /** Día de la sesión que se evalúa; null = el que proponga el servidor. */
  dia: string | null;
}

const VACIO: Borrador = { id: null, estado: null, texto: '', dia: null };

async function leerError(res: Response, porDefecto: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.message || porDefecto;
  } catch {
    return porDefecto;
  }
}

/**
 * Lo que hace cualquier miembro del grupo en el Happiness Door: escribir cómo le
 * fue hoy y releer lo que ya escribió. Lo comparten la pantalla del alumno y la
 * del staff; solo cambia la URL del API.
 *
 * Una entrada es de una SESIÓN del calendario del grupo, no del día en que se
 * escribe: muchos la escriben al día siguiente. Se propone la última sesión que
 * ya empezó y se puede elegir otra; antes de publicar se ve cuál es. Un grupo
 * sin calendario no tiene sesiones y la entrada es de hoy.
 */
export default function HappinessMisEntradas({ apiBase }: Props) {
  const { sessionToken } = useAuth();
  const [entradas, setEntradas] = useState<EntradaHappiness[]>([]);
  const [hoy, setHoy] = useState<string | null>(null);
  const [sesiones, setSesiones] = useState<SesionHappiness[]>([]);
  const [sugerida, setSugerida] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador>(VACIO);
  const [guardando, setGuardando] = useState(false);

  const headers = useCallback(
    () => ({ 'Content-Type': 'application/json', 'x-session-token': sessionToken ?? '' }),
    [sessionToken],
  );

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/entradas`, { headers: headers() });
      if (!res.ok) throw new Error(await leerError(res, 'No se pudieron cargar tus entradas'));
      const body = await res.json();
      setEntradas(body.entradas ?? []);
      setHoy(body.hoy ?? null);
      setSesiones(body.sesiones ?? []);
      setSugerida(body.sugerida ?? body.sesiones?.[body.sesiones.length - 1]?.dia ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus entradas');
    } finally {
      setCargando(false);
    }
  }, [apiBase, headers]);

  useEffect(() => { void cargar(); }, [cargar]);

  const editando = borrador.id !== null;
  const conSesiones = sesiones.length > 0;
  const diaElegido = borrador.dia ?? sugerida;
  const sesionElegida = sesiones.find((x) => x.dia === diaElegido) ?? null;
  // Al editar una entrada de un día que ya no es sesión (de antes del
  // calendario), su día sigue en la lista para no moverla sin querer.
  const opciones = diaElegido && !sesionElegida && editando
    ? [{ dia: diaElegido, inicio: '', temas: [] } as SesionHappiness, ...sesiones]
    : sesiones;
  const temasDe = new Map(sesiones.map((x) => [x.dia, temasSesion(x.temas)]));
  const listo = borrador.estado !== null && borrador.texto.trim() !== '' && !guardando
    && (!conSesiones || diaElegido !== null);

  async function guardar() {
    if (!listo) return;
    setGuardando(true);
    try {
      const res = await fetch(editando ? `${apiBase}/entradas/${borrador.id}` : `${apiBase}/entradas`, {
        method: editando ? 'PUT' : 'POST',
        headers: headers(),
        body: JSON.stringify({
          estado: borrador.estado,
          texto: borrador.texto,
          ...(conSesiones && diaElegido ? { dia: diaElegido } : {}),
        }),
      });
      if (!res.ok) throw new Error(await leerError(res, 'No se pudo guardar la entrada'));
      setBorrador(VACIO);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la entrada');
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(entrada: EntradaHappiness) {
    const ok = await confirmar({
      titulo: '¿Borrar esta entrada?',
      texto: 'Desaparece de tu historial y del tablero del grupo.',
      confirmar: 'Borrar',
      peligro: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`${apiBase}/entradas/${entrada.id}`, { method: 'DELETE', headers: headers() });
      if (!res.ok) throw new Error(await leerError(res, 'No se pudo borrar la entrada'));
      if (borrador.id === entrada.id) setBorrador(VACIO);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar la entrada');
    }
  }

  // Agrupadas por día, en el orden en que llegan (más reciente primero).
  const porDia: [string, EntradaHappiness[]][] = [];
  for (const e of entradas) {
    const ultimo = porDia[porDia.length - 1];
    if (ultimo && ultimo[0] === e.dia) ultimo[1].push(e);
    else porDia.push([e.dia, [e]]);
  }

  return (
    <div className={styles.contenedor}>
      {error && (
        <div className={styles.error} role="alert" onClick={() => setError(null)}>{error}</div>
      )}

      <section className={styles.formulario} aria-label={editando ? 'Editar entrada' : 'Nueva entrada'}>
        <h2 className={styles.formTitulo}>
          {editando ? 'Editar entrada' : conSesiones ? '¿Cómo te fue en la sesión?' : '¿Cómo te fue hoy?'}
        </h2>
        {conSesiones && (
          <div className={styles.sesion}>
            <label className={styles.sesionEtiqueta} htmlFor="happiness-sesion">Sesión que evalúas</label>
            <select
              id="happiness-sesion"
              className={styles.sesionSelect}
              value={diaElegido ?? ''}
              onChange={(ev) => setBorrador((b) => ({ ...b, dia: ev.target.value }))}
            >
              {diaElegido === null && <option value="" disabled>Elige la sesión</option>}
              {opciones.map((x) => (
                <option key={x.dia} value={x.dia}>
                  {fechaSesion(x.dia)}{x.temas.length > 0 ? ` — ${temasSesion(x.temas)}` : ''}
                </option>
              ))}
            </select>
            {diaElegido && (
              <p className={styles.sesionAviso} aria-live="polite">
                <Icon name="event" size="sm" />
                <span>
                  Tu entrada se guardará en la sesión del <strong>{fechaSesion(diaElegido).toLowerCase()}</strong>
                  {sesionElegida?.semana ? ` (semana ${sesionElegida.semana})` : ''}
                  {sesionElegida && sesionElegida.temas.length > 0 && <>: {temasSesion(sesionElegida.temas)}</>}.
                  {' '}Si hablas de otra sesión, cámbiala arriba.
                </span>
              </p>
            )}
          </div>
        )}
        <div className={styles.estados} role="radiogroup" aria-label="Estado">
          {ESTADOS_HAPPINESS.map((s) => (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={borrador.estado === s.key}
              className={`${styles.estado} ${styles[s.key]} ${borrador.estado === s.key ? styles.elegido : ''}`}
              onClick={() => setBorrador((b) => ({ ...b, estado: s.key }))}
            >
              <Icon name={s.icono} />
              {s.label}
            </button>
          ))}
        </div>
        <textarea
          className={styles.texto}
          value={borrador.texto}
          maxLength={TEXTO_HAPPINESS_MAX}
          rows={6}
          placeholder="Cuéntalo con tus palabras: qué pasó, qué te ayudó, qué te estorbó…"
          aria-label="Retroalimentación"
          onChange={(ev) => setBorrador((b) => ({ ...b, texto: ev.target.value }))}
        />
        <div className={styles.acciones}>
          <span className={styles.contador}>{borrador.texto.length} / {TEXTO_HAPPINESS_MAX}</span>
          {editando && (
            <DashButton variant="text" onClick={() => setBorrador(VACIO)} disabled={guardando}>Cancelar</DashButton>
          )}
          <DashButton onClick={() => void guardar()} disabled={!listo}>
            {guardando
              ? 'Guardando…'
              : editando
                ? 'Guardar cambios'
                : conSesiones && diaElegido
                  ? `Publicar en la sesión del ${fechaSesion(diaElegido).toLowerCase()}`
                  : 'Publicar'}
          </DashButton>
        </div>
      </section>

      <section aria-label="Mis entradas">
        <h2 className={styles.historialTitulo}>Mis entradas</h2>
        {cargando ? (
          <p className={styles.vacio}>Cargando…</p>
        ) : porDia.length === 0 ? (
          <p className={styles.vacio}>Todavía no has escrito ninguna.</p>
        ) : (
          porDia.map(([dia, lista]) => (
            <div key={dia} className={styles.dia}>
              <h3 className={styles.diaTitulo}>
                {fechaLargaDia(dia)}
                {dia === hoy && <span className={styles.hoy}>Hoy</span>}
              </h3>
              {temasDe.get(dia) && <p className={styles.diaTemas}>{temasDe.get(dia)}</p>}
              <ul className={styles.lista}>
                {lista.map((e) => {
                  const def = ESTADOS_HAPPINESS.find((s) => s.key === e.estado);
                  return (
                    <li key={e.id} className={`${styles.entrada} ${styles[e.estado]} ${borrador.id === e.id ? styles.enEdicion : ''}`}>
                      <div className={styles.entradaCabecera}>
                        <span className={styles.entradaEstado}>
                          <Icon name={def?.icono ?? 'sentiment_neutral'} size="sm" />
                          {def?.label ?? e.estado}
                        </span>
                        <span className={styles.entradaAcciones}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label="Editar"
                            title="Editar"
                            onClick={() => {
                              setBorrador({ id: e.id, estado: e.estado, texto: e.texto, dia: e.dia });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            <Icon name="edit" size="sm" />
                          </button>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label="Borrar"
                            title="Borrar"
                            onClick={() => void borrar(e)}
                          >
                            <Icon name="delete" size="sm" />
                          </button>
                        </span>
                      </div>
                      <p className={styles.entradaTexto}>{e.texto}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
