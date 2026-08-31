import Parse from 'parse/node';
import { EquipoScrum } from '../models/EquipoScrum.js';
import { HistoriaUsuario } from '../models/HistoriaUsuario.js';
import { SprintScrum } from '../models/SprintScrum.js';
import type { SprintEquipo, CorteBurndown } from '../models/SprintEquipo.js';
import {
  COLUMNAS_DEL_SPRINT, PUNTOS_POR_PENALIZACION,
} from '../constants/scrum.js';
import {
  equiposDeDinamica, historiasDeEquipos, marcadorVivo, puntosComprometidos, puntosRestantes,
} from './scrum.service.js';

/**
 * El ritual de fin de iteración y el cobro de la deuda técnica.
 *
 * Es la parte de la dinámica que enseña lo que ninguna diapositiva enseña: que
 * no terminar tiene un precio, y que ese precio no se paga cuando se decide sino
 * cuando toca volver a planear. Todo lo de aquí ocurre en dos momentos y en
 * ninguno más: al cerrar un sprint y al salir del planning del siguiente.
 */

/* ------------------------------------------------------------------ */
/*  Cortes del burndown                                                */
/* ------------------------------------------------------------------ */

/** El hito con el que arranca todo burndown: lo que el equipo se comprometió. */
export const ETIQUETA_COMPROMISO = 'Compromiso';

/**
 * Guarda cuántos puntos quedaban en este instante.
 *
 * El burndown se dibuja con estos cortes y no con una función del tiempo: un
 * sprint de la dinámica dura tres minutos, así que una curva continua no diría
 * nada. Un corte por cambio de etapa es exactamente el ritmo al que la actividad
 * pide «actualicen su burndown chart».
 */
export async function tomarCorte(
  sprintId: string,
  equipoId: string,
  etiqueta: string,
  /** Ya traídas por quien llama: en un cambio de etapa son cinco equipos y
   *  pedirlas una vez por equipo eran cinco viajes a la base de más. */
  yaTraidas?: HistoriaUsuario[],
): Promise<void> {
  const marcador = await marcadorVivo(sprintId, equipoId);
  const historias = yaTraidas ?? await historiasDeEquipos([equipoId]);
  const corte: CorteBurndown = {
    en: new Date().toISOString(),
    etiqueta,
    restantes: puntosRestantes(historias),
  };
  const cortes = marcador.getCortes();
  // Dos cambios de etapa seguidos sin que nadie mueva nada no aportan un punto
  // nuevo a la gráfica: se sustituye el último en vez de añadir uno igual.
  const ultimo = cortes[cortes.length - 1];
  if (ultimo && ultimo.restantes === corte.restantes && ultimo.etiqueta === corte.etiqueta) {
    cortes[cortes.length - 1] = corte;
  } else {
    cortes.push(corte);
  }
  marcador.setCortes(cortes.slice(-40));
  await marcador.save(null, { useMasterKey: true });
}

/**
 * Fija cuánto se comprometió el equipo y cuánto le quitó la deuda. Se llama al
 * salir del planning, DESPUÉS de cobrar: lo planeado es lo que le queda.
 */
export async function fijarPlaneados(
  sprintId: string,
  equipoId: string,
  devueltos = 0,
  yaTraidas?: HistoriaUsuario[],
  /** Cuántos hitos tiene el ciclo, para la línea ideal. Ver `getPasos`. */
  pasos = 0,
): Promise<void> {
  const marcador = await marcadorVivo(sprintId, equipoId);
  const historias = yaTraidas ?? await historiasDeEquipos([equipoId]);
  const comprometidos = puntosComprometidos(historias);
  marcador.setPlaneados(comprometidos);
  if (devueltos > 0) marcador.setDevueltos(devueltos);
  if (pasos > 0) marcador.setPasos(pasos);

  // El primer punto de la gráfica es el COMPROMISO, y este es el momento en que
  // existe. Antes el primer corte se tomaba al entrar en el planning, con el
  // sprint backlog todavía vacío: la curva empezaba cayendo a cero y volvía a
  // subir mientras planeaban, que es lo que se veía raro.
  const cortes = marcador.getCortes();
  if (!cortes.some((c) => c.etiqueta === ETIQUETA_COMPROMISO)) {
    marcador.setCortes([
      { en: new Date().toISOString(), etiqueta: ETIQUETA_COMPROMISO, restantes: comprometidos },
      ...cortes,
    ]);
  }
  await marcador.save(null, { useMasterKey: true });
}

