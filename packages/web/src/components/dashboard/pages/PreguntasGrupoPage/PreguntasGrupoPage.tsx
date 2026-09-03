import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useArrastre } from '../../../../hooks/useArrastre';
import { useParams, Link } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import Modal from '../../atoms/Modal/Modal';
import SelectorPregunta from '../../organisms/SelectorPregunta/SelectorPregunta';
import SelectorAlumno from '../../organisms/SelectorAlumno/SelectorAlumno';
import AsignarCitaModal from '../../organisms/AsignarCitaModal/AsignarCitaModal';
import SaltoProyeccion from '../../organisms/SaltoProyeccion/SaltoProyeccion';
import AbrirDiasModal, { type FilaPlan } from '../../organisms/AbrirDiasModal/AbrirDiasModal';
import {
  aplicarAsignaciones, ajustarUso, faseProyeccion, formatearDuracion, quitarAsignaciones,
  repartirPreguntas, resumenPregunta,
} from '../../../../utils/preguntas';
import type {
  AlumnoConPregunta, CompetenciaEnBanco, DuracionConfig, EstadoProyeccion, FaseProyeccion,
  Pregunta, PreguntaAsignacion, Proyeccion,
} from '../../../../types/preguntas';
import { confirmar } from '../../../../utils/dialogos';
import {
  claveFecha, diaMasProximo, fechaConDia, fechaLarga, hora, rangoHoras,
} from '../../../../utils/agenda';
import type { Agenda, CitaProfesor, DiaProfesor } from '../../../../types/agenda';
import styles from './PreguntasGrupoPage.module.css';

const API_BASE = '/api';
const SIN_COMPETENCIA = 'sin-competencia';
/** Prefijo de la zona de soltar de un chip de día, para distinguirla de una hora. */
const ZONA_DIA = 'dia:';
/** Espejo de `MAX_INTENTOS` del API: hasta dos entrevistas por competencia. */
const MAX_INTENTOS = 2;
/**
 * Cada cuánto se relee lo que hay proyectado. Mucho más espaciado que en la
 * pantalla proyectada porque aquí el panel es quien MANDA: lo suyo lo pinta al
 * pulsar y lo confirma la respuesta del PUT, así que esto solo cubre el caso de
 * tener el panel abierto en dos sitios. Y las dos pantallas comparten servidor:
 * sondear de más aquí le quita sitio a la que sí lo necesita.
 */
const PERIODO_SONDEO = 5000;
/** Cada cuánto se repinta el reloj del mando. */
const PERIODO_RELOJ = 250;

function mensajeDeError(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}

/**
 * «STC0203. Diseño de componentes de software» → «STC0203».
 *
 * Para el selector del mando, donde el nombre entero no cabe y lo único que hace
 * falta es distinguir una competencia de la otra.
 */
function codigoCompetencia(nombre: string | null | undefined): string {
  return (nombre ?? '').split('.')[0].trim();
}

