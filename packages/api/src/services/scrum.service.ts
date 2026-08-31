import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';
import { EtapaScrum } from '../models/EtapaScrum.js';
import { DinamicaScrum } from '../models/DinamicaScrum.js';
import { EquipoScrum } from '../models/EquipoScrum.js';
import { HistoriaUsuario } from '../models/HistoriaUsuario.js';
import { EpicaScrum } from '../models/EpicaScrum.js';
import { SprintScrum } from '../models/SprintScrum.js';
import { SprintEquipo } from '../models/SprintEquipo.js';
import { TarjetaRetro } from '../models/TarjetaRetro.js';
import {
  COLUMNAS, COLUMNAS_DEL_SPRINT, COLORES_EQUIPO, ETAPAS_SEMILLA,
  OBJETIVOS_SPRINT_SEMILLA, POLITICA_POR_DEFECTO, type Columna, type PoliticaEtapa,
} from '../constants/scrum.js';
import { cuantosEscuchanTablero, publicarTablero } from './scrum-bus.js';
import { bloqueosVigentes } from './scrum-bloqueos.js';

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
  if (existentes.length > 0) return sembrarPoliticasQueFaltan(grupoId, existentes);

  const nuevas = ETAPAS_SEMILLA.map((semilla, i) => {
    const etapa = new EtapaScrum().initDefaults();
    etapa.setGrupo(Grupo.createWithoutData(grupoId) as Grupo);
    etapa.setNombre(semilla.nombre);
    etapa.setColor(semilla.color);
    etapa.setPista(semilla.pista);
    etapa.setPolitica(semilla.politica);
    etapa.setOrden(i);
    return etapa;
  });
  await Parse.Object.saveAll(nuevas, { useMasterKey: true });
  return nuevas;
}

/**
 * Les pone su política a las etapas que se crearon ANTES de que las etapas
 * tuvieran política.
 *
 * Se hace al leer y una sola vez: sin campo guardado, `getPolitica()` devuelve
 * la política por defecto —todo editable—, y un grupo que ya tenía sus cinco
 * etapas se habría quedado sin la mitad del módulo sin decir por qué. Solo toca
 * las que no tienen nada guardado, así que no pisa lo que el profesor configure.
 */