/* ------------------------------------------------------------------ */
/*  Deuda técnica                                                      */
/* ------------------------------------------------------------------ */

/**
 * Qué historias se devuelven al backlog para cubrir el bloqueo.
 *
 * PURA y con la fuente de azar inyectada para poder probarla: es la regla más
 * caótica de la dinámica y la que peor se nota si falla.
 *
 * Se pasa de largo a propósito. Con 7 de bloqueo y tarjetas de 5 y 3 devuelve
 * las dos, 8 puntos: buscar la combinación exacta convertiría el castigo en un
 * rompecabezas resoluble y quitaría justo lo que enseña —que la deuda no se
 * negocia—.
 */
export function elegirDevueltas<T extends { puntos: number }>(
  candidatas: T[],
  bloqueo: number,
  azar: () => number = Math.random,
): T[] {
  if (bloqueo <= 0 || candidatas.length === 0) return [];
  const baraja = [...candidatas];
  for (let i = baraja.length - 1; i > 0; i -= 1) {
    const j = Math.floor(azar() * (i + 1));
    [baraja[i], baraja[j]] = [baraja[j], baraja[i]];
  }
  const elegidas: T[] = [];
  let suma = 0;
  for (const c of baraja) {
    if (suma >= bloqueo) break;
    elegidas.push(c);
    suma += Math.max(0, c.puntos);
  }
  return elegidas;
}

export interface CobroDeuda {
  devueltas: { id: string; porQue: string; puntos: number }[];
  puntos: number;
  /** Se llevó por delante TODO lo que habían planeado. */
  arrasó: boolean;
}

/**
 * Cobra la deuda de un equipo: devuelve al backlog historias al azar de las que
 * acaba de planear, hasta cubrir su bloqueo.
 *
 * Solo toca `planned`: lo que venía de antes en doing o review se queda: «solo
 * podrán seguir trabajando en lo que dejaron del sprint anterior» es
 * exactamente eso.
 */