type Vista = 'alumnos' | 'preguntas' | 'agenda';

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
  // Notas de TODOS los intentos de un alumno. Con «todas» las competencias no
  // hay columna de nota donde escribirlas —serían cuatro por fila—, y son justo
  // lo que se relee antes de la segunda entrevista.
  const [notasDe, setNotasDe] = useState<string | null>(null);
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
  /**
   * La agenda: los días que el profesor abre y las citas que los alumnos
   * reservan. El reparto de preguntas puede hacerse semanas antes, pero el ORDEN
   * de la proyección lo deciden los alumnos al apuntarse.
   */
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  /** El hueco libre que el profesor pulsó para apuntar a alguien a mano. */
  const [asignandoEn, setAsignandoEn] = useState<string | null>(null);
  const [asignandoCita, setAsignandoCita] = useState(false);
  /** Lo último que se movió bien. Se enseña hasta el siguiente gesto. */
  const [movida, setMovida] = useState<string | null>(null);
  const [diaActivo, setDiaActivo] = useState<string | null>(null);
  const [creandoDia, setCreandoDia] = useState(false);
  const [guardandoDias, setGuardandoDias] = useState(false);
  /**
   * Los huecos cuyo cierre está en vuelo. Es un conjunto y no uno solo porque
   * cerrar un rato son varios candados seguidos, y hay que poder picarlos de
   * golpe: cada fila dice por su cuenta que ya recibieron su petición.
   */
  const [huecosEnVuelo, setHuecosEnVuelo] = useState<Set<string>>(new Set());
  /** Cuántas peticiones de hueco quedan vivas, para recargar UNA vez al final. */
  const enVuelo = useRef(0);

  /** La pestaña proyectada, para volver a ella en vez de abrir otra. */
  const ventanaRef = useRef<Window | null>(null);
  /**
   * El profesor picó un día a mano: a partir de ahí no se le mueve solo.
   *
   * Sin esto, cualquier recarga de la agenda —cerrar un hueco, mover una cita—
   * le devolvería al día de hoy mientras está mirando el de la semana que viene.
   */
  const elegidoAMano = useRef(false);
  /** La tira de días, para traer a la vista el que se elige solo. */
  const tiraDias = useRef<HTMLDivElement | null>(null);
  /** El mando, para poder traerlo a la vista al proyectar desde una fila. */
  const mandoRef = useRef<HTMLDivElement | null>(null);
  /** Hay una petición de bajar al mando esperando a que el mando exista. */
  const [irAlMando, setIrAlMando] = useState(false);
  /**
   * Qué orden está en vuelo. El mando escribe en el servidor y la pantalla que
   * cambia está en otro aparato, así que sin esto pulsar «Iniciar» parece no
   * hacer nada durante la ida y la vuelta —y el profesor vuelve a pulsar—.
   */
  const [mandando, setMandando] = useState<EstadoProyeccion | 'mover' | null>(null);

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

  const cargarAgenda = useCallback(async () => {
    if (!grupoId) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/agenda-entrevistas`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) return;
      const data = await res.json() as Agenda;
      setAgenda(data);
      // El día que toca: el más próximo que no haya terminado, por HORA. Se
      // vuelve a decidir en cada recarga mientras el profesor no haya picado
      // uno: su pestaña se queda abierta toda la mañana, y cuando el día de hoy
      // se acaba lo que quiere ver es el siguiente, no el que ya pasó.
      setDiaActivo((actual) => (elegidoAMano.current && actual
        ? actual
        : diaMasProximo(data.dias) ?? actual));
    } catch {
      setError('No se pudo cargar la agenda de entrevistas');
    }
  }, [grupoId, sessionToken]);

  useEffect(() => { cargarAgenda(); }, [cargarAgenda]);

  /**
   * La vista previa del alta en lote: qué se abriría, sin escribir nada.
   *
   * La decide el SERVIDOR y no el navegador, aunque el navegador ya tenga los
   * días cargados: la regla de qué choca con qué vive en un solo sitio, y así
   * lo que se enseña aquí es exactamente lo que se va a crear al pulsar.
   */
  async function simularLote(bloques: { inicio: string; fin: string }[]): Promise<FilaPlan[] | null> {
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/agenda-entrevistas/dias/lote`, {
        method: 'POST', headers, body: JSON.stringify({ bloques, simular: true }),
      });
      if (!res.ok) return null;
      const data = await res.json() as { plan: FilaPlan[] };
      return data.plan;
    } catch {
      return null;
    }
  }

  async function abrirDias(bloques: { inicio: string; fin: string }[], nota: string) {
    setGuardandoDias(true);
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/agenda-entrevistas/dias/lote`, {
        method: 'POST', headers, body: JSON.stringify({ bloques, nota }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'No se pudieron abrir los días');
      }
      setCreandoDia(false);
      await cargarAgenda();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudieron abrir los días'));
    } finally {
      setGuardandoDias(false);
    }
  }

  /**
   * Cerrar o reabrir UN hueco.
   *
   * Es lo que el profesor usa de verdad: lo que quiere tapar son ratos sueltos
   * —la comida, la clase que le pisa las once—, y cerrar el día entero es el
   * caso raro. Sin confirmación: se deshace pulsando otra vez en el mismo sitio.
   */
  async function cerrarHueco(diaId: string, inicio: string, cerrado: boolean) {
    if (huecosEnVuelo.has(inicio)) return;
    setHuecosEnVuelo((s) => new Set(s).add(inicio));
    enVuelo.current += 1;
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/agenda-entrevistas/dias/${diaId}/huecos`,
        { method: 'PUT', headers, body: JSON.stringify({ inicio, cerrado }) },
      );
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? 'No se pudo guardar el hueco');
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo guardar el hueco'));
    } finally {
      enVuelo.current -= 1;
      // Una sola recarga para toda la ráfaga, y las filas siguen marcadas hasta
      // que llega: soltarlas antes las devolvería un instante a como estaban,
      // que es justo el parpadeo que hace dudar de si el clic entró.
      if (enVuelo.current === 0) {
        await cargarAgenda();
        setHuecosEnVuelo(new Set());
      }
    }
  }

  /**
   * Cerrar reservas no borra nada, pero es visible para los alumnos: el día deja
   * de admitirlos de golpe. Se pregunta por eso, no por peligro.
   */
  async function cerrarOReabrir(dia: DiaProfesor) {
    const cerrando = !dia.cerrado;
    if (!(await confirmar({
      titulo: cerrando ? '¿Cerrar las reservas de este día?' : '¿Reabrir las reservas?',
      texto: cerrando
        ? `${fechaLarga(dia.inicio)}: las citas ya apuntadas se quedan, pero nadie más podrá apuntarse.`
        : `${fechaLarga(dia.inicio)} volverá a admitir reservas en sus huecos libres.`,
      confirmar: cerrando ? 'Cerrar reservas' : 'Reabrir',
    }))) return;
    await cambiarDia(dia, { cerrado: cerrando });
  }

  async function cambiarDia(dia: DiaProfesor, cambios: { cerrado?: boolean }) {
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/agenda-entrevistas/dias/${dia.id}`, {
        method: 'PUT', headers, body: JSON.stringify(cambios),
      });
      if (!res.ok) throw new Error('No se pudo guardar el día');
      await cargarAgenda();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo guardar el día'));
    }
  }

  async function borrarDia(dia: DiaProfesor) {
    const citas = dia.huecos.filter((h) => h.cita).length;
    if (!(await confirmar({
      titulo: '¿Borrar este día?',
      texto: citas > 0
        // El servidor lo va a rechazar; decirlo aquí ahorra el rechazo.
        ? `${fechaLarga(dia.inicio)} tiene ${citas} cita${citas === 1 ? '' : 's'} apuntada${citas === 1 ? '' : 's'}. Hay que cancelarlas antes.`
        : `${fechaLarga(dia.inicio)} desaparecerá de la agenda del grupo.`,
      confirmar: 'Borrar el día',
      peligro: true,
    }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/agenda-entrevistas/dias/${dia.id}`, {
        method: 'DELETE', headers,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'No se pudo borrar el día');
      }
      if (diaActivo === dia.id) {
        // Se va el que se estaba mirando: que vuelva a decidirlo la hora.
        elegidoAMano.current = false;
        setDiaActivo(null);
      }
      await cargarAgenda();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo borrar el día'));
    }
  }

  /**
   * Apuntar a un alumno en un hueco sin que él lo reserve.
   *
   * El endpoint ya existía —el profesor podía crear citas desde el primer día—
   * pero no había por dónde llamarlo. El día de las entrevistas siempre pasa
   * algo que la hoja no previó, y sin esto la única salida era pedirle al
   * alumno que se apuntara desde su móvil, que es justo cuando no funciona.
   *
   * El servidor sigue siendo quien manda: comprueba que el hueco exista y siga
   * libre, y que al alumno le queden oportunidades en esa competencia.
   */
  async function asignarCita(inicio: string, alumnoId: string, competenciaId: string) {
    if (!dia) return;
    setAsignandoCita(true);
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/agenda-entrevistas/citas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ diaId: dia.id, inicio, alumnoId, competenciaId }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'No se pudo apuntar la cita');
      }
      setAsignandoEn(null);
      await cargarAgenda();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo apuntar la cita'));
    } finally {
      setAsignandoCita(false);
    }
  }

  /**
   * Cambiar una cita de hueco, incluso a otro día.
   *
   * Antes solo se podía cancelar y volver a apuntar: dos gestos, y entre uno y
   * otro el hueco quedaba libre para que lo tomara alguien. Aquí es una sola
   * escritura y el servidor comprueba que el destino siga libre.
   */
  /**
   * Mover una cita al hueco donde la soltaron.
   *
   * El reorganizador NO se cierra al terminar: mover a uno suele ser el primero
   * de tres, y cerrarlo obligaba a volver a abrirlo por cada persona. Lo que sí
   * hace falta es decir que salió bien, porque la tarjeta puede acabar fuera de
   * lo que se está viendo.
   */
  async function moverCita(citaId: string, diaId: string, inicio: string) {
    setAsignandoCita(true);
    setMovida(null);
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/agenda-entrevistas/citas/${citaId}`,
        { method: 'PUT', headers, body: JSON.stringify({ diaId, inicio }) },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'No se pudo mover la cita');
      }
      const quien = (agenda?.dias ?? [])
        .flatMap((d) => d.huecos)
        .find((h) => h.cita?.id === citaId)?.cita?.alumno?.name;
      setMovida(`${quien ?? 'La cita'} pasa a las ${hora(inicio)}.`);
      // Al día de destino, para no dejar al profesor mirando el hueco vacío que
      // acaba de dejar.
      setDiaActivo(diaId);
      await cargarAgenda();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo mover la cita'));
    } finally {
      setAsignandoCita(false);
    }
  }

  async function cancelarCita(citaId: string) {
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/agenda-entrevistas/citas/${citaId}`, {
        method: 'DELETE', headers,
      });
      if (!res.ok) throw new Error('No se pudo cancelar la cita');
      await cargarAgenda();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo cancelar la cita'));
    }
  }

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
  async function proyectar(
    cambio: { asignacionId?: string | null; estado?: EstadoProyeccion },
    orden: EstadoProyeccion | 'mover' = cambio.estado ?? 'mover',
  ) {
    if (!grupoId) return;
    setMandando(orden);
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
      // Lo que se pintó por adelantado ya no vale: manda lo que hay guardado.
      await leerProyeccion();
    } finally {
      setMandando(null);
    }
  }

  /**
   * Cambia el estado pintándolo YA y confirmando después.
   *
   * El reloj del panel arranca con el clic y no con la respuesta: la orden es de
   * las que no fallan casi nunca, y esperar a la ida y vuelta para mover el
   * número es justo lo que hace pensar que el botón no funciona. Si algo sale
   * mal, `proyectar` relee y deshace.
   */
  function mandarEstado(estado: EstadoProyeccion) {
    setProyeccion((p) => (p ? {
      ...p,
      estado,
      // En la hora del SERVIDOR, que es la que interpretan las dos pantallas.
      iniciadoEn: estado === 'corriendo'
        ? new Date(Date.now() + desfaseRef.current).toISOString()
        : estado === 'espera' ? null : p.iniciadoEn,
    } : p));
    proyectar({ estado }, estado);
  }

  /**
   * Abre —o trae al frente— la pestaña proyectada.
   *
   * Con nombre de ventana a propósito: pulsar «Proyectar» dos veces tiene que
   * llevar a la misma pantalla, no dejar dos abiertas peleándose por el cañón.
   */
  function abrirPantalla(traerAlFrente = true) {
    const abierta = ventanaRef.current;
    if (abierta && !abierta.closed) {
      // Desde una fila NO se trae al frente: el gesto es «prepara a este y
      // déjame darle a Iniciar», y saltar a la otra ventana obliga a volver.
      if (traerAlFrente) abierta.focus();
      return;
    }
    ventanaRef.current = window.open(urlProyeccion, `proyeccion-${grupoId}`);
  }

  /**
   * Poner a alguien en la pantalla desde su fila y bajar al mando.
   *
   * Elegir a quién proyectar y arrancarlo son dos gestos, y el segundo está en
   * el mando, que con un día lleno queda lejos de la fila que se acaba de
   * pulsar. Sin esto hay que ir a buscarlo —y el alumno ya está sentado—.
   */
  function proyectarDesdeFila(asignacionId: string) {
    proyectar({ asignacionId });
    abrirPantalla(false);
    setIrAlMando(true);
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

  /** El día abierto en la pestaña de agenda, con sus huecos. */
  const dia = useMemo(
    () => agenda?.dias.find((d) => d.id === diaActivo) ?? null,
    [agenda, diaActivo],
  );

  /**
   * La fila del día: cada hueco con su cita resuelta contra el roster.
   *
   * La agenda dice QUIÉN viene y de qué competencia; el roster, con qué
   * pregunta. Se cruzan aquí, en el cliente, porque los dos datos ya están
   * cargados y así la fila se mueve sola al reasignarle una pregunta a alguien
   * sin tener que recargar la agenda.
   */
  const filaDelDia = useMemo(() => (dia?.huecos ?? []).map((h) => {
    const cita = h.cita;
    const alumno = cita ? alumnos.find((a) => a.id === cita.alumno?.id) ?? null : null;
    const asignacion = cita?.asignacionId
      ? alumno?.asignaciones.find((x) => x.id === cita.asignacionId) ?? null
      : null;
    return { inicio: h.inicio, cita, alumno, asignacion, cerrado: h.cerrado };
  }), [dia, alumnos]);

  /**
   * Los bloques agrupados por FECHA.
   *
   * Desde que un mismo día puede tener varios bloques, repetir la fecha en cada
   * chip era ilegible: la fecha pasa a encabezar la fila y los chips solo llevan
   * su hora. Cada fila se desplaza por dentro, así que un día con ocho bloques
   * no empuja a los botones de la derecha.
   */
  const porFecha = useMemo(() => {
    const mapa = new Map<string, DiaProfesor[]>();
    for (const d of agenda?.dias ?? []) {
      const clave = claveFecha(d.inicio);
      mapa.set(clave, [...(mapa.get(clave) ?? []), d]);
    }
    return [...mapa]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([clave, dias]) => {
        const bloques = [...dias].sort((a, b) => a.inicio.localeCompare(b.inicio));
        return {
          clave,
          etiqueta: fechaConDia(bloques[0].inicio),
          bloques,
          citas: bloques.reduce((t, d) => t + d.huecos.filter((h) => h.cita).length, 0),
          huecos: bloques.reduce((t, d) => t + d.huecos.length, 0),
        };
      });
  }, [agenda]);

  /** El día que se está mirando, con todos sus bloques. */
  const fechaActiva = useMemo(
    () => porFecha.find((f) => f.bloques.some((d) => d.id === diaActivo)) ?? porFecha[0] ?? null,
    [porFecha, diaActivo],
  );

  /**
   * Reorganizar el día arrastrando, sobre la propia tabla.
   *
   * Antes esto era un diálogo con dos desplegables —día y hora— y había que
   * saber de memoria qué hueco estaba libre. Aquí se arrastra a alguien a su
   * hora nueva sobre la misma tabla que se está leyendo, que es donde el
   * profesor ya tiene los ojos el día de las entrevistas.
   *
   * La zona de destino es el instante del hueco. Los chips de los días también
   * son zona: soltar a alguien encima lo manda a ese día, a su primer hueco
   * libre, y la vista salta allí para poder colocarlo a la hora exacta.
   */
  const cuerpoAgenda = useRef<HTMLDivElement>(null);
  const { iniciar, arrastrando, posicion, zona } = useArrastre<CitaProfesor>({
    alSoltar: (cita, destino) => {
      if (asignandoCita) return;
      if (destino.startsWith(ZONA_DIA)) {
        const otro = (agenda?.dias ?? []).find((d) => d.id === destino.slice(ZONA_DIA.length));
        const libre = otro?.huecos.find((h) => !h.cita);
        if (!otro || !libre) return;
        void moverCita(cita.id, otro.id, libre.inicio);
        return;
      }
      if (!dia || destino === cita.inicio) return;
      void moverCita(cita.id, dia.id, destino);
    },
    contenedor: cuerpoAgenda,
  });

  /** Las horas del día que siguen libres, para poder ofrecerlas a mano. */
  const libresDelDia = useMemo(
    () => (dia?.huecos ?? []).filter((h) => !h.cita).map((h) => h.inicio),
    [dia],
  );

  /**
   * Cuántas citas lleva cada alumno por competencia, clave `alumnoId::compId`.
   *
   * Sale de la agenda entera y no del día abierto: las oportunidades se gastan
   * en cualquier día. Es la misma cuenta que hace el servidor antes de aceptar
   * una cita; aquí solo evita ofrecer a quien va a ser rechazado.
   */
  const usadosPorAlumno = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const d of agenda?.dias ?? []) {
      for (const h of d.huecos) {
        const alumnoId = h.cita?.alumno?.id;
        const compId = h.cita?.competencia?.id;
        if (!alumnoId || !compId) continue;
        const clave = `${alumnoId}::${compId}`;
        cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
      }
    }
    return cuenta;
  }, [agenda]);

  /** Pares (alumno, asignación) proyectables, en el orden en que se ven. */
  const paraProyectarRoster = useMemo(
    () => visibles.flatMap((alumno) => huecosVisibles
      .flatMap((c) => (competenciaActiva
        ? [asignacionDe(alumno, c.id, intentoActivo)]
        : Array.from({ length: MAX_INTENTOS }, (_, i) => asignacionDe(alumno, c.id, i + 1))))
      .filter((a): a is PreguntaAsignacion => !!a?.pregunta)
      // La pista distingue dos filas del mismo alumno en el selector del mando:
      // aquí, de qué competencia e intento son.
      .map((a) => ({
        alumno,
        asignacion: a,
        pista: `${codigoCompetencia(a.pregunta?.competencia)} ${a.intento}.º`.trim(),
      }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibles, huecosVisibles, competenciaActiva, intentoActivo],
  );

  /**
   * En la agenda manda la HORA, no la lista de alumnos: el profesor reparte las
   * preguntas cuando quiere, pero el orden del día lo escribieron los alumnos al
   * apuntarse. Las citas sin pregunta asignada no entran en la fila proyectable
   * —no hay nada que enseñar—, y la tabla las señala aparte.
   */
  const paraProyectar = useMemo(
    () => (vista === 'agenda'
      ? filaDelDia
        .filter((f) => f.alumno && f.asignacion)
        // En la agenda la pista es la HORA: es lo que el profesor está leyendo
        // en la tabla, y lo que separa las dos citas de quien viene dos veces.
        .map((f) => ({ alumno: f.alumno!, asignacion: f.asignacion!, pista: hora(f.inicio) }))
      : paraProyectarRoster),
    [vista, filaDelDia, paraProyectarRoster],
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

  /** La asignación que está proyectándose, para escribirle la nota sin buscarla. */
  const asignacionProyectada = useMemo(
    () => alumnos.flatMap((a) => a.asignaciones)
      .find((a) => a.id === proyeccion?.asignacionId) ?? null,
    [alumnos, proyeccion],
  );

  /**
   * Trae a la vista el día elegido.
   *
   * La tira se desplaza por dentro y con nueve fechas no caben todas: el que se
   * elige solo puede quedar fuera, y entonces parece que no hay ninguno puesto.
   * Con `nearest` no hace nada si ya se veía, así que picar uno no da tirones.
   */
  useEffect(() => {
    tiraDias.current
      ?.querySelector<HTMLElement>('[data-activo]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    // `vista` entra en la cuenta porque la tira solo existe en la agenda: al
    // entrar por otra pestaña, el día ya estaba elegido y sin esto el efecto
    // no llegaba a correr con la tira pintada.
  }, [diaActivo, vista, porFecha.length]);

  /**
   * Baja al mando cuando se ha pedido desde una fila.
   *
   * No se puede desplazar en el mismo clic: el mando solo existe cuando hay algo
   * proyectado, y eso llega con la respuesta del servidor. Se deja la petición
   * apuntada y se atiende en cuanto el mando está pintado.
   */
  useEffect(() => {
    if (!irAlMando || !mandoRef.current) return;
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    mandoRef.current.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'center' });
    setIrAlMando(false);
  }, [irAlMando, proyeccion?.asignacionId]);

  /** Salta a la pregunta de al lado en el orden en que se ve la tabla. */
  function moverProyeccion(paso: number) {
    if (paraProyectar.length === 0) return;
    const desde = indiceProyectado < 0 ? (paso > 0 ? -1 : 0) : indiceProyectado;
    irAProyeccion(Math.min(paraProyectar.length - 1, Math.max(0, desde + paso)));
  }

  /**
   * Poner en la pantalla al que ocupa ese lugar de la fila.
   *
   * Las flechas se apoyan en esto y el selector también: ir al siguiente y
   * saltar al séptimo son el mismo gesto con distinto destino, y separarlos
   * habría dejado dos sitios donde acordarse de reiniciar el reloj.
   */
  function irAProyeccion(destino: number) {
    const siguiente = paraProyectar[destino];
    if (!siguiente || siguiente.asignacion.id === proyeccion?.asignacionId) return;
    // Lo que el mando enseña se sabe ya de la tabla; el texto de la pregunta no
    // se pinta aquí, así que no hay que esperarlo para cambiar de nombre.
    setProyeccion((p) => (p ? {
      ...p,
      asignacionId: siguiente.asignacion.id,
      alumno: { name: siguiente.alumno.name },
      competencia: siguiente.asignacion.pregunta?.competencia ?? null,
      intento: siguiente.asignacion.intento,
      estado: 'espera',
      iniciadoEn: null,
    } : p));
    // Sin `estado`: cambiar de alumno reinicia el reloj en el servidor.
    proyectar({ asignacionId: siguiente.asignacion.id }, 'mover');
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

  /**
   * El MANDO de la proyección, en una variable porque su SITIO cambia.
   *
   * En «Por alumno» y «Por pregunta» encabeza la pantalla. En la agenda va
   * DEBAJO del selector de día: ahí lo que manda es el día, y el control es el
   * control DE ese día —ponerlo encima hacía leer que el día dependía de él—.
   */
  const mando = proyeccion?.asignacionId && enPantalla ? (

          <div className={styles.mando} ref={mandoRef}>
            <div className={styles.mandoQuien}>
              <span className={styles.mandoNombre}>{proyeccion.alumno?.name}</span>
              <span className={styles.mandoCompetencia}>
                {proyeccion.competencia ?? 'Sin competencia'}
                {proyeccion.intento ? ` · ${proyeccion.intento}.º intento` : ''}
                {indiceProyectado >= 0
                ? ` · ${indiceProyectado + 1} de ${paraProyectar.length}`
                // Sin sitio en la lista de delante: pasa al cambiar de día con
                // algo puesto de otro. Decirlo evita leer el mando como si fuera
                // de este día.
                : ' · no es de esta lista'}
              </span>
            </div>

            <div className={`${styles.mandoEstado} ${styles[`fase_${enPantalla.fase}`] ?? ''}`}>
              <span className={styles.mandoReloj}>{formatearDuracion(
                enPantalla.fase === 'espera' || enPantalla.fase === 'detenida'
                  ? proyeccion.duracionSegundos
                  : enPantalla.restante,
              )}</span>
              <span className={styles.mandoFase}>
                {mandando !== null ? (
                  <span className={styles.mandoEnviando}><Icon name="sync" size="sm" /> Enviando…</span>
                ) : ETIQUETA_FASE[enPantalla.fase]}
              </span>
            </div>

            <div className={styles.mandoBotones}>
              <button
                className={styles.iconBtn}
                onClick={() => moverProyeccion(-1)}
                disabled={indiceProyectado <= 0 || mandando !== null}
                title="Anterior de la lista"
              >
                <Icon name="chevron_left" size="sm" />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => moverProyeccion(1)}
                disabled={indiceProyectado >= paraProyectar.length - 1 || mandando !== null}
                title="Siguiente de la lista"
              >
                <Icon name="chevron_right" size="sm" />
              </button>

              {/* Ir a cualquiera sin pasar por los de en medio. Las flechas
                  sirven para el día seguido; esto, para cuando alguien pide su
                  turno antes o llega tarde y hay que rescatarlo. */}
              <SaltoProyeccion
                opciones={paraProyectar.map((x) => ({
                  id: x.asignacion.id,
                  nombre: x.alumno.name,
                  pista: x.pista,
                }))}
                indice={indiceProyectado}
                deshabilitado={mandando !== null}
                onElegir={irAProyeccion}
              />

              {/* El botón dice lo que está pasando mientras pasa: la pantalla que
                  cambia está en otro aparato y el profesor no la tiene delante. */}
              {enPantalla.visible ? (
                <DashButton
                  variant="outline"
                  onClick={() => mandarEstado('detenido')}
                  disabled={mandando !== null}
                  title="Retira la pregunta de la pantalla"
                >
                  <Icon name={mandando === 'detenido' ? 'sync' : 'stop'} size="sm" />
                  {mandando === 'detenido' ? 'Deteniendo…' : 'Detener'}
                </DashButton>
              ) : (
                <DashButton
                  onClick={() => mandarEstado('corriendo')}
                  disabled={mandando !== null}
                  title="Enseña la pregunta y arranca el reloj"
                >
                  <Icon name={mandando === 'corriendo' ? 'sync' : 'play_arrow'} size="sm" />
                  {mandando === 'corriendo'
                    ? 'Iniciando…'
                    : enPantalla.fase === 'espera' ? 'Iniciar' : 'Otra vez'}
                </DashButton>
              )}
              <button
                className={styles.iconBtn}
                onClick={() => mandarEstado('espera')}
                disabled={enPantalla.fase === 'espera' || mandando !== null}
                title="Deja el reloj a cero, sin enseñar la pregunta"
              >
                <Icon name="restart_alt" size="sm" />
              </button>

              <button className={styles.iconBtn} onClick={() => abrirPantalla()} title="Abrir o traer al frente la pantalla proyectada">
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
                onClick={() => proyectar({ asignacionId: null }, 'mover')}
                disabled={mandando !== null}
                title="Dejar la pantalla en blanco"
              >
                <Icon name="close" size="sm" />
              </button>
            </div>

            {/* La nota se escribe MIENTRAS se pregunta, no después: es el momento
                en que uno se acuerda de lo que quería anotar. Va en su propia
                línea porque es un campo, no un botón más de la fila. */}
            {asignacionProyectada && (
              <label className={styles.mandoNota}>
                <Icon name="edit_note" size="sm" />
                <NotaInline
                  key={asignacionProyectada.id}
                  valor={asignacionProyectada.nota}
                  deshabilitado={false}
                  className={styles.notaAncha}
                  lineas={3}
                  placeholder="Nota de este intento: qué respondió, en qué insistir…"
                  onGuardar={(nota) => actualizar(asignacionProyectada.id, { nota })}
                />
              </label>
            )}
          </div>
  ) : null;

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
        {/* El día de las entrevistas manda sobre las otras dos: el orden no lo
            decide el profesor al repartir, lo escriben los alumnos al apuntarse. */}
        <button
          className={`${styles.tab} ${vista === 'agenda' ? styles.tabActiva : ''}`}
          onClick={() => setVista('agenda')}
        >
          <Icon name="event_available" size="sm" /> Agenda
        </button>
      </div>

      {/* El filtro de competencia no es un filtro: es el MODO de trabajo, y por
          eso manda sobre las dos vistas y sobre lo que reparte el botón. En la
          agenda no pinta nada: ahí el orden y la competencia los trae la cita. */}
      {/* `hidden` no bastaba: el `display: flex` de la clase lo pisa. */}
      {vista !== 'agenda' && (
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
      )}

      {vista !== 'agenda' && mando}

      {vista === 'agenda' ? (
        <>
          <div className={styles.barra}>
            <div className={styles.dias}>
              {porFecha.length === 0 && (
                <span className={styles.hint}>Todavía no has abierto ningún día.</span>
              )}

              {/* Primero el DÍA, en una tira horizontal. Con un bloque por día
                  —lo normal— una fila por fecha eran ocho líneas para nada.
                  Aquí caben todas en una, y el nombre del día va entero porque
                  lo que se busca es «el martes», no «el 8». */}
              {porFecha.length > 0 && (
                <div className={styles.tiraDia} ref={tiraDias}>
                  {porFecha.map((f) => {
                    const activa = fechaActiva?.clave === f.clave;
                    return (
                      <button
                        key={f.clave}
                        data-activo={activa || undefined}
                        // Soltar a alguien encima lo manda a ese día. Solo con
                        // UN horario: con varios no hay respuesta a «a cuál».
                        data-zona={arrastrando && f.bloques.length === 1
                          ? `${ZONA_DIA}${f.bloques[0].id}`
                          : undefined}
                        className={[
                          styles.chip,
                          styles.chipDia,
                          activa ? styles.chipActivo : '',
                          arrastrando && f.bloques.length === 1 ? styles.chipSoltable : '',
                          zona === `${ZONA_DIA}${f.bloques[0].id}` ? styles.chipDestino : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => {
                          elegidoAMano.current = true;
                          setDiaActivo(f.bloques[0].id);
                        }}
                        title={f.bloques.length === 1
                          ? rangoHoras(f.bloques[0].inicio, f.bloques[0].fin)
                          : `${f.bloques.length} bloques`}
                      >
                        {f.etiqueta}
                        <span className={styles.chipContador}>{f.citas}/{f.huecos}</span>
                        {f.bloques.length > 1 && (
                          <span className={styles.chipContador}>· {f.bloques.length} horarios</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Y después sus horarios, solo cuando hay más de uno: con uno
                  solo, una segunda tira con un único chip es una línea que no
                  dice nada. */}
              {fechaActiva && fechaActiva.bloques.length > 1 && (
                <div className={styles.tiraDia}>
                  {fechaActiva.bloques.map((d) => (
                      <button
                        key={d.id}
                        className={`${styles.chip} ${styles.chipBloque} ${diaActivo === d.id ? styles.chipActivo : ''}`}
                        onClick={() => {
                          elegidoAMano.current = true;
                          setDiaActivo(d.id);
                        }}
                        title={d.nota || rangoHoras(d.inicio, d.fin)}
                      >
                        {rangoHoras(d.inicio, d.fin)}
                        <span className={styles.chipContador}>
                          {d.huecos.filter((h) => h.cita).length}/{d.huecos.length}
                        </span>
                        {d.cerrado && <Icon name="lock" size="sm" />}
                      </button>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.acciones}>
              <DashButton variant="outline" onClick={() => setCreandoDia(true)}>
                <Icon name="add" size="sm" /> Abrir días
              </DashButton>
              <DashButton
                onClick={() => {
                  abrirPantalla();
                  // SIEMPRE por el primero de este día, aunque hubiera algo
                  // puesto de otro: es lo que se pide al pulsar «Proyectar el
                  // día», y si no, cambiar de día dejaba el mando en un alumno
                  // que no estaba en la fila que se mira.
                  const primera = paraProyectar[0];
                  if (primera && primera.asignacion.id !== proyeccion?.asignacionId) {
                    proyectar({ asignacionId: primera.asignacion.id });
                  }
                }}
                disabled={paraProyectar.length === 0}
                title="Abre la pantalla de proyección empezando por la primera cita de este día"
              >
                <Icon name="cast" size="sm" /> Proyectar el día
              </DashButton>
            </div>
          </div>

          {mando}

          {movida && !arrastrando && (
            /* Mover a alguien lo saca de donde estaba: si el destino quedó
               fuera de lo que se ve, el cambio no se nota. Se dice. */
            <p className={styles.movida} role="status">
              <Icon name="check_circle" size="sm" /> {movida}
            </p>
          )}

          {dia && (
            <>
              <div className={styles.diaCabecera}>
                <span className={styles.diaRango}>
                  <Icon name="schedule" size="sm" /> {rangoHoras(dia.inicio, dia.fin)}
                  {' · '}bloques de {formatearDuracion(dia.duracionSegundos)}
                </span>
                {dia.nota && <span className={styles.diaNota}>{dia.nota}</span>}
                {/* Botones y no enlaces: son acciones sobre el día, y como
                    enlaces subrayados se leían como navegación —y «Borrar el
                    día» pesa lo mismo que «Cerrar reservas», que no es el caso—. */}
                <span className={styles.diaAcciones}>
                  <button
                    className={styles.botonDia}
                    onClick={() => cerrarOReabrir(dia)}
                    title={dia.cerrado
                      ? 'Volver a admitir reservas'
                      : 'Dejar de admitir reservas sin borrar lo agendado'}
                  >
                    <Icon name={dia.cerrado ? 'lock_open' : 'lock'} size="sm" />
                    {dia.cerrado ? 'Reabrir' : 'Cerrar reservas'}
                  </button>
                  <button
                    className={`${styles.botonDia} ${styles.botonDiaPeligro}`}
                    onClick={() => borrarDia(dia)}
                    title="Borrar el día de la agenda"
                  >
                    <Icon name="delete" size="sm" /> Borrar el día
                  </button>
                </span>
              </div>

              {/* La tabla se desplaza DENTRO de su caja, y no la página.
                  Mientras se arrastra la lista se abre a los cuarenta y ocho
                  huecos: sin un contenedor propio, la página crecería de golpe
                  y el hook no tendría qué desplazar al llegar al borde —llevar
                  a alguien de las 10:30 a las 12:55 sería imposible sin soltar. */}
              <div
                className={`${styles.cuerpoAgenda} ${arrastrando ? styles.cuerpoEnArrastre : ''}`}
                ref={cuerpoAgenda}
              >
              <table className={styles.tabla}>
                <thead>
                  {/* Anchos fijos: con un día lleno, dejar que la tabla
                      reparta sola parte los nombres en cuatro líneas para
                      hacerle sitio al chip de competencia, que es lo que menos
                      falta hace leer entero. */}
                  <tr>
                    <th className={styles.colCorta}>Hora</th>
                    <th className={styles.colAlumno}>Alumno</th>
                    <th className={styles.colCompetencia}>Competencia</th>
                    <th>Pregunta que le toca</th>
                    <th className={styles.colAcciones} />
                  </tr>
                </thead>
                <tbody>
                  {/* UNA FILA POR HUECO, sin agrupar los vacíos.
                      Antes los vacíos seguidos se resumían en «sin entrevistas
                      hasta las 09:10 · 2 libres». Se lee bien, pero sobre un
                      resumen no se puede actuar: cerrar las 09:00 y dejar
                      abiertas las 09:05 no tiene dónde pulsarse. Y cerrar
                      huecos sueltos es justo lo que el profesor hace —tapar la
                      comida, el rato de la otra clase—, así que manda eso. */}
                  {filaDelDia.map((f) => {
                    if (!f.cita) {
                      const encima = zona === f.inicio && !f.cerrado;
                      const yendo = huecosEnVuelo.has(f.inicio);
                      return (
                        <tr
                          key={`libre-${f.inicio}`}
                          // Un hueco cerrado no recibe a nadie: soltar ahí sería
                          // meter una cita en el rato que se acaba de tapar.
                          data-zona={f.cerrado ? undefined : f.inicio}
                          className={[
                            styles.filaVacia,
                            f.cerrado ? styles.filaCerrada : styles.filaSoltable,
                            encima ? styles.filaDestino : '',
                            yendo ? styles.filaEnVuelo : '',
                          ].filter(Boolean).join(' ')}
                        >
                          <td className={styles.colCorta}>
                            {hora(f.inicio)}
                            {/* El cierre va al servidor y vuelve. Sin decirlo,
                                picar tres candados seguidos no da señal de que
                                los tres entraron y se vuelven a picar. */}
                            {yendo && <span className={styles.girandoFila} aria-label="Guardando" />}
                          </td>
                          {/* Mientras se arrastra, solo el hueco de DEBAJO DEL
                              PUNTERO dice algo, y dice a quién va a recibir:
                              cuarenta y ocho filas repitiendo «soltar aquí» son
                              cuarenta y ocho iguales y no se sabe en cuál se
                              está. */}
                          <td colSpan={3}>
                            {encima
                              ? <span className={styles.destinoAviso}>
                                  <Icon name="south_east" size="sm" />
                                  Aquí: {arrastrando?.alumno?.name}
                                </span>
                              : f.cerrado
                                ? <span className={styles.cerradoAviso}>
                                    <Icon name="lock" size="sm" /> cerrado
                                  </span>
                                : <span className={styles.libreTenue}>libre</span>}
                          </td>
                          <td className={styles.colAcciones}>
                            {/* Las acciones salen al pasar por encima: con
                                cuarenta y ocho filas, dos iconos fijos en cada
                                una tapan la agenda que se está leyendo. El
                                candado de un hueco cerrado sí se queda: es lo
                                que explica por qué esa fila está apagada. */}
                            {!arrastrando && !f.cerrado && (
                              <button
                                className={`${styles.iconBtn} ${styles.accionHover}`}
                                disabled={yendo}
                                onClick={() => setAsignandoEn(f.inicio)}
                                title="Apuntar a alguien en este hueco"
                              >
                                <Icon name="person_add" size="sm" />
                              </button>
                            )}
                            {!arrastrando && (
                              <button
                                className={`${styles.iconBtn} ${f.cerrado ? '' : styles.accionHover}`}
                                disabled={yendo}
                                onClick={() => void cerrarHueco(dia.id, f.inicio, !f.cerrado)}
                                title={f.cerrado
                                  ? 'Volver a ofrecer este hueco'
                                  : 'Cerrar este hueco: nadie podrá apuntarse a esta hora'}
                              >
                                <Icon name={f.cerrado ? 'lock_open' : 'block'} size="sm" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }
                    const { inicio, cita, alumno, asignacion } = f;
                    const enPantalla = !!asignacion && asignacion.id === proyeccion?.asignacionId;
                    const viajando = asignandoCita && arrastrando?.id === cita!.id;
                    return (
                      <tr
                        key={inicio}
                        onPointerDown={asignandoCita ? undefined : iniciar(cita!)}
                        className={[
                          styles.filaCita,
                          enPantalla ? styles.filaProyectada : '',
                          arrastrando?.id === cita!.id ? styles.filaAtenuada : '',
                        ].filter(Boolean).join(' ')}
                        title="Arrástralo para cambiarlo de hora"
                      >
                        <td className={styles.colCorta}>
                          <strong>{hora(inicio)}</strong>
                          {viajando && <span className={styles.girandoFila} aria-label="Moviendo" />}
                        </td>
                        <td className={styles.colAlumno}>
                          <span className={styles.alumnoNombre}>{cita!.alumno?.name}</span>
                          <span className={styles.alumnoMatricula}>{cita!.alumno?.matricula}</span>
                        </td>
                        <td className={styles.colCompetencia}>
                          <span className={styles.competenciaTag}>
                            {cita!.competencia?.nombre ?? 'Sin competencia'}
                          </span>
                          <span className={styles.historialIntento}> {cita!.intento}.º intento</span>
                        </td>
                        <td>
                          {cita!.pregunta ? (
                            resumenPregunta(cita!.pregunta.texto, 80)
                          ) : (
                            <span className={styles.sinPreguntaAviso}>
                              <Icon name="warning" size="sm" />
                              Sin pregunta para su {cita!.intento}.º intento
                            </span>
                          )}
                        </td>
                        <td className={styles.colAcciones}>
                          <button
                            className={`${styles.iconBtn} ${enPantalla ? styles.iconBtnOn : ''}`}
                            disabled={!asignacion}
                            onClick={() => asignacion && proyectarDesdeFila(asignacion.id)}
                            title="Poner esta pregunta en la pantalla y bajar al mando"
                          >
                            <Icon name="cast" size="sm" />
                          </button>
                          <button
                            className={`${styles.iconBtn} ${alumno?.asignaciones.some((a) => a.nota) ? styles.iconBtnOn : ''}`}
                            disabled={!alumno}
                            onClick={() => alumno && setNotasDe(alumno.id)}
                            title="Notas de todos sus intentos"
                          >
                            <Icon name="edit_note" size="sm" />
                          </button>
                          <button
                            className={styles.iconBtn}
                            onClick={() => cancelarCita(cita!.id)}
                            title="Cancelar esta cita (no llegó, se cambió de día…)"
                          >
                            <Icon name="close" size="sm" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filaDelDia.length === 0 && (
                    <tr><td colSpan={5} className={styles.vacio}>Ese día no tiene huecos.</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </>
          )}
        </>
      ) : vista === 'alumnos' ? (
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
                            // Poner en pantalla es una cosa y arrancar el reloj
                            // es otra: esto solo la pone, en «por iniciar», y
                            // lleva al mando, que es donde se arranca.
                            onClick={() => unica && proyectarDesdeFila(unica.id)}
                            title="Poner esta pregunta en la pantalla y subir al mando"
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
                            className={`${styles.iconBtn} ${alumno.asignaciones.some((a) => a.nota) ? styles.iconBtnOn : ''}`}
                            onClick={() => setNotasDe(alumno.id)}
                            title="Notas de todos sus intentos"
                          >
                            <Icon name="edit_note" size="sm" />
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
                        <>
                          {/* Sin competencia elegida no hay columna de nota: son
                              cuatro huecos por fila. Se entra por aquí. */}
                          <button
                            className={`${styles.iconBtn} ${alumno.asignaciones.some((a) => a.nota) ? styles.iconBtnOn : ''}`}
                            onClick={() => setNotasDe(alumno.id)}
                            title="Notas de todos sus intentos"
                          >
                            <Icon name="edit_note" size="sm" />
                          </button>
                          <button
                            className={styles.iconBtn}
                            onClick={() => abrirHistorial(alumno)}
                            title={`Historial (${alumno.totalAsignaciones})`}
                          >
                            <Icon name="history" size="sm" />
                          </button>
                        </>
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
      {/* La tarjeta que sigue al puntero. Fuera de la tabla para que no la
          recorte el desplazamiento. */}
      {arrastrando && posicion && (
        <div
          className={styles.fantasma}
          style={{ transform: `translate(${posicion.x}px, ${posicion.y}px)` }}
        >
          <span className={styles.fantasmaNombre}>{arrastrando.alumno?.name}</span>
          {/* La hora de destino viaja con el puntero: mirando la tarjeta ya se
              sabe dónde va a caer, sin tener que buscar cuál fila está
              encendida entre cuarenta y ocho. */}
          <span className={zona ? styles.fantasmaHora : styles.fantasmaFuera}>
            {zona
              ? (zona.startsWith(ZONA_DIA)
                ? '→ a ese día'
                : `→ ${hora(zona)}`)
              : 'suelta sobre un hueco libre'}
          </span>
        </div>
      )}

      {asignandoEn && (
        <AsignarCitaModal
          libres={libresDelDia}
          inicioSugerido={asignandoEn}
          competencias={agenda?.competencias ?? []}
          alumnos={alumnos}
          usados={usadosPorAlumno}
          maxIntentos={agenda?.reglas.maxIntentos ?? MAX_INTENTOS}
          guardando={asignandoCita}
          onAsignar={asignarCita}
          onCerrar={() => setAsignandoEn(null)}
        />
      )}

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

      {/* Abrir un día: fecha y franja. Los huecos salen solos, del tiempo que
          rige en el grupo, y quedan congelados en el día para que cambiarlo
          después no mueva las citas que los alumnos ya tienen apuntadas. */}
      {creandoDia && (
        <AbrirDiasModal
          duracionSegundos={duracionVigente}
          guardando={guardandoDias}
          onSimular={simularLote}
          onAbrir={(bloques, nota) => void abrirDias(bloques, nota)}
          onCerrar={() => setCreandoDia(false)}
        />
      )}

      {/* Notas de un alumno, todas juntas. Es la vista que se abre antes de la
          segunda entrevista: qué se le preguntó ya y qué se apuntó entonces. */}
      {notasDe && (() => {
        const alumno = alumnos.find((a) => a.id === notasDe);
        if (!alumno) return null;
        const huecos = competencias.flatMap((c) => Array
          .from({ length: MAX_INTENTOS }, (_, i) => i + 1)
          .map((intento) => ({ competencia: c, intento, asignacion: asignacionDe(alumno, c.id, intento) }))
          .filter((h) => h.asignacion));
        return (
          <Modal isOpen onClose={() => setNotasDe(null)} title={`Notas — ${alumno.name}`} wide>
            {huecos.length === 0 ? (
              <p className={styles.hint}>Todavía no tiene ninguna pregunta asignada.</p>
            ) : (
              <div className={styles.notasLista}>
                {huecos.map(({ competencia, intento, asignacion }) => (
                  <div key={asignacion!.id} className={styles.notaBloque}>
                    <div className={styles.notaCabecera}>
                      <span className={styles.competenciaTag}>{competencia.nombre}</span>
                      <span className={styles.historialIntento}>{intento}.º intento</span>
                      {asignacion!.usada && <span className={styles.libreTag}>ya preguntada</span>}
                      {asignacion!.id === proyeccion?.asignacionId && (
                        <span className={styles.tomadaTag}>
                          <Icon name="cast" size="sm" /> en pantalla
                        </span>
                      )}
                    </div>
                    <p className={styles.notaEnunciado}>
                      {asignacion!.pregunta ? resumenPregunta(asignacion!.pregunta.texto, 160) : '—'}
                    </p>
                    <NotaInline
                      key={asignacion!.id}
                      valor={asignacion!.nota}
                      deshabilitado={!!asignacion!.pendiente}
                      className={styles.notaAncha}
                      lineas={3}
                      placeholder="Qué respondió, en qué insistir…"
                      onGuardar={(nota) => actualizar(asignacion!.id, { nota })}
                    />
                  </div>
                ))}
              </div>
            )}
            <p className={styles.hint}>
              Se guardan al salir del campo. Solo las ves tú: no se proyectan ni afectan a la
              calificación.
            </p>
          </Modal>
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
function NotaInline({ valor, deshabilitado, onGuardar, className, placeholder, lineas }: {
  valor: string;
  deshabilitado: boolean;
  onGuardar: (nota: string) => void;
  className?: string;
  placeholder?: string;
  /** Alto en líneas. Con esto es un `textarea`: Enter escribe, no guarda. */
  lineas?: number;
}) {
  const [texto, setTexto] = useState(valor);
  const inicial = useRef(valor);

  useEffect(() => { setTexto(valor); inicial.current = valor; }, [valor]);

  const comunes = {
    value: texto,
    disabled: deshabilitado,
    placeholder: deshabilitado ? '' : (placeholder ?? 'p. ej. insistir en el conflicto…'),
    onChange: (e: { target: { value: string } }) => setTexto(e.target.value),
    onBlur: () => { if (texto !== inicial.current) { inicial.current = texto; onGuardar(texto); } },
  };

  // Con varias líneas es un `textarea` y Enter escribe en vez de guardar: una
  // nota de entrevista se toma en trozos, no en una frase seguida.
  if (lineas) {
    return (
      <textarea
        className={`${styles.nota} ${styles.notaCaja} ${className ?? ''}`}
        rows={lineas}
        {...comunes}
      />
    );
  }

  return (
    <input
      className={`${styles.nota} ${className ?? ''}`}
      type="text"
      {...comunes}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}
