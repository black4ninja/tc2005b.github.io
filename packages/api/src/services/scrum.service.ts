import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';
import { EtapaScrum } from '../models/EtapaScrum.js';
import { DinamicaScrum } from '../models/DinamicaScrum.js';
import { EquipoScrum } from '../models/EquipoScrum.js';
import { HistoriaUsuario } from '../models/HistoriaUsuario.js';
import { COLUMNAS, COLORES_EQUIPO, ETAPAS_SEMILLA, type Columna } from '../constants/scrum.js';
import { cuantosEscuchanTablero, publicarTablero } from './scrum-bus.js';

/**
 * Lecturas compartidas del módulo "Actividad de Scrum".
 *
 * Las mismas tres consultas —dinámica, equipos, historias— las necesitan el
 * panel del profesor, el tablero del alumno y la pantalla que se proyecta. Están
 * aquí y no repetidas en cada controlador porque cualquier divergencia entre
 * ellas se ve en el aula como «a mí no me sale lo mismo que en el proyector».
 */

/** Índice de una columna, para ordenar el tablero de izquierda a derecha. */
const ORDEN_COLUMNA = new Map<Columna, number>(COLUMNAS.map((c, i) => [c, i]));

/**
 * El catálogo de etapas del grupo, sembrando las cinco por defecto la primera
 * vez.
 *
 * Se siembra al LEER y no al crear el grupo porque los grupos ya existen: pedir
 * una migración para estrenar el módulo sería pedirle al profesor que abra una
 * pantalla vacía y adivine qué escribir. Es idempotente: solo siembra si no hay
 * ninguna, incluidas las que el profesor haya borrado a mano (si las borra
 * todas y vuelve, le renacen las cinco, que es lo menos sorprendente).
 */
export async function etapasDeGrupo(grupoId: string): Promise<EtapaScrum[]> {
  const q = new Parse.Query<EtapaScrum>('EtapaScrum');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  q.equalTo('exists' as any, true as any);
  q.ascending('orden');
  q.addAscending('createdAt' as any);
  q.limit(200);
  const existentes = await q.find({ useMasterKey: true });
  if (existentes.length > 0) return existentes;

  const nuevas = ETAPAS_SEMILLA.map((semilla, i) => {
    const etapa = new EtapaScrum().initDefaults();
    etapa.setGrupo(Grupo.createWithoutData(grupoId) as Grupo);
    etapa.setNombre(semilla.nombre);
    etapa.setColor(semilla.color);
    etapa.setPista(semilla.pista);
    etapa.setOrden(i);
    return etapa;
  });
  await Parse.Object.saveAll(nuevas, { useMasterKey: true });
  return nuevas;
}

/** Las dinámicas del grupo, la más reciente primero. */
export async function dinamicasDeGrupo(grupoId: string): Promise<DinamicaScrum[]> {
  const q = new Parse.Query<DinamicaScrum>('DinamicaScrum');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  q.equalTo('exists' as any, true as any);
  q.include('etapaActual' as any);
  q.descending('createdAt');
  q.limit(200);
  return q.find({ useMasterKey: true });
}

/**
 * Una dinámica por id, comprobando que sea del grupo de la ruta.
 *
 * La comprobación va AQUÍ y no en el guard: el middleware verifica el acceso al
 * grupo, no que el recurso pedido le pertenezca. Sin esto, un profesor con un
 * grupo podría leer y escribir la dinámica de otro cambiando el id de la URL.
 */
export async function cargarDinamica(
  dinamicaId: string,
  grupoId: string,
): Promise<DinamicaScrum | null> {
  const q = new Parse.Query<DinamicaScrum>('DinamicaScrum');
  q.equalTo('exists' as any, true as any);
  q.include('etapaActual' as any);
  try {
    const dinamica = await q.get(dinamicaId, { useMasterKey: true });
    return dinamica.getGrupoId() === grupoId ? dinamica : null;
  } catch {
    return null;
  }
}

/** La dinámica ABIERTA más reciente del grupo: la que el alumno ve al entrar. */
export async function dinamicaVigente(grupoId: string): Promise<DinamicaScrum | null> {
  const q = new Parse.Query<DinamicaScrum>('DinamicaScrum');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  q.equalTo('exists' as any, true as any);
  q.notEqualTo('cerrada' as any, true as any);
  q.include('etapaActual' as any);
  q.descending('createdAt');
  return (await q.first({ useMasterKey: true })) ?? null;
}

export async function equiposDeDinamica(dinamicaId: string): Promise<EquipoScrum[]> {
  const q = new Parse.Query<EquipoScrum>('EquipoScrum');
  q.equalTo('dinamica' as any, DinamicaScrum.createWithoutData(dinamicaId) as any);
  q.equalTo('exists' as any, true as any);
  q.include('miembros' as any);
  q.ascending('orden');
  q.addAscending('createdAt' as any);
  q.limit(50);
  return q.find({ useMasterKey: true });
}

/** Todas las historias de esos equipos, ya ordenadas como se pintan. */
export async function historiasDeEquipos(equipoIds: string[]): Promise<HistoriaUsuario[]> {
  if (equipoIds.length === 0) return [];
  const q = new Parse.Query<HistoriaUsuario>('HistoriaUsuario');
  q.containedIn(
    'equipo' as any,
    equipoIds.map((id) => EquipoScrum.createWithoutData(id)) as any,
  );
  q.equalTo('exists' as any, true as any);
  q.include('responsable' as any);
  q.limit(2000);
  const historias = await q.find({ useMasterKey: true });
  // El orden se aplica en memoria: son pocas y ordenar por dos campos en Parse
  // obliga a un índice compuesto que no vale la pena para 9 equipos.
  return historias.sort((a, b) => {
    const ca = ORDEN_COLUMNA.get(a.getColumna()) ?? 0;
    const cb = ORDEN_COLUMNA.get(b.getColumna()) ?? 0;
    if (ca !== cb) return ca - cb;
    if (a.getOrden() !== b.getOrden()) return a.getOrden() - b.getOrden();
    return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
  });
}

