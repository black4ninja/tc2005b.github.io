import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import Modal from '../../atoms/Modal/Modal';
import PreguntaProyector from '../../organisms/PreguntaProyector/PreguntaProyector';
import SelectorPregunta from '../../organisms/SelectorPregunta/SelectorPregunta';
import SelectorAlumno from '../../organisms/SelectorAlumno/SelectorAlumno';
import {
  aplicarAsignaciones, ajustarUso, formatearDuracion, quitarAsignaciones, repartirPreguntas, resumenPregunta,
} from '../../../../utils/preguntas';
import type {
  AlumnoConPregunta, CompetenciaEnBanco, DuracionConfig, Pregunta, PreguntaAsignacion,
} from '../../../../types/preguntas';
import styles from './PreguntasGrupoPage.module.css';

const API_BASE = '/api';
const SIN_COMPETENCIA = 'sin-competencia';
/** Espejo de `MAX_INTENTOS` del API: hasta dos entrevistas por competencia. */
const MAX_INTENTOS = 2;

function mensajeDeError(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}

type Vista = 'alumnos' | 'preguntas';

/**
 * Roster de PREGUNTAS de un grupo: a quién le toca qué.
 *
 * La regla que manda sobre el diseño: **una pregunta por competencia, alumno e
 * intento**. Cada competencia admite hasta dos entrevistas, así que cada alumno
 * tiene `competencias × 2` huecos.
 *
 * Competencia e intento no son filtros: son el MODO de trabajo. Con «todas» se
 * ve el mapa del grupo de un vistazo —cuántos huecos lleva llenos cada alumno en
 * cada competencia— y al elegir competencia + intento se trabaja en ese hueco
 * concreto (nota, proyectar, marcar como hecha). Sin ese corte, una tabla con
 * una columna por competencia y por intento no cabe en la pantalla.
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
  const [intentoActivo, setIntentoActivo] = useState(1);
  const [soloSinAsignar, setSoloSinAsignar] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaPregunta, setBusquedaPregunta] = useState('');

  const [editandoDuracion, setEditandoDuracion] = useState(false);
  const [duracionBorrador, setDuracionBorrador] = useState('');

  // Hueco que se está llenando: alumno + competencia.
  const [eligiendoPara, setEligiendoPara] = useState<
    { alumno: AlumnoConPregunta; competenciaId: string; intento: number } | null
  >(null);
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

  /** Asignación de un alumno en un hueco concreto (competencia + intento). */
  function asignacionDe(
    alumno: AlumnoConPregunta,
    competenciaId: string,
    intento: number,
  ): PreguntaAsignacion | null {
    return alumno.asignaciones.find(
      (a) => a.hueco === `${competenciaId}::${intento}`,
    ) ?? null;
  }

  /** Cuántos de los dos intentos lleva llenos en esa competencia. */
  function llenosEn(alumno: AlumnoConPregunta, competenciaId: string): number {
    let n = 0;
    for (let i = 1; i <= MAX_INTENTOS; i += 1) if (asignacionDe(alumno, competenciaId, i)) n += 1;
    return n;
  }

  /** El primer intento sin pregunta, o el último si están todos llenos. */
  function primerHuecoLibre(alumno: AlumnoConPregunta, competenciaId: string): number {
    for (let i = 1; i <= MAX_INTENTOS; i += 1) {
      if (!asignacionDe(alumno, competenciaId, i)) return i;
    }
    return MAX_INTENTOS;
  }

  /** Huecos que hay que llenar: todos los de la competencia activa, o todos. */
  const huecosVisibles = useMemo(
    () => (competenciaActiva ? competencias.filter((c) => c.id === competenciaActiva) : competencias),
    [competencias, competenciaActiva],
  );

  /**
   * A quién le falta algo de lo visible. Con «todas» mira los dos intentos de
   * cada competencia; con una elegida, solo el intento en el que se trabaja.
   */
  function leFalta(alumno: AlumnoConPregunta): boolean {
    if (competenciaActiva) return !asignacionDe(alumno, competenciaActiva, intentoActivo);
    return huecosVisibles.some(
      (c) => llenosEn(alumno, c.id) < MAX_INTENTOS,
    );
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sinLlenar = useMemo(() => alumnos.filter(leFalta).length, [alumnos, huecosVisibles, competenciaActiva, intentoActivo]);
  const totalHuecos = alumnos.length * huecosVisibles.length * (competenciaActiva ? 1 : MAX_INTENTOS);
  const llenos = useMemo(
    () => alumnos.reduce((n, a) => n + (competenciaActiva
      ? (asignacionDe(a, competenciaActiva, intentoActivo) ? 1 : 0)
      : huecosVisibles.reduce((m, c) => m + llenosEn(a, c.id), 0)), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alumnos, huecosVisibles, competenciaActiva, intentoActivo],
  );

  /** Pares (alumno, asignación) proyectables, en el orden en que se ven. */
  const paraProyectar = useMemo(
    () => visibles.flatMap((alumno) => huecosVisibles
      .flatMap((c) => (competenciaActiva
        ? [asignacionDe(alumno, c.id, intentoActivo)]
        : Array.from({ length: MAX_INTENTOS }, (_, i) => asignacionDe(alumno, c.id, i + 1))))
      .filter((a): a is PreguntaAsignacion => !!a?.pregunta)
      .map((a) => ({ alumno, asignacion: a }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibles, huecosVisibles, competenciaActiva, intentoActivo],
  );

  /**
   * Asigna y pinta EN EL ACTO, confirmando cuando el servidor responde.
   *
   * Antes esto recargaba la pantalla entera, y con razón: mientras una pregunta
   * solo podía ser de un alumno, asignar cambiaba el estado de las demás. Ya no
   * es así, y el precio del refresco se veía —la tabla parpadeaba y el sitio
   * donde estabas trabajando se perdía en cada clic—.
   *
   * Ahora la fila cambia inmediatamente, marcada como pendiente, y el servidor
   * solo confirma o revierte. Si falla, la tabla vuelve exactamente a como
   * estaba: se guarda una foto antes de tocar nada.
   */
  async function asignar(pares: { alumnoId: string; preguntaId: string; intento: number }[]) {
    if (pares.length === 0 || !grupoId) return;
    setError('');
    setAviso('');

    const foto = alumnos;
    const fotoPreguntas = preguntas;

    // Optimista: se fabrica la asignación con lo que el cliente ya sabe de la
    // pregunta. El id temporal se sustituye por el real al confirmar.
    const provisionales = pares.map((par, i) => {
      const p = porId.get(par.preguntaId);
      const asignacion: PreguntaAsignacion = {
        id: `pendiente-${i}-${par.alumnoId}`,
        alumnoId: par.alumnoId,
        intento: par.intento,
        hueco: `${p?.competenciaId ?? SIN_COMPETENCIA}::${par.intento}`,
        pregunta: p
          ? {
            id: p.id,
            texto: p.texto,
            etiquetas: p.etiquetas,
            competencia: p.competencia?.competencia ?? null,
            competenciaId: p.competenciaId,
            archivada: p.archivada,
          }
          : null,
        nota: '',
        usada: false,
        createdAt: new Date().toISOString(),
        pendiente: true,
      };
      return asignacion;
    });

    setAlumnos((prev) => aplicarAsignaciones(prev, provisionales));
    setPreguntas((prev) => ajustarUso(prev, pares.map((p) => p.preguntaId), []));

    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/preguntas/asignaciones`, {
        method: 'POST', headers, body: JSON.stringify({ asignaciones: pares }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'Error al asignar');
      }
      const data = await res.json() as { asignaciones?: PreguntaAsignacion[]; retiradas?: string[] };
      // Confirmado: entran las reales (con su id) y salen las provisionales.
      setAlumnos((prev) => aplicarAsignaciones(
        quitarAsignaciones(prev, provisionales.map((a) => a.id)),
        data.asignaciones ?? [],
      ));
      // Lo que el servidor retiró al sustituir deja de contar como uso.
      const retiradas = data.retiradas ?? [];
      if (retiradas.length > 0) {
        const preguntasRetiradas = foto.flatMap((a) => a.asignaciones)
          .filter((a) => retiradas.includes(a.id))
          .map((a) => a.pregunta?.id)
          .filter((id): id is string => !!id);
        setPreguntas((prev) => ajustarUso(prev, [], preguntasRetiradas));
      }
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al asignar'));
      setAlumnos(foto);
      setPreguntas(fotoPreguntas);
    }
  }

  async function quitar(asignacion: PreguntaAsignacion) {
    if (!grupoId) return;
    const foto = alumnos;
    const fotoPreguntas = preguntas;
    setAlumnos((prev) => quitarAsignaciones(prev, [asignacion.id]));
    setPreguntas((prev) => ajustarUso(prev, [], asignacion.pregunta ? [asignacion.pregunta.id] : []));
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/preguntas/asignaciones/${asignacion.id}`,
        { method: 'DELETE', headers },
      );
      if (!res.ok) throw new Error('Error al quitar la asignación');
      // Quitar la vigente puede destapar la anterior del mismo hueco: el
      // servidor dice qué queda, y así no hay que recargar para averiguarlo.
      const data = await res.json() as { vigente?: PreguntaAsignacion | null };
      if (data.vigente) setAlumnos((prev) => aplicarAsignaciones(prev, [data.vigente!]));
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al quitar la asignación'));
      setAlumnos(foto);
      setPreguntas(fotoPreguntas);
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
    const pares: { alumnoId: string; preguntaId: string; intento: number }[] = [];
    // Con una competencia elegida se reparte SU intento; con «todas», los dos de
    // cada competencia, y el segundo después del primero para que ya sepa qué le
    // tocó al alumno y no se lo repita.
    const intentos = competenciaActiva
      ? [intentoActivo]
      : Array.from({ length: MAX_INTENTOS }, (_, i) => i + 1);

    for (const competencia of huecosVisibles) {
      const disponibles = preguntas.filter(
        (p) => !p.archivada && (p.competenciaId ?? SIN_COMPETENCIA) === competencia.id,
      );
      if (disponibles.length === 0) continue;
      for (const intento of intentos) {
        const pendientes = alumnos.filter((a) => !asignacionDe(a, competencia.id, intento));
        const reparto = repartirPreguntas(
          pendientes.map((a) => a.id),
          disponibles.map((p) => p.id),
        );
        for (const r of reparto) {
          // Repetirle a un alumno la MISMA pregunta en su segundo intento no
          // evalúa nada: se le busca otra del montón, y solo si el banco tiene
          // una sola pregunta se deja pasar.
          const alumno = alumnos.find((a) => a.id === r.alumnoId);
          const yaLaTiene = !!alumno && Array.from({ length: MAX_INTENTOS }, (_, i) => i + 1)
            .some((otro) => asignacionDe(alumno, competencia.id, otro)?.pregunta?.id === r.preguntaId)
            || pares.some((x) => x.alumnoId === r.alumnoId && x.preguntaId === r.preguntaId);
          let preguntaId = r.preguntaId;
          if (yaLaTiene && disponibles.length > 1) {
            const otra = disponibles.find((p) => p.id !== r.preguntaId
              && !pares.some((x) => x.alumnoId === r.alumnoId && x.preguntaId === p.id));
            if (otra) preguntaId = otra.id;
          }
          pares.push({ alumnoId: r.alumnoId, preguntaId, intento });
        }
      }
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
            Una pregunta por competencia e intento: cada competencia admite hasta {MAX_INTENTOS}{' '}
            entrevistas. Los alumnos no ven nada de esto y no afecta a su calificación.
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

        {/* El intento solo tiene sentido dentro de una competencia: con «todas»
            la tabla enseña los dos a la vez. */}
        {competenciaActiva && (
          <span className={styles.intentos}>
            <span className={styles.chipsTitulo}>Intento:</span>
            {Array.from({ length: MAX_INTENTOS }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={`${styles.chip} ${intentoActivo === n ? styles.chipActivo : ''}`}
                onClick={() => setIntentoActivo(n)}
                title={n === 1 ? 'Primera entrevista' : 'Segunda oportunidad'}
              >
                {n}.º
              </button>
            ))}
          </span>
        )}
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
                  ? `Da una pregunta de esta competencia a cada alumno sin ${intentoActivo}.º intento`
                  : 'Llena todos los huecos vacíos: cada competencia y cada intento'}
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
                <th>{competenciaActiva ? `Pregunta · ${intentoActivo}.º intento` : 'Intentos por competencia'}</th>
                {competenciaActiva && <th>Nota para ti</th>}
                <th className={styles.colAcciones}>{competenciaActiva ? 'Acciones' : ''}</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr><td colSpan={4} className={styles.vacio}>No hay alumnos que mostrar.</td></tr>
              )}
              {visibles.map((alumno) => {
                const unica = competenciaActiva
                  ? asignacionDe(alumno, competenciaActiva, intentoActivo)
                  : null;
                return (
                  <tr key={alumno.id} className={unica?.usada ? styles.filaUsada : ''}>
                    <td>
                      <span className={styles.alumnoNombre}>{alumno.name}</span>
                      <span className={styles.alumnoMatricula}>{alumno.matricula}</span>
                    </td>

                    {competenciaActiva ? (
                      <td>
                        <button
                          className={`${styles.celdaPregunta} ${unica ? '' : styles.celdaVacia} ${unica?.pendiente ? styles.pendiente : ''}`}
                          onClick={() => setEligiendoPara({
                            alumno, competenciaId: competenciaActiva, intento: intentoActivo,
                          })}
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
                              {unica.pendiente && (
                                <span className={styles.guardando} title="Guardando…">
                                  <Icon name="sync" size="sm" />
                                </span>
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
                            const llenos = llenosEn(alumno, c.id);
                            const libre = primerHuecoLibre(alumno, c.id);
                            const completa = llenos === MAX_INTENTOS;
                            const guardando = alumno.asignaciones.some(
                              (a) => a.pendiente && a.hueco?.startsWith(`${c.id}::`),
                            );
                            return (
                              <button
                                key={c.id}
                                className={`${styles.hueco} ${llenos > 0 ? styles.huecoLleno : ''} ${completa ? styles.huecoCompleto : ''} ${guardando ? styles.pendiente : ''}`}
                                // Un clic aquí llena el PRIMER intento libre; para
                                // trabajar uno concreto se entra por su modo.
                                onClick={() => setEligiendoPara({
                                  alumno, competenciaId: c.id, intento: libre,
                                })}
                                title={completa
                                  ? `${c.nombre}: los ${MAX_INTENTOS} intentos asignados`
                                  : `${c.nombre}: asignar el ${libre}.º intento`}
                              >
                                <span className={styles.huecoNombre}>{c.nombre}</span>
                                <span className={styles.huecoCuenta}>{llenos}/{MAX_INTENTOS}</span>
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
                            disabled={!unica || unica.pendiente}
                            onClick={() => unica && quitar(unica)}
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
          competenciaInicial={eligiendoPara.competenciaId}
          titulo={`Pregunta para ${eligiendoPara.alumno.name} · ${eligiendoPara.intento}.º intento`}
          // Las que ese alumno ya tiene en el otro intento de esta competencia:
          // repetírselas no evalúa nada, así que se marcan.
          yaDelAlumno={new Set(
            eligiendoPara.alumno.asignaciones
              .filter((a) => a.hueco?.startsWith(`${eligiendoPara.competenciaId}::`))
              .map((a) => a.pregunta?.id)
              .filter((id): id is string => !!id),
          )}
          onElegir={(p) => {
            asignar([{
              alumnoId: eligiendoPara.alumno.id,
              preguntaId: p.id,
              intento: eligiendoPara.intento,
            }]);
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
              .filter((a) => llenosEn(a, eligiendoAlumno.competenciaId ?? SIN_COMPETENCIA) >= MAX_INTENTOS)
              .map((a) => a.id),
          )}
          onElegir={(alumno) => {
            // Cae en el primer intento libre de esa competencia; si los dos están
            // ocupados, sustituye el último.
            asignar([{
              alumnoId: alumno.id,
              preguntaId: eligiendoAlumno.id,
              intento: primerHuecoLibre(alumno, eligiendoAlumno.competenciaId ?? SIN_COMPETENCIA),
            }]);
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
                <span className={styles.historialIntento}>{a.intento}.º</span>
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
