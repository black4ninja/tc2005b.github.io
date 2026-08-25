import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import Modal from '../../atoms/Modal/Modal';
import PreguntaProyector from '../../organisms/PreguntaProyector/PreguntaProyector';
import SelectorPregunta from '../../organisms/SelectorPregunta/SelectorPregunta';
import SelectorAlumno from '../../organisms/SelectorAlumno/SelectorAlumno';
import { formatearDuracion, repartirPreguntas, resumenPregunta } from '../../../../utils/preguntas';
import type {
  AlumnoConPregunta, CompetenciaEnBanco, DuracionConfig, Pregunta, PreguntaAsignacion,
} from '../../../../types/preguntas';
import styles from './PreguntasGrupoPage.module.css';

const API_BASE = '/api';
const SIN_COMPETENCIA = 'sin-competencia';

function mensajeDeError(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}

type Vista = 'alumnos' | 'preguntas';

/**
 * Roster de PREGUNTAS de un grupo: a quién le toca qué.
 *
 * La regla que manda sobre el diseño: **una pregunta por competencia y alumno**.
 * Cada competencia con banco es un hueco, y el filtro de competencia no es un
 * filtro sino un MODO: con «todas» se ve el mapa del grupo de un vistazo y con
 * una elegida se trabaja en ella (nota, proyectar, marcar como hecha).
 *
 * Repetir una pregunta está permitido —en el grupo y entre grupos—, así que el
 * reparto puede reciclar el banco y nadie se queda sin. Lo que sí se enseña es a
 * cuántos se la has puesto ya, para poder variar a propósito.
 *
 * De ahí la segunda vista, **Por pregunta**: leer el enunciado entero y decidir
 * a quién le va es el orden en que el profesor piensa cuando personaliza, y al
 * revés obligaba a abrir el banco en otra pestaña.
 */