async function sembrarPoliticasQueFaltan(
  grupoId: string,
  etapas: EtapaScrum[],
): Promise<EtapaScrum[]> {
  const porNombre = new Map(ETAPAS_SEMILLA.map((x) => [x.nombre.toLowerCase(), x]));
  const nombres = etapas.map((e) => e.getNombre().trim().toLowerCase());

  const tocadas: EtapaScrum[] = [];
  for (const etapa of etapas.filter((e) => !e.get('politica'))) {
    const semilla = porNombre.get(etapa.getNombre().trim().toLowerCase());
    if (!semilla) continue;
    etapa.setPolitica(semilla.politica);
    if (!etapa.getPista()) etapa.setPista(semilla.pista);
    tocadas.push(etapa);
  }

  // Y las correcciones de la semilla, que ya han hecho falta dos veces: un
  // desarrollo que dejaba meter historias a un sprint empezado y una daily en la
  // que se movían tarjetas. Se aplican a las etapas que el profesor NO ha
  // configurado; en cuanto toca una, esa deja de escucharlas para siempre.
  for (const etapa of etapas.filter((e) => e.get('politica') && !e.getPoliticaTocada())) {
    const semilla = porNombre.get(etapa.getNombre().trim().toLowerCase());
    if (!semilla || tocadas.includes(etapa)) continue;
    const guardada = etapa.getPolitica();
    const claves = Object.keys(semilla.politica) as (keyof PoliticaEtapa)[];
    if (claves.every((k) => guardada[k] === semilla.politica[k])) continue;
    etapa.setPolitica(semilla.politica);
    tocadas.push(etapa);
  }

  if (tocadas.length > 0) await Parse.Object.saveAll(tocadas, { useMasterKey: true });

  // Y las etapas de la semilla que aún no existen —«Desarrollo» se añadió
  // después—, pero SOLO si el catálogo sigue siendo el original: en cuanto el
  // profesor renombra o añade algo, esto deja de tocarlo. Sin este añadido, un
  // grupo antiguo se queda con cinco etapas que bloquean algo y ninguna en la
  // que se pueda construir.
  const intacto = nombres.every((n) => porNombre.has(n));
  const faltantes = intacto ? ETAPAS_SEMILLA.filter(
    (x) => !nombres.includes(x.nombre.toLowerCase()),
  ) : [];
  if (faltantes.length === 0) return etapas;

  const nuevas = faltantes.map((semilla) => {
    const etapa = new EtapaScrum().initDefaults();
    etapa.setGrupo(Grupo.createWithoutData(grupoId) as Grupo);
    etapa.setNombre(semilla.nombre);
    etapa.setColor(semilla.color);
    etapa.setPista(semilla.pista);
    etapa.setPolitica(semilla.politica);
    // En el orden que les toca en el ciclo, no al final de la lista.
    etapa.setOrden(ETAPAS_SEMILLA.findIndex((x) => x.nombre === semilla.nombre));
    return etapa;
  });
  await Parse.Object.saveAll(nuevas, { useMasterKey: true });
  return [...etapas, ...nuevas].sort((a, b) => a.getOrden() - b.getOrden());
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
/**
 * La dinámica PELADA: sin desplegar la etapa ni el sprint.
 *
 * Cada `include` es un viaje más contra una base remota, y para cambiar de
 * etapa no hacen falta: el catálogo de etapas se lee igualmente al lado —de ahí
 * sale la anterior— y del sprint solo se necesita el id, que el puntero ya
 * trae. Es la mitad de lo que costaba el gesto que más se pulsa en clase.
 */
export async function cargarDinamicaLigera(
  dinamicaId: string,
  grupoId: string,
): Promise<DinamicaScrum | null> {
  const q = new Parse.Query<DinamicaScrum>('DinamicaScrum');
  q.equalTo('exists' as any, true as any);
  try {
    const dinamica = await q.get(dinamicaId, { useMasterKey: true });
    return dinamica.getGrupoId() === grupoId ? dinamica : null;
  } catch {
    return null;
  }
}

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

/**
 * La dinámica que el alumno ve al entrar: la ABIERTA más reciente.
 *
 * Y si no hay ninguna abierta, la última FINALIZADA. Sin esto, terminar la
 * dinámica dejaba al equipo con un «todavía no hay ninguna» justo cuando lo que
 * tiene que ver es su resumen — que es la pantalla que contesta las preguntas
 * del cierre de la sesión.
 */
export async function dinamicaVigente(grupoId: string): Promise<DinamicaScrum | null> {
  const abierta = new Parse.Query<DinamicaScrum>('DinamicaScrum');
  abierta.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  abierta.equalTo('exists' as any, true as any);
  abierta.notEqualTo('cerrada' as any, true as any);
  abierta.include('etapaActual' as any);
  abierta.include('sprintActual' as any);
  abierta.descending('createdAt');
  const viva = await abierta.first({ useMasterKey: true });
  if (viva) return viva;

  const terminada = new Parse.Query<DinamicaScrum>('DinamicaScrum');
  terminada.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  terminada.equalTo('exists' as any, true as any);
  terminada.equalTo('finalizada' as any, true as any);
  terminada.include('etapaActual' as any);
  terminada.include('sprintActual' as any);
  terminada.descending('updatedAt');
  return (await terminada.first({ useMasterKey: true })) ?? null;
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
export async function historiasDeEquipos(
  equipoIds: string[],
  opciones: { incluirArchivadas?: boolean } = {},
): Promise<HistoriaUsuario[]> {
  if (equipoIds.length === 0) return [];
  const q = new Parse.Query<HistoriaUsuario>('HistoriaUsuario');
  q.containedIn(
    'equipo' as any,
    equipoIds.map((id) => EquipoScrum.createWithoutData(id)) as any,
  );
  q.equalTo('exists' as any, true as any);
  // Lo archivado sale del tablero pero no de la base: la columna «Archived» va
  // plegada y es el histórico del que sale el resumen final.
  if (!opciones.incluirArchivadas) q.notEqualTo('archivada' as any, true as any);
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
  etapa: Record<string, unknown> | null;
  sprint: Record<string, unknown> | null;
  equipos: EquipoConTablero[];
  /** Quién está editando qué ahora mismo. Ver `scrum-bloqueos`. */
  bloqueos: { recurso: string; quien: string; nombre: string }[];
  serverNow: string;
}

/**
 * Todo lo que hay que saber de una dinámica para pintarla: la dinámica con su
 * etapa y su sprint, y cada equipo con sus historias, sus épicas, sus
 * compromisos, su retro y su marcador.
 *
 * Es el MISMO objeto para el tablero del alumno y para la proyección. Cada
 * pantalla se queda con lo suyo. Se construye una sola vez por cambio y se
 * reparte a todos los que escuchan; construir uno por conexión eran treinta
 * consultas cada vez que alguien arrastraba una tarjeta.
 */
export async function construirEstadoDinamica(
  dinamicaId: string,
  /**
   * Lo que quien llama ya tenga leído. El tablero del alumno acaba de cargar la
   * dinámica y sus equipos para saber en cuál está: volver a pedirlos aquí eran
   * dos viajes más a una base remota en la pantalla que más se abre de todo el
   * módulo.
   */
  precargado?: { dinamica?: DinamicaScrum | null; equipos?: EquipoScrum[] },
): Promise<EstadoDinamica | null> {
  let dinamica = precargado?.dinamica ?? null;
  if (!dinamica) {
    const q = new Parse.Query<DinamicaScrum>('DinamicaScrum');
    q.equalTo('exists' as any, true as any);
    q.include('etapaActual' as any);
    q.include('sprintActual' as any);
    try {
      dinamica = await q.get(dinamicaId, { useMasterKey: true });
    } catch {
      return null;
    }
  }

  const equipos = precargado?.equipos ?? (await equiposDeDinamica(dinamicaId));
  const ids = equipos.map((e) => e.id!);
  const sprint = dinamica.getSprintActual();
  const sprintId = sprint?.id ?? null;

  const [historias, archivadas, epicas, retro, compromisos, marcadores] = await Promise.all([
    historiasDeEquipos(ids),
    contarArchivadas(ids),
    epicasDeEquipos(ids),
    sprintId ? tarjetasRetroDeEquipos(ids, sprintId) : Promise.resolve([]),
    compromisosDeEquipos(ids, sprintId),
    sprintId ? marcadoresDeSprint(sprintId) : Promise.resolve([]),
  ]);

  const porEquipo = <T>(lista: T[], id: (x: T) => string) => {
    const mapa = new Map<string, T[]>();
    for (const x of lista) {
      const k = id(x);
      if (!k) continue;
      const suyos = mapa.get(k) ?? [];
      suyos.push(x);
      mapa.set(k, suyos);
    }
    return mapa;
  };

  const hPorEquipo = porEquipo(historias, (h) => h.getEquipoId());
  const ePorEquipo = porEquipo(epicas, (e) => e.getEquipoId());
  const rPorEquipo = porEquipo(retro, (t) => t.getEquipoId());
  const cPorEquipo = porEquipo(compromisos, (t) => t.getEquipoId());
  const mPorEquipo = new Map(marcadores.map((m) => [m.getEquipoId(), m]));

  const etapa = dinamica.getEtapaActual();

  return {
    dinamica: dinamica.toSafeJSON(),
    etapa: etapa
      ? {
        id: etapa.id,
        nombre: etapa.get('nombre') ?? '',
        color: etapa.get('color') ?? '#64748b',
        pista: etapa.get('pista') ?? '',
        politica: { ...POLITICA_POR_DEFECTO, ...(etapa.get('politica') ?? {}) },
      }
      : null,
    sprint: sprint
      ? {
        id: sprint.id,
        numero: sprint.get('numero') ?? 1,
        objetivo: sprint.get('objetivo') ?? '',
        cerrado: sprint.get('cerrado') === true,
      }
      : null,
    equipos: equipos.map((e) => ({
      ...(e.toSafeJSON() as Record<string, unknown>),
      id: e.id!,
      historias: (hPorEquipo.get(e.id!) ?? []).map((h) => h.toSafeJSON()),
      epicas: (ePorEquipo.get(e.id!) ?? []).map((x) => x.toSafeJSON()),
      retro: (rPorEquipo.get(e.id!) ?? []).map((t) => t.toSafeJSON()),
      compromisos: (cPorEquipo.get(e.id!) ?? []).map((t) => t.toSafeJSON()),
      marcador: mPorEquipo.get(e.id!)?.toSafeJSON() ?? null,
      archivadas: archivadas.get(e.id!) ?? 0,
    })),
    bloqueos: bloqueosVigentes(dinamicaId).map(({ recurso, quien, nombre }) => ({
      recurso, quien, nombre,
    })),
    serverNow: new Date().toISOString(),
  };
}


/**
 * ¿Tiene esta persona otra historia viva a su cargo?
 *
 * «Viva» es todo lo que no está en `done`: si sigue por terminar, sigue siendo
 * su trabajo. Una persona lleva UNA historia a la vez —lo dice la teoría y es lo
 * que hace que el reparto sea una decisión y no un adorno—, y sin esto el equipo
 * se lo repartía todo el primer día y luego nadie sabía de qué respondía.
 *
 * `exceptoId` es la historia que se está tocando: reasignarle a alguien la que
 * ya lleva no es darle una segunda.
 */
export function otraHistoriaViva<T extends {
  id?: string;
  getResponsable(): { id?: string } | null | undefined;
  getColumna(): Columna;
  getArchivada(): boolean;
}>(historias: T[], responsableId: string, exceptoId?: string): T | null {
  return historias.find((h) => h.id !== exceptoId
    && !h.getArchivada()
    && h.getColumna() !== 'done'
    && h.getResponsable()?.id === responsableId) ?? null;
}

/**
 * Cuántas historias archivadas tiene cada equipo. Solo el número: la columna
 * «Archived» va siempre plegada y no enseña las tarjetas, así que traérselas
 * enteras sería pagar por algo que nadie mira.
 */
async function contarArchivadas(equipoIds: string[]): Promise<Map<string, number>> {
  const cuenta = new Map<string, number>();
  if (equipoIds.length === 0) return cuenta;
  const q = new Parse.Query<HistoriaUsuario>('HistoriaUsuario');
  q.containedIn('equipo' as any, equipoIds.map((id) => EquipoScrum.createWithoutData(id)) as any);
  q.equalTo('archivada' as any, true as any);
  q.equalTo('exists' as any, true as any);
  q.select('equipo' as any);
  q.limit(5000);
  for (const h of await q.find({ useMasterKey: true })) {
    const id = h.getEquipoId();
    cuenta.set(id, (cuenta.get(id) ?? 0) + 1);
  }
  return cuenta;
}

/** Tarjetas de retro de varios equipos para un mismo sprint. */
async function tarjetasRetroDeEquipos(
  equipoIds: string[],
  sprintId: string,
): Promise<TarjetaRetro[]> {
  if (equipoIds.length === 0) return [];
  const q = new Parse.Query<TarjetaRetro>('TarjetaRetro');
  q.containedIn('equipo' as any, equipoIds.map((id) => EquipoScrum.createWithoutData(id)) as any);
  q.equalTo('sprint' as any, SprintScrum.createWithoutData(sprintId) as any);
  q.equalTo('exists' as any, true as any);
  q.include('responsable' as any);
  q.ascending('createdAt');
  q.limit(500);
  return q.find({ useMasterKey: true });
}

/** Compromisos abiertos de varios equipos, sin los de la retro en curso. */
async function compromisosDeEquipos(
  equipoIds: string[],
  exceptoSprintId: string | null,
): Promise<TarjetaRetro[]> {
  if (equipoIds.length === 0) return [];
  const q = new Parse.Query<TarjetaRetro>('TarjetaRetro');
  q.containedIn('equipo' as any, equipoIds.map((id) => EquipoScrum.createWithoutData(id)) as any);
  q.equalTo('columna' as any, 'mejorar' as any);
  q.doesNotExist('estado' as any);
  q.equalTo('exists' as any, true as any);
  q.include('responsable' as any);
  q.ascending('createdAt');
  q.limit(500);
  const todas = await q.find({ useMasterKey: true });
  return exceptoSprintId ? todas.filter((t) => t.getSprintId() !== exceptoSprintId) : todas;
}

/**
 * Avisa a las pantallas abiertas de que algo cambió.
 *
 * No construye nada si no hay nadie escuchando, que es el caso normal fuera de
 * clase. Nunca lanza: un fallo avisando no puede tumbar la petición que ya
 * guardó el cambio — la pantalla se enteraría igual en su siguiente refresco.
 */
/**
 * Aviso BARATO de que cambió solo la cabecera: la etapa, su reloj o el sprint.
 *
 * Es el cambio que más corre en clase y el que peor se notaba: reconstruir el
 * estado entero son ocho consultas contra una base remota, casi dos segundos
 * durante los cuales el profesor ya pulsó y a nadie le ha cambiado nada. Aquí
 * no se consulta nada —lo que hace falta ya está en memoria— y cada pantalla
 * fusiona solo esos campos.
 */
export function difundirEtapa(dinamica: DinamicaScrum, etapa: EtapaScrum | null): void {
  const dinamicaId = dinamica.id!;
  if (cuantosEscuchanTablero(dinamicaId) === 0) return;
  // El parche NO lleva el sprint: cambiar de etapa no lo toca, y mandarlo
  // obligaba a desplegarlo —un viaje más— o a mandarlo a medias, que es lo que
  // pasaba: el alumno veía «Sprint 1» sin objetivo durante los dos segundos que
  // tardaba en llegar el estado completo. Quien recibe conserva el suyo.
  publicarTablero(dinamicaId, {
    tipo: 'etapa',
    dinamica: dinamica.toSafeJSON(),
    etapa: etapa
      ? {
        id: etapa.id,
        nombre: etapa.getNombre(),
        color: etapa.getColor(),
        pista: etapa.getPista(),
        politica: etapa.getPolitica(),
      }
      : null,
    serverNow: new Date().toISOString(),
  });
}

export async function difundirTablero(dinamicaId: string): Promise<void> {
  if (cuantosEscuchanTablero(dinamicaId) === 0) return;
  try {
    const estado = await construirEstadoDinamica(dinamicaId);
    if (estado) publicarTablero(dinamicaId, { tipo: 'completo', ...estado });
  } catch { /* la pantalla se pone al día en su siguiente refresco */ }
}

/* ------------------------------------------------------------------ */
/*  Sprints                                                            */
/* ------------------------------------------------------------------ */

export async function sprintsDeDinamica(dinamicaId: string): Promise<SprintScrum[]> {
  const q = new Parse.Query<SprintScrum>('SprintScrum');
  q.equalTo('dinamica' as any, DinamicaScrum.createWithoutData(dinamicaId) as any);
  q.equalTo('exists' as any, true as any);
  q.ascending('numero');
  q.limit(100);
  return q.find({ useMasterKey: true });
}

/**
 * Crea el siguiente sprint y le abre su marcador a cada equipo.
 *
 * El objetivo sale de la presentación de la actividad mientras alcanza —los
 * cuatro sprints que cubre— y después queda vacío para que lo escriba el
 * profesor: la dinámica no tiene por qué terminarse en cuatro iteraciones.
 */
export async function crearSprint(
  dinamicaId: string,
  objetivo?: string,
): Promise<SprintScrum> {
  const previos = await sprintsDeDinamica(dinamicaId);
  const numero = previos.length + 1;

  const sprint = new SprintScrum().initDefaults();
  sprint.setDinamica(DinamicaScrum.createWithoutData(dinamicaId) as DinamicaScrum);
  sprint.setNumero(numero);
  sprint.setObjetivo(objetivo ?? OBJETIVOS_SPRINT_SEMILLA[numero - 1] ?? '');
  sprint.setCerrado(false);
  await sprint.save(null, { useMasterKey: true });

  const equipos = await equiposDeDinamica(dinamicaId);
  const marcadores = equipos.map((e) => {
    const m = new SprintEquipo().initDefaults();
    m.setSprint(sprint);
    m.setEquipo(EquipoScrum.createWithoutData(e.id!) as EquipoScrum);
    return m;
  });
  if (marcadores.length > 0) await Parse.Object.saveAll(marcadores, { useMasterKey: true });

  return sprint;
}

/**
 * Se asegura de que la dinámica tenga un sprint abierto, creándolo si hace
 * falta.
 *
 * Se hace al LEER y no solo al crear la dinámica porque las dinámicas que
 * existían antes de que hubiera sprints se quedarían sin uno para siempre, y sin
 * sprint no hay burndown, ni deuda, ni retro: la mitad del módulo dejaría de
 * funcionar sin decir por qué.
 */
const asegurando = new Map<string, Promise<SprintScrum | null>>();

export async function asegurarSprint(dinamica: DinamicaScrum): Promise<SprintScrum | null> {
  const actual = dinamica.getSprintActual();
  if (actual?.id) return actual as SprintScrum;

  // El profesor y treinta alumnos pueden entrar a la vez y todos encontrarse sin
  // sprint: sin esta cola saldrían treinta «Sprint 1». Basta con una promesa por
  // dinámica porque quien lee habla siempre con el mismo servidor.
  const enCurso = asegurando.get(dinamica.id!);
  if (enCurso) return enCurso;

  const tarea = crearloSiFalta(dinamica).finally(() => asegurando.delete(dinamica.id!));
  asegurando.set(dinamica.id!, tarea);
  return tarea;
}

async function crearloSiFalta(dinamica: DinamicaScrum): Promise<SprintScrum | null> {
  const previos = await sprintsDeDinamica(dinamica.id!);
  const abierto = previos.find((sp) => !sp.getCerrado());
  const sprint = abierto ?? (await crearSprint(dinamica.id!));
  dinamica.setSprintActual(sprint);
  await dinamica.save(null, { useMasterKey: true });
  return sprint;
}

/** El marcador de un sprint, por equipo. */
export async function marcadoresDeSprint(sprintId: string): Promise<SprintEquipo[]> {
  const q = new Parse.Query<SprintEquipo>('SprintEquipo');
  q.equalTo('sprint' as any, SprintScrum.createWithoutData(sprintId) as any);
  q.equalTo('exists' as any, true as any);
  q.limit(100);
  return q.find({ useMasterKey: true });
}

/** Todo el histórico de un equipo, sprint a sprint. */
export async function historicoDeEquipos(equipoIds: string[]): Promise<SprintEquipo[]> {
  if (equipoIds.length === 0) return [];
  const q = new Parse.Query<SprintEquipo>('SprintEquipo');
  q.containedIn('equipo' as any, equipoIds.map((id) => EquipoScrum.createWithoutData(id)) as any);
  q.equalTo('exists' as any, true as any);
  q.include('sprint' as any);
  q.limit(500);
  const filas = await q.find({ useMasterKey: true });
  return filas.sort((a, b) => (a.getSprint()?.get('numero') ?? 0) - (b.getSprint()?.get('numero') ?? 0));
}

export async function historicoDeEquipo(equipoId: string): Promise<SprintEquipo[]> {
  const q = new Parse.Query<SprintEquipo>('SprintEquipo');
  q.equalTo('equipo' as any, EquipoScrum.createWithoutData(equipoId) as any);
  q.equalTo('exists' as any, true as any);
  q.include('sprint' as any);
  q.limit(100);
  const filas = await q.find({ useMasterKey: true });
  return filas.sort((a, b) => (a.getSprint()?.get('numero') ?? 0) - (b.getSprint()?.get('numero') ?? 0));
}


/**
 * Todo lo que cuelga de unos equipos: épicas, tarjetas de retro y marcadores.
 *
 * Se usa al borrar. Nadie volvería a leerlos —se consultan por el equipo, que
 * ya no existe—, pero la base es la de producción y se comparte: dejarlos ahí
 * es basura que solo crece.
 */
export async function colgadoDeEquipos(equipoIds: string[]): Promise<Parse.Object[]> {
  if (equipoIds.length === 0) return [];
  const punteros = equipoIds.map((id) => EquipoScrum.createWithoutData(id));
  const de = async (clase: string) => {
    const q = new Parse.Query(clase);
    q.containedIn('equipo' as any, punteros as any);
    q.equalTo('exists' as any, true as any);
    q.limit(1000);
    return q.find({ useMasterKey: true });
  };
  const [epicas, retro, marcadores] = await Promise.all([
    de('EpicaScrum'), de('TarjetaRetro'), de('SprintEquipo'),
  ]);
  return [...epicas, ...retro, ...marcadores];
}

/** Los sprints de una dinámica. Se usa al borrarla. */
export async function sprintsColgados(dinamicaId: string): Promise<Parse.Object[]> {
  const q = new Parse.Query('SprintScrum');
  q.equalTo('dinamica' as any, DinamicaScrum.createWithoutData(dinamicaId) as any);
  q.equalTo('exists' as any, true as any);
  q.limit(500);
  return q.find({ useMasterKey: true });
}

/** El marcador vivo de un equipo en el sprint en curso, creándolo si falta. */
export async function marcadorVivo(
  sprintId: string,
  equipoId: string,
): Promise<SprintEquipo> {
  const q = new Parse.Query<SprintEquipo>('SprintEquipo');
  q.equalTo('sprint' as any, SprintScrum.createWithoutData(sprintId) as any);
  q.equalTo('equipo' as any, EquipoScrum.createWithoutData(equipoId) as any);
  q.equalTo('exists' as any, true as any);
  const existente = await q.first({ useMasterKey: true });
  if (existente) return existente;

  const nuevo = new SprintEquipo().initDefaults();
  nuevo.setSprint(SprintScrum.createWithoutData(sprintId) as SprintScrum);
  nuevo.setEquipo(EquipoScrum.createWithoutData(equipoId) as EquipoScrum);
  await nuevo.save(null, { useMasterKey: true });
  return nuevo;
}

/* ------------------------------------------------------------------ */
/*  Épicas                                                             */
/* ------------------------------------------------------------------ */

export async function epicasDeEquipos(equipoIds: string[]): Promise<EpicaScrum[]> {
  if (equipoIds.length === 0) return [];
  const q = new Parse.Query<EpicaScrum>('EpicaScrum');
  q.containedIn('equipo' as any, equipoIds.map((id) => EquipoScrum.createWithoutData(id)) as any);
  q.equalTo('exists' as any, true as any);
  q.ascending('orden');
  q.limit(200);
  return q.find({ useMasterKey: true });
}

/* ------------------------------------------------------------------ */
/*  Retrospectiva                                                      */
/* ------------------------------------------------------------------ */

/** Las tarjetas de la retro de ESTE sprint. */
export async function tarjetasRetro(
  equipoId: string,
  sprintId: string,
): Promise<TarjetaRetro[]> {
  const q = new Parse.Query<TarjetaRetro>('TarjetaRetro');
  q.equalTo('equipo' as any, EquipoScrum.createWithoutData(equipoId) as any);
  q.equalTo('sprint' as any, SprintScrum.createWithoutData(sprintId) as any);
  q.equalTo('exists' as any, true as any);
  q.include('responsable' as any);
  q.ascending('createdAt');
  q.limit(200);
  return q.find({ useMasterKey: true });
}

/**
 * Los compromisos que el equipo arrastra: tarjetas de «mejorar» de sprints
 * anteriores que todavía no se han marcado.
 *
 * Se acumulan a propósito. Y como una persona solo puede tener UNO abierto, un
 * equipo que no cierra sus compromisos se queda sin gente a quien asignarle los
 * nuevos: el castigo por no darles seguimiento es no poder seguir prometiendo.
 */
export async function compromisosAbiertos(
  equipoId: string,
  exceptoSprintId?: string,
): Promise<TarjetaRetro[]> {
  const q = new Parse.Query<TarjetaRetro>('TarjetaRetro');
  q.equalTo('equipo' as any, EquipoScrum.createWithoutData(equipoId) as any);
  q.equalTo('columna' as any, 'mejorar' as any);
  q.doesNotExist('estado' as any);
  q.equalTo('exists' as any, true as any);
  q.include('responsable' as any);
  q.include('sprint' as any);
  q.ascending('createdAt');
  q.limit(200);
  const todas = await q.find({ useMasterKey: true });
  return exceptoSprintId ? todas.filter((t) => t.getSprintId() !== exceptoSprintId) : todas;
}

/* ------------------------------------------------------------------ */
/*  Cuentas del sprint                                                 */
/* ------------------------------------------------------------------ */

/** Puntos que quedan por cerrar en el sprint: todo lo comprometido menos Done. */
export function puntosRestantes(historias: HistoriaUsuario[]): number {
  return historias
    .filter((h) => COLUMNAS_DEL_SPRINT.includes(h.getColumna()) && h.getColumna() !== 'done')
    .reduce((t, h) => t + Math.max(0, h.getPuntos()), 0);
}

/** Puntos comprometidos: todo el sprint backlog, terminado o no. */
export function puntosComprometidos(historias: HistoriaUsuario[]): number {
  return historias
    .filter((h) => COLUMNAS_DEL_SPRINT.includes(h.getColumna()))
    .reduce((t, h) => t + Math.max(0, h.getPuntos()), 0);
}
