import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import Modal from '../../atoms/Modal/Modal';
import SelectorPregunta from '../../organisms/SelectorPregunta/SelectorPregunta';
import SelectorAlumno from '../../organisms/SelectorAlumno/SelectorAlumno';
import {
  aplicarAsignaciones, ajustarUso, faseProyeccion, formatearDuracion, quitarAsignaciones,
  repartirPreguntas, resumenPregunta,
} from '../../../../utils/preguntas';
import type {
  AlumnoConPregunta, CompetenciaEnBanco, DuracionConfig, EstadoProyeccion, FaseProyeccion,
  Pregunta, PreguntaAsignacion, Proyeccion,
} from '../../../../types/preguntas';
import styles from './PreguntasGrupoPage.module.css';

const API_BASE = '/api';
const SIN_COMPETENCIA = 'sin-competencia';
/** Espejo de `MAX_INTENTOS` del API: hasta dos entrevistas por competencia. */
const MAX_INTENTOS = 2;
/**
 * Cada cuánto se relee lo que hay proyectado. Más lento que en la pantalla
 * proyectada porque aquí el panel es quien MANDA: sondea para no mentir si el
 * profesor abrió el panel en dos sitios, no para enterarse de lo suyo.
 */
const PERIODO_SONDEO = 2500;
/** Cada cuánto se repinta el reloj del mando. */
const PERIODO_RELOJ = 250;

function mensajeDeError(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}

type Vista = 'alumnos' | 'preguntas';