export interface EquipoConTablero extends Record<string, unknown> {
  id: string;
  historias: Record<string, unknown>[];
}

/** Los equipos con sus historias colgando, que es como se pinta el tablero. */
export function armarTableros(
  equipos: EquipoScrum[],
  historias: HistoriaUsuario[],
): EquipoConTablero[] {
  const porEquipo = new Map<string, HistoriaUsuario[]>();
  for (const h of historias) {
    const id = h.getEquipoId();
    if (!id) continue;
    const lista = porEquipo.get(id) ?? [];
    lista.push(h);
    porEquipo.set(id, lista);
  }
  return equipos.map((e) => ({
    ...(e.toSafeJSON() as Record<string, unknown>),
    id: e.id!,
    historias: (porEquipo.get(e.id!) ?? []).map((h) => h.toSafeJSON()),
  }));
}

/** El equipo del alumno dentro de una dinámica, o null si no le tocó ninguno. */
export async function equipoDelAlumno(
  dinamicaId: string,
  alumnoId: string,
): Promise<EquipoScrum | null> {
  const q = new Parse.Query<EquipoScrum>('EquipoScrum');
  q.equalTo('dinamica' as any, DinamicaScrum.createWithoutData(dinamicaId) as any);
  q.equalTo('exists' as any, true as any);
  q.equalTo('miembros' as any, AppUser.createWithoutData(alumnoId) as any);
  q.include('miembros' as any);
  return (await q.first({ useMasterKey: true })) ?? null;
}

/** Un equipo por id, comprobando que sea de la dinámica indicada. */
export async function cargarEquipo(
  equipoId: string,
  dinamicaId?: string,
): Promise<EquipoScrum | null> {
  const q = new Parse.Query<EquipoScrum>('EquipoScrum');
  q.equalTo('exists' as any, true as any);
  q.include('miembros' as any);
  try {
    const equipo = await q.get(equipoId, { useMasterKey: true });
    if (dinamicaId && equipo.getDinamicaId() !== dinamicaId) return null;
    return equipo;
  } catch {
    return null;
  }
}

/** El color que le toca al equipo n-ésimo de la dinámica. */
export function colorParaEquipo(indice: number): string {
  return COLORES_EQUIPO[indice % COLORES_EQUIPO.length];
}

/**
 * Siguiente posición libre en una columna. Las tarjetas nuevas caen al FINAL,
 * que es donde el ojo las busca después de escribirlas.
 */
export function siguienteOrdenEnColumna(
  historias: HistoriaUsuario[],
  columna: Columna,
): number {
  const dela = historias.filter((h) => h.getColumna() === columna);
  return dela.length === 0 ? 0 : Math.max(...dela.map((h) => h.getOrden())) + 1;
}

/* ------------------------------------------------------------------ */
/*  Estado vivo de una dinámica                                        */
/* ------------------------------------------------------------------ */

export interface EstadoDinamica {
  dinamica: Record<string, unknown>;
  equipos: EquipoConTablero[];
  serverNow: string;
}

/**
 * Todo lo que hay que saber de una dinámica para pintarla: la dinámica con su
 * etapa y los equipos con sus historias.
 *
 * Es el MISMO objeto para el tablero del alumno y para la proyección. Cada
 * pantalla se queda con lo suyo: el alumno filtra su equipo y la proyección los
 * que el profesor eligió. Se construye una sola vez por cambio y se reparte a
 * todos los que escuchan; construir uno por conexión eran treinta consultas
 * cada vez que alguien arrastraba una tarjeta.
 */
export async function construirEstadoDinamica(dinamicaId: string): Promise<EstadoDinamica | null> {
  const q = new Parse.Query<DinamicaScrum>('DinamicaScrum');
  q.equalTo('exists' as any, true as any);
  q.include('etapaActual' as any);
  let dinamica: DinamicaScrum;
  try {
    dinamica = await q.get(dinamicaId, { useMasterKey: true });
  } catch {
    return null;
  }
  const equipos = await equiposDeDinamica(dinamicaId);
  const historias = await historiasDeEquipos(equipos.map((e) => e.id!));
  return {
    dinamica: dinamica.toSafeJSON(),
    equipos: armarTableros(equipos, historias),
    serverNow: new Date().toISOString(),
  };
}

/**
 * Avisa a las pantallas abiertas de que algo cambió.
 *
 * No construye nada si no hay nadie escuchando, que es el caso normal fuera de
 * clase. Nunca lanza: un fallo avisando no puede tumbar la petición que ya
 * guardó el cambio — la pantalla se enteraría igual en su siguiente refresco.
 */
export async function difundirTablero(dinamicaId: string): Promise<void> {
  if (cuantosEscuchanTablero(dinamicaId) === 0) return;
  try {
    const estado = await construirEstadoDinamica(dinamicaId);
    if (estado) publicarTablero(dinamicaId, estado);
  } catch { /* la pantalla se pone al día en su siguiente refresco */ }
}
