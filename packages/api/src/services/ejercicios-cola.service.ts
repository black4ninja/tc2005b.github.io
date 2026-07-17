import Parse from 'parse/node';
import { config } from '../config/index.js';
import { EnvioEjercicio, type DetalleCasoEnvio } from '../models/EnvioEjercicio.js';
import { EjercicioProgramacion, MARCADOR_SOLUCION } from '../models/EjercicioProgramacion.js';
import { evaluar, type Lenguaje, type ResultadoEvaluacion } from './judge/index.js';

/**
 * Cola del juez. Con recursos reducidos (y Kotlin lento de compilar) NO se puede
 * compilar en paralelo ni bloquear el request HTTP esperando turno: cada envío se
 * ENCOLA y un worker lo procesa 1×1 (concurrencia = config.juez.concurrencia). El
 * front consulta el estado por `jobId` (pendiente → posición en cola → ejecutando
 * → listo/error).
 *
 * Los envíos (`enviar`) se PERSISTEN como `EnvioEjercicio` (historial + cola +
 * completitud) y sobreviven a un reinicio (se re-encolan al arrancar). Las
 * corridas efímeras (`probar`/`ejecutar`) viven solo en memoria.
 */

export type EstadoTrabajo = 'pendiente' | 'ejecutando' | 'listo' | 'error';

interface Trabajo {
  id: string;
  usuarioId: string;
  estado: EstadoTrabajo;
  correr: () => Promise<unknown>;
  resultado?: unknown;
  error?: string;
  creado: number;
  terminado?: number;
}

const trabajos = new Map<string, Trabajo>();
const pendientes: string[] = []; // FIFO de ids
let enProceso = 0;
let contador = 0;

function nuevoId(): string {
  return `job_${Date.now()}_${++contador}`;
}

function purgar(): void {
  // Descarta trabajos terminados hace > 10 min (los efímeros no se consultan más).
  const corte = Date.now() - 10 * 60 * 1000;
  for (const [id, t] of trabajos) {
    if (t.terminado && t.terminado < corte) trabajos.delete(id);
  }
}

function bombear(): void {
  const limite = Math.max(1, config.juez.concurrencia);
  while (enProceso < limite && pendientes.length > 0) {
    const id = pendientes.shift()!;
    const t = trabajos.get(id);
    if (!t) continue;
    enProceso++;
    t.estado = 'ejecutando';
    t.correr()
      .then((r) => { t.estado = 'listo'; t.resultado = r; })
      .catch((e) => { t.estado = 'error'; t.error = (e as Error)?.message ?? 'Error del juez'; })
      .finally(() => { enProceso--; t.terminado = Date.now(); purgar(); bombear(); });
  }
}

/** Encola una corrida y devuelve su jobId. */
export function encolar(usuarioId: string, correr: () => Promise<unknown>): string {
  const id = nuevoId();
  trabajos.set(id, { id, usuarioId, estado: 'pendiente', correr, creado: Date.now() });
  pendientes.push(id);
  bombear();
  return id;
}

export interface EstadoConsulta {
  estado: EstadoTrabajo;
  /** Posición en la cola (1 = siguiente). 0 si ya está ejecutando/terminado. */
  posicion: number;
  resultado?: unknown;
  error?: string;
}

/** Estado de un trabajo; null si no existe (o no es del usuario). */
export function estadoTrabajo(id: string, usuarioId: string): EstadoConsulta | null {
  const t = trabajos.get(id);
  if (!t || t.usuarioId !== usuarioId) return null;
  const posicion = t.estado === 'pendiente' ? pendientes.indexOf(id) + 1 : 0;
  return { estado: t.estado, posicion, resultado: t.resultado, error: t.error };
}

/**
 * Construye el código a compilar: en modo 'plantilla' inserta el código del
 * alumno en el marcador de la plantilla del ejercicio; si no, lo devuelve tal cual.
 */
export function construirCodigo(ej: EjercicioProgramacion, lenguaje: Lenguaje, codigoAlumno: string): string {
  if (ej.getModoEvaluacion() !== 'plantilla') return codigoAlumno;
  const plantilla = ej.getPlantillaCodigo()[lenguaje];
  if (!plantilla) return codigoAlumno;
  return plantilla.split(MARCADOR_SOLUCION).join(codigoAlumno);
}

async function cargarEnvioConEjercicio(envioId: string): Promise<EnvioEjercicio> {
  const q = new Parse.Query(EnvioEjercicio);
  q.include('ejercicio' as any);
  return q.get(envioId, { useMasterKey: true });
}

/** Evalúa un EnvioEjercicio persistido y guarda su resultado. */
async function procesarEnvio(envioId: string): Promise<{ resultado: ResultadoEvaluacion; envioId: string }> {
  const envio = await cargarEnvioConEjercicio(envioId);
  const ej = envio.getEjercicio();
  if (!ej) throw new Error('Ejercicio del envío no encontrado');

  envio.setEstado('ejecutando');
  await envio.save(null, { useMasterKey: true });

  const lenguaje = envio.getLenguaje() as Lenguaje;
  const codigo = construirCodigo(ej, lenguaje, envio.getCodigo());
  const limites = { tiempoMs: ej.getLimiteTiempoMs(), memoriaMb: ej.getLimiteMemoriaMb() };

  try {
    const resultado = await evaluar({ lenguaje, codigo, casos: ej.getCasos(), limites });
    envio.setEstado('listo');
    envio.setVeredicto(resultado.veredicto);
    envio.setCasosPasados(resultado.casosPasados);
    envio.setCasosTotales(resultado.casosTotales);
    envio.setDetalle({ casos: resultado.casos as DetalleCasoEnvio[], errorCompilacion: resultado.errorCompilacion });
    envio.setTiempoMaxMs(resultado.tiempoMaxMs);
    await envio.save(null, { useMasterKey: true });
    return { resultado, envioId: envio.id! };
  } catch (e) {
    envio.setEstado('error');
    await envio.save(null, { useMasterKey: true }).catch(() => {});
    throw e;
  }
}

/** Encola la evaluación de un envío ya persistido. */
export function encolarEnvio(usuarioId: string, envioId: string): string {
  return encolar(usuarioId, () => procesarEnvio(envioId));
}

/**
 * Al arrancar el servidor: los envíos que quedaron 'pendiente'/'ejecutando' (por
 * un reinicio) se re-encolan para no perderse. Sin dueño en memoria: se encolan
 * con el alumno como usuarioId para que su propio polling los reencuentre.
 */
export async function recuperarEnviosPendientes(): Promise<number> {
  const q = new Parse.Query(EnvioEjercicio);
  q.containedIn('estado', ['pendiente', 'ejecutando']);
  q.equalTo('exists' as any, true as any);
  q.include('alumno' as any);
  q.limit(1000);
  const envios = await q.find({ useMasterKey: true });
  for (const e of envios) e.setEstado('pendiente');
  if (envios.length) await Parse.Object.saveAll(envios, { useMasterKey: true }).catch(() => {});
  for (const e of envios) encolarEnvio(e.get('alumno')?.id ?? 'sistema', e.id!);
  return envios.length;
}