export default function PreguntasGrupoPage() {
  const { id: grupoId } = useParams<{ id: string }>();
  const { sessionToken } = useAuth();

  const [habilitado, setHabilitado] = useState(true);
  const [alumnos, setAlumnos] = useState<AlumnoConPregunta[]>([]);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [competencias, setCompetencias] = useState<CompetenciaEnBanco[]>([]);
  const [duracion, setDuracion] = useState<DuracionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const [vista, setVista] = useState<Vista>('alumnos');
  const [competenciaActiva, setCompetenciaActiva] = useState<string | null>(null);
  const [soloSinAsignar, setSoloSinAsignar] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaPregunta, setBusquedaPregunta] = useState('');

  const [editandoDuracion, setEditandoDuracion] = useState(false);
  const [duracionBorrador, setDuracionBorrador] = useState('');

  // Hueco que se está llenando: alumno + competencia.
  const [eligiendoPara, setEligiendoPara] = useState<{ alumno: AlumnoConPregunta; hueco: string | null } | null>(null);
  // Camino inverso: pregunta elegida, falta el alumno.
  const [eligiendoAlumno, setEligiendoAlumno] = useState<Pregunta | null>(null);
  const [historialDe, setHistorialDe] = useState<AlumnoConPregunta | null>(null);
  const [historial, setHistorial] = useState<PreguntaAsignacion[]>([]);
  const [proyectando, setProyectando] = useState<number | null>(null);

  const headers = useMemo<Record<string, string>>(() => ({
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  }), [sessionToken]);

  const fetchTodo = useCallback(async () => {
    if (!grupoId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/preguntas`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('Error al cargar las preguntas del grupo');
      const data = await res.json() as {
        habilitado?: boolean;
        alumnos?: AlumnoConPregunta[];
        preguntas?: Pregunta[];
        competencias?: CompetenciaEnBanco[];
        duracion?: DuracionConfig;
      };
      setHabilitado(data.habilitado !== false);
      setAlumnos(data.alumnos ?? []);
      setPreguntas(data.preguntas ?? []);
      setCompetencias(data.competencias ?? []);
      setDuracion(data.duracion ?? null);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al cargar las preguntas del grupo'));
    } finally {
      setLoading(false);
    }
  }, [grupoId, sessionToken]);

  useEffect(() => { fetchTodo(); }, [fetchTodo]);

  const porId = useMemo(() => new Map(preguntas.map((p) => [p.id, p])), [preguntas]);

  /** Qué tiempo rige y de dónde sale. Ver el comentario del control. */
  const { duracionVigente, fuenteDuracion } = useMemo(() => {
    if (!duracion) return { duracionVigente: 180, fuenteDuracion: '' };
    if (duracion.grupo !== null) {
      return { duracionVigente: duracion.grupo, fuenteDuracion: 'de este grupo' };
    }
    const valores = new Set(duracion.materias.map((m) => m.duracionSegundos ?? duracion.porDefecto));
    if (valores.size <= 1) {
      const materia = duracion.materias[0];
      return {
        duracionVigente: [...valores][0] ?? duracion.porDefecto,
        fuenteDuracion: materia?.duracionSegundos != null
          ? `de ${materia.clave ?? materia.nombre ?? 'la materia'}`
          : 'por defecto',
      };
    }
    return { duracionVigente: duracion.porDefecto, fuenteDuracion: 'según cada materia' };
  }, [duracion]);

  /** Asignación de un alumno en un hueco concreto. */
  function asignacionDe(alumno: AlumnoConPregunta, hueco: string): PreguntaAsignacion | null {
    return alumno.asignaciones.find((a) => a.hueco === hueco) ?? null;
  }

  /** Huecos que hay que llenar: todos los de la competencia activa, o todos. */
  const huecosVisibles = useMemo(
    () => (competenciaActiva ? competencias.filter((c) => c.id === competenciaActiva) : competencias),
    [competencias, competenciaActiva],
  );

  /** A quién le falta algo de lo visible. */
  function leFalta(alumno: AlumnoConPregunta): boolean {
    return huecosVisibles.some((c) => !asignacionDe(alumno, c.id));
  }

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return alumnos.filter((a) => {
      if (soloSinAsignar && !leFalta(a)) return false;
      if (!texto) return true;
      return a.name.toLowerCase().includes(texto) || a.matricula.toLowerCase().includes(texto);
    });
    // `leFalta` depende de huecosVisibles, que ya está en las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnos, soloSinAsignar, busqueda, huecosVisibles]);

  const sinLlenar = useMemo(() => alumnos.filter(leFalta).length, [alumnos, huecosVisibles]);
  const totalHuecos = alumnos.length * huecosVisibles.length;
  const llenos = useMemo(
    () => alumnos.reduce((n, a) => n + huecosVisibles.filter((c) => asignacionDe(a, c.id)).length, 0),
    [alumnos, huecosVisibles],
  );

  /** Pares (alumno, asignación) proyectables, en el orden en que se ven. */
  const paraProyectar = useMemo(
    () => visibles.flatMap((alumno) => huecosVisibles
      .map((c) => asignacionDe(alumno, c.id))
      .filter((a): a is PreguntaAsignacion => !!a?.pregunta)
      .map((a) => ({ alumno, asignacion: a }))),
    [visibles, huecosVisibles],
  );

  async function asignar(pares: { alumnoId: string; preguntaId: string }[]) {
    if (pares.length === 0 || !grupoId) return;
    setError('');
    setAviso('');
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/preguntas/asignaciones`, {
        method: 'POST', headers, body: JSON.stringify({ asignaciones: pares }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'Error al asignar');
      }
      // Recarga entera y no parche local: asignar mueve el estado de OTRAS
      // preguntas (pasan a estar tomadas) y de otros grupos.
      await fetchTodo();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al asignar'));
      await fetchTodo();
    }
  }

  async function quitar(asignacionId: string) {
    if (!grupoId) return;
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/preguntas/asignaciones/${asignacionId}`,
        { method: 'DELETE', headers },
      );
      if (!res.ok) throw new Error('Error al quitar la asignación');
      await fetchTodo();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al quitar la asignación'));
      await fetchTodo();
    }
  }

  async function actualizar(asignacionId: string, cambios: { nota?: string; usada?: boolean }) {
    if (!grupoId) return;
    // Optimista: la nota se escribe letra a letra y el tic se pulsa en medio de
    // una entrevista; esperar al servidor para repintar se nota.
    setAlumnos((prev) => prev.map((a) => ({
      ...a,
      asignaciones: a.asignaciones.map((x) => (x.id === asignacionId ? { ...x, ...cambios } : x)),
    })));
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/preguntas/asignaciones/${asignacionId}`,
        { method: 'PUT', headers, body: JSON.stringify(cambios) },
      );
      if (!res.ok) throw new Error('Error al guardar el cambio');
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al guardar el cambio'));
      await fetchTodo();
    }
  }

  async function guardarDuracion() {
    const crudo = duracionBorrador.trim();
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/preguntas/configuracion`, {
        method: 'PUT',
        headers,
        // Vacío = quitar la anulación y volver al tiempo de la materia.
        body: JSON.stringify({ duracionSegundos: crudo === '' ? null : Number(crudo) }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'Error al guardar el tiempo');
      }
      setEditandoDuracion(false);
      await fetchTodo();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al guardar el tiempo'));
    }
  }

  async function abrirHistorial(alumno: AlumnoConPregunta) {
    setHistorialDe(alumno);
    setHistorial([]);
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/preguntas/alumnos/${alumno.id}`,
        { headers: { 'x-session-token': sessionToken ?? '' } },
      );
      if (!res.ok) return;
      const data = await res.json() as { historial?: PreguntaAsignacion[] };
      setHistorial(data.historial ?? []);
    } catch {
      // El historial es consulta: si falla, el modal se queda vacío y ya.
    }
  }

  /**
   * Reparto: a cada alumno sin pregunta en un hueco, una de esa competencia.
   *
   * `repartirPreguntas` agota el banco antes de reciclarlo, así que con más
   * preguntas que alumnos nadie repite, y con menos las repeticiones quedan lo
   * más espaciadas posible. Repetir está permitido, así que nadie se queda sin.
   */
  function repartir() {
    const pares: { alumnoId: string; preguntaId: string }[] = [];
    for (const competencia of huecosVisibles) {
      const pendientes = alumnos.filter((a) => !asignacionDe(a, competencia.id));
      const disponibles = preguntas.filter(
        (p) => !p.archivada && (p.competenciaId ?? SIN_COMPETENCIA) === competencia.id,
      );
      pares.push(...repartirPreguntas(pendientes.map((a) => a.id), disponibles.map((p) => p.id))
        .map((r) => ({ alumnoId: r.alumnoId, preguntaId: r.preguntaId })));
    }
    if (pares.length === 0) {
      setAviso('No hay huecos que llenar, o esas competencias no tienen preguntas en el banco.');
      return;
    }
    asignar(pares);
  }

  const preguntasDeVista = useMemo(() => {
    const q = busquedaPregunta.trim().toLowerCase();
    return preguntas
      .filter((p) => !p.archivada)
      .filter((p) => !competenciaActiva || (p.competenciaId ?? SIN_COMPETENCIA) === competenciaActiva)
      .filter((p) => !q
        || p.texto.toLowerCase().includes(q)
        || p.etiquetas.some((e) => e.includes(q))
        || (p.competencia?.competencia ?? '').toLowerCase().includes(q));
  }, [preguntas, competenciaActiva, busquedaPregunta]);

  if (loading) return <div className={styles.page}><p>Cargando...</p></div>;

  if (!habilitado) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Preguntas</h1>
        <div className={styles.apagado}>
          <Icon name="quiz" size="lg" />
          <p>Ninguna materia de este grupo tiene el módulo <strong>Preguntas</strong> encendido.</p>
          <p className={styles.hint}>
            Se enciende en <Link to="/admin/grupos">Grupos → Asignaciones</Link>, dentro de la materia
            que se evalúa. El banco se llena en Contenidos → la materia → Preguntas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Preguntas</h1>
          <p className={styles.subtitulo}>
            Una pregunta por competencia y alumno. Los alumnos no ven nada de esto y no afecta
            a su calificación.
          </p>
        </div>
        <div className={styles.headerLado}>
          {/* El tiempo es del módulo, no de cada pregunta: se ve y se ajusta una
              vez, aquí, y vale para todo el grupo. */}
          <div className={styles.duracion}>
            <Icon name="timer" size="sm" />
            {editandoDuracion ? (
              <>
                <input
                  className={styles.duracionInput}
                  type="number"
                  min={15}
                  max={3600}
                  autoFocus
                  value={duracionBorrador}
                  onChange={(e) => setDuracionBorrador(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') guardarDuracion();
                    if (e.key === 'Escape') setEditandoDuracion(false);
                  }}
                  placeholder={String(duracionVigente)}
                />
                <button className={styles.enlaceBtn} onClick={guardarDuracion}>Guardar</button>
                <button className={styles.enlaceBtn} onClick={() => setEditandoDuracion(false)}>Cancelar</button>
              </>
            ) : (
              <>
                <span>
                  Tiempo: <strong>{formatearDuracion(duracionVigente)}</strong>
                  {fuenteDuracion && <span className={styles.duracionFuente}> ({fuenteDuracion})</span>}
                </span>
                <button
                  className={styles.enlaceBtn}
                  onClick={() => {
                    setDuracionBorrador(duracion?.grupo == null ? '' : String(duracion.grupo));
                    setEditandoDuracion(true);
                  }}
                  title="Ajustar el tiempo solo para este grupo; vacío vuelve al de la materia"
                >
                  editar
                </button>
              </>
            )}
          </div>
          <span className={styles.contador}>{llenos} de {totalHuecos} asignadas</span>
        </div>
      </div>

      {error && <div className={styles.error} onClick={() => setError('')}>{error}</div>}
      {aviso && <div className={styles.aviso} onClick={() => setAviso('')}>{aviso}</div>}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${vista === 'alumnos' ? styles.tabActiva : ''}`}
          onClick={() => setVista('alumnos')}
        >
          <Icon name="group" size="sm" /> Por alumno
        </button>
        {/* El camino inverso: leer la pregunta entera y decidir a quién le va.
            Es el orden en que se piensa cuando se personaliza. */}
        <button
          className={`${styles.tab} ${vista === 'preguntas' ? styles.tabActiva : ''}`}
          onClick={() => setVista('preguntas')}
        >
          <Icon name="quiz" size="sm" /> Por pregunta
        </button>
      </div>

      {/* El filtro de competencia no es un filtro: es el MODO de trabajo, y por
          eso manda sobre las dos vistas y sobre lo que reparte el botón. */}
      <div className={styles.filtros}>
        <span className={styles.chipsTitulo}>Competencia:</span>
        <button
          className={`${styles.chip} ${competenciaActiva === null ? styles.chipActivo : ''}`}
          onClick={() => setCompetenciaActiva(null)}
        >
          todas
        </button>
        {competencias.map((c) => (
          <button
            key={c.id}
            className={`${styles.chip} ${competenciaActiva === c.id ? styles.chipActivo : ''}`}
            onClick={() => setCompetenciaActiva(competenciaActiva === c.id ? null : c.id)}
            title={`${c.total} preguntas en el banco de esta competencia`}
          >
            {c.nombre} <span className={styles.chipContador}>{c.total}</span>
          </button>
        ))}
      </div>

      {vista === 'alumnos' ? (
        <>
          <div className={styles.barra}>
            <div className={styles.filtrosIzq}>
              <input
                className={styles.buscador}
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar alumno..."
              />
              <label className={styles.check}>
                <input type="checkbox" checked={soloSinAsignar} onChange={(e) => setSoloSinAsignar(e.target.checked)} />
                <span>Solo a quien le falta</span>
              </label>
            </div>
            <div className={styles.acciones}>
              <DashButton
                variant="outline"
                onClick={repartir}
                disabled={sinLlenar === 0}
                title={competenciaActiva
                  ? 'Da una pregunta de esta competencia a cada alumno que no tenga'
                  : 'Da una pregunta de cada competencia a cada alumno que no tenga'}
              >
                Repartir al grupo ({sinLlenar})
              </DashButton>
              <DashButton
                onClick={() => setProyectando(0)}
                disabled={paraProyectar.length === 0}
                title="Abre la primera pregunta a pantalla completa; se avanza con ← →"
              >
                <Icon name="slideshow" size="sm" /> Proyectar
              </DashButton>
            </div>
          </div>

          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>{competenciaActiva ? 'Pregunta' : 'Preguntas por competencia'}</th>
                {competenciaActiva && <th>Nota para ti</th>}
                <th className={styles.colAcciones}>{competenciaActiva ? 'Acciones' : ''}</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr><td colSpan={4} className={styles.vacio}>No hay alumnos que mostrar.</td></tr>
              )}
              {visibles.map((alumno) => {
                const unica = competenciaActiva ? asignacionDe(alumno, competenciaActiva) : null;
                return (
                  <tr key={alumno.id} className={unica?.usada ? styles.filaUsada : ''}>
                    <td>
                      <span className={styles.alumnoNombre}>{alumno.name}</span>
                      <span className={styles.alumnoMatricula}>{alumno.matricula}</span>
                    </td>

                    {competenciaActiva ? (
                      <td>
                        <button
                          className={`${styles.celdaPregunta} ${unica ? '' : styles.celdaVacia}`}
                          onClick={() => setEligiendoPara({ alumno, hueco: competenciaActiva })}
                          title={unica ? 'Cambiar la pregunta' : 'Elegir pregunta'}
                        >
                          {unica?.pregunta ? (
                            <>
                              <span className={styles.preguntaTitulo}>
                                {resumenPregunta(unica.pregunta.texto, 70)}
                              </span>
                              {unica.pregunta.archivada && (
                                <span className={styles.archivadaTag} title="Esta pregunta ya no está en el banco">archivada</span>
                              )}
                            </>
                          ) : (
                            <span className={styles.sinPregunta}>Sin asignar</span>
                          )}
                        </button>
                      </td>
                    ) : (
                      // Vista de conjunto: un chip por hueco. Sirve para ver de
                      // un vistazo a quién le falta qué, no para trabajar.
                      <td>
                        <div className={styles.chipsHuecos}>
                          {competencias.map((c) => {
                            const a = asignacionDe(alumno, c.id);
                            return (
                              <button
                                key={c.id}
                                className={`${styles.hueco} ${a ? styles.huecoLleno : ''}`}
                                onClick={() => setEligiendoPara({ alumno, hueco: c.id })}
                                title={a?.pregunta ? a.pregunta.texto : `Sin pregunta de ${c.nombre}`}
                              >
                                <span className={styles.huecoNombre}>{c.nombre}</span>
                                {a ? <Icon name="check" size="sm" /> : <Icon name="add" size="sm" />}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}

                    {competenciaActiva && (
                      <td>
                        <NotaInline
                          key={unica?.id ?? 'sin'}
                          valor={unica?.nota ?? ''}
                          deshabilitado={!unica}
                          onGuardar={(nota) => unica && actualizar(unica.id, { nota })}
                        />
                      </td>
                    )}

                    <td className={styles.colAcciones}>
                      {competenciaActiva ? (
                        <>
                          <button
                            className={styles.iconBtn}
                            disabled={!unica?.pregunta}
                            onClick={() => {
                              const i = paraProyectar.findIndex((x) => x.asignacion.id === unica?.id);
                              if (i >= 0) setProyectando(i);
                            }}
                            title="Proyectar esta pregunta"
                          >
                            <Icon name="slideshow" size="sm" />
                          </button>
                          <button
                            className={`${styles.iconBtn} ${unica?.usada ? styles.iconBtnOn : ''}`}
                            disabled={!unica}
                            onClick={() => unica && actualizar(unica.id, { usada: !unica.usada })}
                            title={unica?.usada ? 'Marcar como pendiente' : 'Marcar como ya preguntada'}
                          >
                            <Icon name="check_circle" size="sm" />
                          </button>
                          <button
                            className={styles.iconBtn}
                            onClick={() => abrirHistorial(alumno)}
                            title={`Historial (${alumno.totalAsignaciones})`}
                          >
                            <Icon name="history" size="sm" />
                          </button>
                          <button
                            className={styles.iconBtn}
                            disabled={!unica}
                            onClick={() => unica && quitar(unica.id)}
                            title="Quitar la asignación y devolver la pregunta al banco"
                          >
                            <Icon name="close" size="sm" />
                          </button>
                        </>
                      ) : (
                        <button
                          className={styles.iconBtn}
                          onClick={() => abrirHistorial(alumno)}
                          title={`Historial (${alumno.totalAsignaciones})`}
                        >
                          <Icon name="history" size="sm" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : (
        <>
          <div className={styles.barra}>
            <input
              className={styles.buscador}
              type="search"
              value={busquedaPregunta}
              onChange={(e) => setBusquedaPregunta(e.target.value)}
              placeholder="Buscar en las preguntas..."
            />
            <span className={styles.contador}>
              {preguntasDeVista.filter((p) => !p.uso).length} sin usar de {preguntasDeVista.length}
            </span>
          </div>

          <div className={styles.listaPreguntas}>
            {preguntasDeVista.length === 0 && (
              <p className={styles.vacio}>No hay preguntas que mostrar.</p>
            )}
            {preguntasDeVista.map((p) => (
              <article key={p.id} className={styles.tarjeta}>
                <div className={styles.tarjetaMeta}>
                  {p.competencia && <span className={styles.competenciaTag}>{p.competencia.competencia}</span>}
                  {p.etiquetas.map((e) => <span key={e} className={styles.chipEtiqueta}>{e}</span>)}
                  {p.uso ? (
                    <span className={styles.tomadaTag} title={p.uso.quienes.join('\n')}>
                      <Icon name="person" size="sm" />
                      ya en {p.uso.veces} alumno{p.uso.veces === 1 ? '' : 's'}
                      {p.uso.algunaUsada && ' · preguntada'}
                    </span>
                  ) : (
                    <span className={styles.libreTag}>sin usar</span>
                  )}
                </div>
                {/* El enunciado entero: es el motivo de esta vista. */}
                <p className={styles.tarjetaTexto}>{p.texto}</p>
                <div className={styles.tarjetaAcciones}>
                  <button className={styles.enlaceBtn} onClick={() => setEligiendoAlumno(p)}>
                    Asignar a un alumno…
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {/* Alumno → pregunta */}
      {eligiendoPara && (
        <SelectorPregunta
          preguntas={preguntas.filter((p) => !p.archivada)}
          competencias={competencias}
          competenciaInicial={eligiendoPara.hueco}
          titulo={`Pregunta para ${eligiendoPara.alumno.name}`}
          onElegir={(p) => {
            asignar([{ alumnoId: eligiendoPara.alumno.id, preguntaId: p.id }]);
            setEligiendoPara(null);
          }}
          onCerrar={() => setEligiendoPara(null)}
        />
      )}

      {/* Pregunta → alumno */}
      {eligiendoAlumno && (
        <SelectorAlumno
          alumnos={alumnos}
          titulo="¿A quién se la asignas?"
          // A quien ya tenga una de esta competencia se le sustituye: se avisa en
          // la fila en vez de esconderlo, porque a veces es justo lo que se busca.
          yaTienen={new Set(
            alumnos
              .filter((a) => asignacionDe(a, eligiendoAlumno.competenciaId ?? SIN_COMPETENCIA))
              .map((a) => a.id),
          )}
          onElegir={(alumno) => {
            asignar([{ alumnoId: alumno.id, preguntaId: eligiendoAlumno.id }]);
            setEligiendoAlumno(null);
          }}
          onCerrar={() => setEligiendoAlumno(null)}
        />
      )}

      <Modal
        isOpen={historialDe !== null}
        onClose={() => setHistorialDe(null)}
        title={historialDe ? `Historial — ${historialDe.name}` : 'Historial'}
      >
        {historial.length === 0 ? (
          <p className={styles.hint}>Sin asignaciones previas.</p>
        ) : (
          <ul className={styles.historial}>
            {historial.map((a) => (
              <li key={a.id}>
                <span className={styles.historialFecha}>
                  {new Date(a.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span>{a.pregunta ? resumenPregunta(a.pregunta.texto, 70) : '—'}</span>
                {a.pregunta?.competencia && (
                  <span className={styles.competenciaTag}>{a.pregunta.competencia}</span>
                )}
                {a.usada && <span className={styles.historialUsada}>preguntada</span>}
                {a.nota && <span className={styles.historialNota}>{a.nota}</span>}
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {proyectando !== null && paraProyectar[proyectando] && (() => {
        const { alumno, asignacion } = paraProyectar[proyectando];
        const pregunta = asignacion.pregunta ? porId.get(asignacion.pregunta.id) : null;
        if (!pregunta) return null;
        return (
          <PreguntaProyector
            pregunta={pregunta}
            duracionSegundos={pregunta.duracionSegundos ?? duracionVigente}
            alumno={{ name: alumno.name, matricula: alumno.matricula }}
            posicion={{ indice: proyectando + 1, total: paraProyectar.length }}
            onAnterior={proyectando > 0 ? () => setProyectando(proyectando - 1) : null}
            onSiguiente={proyectando < paraProyectar.length - 1 ? () => setProyectando(proyectando + 1) : null}
            onSalir={() => setProyectando(null)}
          />
        );
      })()}
    </div>
  );
}

/**
 * Nota por alumno. Guarda al salir del campo y no en cada tecla: es un texto
 * corto que se escribe de una sentada, y una petición por pulsación llenaría la
 * red de escrituras a medio escribir.
 */
function NotaInline({ valor, deshabilitado, onGuardar }: {
  valor: string;
  deshabilitado: boolean;
  onGuardar: (nota: string) => void;
}) {
  const [texto, setTexto] = useState(valor);
  const inicial = useRef(valor);

  useEffect(() => { setTexto(valor); inicial.current = valor; }, [valor]);

  return (
    <input
      className={styles.nota}
      type="text"
      value={texto}
      disabled={deshabilitado}
      placeholder={deshabilitado ? '' : 'p. ej. insistir en el conflicto…'}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => { if (texto !== inicial.current) { inicial.current = texto; onGuardar(texto); } }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}