/** Cómo se llama cada fase en el mando. En la pantalla proyectada no se escribe. */
const ETIQUETA_FASE: Record<FaseProyeccion, string> = {
  'sin-pregunta': 'Sin pregunta',
  espera: 'Por iniciar',
  corriendo: 'En curso',
  // El reloj ya está a cero pero la pregunta sigue puesta unos segundos.
  gracia: 'Se acabó el tiempo',
  finalizada: 'Finalizada',
  detenida: 'Detenida',
};

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

  /**
   * Cuántos guardados hay en vuelo. Es un contador y no un booleano porque
   * repartir manda uno solo pero el profesor puede encadenar clics, y con un
   * booleano el primero en volver desbloquearía mientras el segundo sigue.
   *
   * Mientras haya alguno, el selector no admite clics: dos altas solapadas
   * calculan su hueco con un estado que el servidor todavía no ha visto, y lo
   * que queda guardado no es lo que se ve.
   */
  const [guardando, setGuardando] = useState(0);
  const [editandoDuracion, setEditandoDuracion] = useState(false);
  const [duracionBorrador, setDuracionBorrador] = useState('');

  // Hueco que se está llenando: alumno + competencia.
  // Se guarda el ID y no el alumno: el modal se queda abierto mientras se
  // asigna, así que tiene que repintarse con lo que el alumno tiene AHORA y no
  // con la copia de cuando se abrió.
  const [eligiendoPara, setEligiendoPara] = useState<
    { alumnoId: string; competenciaId: string; intentoFijo: number | null } | null
  >(null);
  // Camino inverso: pregunta elegida, falta el alumno.
  const [eligiendoAlumno, setEligiendoAlumno] = useState<Pregunta | null>(null);
  const [historialDe, setHistorialDe] = useState<AlumnoConPregunta | null>(null);
  const [historial, setHistorial] = useState<PreguntaAsignacion[]>([]);
  /**
   * Lo que hay en la pantalla proyectada. El panel es el MANDO: escribe aquí y
   * la otra pantalla —que suele estar en otro aparato— lo lee del servidor.
   */
  const [proyeccion, setProyeccion] = useState<Proyeccion | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  /** `serverNow - Date.now()`: el reloj del mando no es el del servidor. */
  const desfaseRef = useRef(0);
  /** La pestaña proyectada, para volver a ella en vez de abrir otra. */
  const ventanaRef = useRef<Window | null>(null);

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

  /** La URL de la pantalla proyectada. Se abre aquí o se manda al iPad. */
  const urlProyeccion = `${window.location.origin}/admin/grupos/${grupoId}/proyeccion`;

  const leerProyeccion = useCallback(async () => {
    if (!grupoId) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/preguntas/proyeccion`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) return;
      const data = await res.json() as { proyeccion?: Proyeccion; serverNow?: string };
      if (data.serverNow) desfaseRef.current = new Date(data.serverNow).getTime() - Date.now();
      setProyeccion(data.proyeccion ?? null);
    } catch {
      // El mando sigue funcionando sin esto: lo que manda se guarda igual y la
      // respuesta del PUT trae el estado. Sondear es solo para no mentir.
    }
  }, [grupoId, sessionToken]);

  useEffect(() => {
    leerProyeccion();
    const id = window.setInterval(leerProyeccion, PERIODO_SONDEO);
    return () => window.clearInterval(id);
  }, [leerProyeccion]);

  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), PERIODO_RELOJ);
    return () => window.clearInterval(id);
  }, []);

  /**
   * Manda un cambio a la pantalla proyectada.
   *
   * La respuesta trae el estado ya resuelto, así que el mando se pinta con lo
   * que el servidor guardó y no con lo que creía haber mandado: si dos panelistas
   * pulsan a la vez, gana el servidor y los dos ven lo mismo.
   */
  async function proyectar(cambio: { asignacionId?: string | null; estado?: EstadoProyeccion }) {
    if (!grupoId) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/preguntas/proyeccion`, {
        method: 'PUT', headers, body: JSON.stringify(cambio),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'Error al cambiar la proyección');
      }
      const data = await res.json() as { proyeccion?: Proyeccion; serverNow?: string };
      if (data.serverNow) desfaseRef.current = new Date(data.serverNow).getTime() - Date.now();
      setProyeccion(data.proyeccion ?? null);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al cambiar la proyección'));
    }
  }

  /**
   * Abre —o trae al frente— la pestaña proyectada.
   *
   * Con nombre de ventana a propósito: pulsar «Proyectar» dos veces tiene que
   * llevar a la misma pantalla, no dejar dos abiertas peleándose por el cañón.
   */
  function abrirPantalla() {
    const abierta = ventanaRef.current;
    if (abierta && !abierta.closed) { abierta.focus(); return; }
    ventanaRef.current = window.open(urlProyeccion, `proyeccion-${grupoId}`);
  }

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

  /** Dónde cae lo proyectado dentro de la lista que el profesor está viendo. */
  const indiceProyectado = useMemo(
    () => paraProyectar.findIndex((x) => x.asignacion.id === proyeccion?.asignacionId),
    [paraProyectar, proyeccion],
  );

  /**
   * En qué punto está la pantalla proyectada. Sale de la MISMA función pura que
   * usa el proyector, con el reloj corregido: el mando enseña el número que se
   * está viendo en la otra pantalla, no una aproximación suya.
   */
  const enPantalla = proyeccion ? faseProyeccion(proyeccion, ahora + desfaseRef.current) : null;

  /** Salta a la pregunta de al lado en el orden en que se ve la tabla. */
  function moverProyeccion(paso: number) {
    if (paraProyectar.length === 0) return;
    const desde = indiceProyectado < 0 ? (paso > 0 ? -1 : 0) : indiceProyectado;
    const destino = Math.min(paraProyectar.length - 1, Math.max(0, desde + paso));
    const siguiente = paraProyectar[destino];
    if (siguiente && siguiente.asignacion.id !== proyeccion?.asignacionId) {
      // Sin `estado`: cambiar de alumno reinicia el reloj en el servidor.
      proyectar({ asignacionId: siguiente.asignacion.id });
    }
  }

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
    setGuardando((n) => n + 1);

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
    } finally {
      setGuardando((n) => n - 1);
    }
  }

  async function quitar(asignacion: PreguntaAsignacion) {
    if (!grupoId) return;
    const foto = alumnos;
    const fotoPreguntas = preguntas;
    setAlumnos((prev) => quitarAsignaciones(prev, [asignacion.id]));
    setPreguntas((prev) => ajustarUso(prev, [], asignacion.pregunta ? [asignacion.pregunta.id] : []));
    setGuardando((n) => n + 1);
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
    } finally {
      setGuardando((n) => n - 1);
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

  /**
   * A quién le ha tocado ya cada pregunta EN ESTE GRUPO.
   *
   * El `uso` que trae el banco cuenta todos los grupos en curso; al repartir lo
   * que hace falta es lo de casa. Además sale del mismo estado que la tabla, así
   * que la cuenta se mueve con el clic y no cuando conteste el servidor.
   */
  const asignadosPorPregunta = useMemo(() => {
    const mapa = new Map<string, AlumnoConPregunta[]>();
    for (const alumno of alumnos) {
      // Un alumno puede llevar la misma pregunta en sus dos intentos: cuenta una
      // vez, que lo que se enseña son ALUMNOS, no asignaciones.
      const suyas = new Set(
        alumno.asignaciones.map((a) => a.pregunta?.id).filter((id): id is string => !!id),
      );
      for (const id of suyas) {
        const lista = mapa.get(id) ?? [];
        lista.push(alumno);
        mapa.set(id, lista);
      }
    }
    return mapa;
  }, [alumnos]);

  const preguntasDeVista = useMemo(() => {
    const q = busquedaPregunta.trim().toLowerCase();
    return preguntas
      .filter((p) => !p.archivada)
      .filter((p) => !competenciaActiva || (p.competenciaId ?? SIN_COMPETENCIA) === competenciaActiva)
      .filter((p) => !q
        || p.texto.toLowerCase().includes(q)
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

      {/* El MANDO. La proyección ya no es un overlay de esta pestaña: vive en
          otra —el iPad, el cañón— y desde aquí se dirige. Por eso esta barra
          está en las dos vistas: es el estado de la sesión, no de una lista. */}
      {proyeccion?.asignacionId && enPantalla && (
        <div className={styles.mando}>
          <div className={styles.mandoQuien}>
            <span className={styles.mandoNombre}>{proyeccion.alumno?.name}</span>
            <span className={styles.mandoCompetencia}>
              {proyeccion.competencia ?? 'Sin competencia'}
              {proyeccion.intento ? ` · ${proyeccion.intento}.º intento` : ''}
              {indiceProyectado >= 0 && ` · ${indiceProyectado + 1} de ${paraProyectar.length}`}
            </span>
          </div>

          <div className={`${styles.mandoEstado} ${styles[`fase_${enPantalla.fase}`] ?? ''}`}>
            <span className={styles.mandoReloj}>{formatearDuracion(
              enPantalla.fase === 'espera' || enPantalla.fase === 'detenida'
                ? proyeccion.duracionSegundos
                : enPantalla.restante,
            )}</span>
            <span className={styles.mandoFase}>{ETIQUETA_FASE[enPantalla.fase]}</span>
          </div>

          <div className={styles.mandoBotones}>
            <button
              className={styles.iconBtn}
              onClick={() => moverProyeccion(-1)}
              disabled={indiceProyectado <= 0}
              title="Anterior de la lista"
            >
              <Icon name="chevron_left" size="sm" />
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => moverProyeccion(1)}
              disabled={indiceProyectado >= paraProyectar.length - 1}
              title="Siguiente de la lista"
            >
              <Icon name="chevron_right" size="sm" />
            </button>

            {enPantalla.visible ? (
              <DashButton
                variant="outline"
                onClick={() => proyectar({ estado: 'detenido' })}
                title="Retira la pregunta de la pantalla"
              >
                <Icon name="stop" size="sm" /> Detener
              </DashButton>
            ) : (
              <DashButton
                onClick={() => proyectar({ estado: 'corriendo' })}
                title="Enseña la pregunta y arranca el reloj"
              >
                <Icon name="play_arrow" size="sm" />
                {enPantalla.fase === 'espera' ? 'Iniciar' : 'Otra vez'}
              </DashButton>
            )}
            <button
              className={styles.iconBtn}
              onClick={() => proyectar({ estado: 'espera' })}
              disabled={enPantalla.fase === 'espera'}
              title="Deja el reloj a cero, sin enseñar la pregunta"
            >
              <Icon name="restart_alt" size="sm" />
            </button>

            <button className={styles.iconBtn} onClick={abrirPantalla} title="Abrir o traer al frente la pantalla proyectada">
              <Icon name="open_in_new" size="sm" />
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => {
                navigator.clipboard?.writeText(urlProyeccion);
                setAviso(`Enlace copiado: ${urlProyeccion} — ábrelo en el iPad con tu sesión iniciada.`);
              }}
              title="Copiar el enlace para abrirlo en otro aparato"
            >
              <Icon name="link" size="sm" />
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => proyectar({ asignacionId: null })}
              title="Dejar la pantalla en blanco"
            >
              <Icon name="close" size="sm" />
            </button>
          </div>
        </div>
      )}

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
                disabled={sinLlenar === 0 || guardando > 0}
                title={competenciaActiva
                  ? `Da una pregunta de esta competencia a cada alumno sin ${intentoActivo}.º intento`
                  : 'Llena todos los huecos vacíos: cada competencia y cada intento'}
              >
                Repartir al grupo ({sinLlenar})
              </DashButton>
              <DashButton
                onClick={() => {
                  abrirPantalla();
                  // Si no hay nada puesto, empieza por el primero de la lista tal
                  // como se está viendo; si ya lo hay, solo trae la pestaña.
                  if (!proyeccion?.asignacionId && paraProyectar[0]) {
                    proyectar({ asignacionId: paraProyectar[0].asignacion.id });
                  }
                }}
                disabled={paraProyectar.length === 0 && !proyeccion?.asignacionId}
                title="Abre la pantalla de proyección en otra pestaña; se maneja desde aquí"
              >
                <Icon name="cast" size="sm" /> Proyectar
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
                  <tr
                    key={alumno.id}
                    className={`${unica?.usada ? styles.filaUsada : ''} ${
                      alumno.asignaciones.some((a) => a.id === proyeccion?.asignacionId)
                        ? styles.filaProyectada : ''}`}
                  >
                    <td>
                      <span className={styles.alumnoNombre}>{alumno.name}</span>
                      <span className={styles.alumnoMatricula}>{alumno.matricula}</span>
                    </td>

                    {competenciaActiva ? (
                      <td>
                        <button
                          className={`${styles.celdaPregunta} ${unica ? '' : styles.celdaVacia} ${unica?.pendiente ? styles.pendiente : ''}`}
                          onClick={() => setEligiendoPara({
                            alumnoId: alumno.id,
                            competenciaId: competenciaActiva,
                            // Desde el modo de trabajo el intento lo eligió el
                            // profesor arriba: lo que se elija va ahí.
                            intentoFijo: intentoActivo,
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
                                  alumnoId: alumno.id,
                                  competenciaId: c.id,
                                  // Desde el mapa no hay intento elegido: cada
                                  // pregunta cae en el primero que esté libre.
                                  intentoFijo: null,
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
                            className={`${styles.iconBtn} ${unica && unica.id === proyeccion?.asignacionId ? styles.iconBtnOn : ''}`}
                            disabled={!unica?.pregunta}
                            onClick={() => {
                              if (!unica) return;
                              // Poner en pantalla es una cosa y arrancar el reloj
                              // es otra: esto solo la pone, en «por iniciar».
                              proyectar({ asignacionId: unica.id });
                              abrirPantalla();
                            }}
                            title="Poner esta pregunta en la pantalla proyectada"
                          >
                            <Icon name="cast" size="sm" />
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
              {preguntasDeVista.filter((p) => !asignadosPorPregunta.has(p.id)).length} sin
              {' '}repartir de {preguntasDeVista.length}
            </span>
          </div>

          <div className={styles.listaPreguntas}>
            {preguntasDeVista.length === 0 && (
              <p className={styles.vacio}>No hay preguntas que mostrar.</p>
            )}
            {preguntasDeVista.map((p) => {
              const suyos = asignadosPorPregunta.get(p.id) ?? [];
              // Lo que trae `uso` menos lo de casa: los otros grupos en curso.
              const enOtros = Math.max(0, (p.uso?.veces ?? 0) - suyos.length);
              const enVuelo = suyos.some((a) => a.asignaciones.some(
                (x) => x.pregunta?.id === p.id && x.pendiente,
              ));
              return (
                <article key={p.id} className={styles.tarjeta}>
                  <div className={styles.tarjetaMeta}>
                    {p.competencia && <span className={styles.competenciaTag}>{p.competencia.competencia}</span>}
                    {enOtros > 0 && (
                      <span className={styles.tomadaTag} title={p.uso?.quienes.join('\n')}>
                        <Icon name="history" size="sm" />
                        también en {enOtros} de otros grupos
                      </span>
                    )}
                    {p.uso?.algunaUsada && <span className={styles.libreTag}>ya preguntada</span>}
                  </div>
                  {/* El enunciado entero: es el motivo de esta vista. */}
                  <p className={styles.tarjetaTexto}>{p.texto}</p>
                  <div className={styles.tarjetaAcciones}>
                    {/* El MISMO chip que en la vista por alumno, aquí del lado de
                        la pregunta: dice a cuántos les ha tocado y se pulsa para
                        repartirla. No hay tope —una pregunta se repite cuantas
                        veces haga falta—, así que la cuenta es informativa. */}
                    <button
                      className={`${styles.hueco} ${styles.huecoAccion} ${suyos.length > 0 ? styles.huecoLleno : ''} ${enVuelo ? styles.pendiente : ''}`}
                      onClick={() => setEligiendoAlumno(p)}
                      title={suyos.length === 0
                        ? 'Elegir a quién se la asignas'
                        : `Ya es de:\n${suyos.map((a) => a.name).join('\n')}`}
                    >
                      <Icon name={suyos.length > 0 ? 'group' : 'person_add'} size="sm" />
                      <span className={styles.huecoNombre}>
                        {suyos.length === 0 ? 'Asignar a un alumno' : 'Asignada a'}
                      </span>
                      {suyos.length > 0 && (
                        <span className={styles.huecoCuenta}>
                          {suyos.length} de {alumnos.length}
                        </span>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Alumno → pregunta */}
      {eligiendoPara && (() => {
        const alumno = alumnos.find((a) => a.id === eligiendoPara.alumnoId);
        if (!alumno) return null;
        const { competenciaId } = eligiendoPara;
        // Lo que ya tiene en ESTA competencia, sea del intento que sea.
        const suyas = alumno.asignaciones.filter((a) => a.hueco?.startsWith(`${competenciaId}::`));
        const destino = eligiendoPara.intentoFijo ?? primerHuecoLibre(alumno, competenciaId);
        const nombreCompetencia = competencias.find((c) => c.id === competenciaId)?.nombre ?? '';
        return (
          <SelectorPregunta
            preguntas={preguntas.filter((p) => !p.archivada)}
            competencias={competencias}
            competenciaInicial={competenciaId}
            titulo={`Preguntas de ${alumno.name}`}
            subtitulo={suyas.length >= MAX_INTENTOS
              ? `${nombreCompetencia} · ya tiene sus ${MAX_INTENTOS} intentos. Quita una para poner otra.`
              : `${nombreCompetencia} · lleva ${suyas.length} de ${MAX_INTENTOS}. Lo que elijas entra en el ${destino}.º intento.`}
            seleccionadas={new Set(suyas.map((a) => a.pregunta?.id).filter((id): id is string => !!id))}
            permiteAgregar={suyas.length < MAX_INTENTOS}
            guardando={guardando > 0}
            onAlternar={(p) => {
              // Pulsar una que ya tiene la QUITA; pulsar otra la mete en el
              // hueco de destino, sustituyendo lo que hubiera ahí.
              const yaLaTiene = suyas.find((a) => a.pregunta?.id === p.id);
              // Una que todavía se está guardando no tiene id real: quitarla
              // daría un 404. Se ignora el clic hasta que confirme.
              if (yaLaTiene?.pendiente) return;
              if (yaLaTiene) quitar(yaLaTiene);
              else asignar([{ alumnoId: alumno.id, preguntaId: p.id, intento: destino }]);
            }}
            onCerrar={() => setEligiendoPara(null)}
          />
        );
      })()}

      {/* Pregunta → alumno */}
      {eligiendoAlumno && (() => {
        const competenciaId = eligiendoAlumno.competenciaId ?? SIN_COMPETENCIA;
        const suyos = asignadosPorPregunta.get(eligiendoAlumno.id) ?? [];
        return (
          <SelectorAlumno
            alumnos={alumnos}
            titulo="¿A quién se la asignas?"
            subtitulo={`${resumenPregunta(eligiendoAlumno.texto, 120)} — ${suyos.length === 0
              ? 'todavía no es de nadie'
              : `ya es de ${suyos.length} alumno${suyos.length === 1 ? '' : 's'}`}`}
            seleccionados={new Set(suyos.map((a) => a.id))}
            // A quien ya agotó sus intentos no se le puede añadir otra: se apaga
            // en vez de sustituirle una en silencio.
            sinHuecos={new Set(
              alumnos
                .filter((a) => llenosEn(a, competenciaId) >= MAX_INTENTOS)
                .map((a) => a.id),
            )}
            llenosPorAlumno={new Map(alumnos.map((a) => [a.id, llenosEn(a, competenciaId)]))}
            maxIntentos={MAX_INTENTOS}
            guardando={guardando > 0}
            onAlternar={(alumno) => {
              // Pulsar a quien ya la tiene se la QUITA; a quien no, se la pone en
              // su primer intento libre de esa competencia.
              const ya = alumno.asignaciones.find((x) => x.pregunta?.id === eligiendoAlumno.id);
              if (ya?.pendiente) return;
              if (ya) quitar(ya);
              else {
                asignar([{
                  alumnoId: alumno.id,
                  preguntaId: eligiendoAlumno.id,
                  intento: primerHuecoLibre(alumno, competenciaId),
                }]);
              }
            }}
            onCerrar={() => setEligiendoAlumno(null)}
          />
        );
      })()}

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