export async function cobrarDeuda(
  equipo: EquipoScrum,
  yaTraidas?: HistoriaUsuario[],
): Promise<CobroDeuda | null> {
  const bloqueo = equipo.getBloqueoPendiente();
  if (bloqueo <= 0) return null;

  const historias = yaTraidas ?? await historiasDeEquipos([equipo.id!]);
  const candidatas = historias.filter((h) => h.getColumna() === 'planned');
  const elegidas = elegirDevueltas(
    candidatas.map((h) => ({ id: h.id!, puntos: Math.max(0, h.getPuntos()), historia: h })),
    bloqueo,
  );
  if (elegidas.length === 0 && candidatas.length === 0) {
    // Sin nada que devolver la deuda se salda igual: arrastrarla otra vez
    // castigaría dos veces lo mismo.
    equipo.setBloqueoPendiente(0);
    await equipo.save(null, { useMasterKey: true });
    return { devueltas: [], puntos: 0, arrasó: false };
  }

  const aGuardar: Parse.Object[] = [];
  let puntos = 0;
  for (const e of elegidas) {
    e.historia.setColumna('backlog');
    aGuardar.push(e.historia);
    puntos += e.puntos;
  }

  // La deuda se salda aunque no hubiera con qué pagarla entera: arrastrarla otra
  // vez castigaría dos veces lo mismo y el equipo no saldría nunca del pozo.
  equipo.setBloqueoPendiente(0);
  aGuardar.push(equipo);
  await Parse.Object.saveAll(aGuardar, { useMasterKey: true });

  return {
    devueltas: elegidas.map((e) => ({
      id: e.id,
      porQue: e.historia.getPorQue(),
      puntos: e.puntos,
    })),
    puntos,
    arrasó: elegidas.length === candidatas.length && candidatas.length > 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Cierre del sprint                                                  */
/* ------------------------------------------------------------------ */

export interface CierreEquipo {
  equipoId: string;
  nombre: string;
  cerrados: number;
  abiertas: number;
  abiertosPts: number;
  penalizaciones: number;
  bloqueo: number;
  archivadas: number;
}

/**
 * Cierra el sprint de toda la dinámica.
 *
 * Por cada equipo: lo terminado se archiva —sale del tablero pero queda en el
 * histórico—, lo que se quedó abierto se queda donde está, y de ahí sale el
 * bloqueo con el que arrancará el siguiente sprint.
 *
 * `penalizaciones` viene del profesor, que las recoge del PO de cada equipo en
 * el review. No se deducen solas: comprobar a ojo si un modelo mide más de diez
 * centímetros es justo lo que un sistema no puede hacer.
 */
export async function cerrarSprint(
  dinamicaId: string,
  sprintId: string,
  penalizaciones: Record<string, number>,
): Promise<CierreEquipo[]> {
  const sprint = SprintScrum.createWithoutData(sprintId) as SprintScrum;
  const equipos = await equiposDeDinamica(dinamicaId);
  const resultado: CierreEquipo[] = [];
  const aGuardar: Parse.Object[] = [];
  const marcadores: SprintEquipo[] = [];

  for (const equipo of equipos) {
    const historias = await historiasDeEquipos([equipo.id!]);
    const terminadas = historias.filter((h) => h.getColumna() === 'done');
    const abiertas = historias.filter(
      (h) => COLUMNAS_DEL_SPRINT.includes(h.getColumna()) && h.getColumna() !== 'done',
    );

    const cerrados = terminadas.reduce((t, h) => t + Math.max(0, h.getPuntos()), 0);
    const abiertosPts = abiertas.reduce((t, h) => t + Math.max(0, h.getPuntos()), 0);
    const pen = Math.max(0, Math.trunc(penalizaciones[equipo.id!] ?? 0));
    const bloqueo = abiertosPts + pen * PUNTOS_POR_PENALIZACION;

    for (const h of terminadas) {
      h.setArchivada(true);
      h.setSprintCerrado(sprint);
      aGuardar.push(h);
    }

    const marcador = await marcadorVivo(sprintId, equipo.id!);
    marcador.setCerrados(cerrados);
    marcador.setAbiertas(abiertas.length);
    marcador.setAbiertosPts(abiertosPts);
    marcador.setPenalizaciones(pen);
    marcador.setBloqueo(bloqueo);
    // Último corte del burndown: dónde se quedó la línea al cerrar.
    marcador.setCortes([
      ...marcador.getCortes(),
      { en: new Date().toISOString(), etiqueta: 'Cierre', restantes: abiertosPts },
    ]);
    marcadores.push(marcador);

    equipo.setBloqueoPendiente(bloqueo);
    aGuardar.push(equipo);

    resultado.push({
      equipoId: equipo.id!,
      nombre: equipo.getNombre(),
      cerrados,
      abiertas: abiertas.length,
      abiertosPts,
      penalizaciones: pen,
      bloqueo,
      archivadas: terminadas.length,
    });
  }

  const sprintVivo = await new Parse.Query<SprintScrum>('SprintScrum')
    .get(sprintId, { useMasterKey: true });
  sprintVivo.setCerrado(true);
  sprintVivo.setCerradoEn(new Date());

  await Parse.Object.saveAll([...aGuardar, ...marcadores, sprintVivo], { useMasterKey: true });
  return resultado;
}

/**
 * Historias que nunca salieron del backlog en toda la dinámica. Es media
 * respuesta a «¿priorizar sirvió de algo?».
 */
export async function nuncaSalieronDelBacklog(equipoId: string): Promise<HistoriaUsuario[]> {
  const historias = await historiasDeEquipos([equipoId], { incluirArchivadas: true });
  return historias.filter((h) => !h.getArchivada() && h.getColumna() === 'backlog');
}
