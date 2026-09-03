import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Grupo } from '../models/Grupo.js';
import { AppUser } from '../models/AppUser.js';
import { Coleccion } from '../models/Coleccion.js';
import { Competencia } from '../models/Competencia.js';
import { Pregunta } from '../models/Pregunta.js';
import { PreguntaAsignacion } from '../models/PreguntaAsignacion.js';
import { DiaEntrevistas } from '../models/DiaEntrevistas.js';
import { CitaEntrevista } from '../models/CitaEntrevista.js';
import { EvidenciaCompetencia } from '../models/EvidenciaCompetencia.js';
import { coleccionesDeGrupo } from '../services/grupo-colecciones.service.js';
import { getVinculoConGrupoActivo } from '../services/grupo-alumno.service.js';
import {
  huecoAbierto, huecosDelDia, numerarIntentos, planificarBloques, puedeAgendar, puedeCancelar,
  puedeSerOtroIntento, sumarHorasHabiles,
  type FilaPlan, type Rango,
} from '../services/agenda-entrevistas.service.js';
import {
  MAX_EVIDENCIAS, agruparEvidencias, engancharSueltas, evidenciasDelGrupo, llaveDeEvidencia,
  soltarEvidenciasDeCita, urlDeEvidencia,
} from '../services/evidencias.service.js';
import {
  DURACION_POR_DEFECTO, MAX_BLOQUES_POR_LOTE, MAX_INTENTOS, HORAS_HABILES_ANTELACION,
  MARGEN_CANCELACION_MINUTOS, ZONA_CURSO,
} from '../constants/preguntas.js';

/**
 * Agenda de entrevistas: los días que el profesor abre y las citas que los
 * alumnos reservan.
 *
 * Sustituye a la hoja de cálculo compartida —una columna por día, una fila por
 * bloque, el nombre y la competencia escritos a mano— y sobre todo al hecho de
 * que las reglas de la cabecera fueran un texto que había que creerse. Aquí las
 * aplica el servidor: la antelación de 24 horas hábiles, el margen para
 * cancelar y el tope de intentos por competencia.
 *
 * De aquí sale el ORDEN de la proyección. El profesor puede repartir las
 * preguntas semanas antes, pero quién pasa primero lo deciden los alumnos al
 * apuntarse, y eso solo se sabe el día de la entrevista.
 *
 * La cita NO guarda su número de intento: ver `CitaEntrevista`.
 */

const SIN_COMPETENCIA = 'sin-competencia';

/** El tiempo de una entrevista en este grupo: grupo → materia → módulo. */
async function duracionDelGrupo(grupoId: string): Promise<number> {
  const q = new Parse.Query<Grupo>('Grupo');
  const grupo = await q.get(grupoId, { useMasterKey: true }).catch(() => null);
  const delGrupo = grupo?.get('preguntasDuracionSegundos') as number | undefined;
  if (delGrupo != null) return delGrupo;
  for (const c of await coleccionesDeGrupo(grupoId, 'preguntas')) {
    const suyo = c.get('preguntasDuracionSegundos') as number | undefined;
    if (suyo != null) return suyo;
  }
  return DURACION_POR_DEFECTO;
}

/**
 * Las competencias que el alumno puede venir a evaluar: las que TIENEN preguntas
 * en el banco del grupo. Una competencia sin preguntas no es una entrevista que
 * se pueda dar, solo una opción que dejaría al profesor sin nada que proyectar.
 */
async function competenciasDelBanco(grupoId: string): Promise<{ id: string; nombre: string }[]> {
  const colecciones = await coleccionesDeGrupo(grupoId, 'preguntas');
  if (colecciones.length === 0) return [];
  const q = new Parse.Query<Pregunta>('Pregunta');
  q.containedIn('coleccion' as any, colecciones.map((c) => Coleccion.createWithoutData(c.id!)) as any);
  q.equalTo('exists' as any, true as any);
  q.notEqualTo('archivada' as any, true as any);
  q.include('competencia' as any);
  q.select('competencia' as any);
  q.limit(1000);
  const porId = new Map<string, { id: string; nombre: string }>();
  for (const p of await q.find({ useMasterKey: true })) {
    const c = p.get('competencia');
    if (!c?.id) continue;
    porId.set(c.id, { id: c.id, nombre: c.get('competencia') ?? '' });
  }
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

async function diasDelGrupo(grupoId: string): Promise<DiaEntrevistas[]> {
  const q = new Parse.Query<DiaEntrevistas>('DiaEntrevistas');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  q.equalTo('exists' as any, true as any);
  q.ascending('inicio');
  q.limit(500);
  return q.find({ useMasterKey: true });
}

/** Citas VIVAS del grupo. Las canceladas son soft-delete y no vuelven. */
async function citasDelGrupo(grupoId: string): Promise<CitaEntrevista[]> {
  const q = new Parse.Query<CitaEntrevista>('CitaEntrevista');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  q.equalTo('exists' as any, true as any);
  q.include('alumno' as any);
  q.include('competencia' as any);
  q.ascending('inicio');
  q.limit(2000);
  return q.find({ useMasterKey: true });
}

/**
 * `alumnoId::competenciaId::intento` → asignación vigente. Es el puente entre la
 * agenda y el banco: la cita dice quién y de qué, y esto dice con qué pregunta.
 */
async function asignacionesPorHueco(grupoId: string): Promise<Map<string, PreguntaAsignacion>> {
  const q = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  q.equalTo('exists' as any, true as any);
  q.include('pregunta' as any);
  q.include('pregunta.competencia' as any);
  q.descending('createdAt');
  q.limit(10000);
  const vigentes = new Map<string, PreguntaAsignacion>();
  for (const a of await q.find({ useMasterKey: true })) {
    const clave = `${a.getAlumno()?.id}::${a.getHueco()}`;
    // Vienen de más reciente a más antigua: la primera de cada hueco manda.
    if (!vigentes.has(clave)) vigentes.set(clave, a);
  }
  return vigentes;
}

/** Cuántas citas vivas lleva un alumno en una competencia. */
function citasDe(citas: CitaEntrevista[], alumnoId: string, competenciaId: string): CitaEntrevista[] {
  return citas.filter(
    (c) => c.getAlumno()?.id === alumnoId && (c.getCompetencia()?.id ?? SIN_COMPETENCIA) === competenciaId,
  );
}

/** El intento que le toca a cada cita, por competencia y alumno. */
function intentosDeTodas(citas: CitaEntrevista[]): Map<string, number> {
  const porAlumnoYCompetencia = new Map<string, CitaEntrevista[]>();
  for (const c of citas) {
    const clave = `${c.getAlumno()?.id}::${c.getCompetencia()?.id ?? SIN_COMPETENCIA}`;
    porAlumnoYCompetencia.set(clave, [...(porAlumnoYCompetencia.get(clave) ?? []), c]);
  }
  const numeros = new Map<string, number>();
  for (const grupo of porAlumnoYCompetencia.values()) {
    // Por cuándo se apartó la cita, no por su hora: mover a alguien de hueco no
    // puede renumerarle los intentos ni cambiarle la pregunta.
    const n = numerarIntentos(grupo.map((c) => ({
      id: c.id!,
      creada: c.createdAt ?? new Date(0),
    })));
    for (const [id, intento] of n) numeros.set(id, intento);
  }
  return numeros;
}

const REGLAS = {
  horasHabilesAntelacion: HORAS_HABILES_ANTELACION,
  margenCancelacionMinutos: MARGEN_CANCELACION_MINUTOS,
  maxIntentos: MAX_INTENTOS,
};

/* ------------------------------------------------------------------ */
/*  Profesor                                                           */
/* ------------------------------------------------------------------ */

/**
 * GET /admin/grupos/:grupoId/agenda-entrevistas
 *
 * El día entero, hueco por hueco, con lo vacío marcado como vacío: el profesor
 * necesita saber a qué hora empieza y dónde tiene un respiro, no solo la lista
 * de quién viene.
 */
export async function getAgenda(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  try {
    const [duracionSegundos, dias, citas, competencias, asignaciones, evidencias] = await Promise.all([
      duracionDelGrupo(grupoId),
      diasDelGrupo(grupoId),
      citasDelGrupo(grupoId),
      competenciasDelBanco(grupoId),
      asignacionesPorHueco(grupoId),
      evidenciasDelGrupo(grupoId),
    ]);
    const intentos = intentosDeTodas(citas);
    // Por cita: es lo que la fila necesita para poner la marca y abrir la lista
    // sin una petición más por alumno.
    const porCita = agruparEvidencias(evidencias, llaveDeEvidencia);

    res.json({
      status: 'ok',
      serverNow: new Date().toISOString(),
      duracionSegundos,
      competencias,
      reglas: REGLAS,
      dias: dias.map((dia) => {
        const suyas = citas.filter((c) => c.getDia()?.id === dia.id);
        const cerrados = dia.getHuecosCerrados();
        return {
          ...dia.toSafeJSON(),
          huecos: huecosDelDia(dia.getInicio(), dia.getFin(), dia.getDuracionSegundos())
            .map((inicio) => {
              const cita = suyas.find((c) => c.getInicio()?.getTime() === inicio.getTime());
              // El profesor SÍ ve los cerrados: son suyos y los tiene que poder
              // reabrir. Al alumno se le quitan de la lista.
              const cerrado = cerrados.includes(inicio.toISOString());
              if (!cita) return { inicio: inicio.toISOString(), cita: null, cerrado };
              const intento = intentos.get(cita.id!) ?? 1;
              const asignacion = asignaciones.get(
                `${cita.getAlumno()?.id}::${cita.getCompetencia()?.id ?? SIN_COMPETENCIA}::${intento}`,
              );
              const pregunta = asignacion?.getPregunta();
              return {
                inicio: inicio.toISOString(),
                cerrado,
                cita: {
                  ...cita.toSafeJSON(),
                  evidencias: (porCita.get(`cita:${cita.id}`) ?? []).map((e) => e.toSafeJSON()),
                  intento,
                  // Lo que se proyectará cuando le toque. Vacío = el profesor no
                  // le ha asignado pregunta para ese intento, y hay que decirlo
                  // antes del día, no al pulsar «Proyectar».
                  asignacionId: asignacion?.id ?? null,
                  pregunta: pregunta ? { id: pregunta.id, texto: pregunta.get('texto') ?? '' } : null,
                },
              };
            }),
        };
      }),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al leer la agenda' });
  }
}

function leerRango(body: any): { inicio: Date; fin: Date } | null {
  const inicio = new Date(body?.inicio);
  const fin = new Date(body?.fin);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return null;
  if (fin.getTime() <= inicio.getTime()) return null;
  return { inicio, fin };
}

/** POST /admin/grupos/:grupoId/agenda-entrevistas/dias */
export async function crearDia(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const rango = leerRango(req.body);
  if (!rango) {
    res.status(400).json({ status: 'error', message: 'El día necesita una hora de inicio y otra de fin posterior' });
    return;
  }
  try {
    // Las dos lecturas van juntas: son independientes y en fila india eran dos
    // viajes seguidos a una base remota antes de escribir nada.
    const [ocupados, duracion] = await Promise.all([
      rangosDelGrupo(grupoId),
      duracionDelGrupo(grupoId),
    ]);
    // El alta suelta pasa por la MISMA regla que el lote. Antes no miraba nada,
    // así que abrir a mano un horario que se pisaba con otro partía las mismas
    // horas dos veces y el hueco de las 10:00 existía por duplicado.
    const [plan] = planificarBloques([rango], ocupados);
    if (plan.estado !== 'nuevo') {
      res.status(409).json({ status: 'error', message: porQueNoEntra(plan) });
      return;
    }
    const dia = await abrirDia(grupoId, rango, req.body?.nota, duracion);
    res.status(201).json({ status: 'ok', dia: dia.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al crear el día' });
  }
}

/** Los tramos que ya ocupan los días abiertos del grupo. */
async function rangosDelGrupo(grupoId: string): Promise<Rango[]> {
  return (await diasDelGrupo(grupoId)).map((d) => ({ inicio: d.getInicio(), fin: d.getFin() }));
}

/** `09:00 – 13:00` en la zona del curso, para poder decirlo en un mensaje. */
function rangoLegible(rango: Rango): string {
  const hhmm = (fecha: Date) => new Intl.DateTimeFormat('es-MX', {
    timeZone: ZONA_CURSO, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(fecha);
  return `${hhmm(rango.inicio)} – ${hhmm(rango.fin)}`;
}

/**
 * En palabras, por qué un bloque no se abre.
 *
 * Con la hora puesta y no el instante en crudo: quien lee esto está mirando su
 * agenda, no una marca de tiempo.
 */
function porQueNoEntra(fila: FilaPlan): string {
  if (fila.estado === 'duplicado') return 'Ese bloque ya está abierto';
  return `Ese horario se pisa con el bloque de ${rangoLegible(fila.choca!)} que ya existe`;
}

/**
 * Crea un bloque. `duracionSegundos` se copia al crear y no se lee del módulo:
 * si mañana el profesor pasa las entrevistas de cinco a tres minutos, los días
 * ya abiertos tienen que seguir partiéndose igual.
 */
async function abrirDia(
  grupoId: string,
  rango: Rango,
  nota: unknown,
  duracionSegundos: number,
): Promise<DiaEntrevistas> {
  const dia = new DiaEntrevistas().initDefaults();
  dia.setGrupo(Grupo.createWithoutData(grupoId) as Grupo);
  dia.setInicio(rango.inicio);
  dia.setFin(rango.fin);
  dia.setDuracionSegundos(duracionSegundos);
  dia.setNota(String(nota ?? '').trim());
  await dia.save(null, { useMasterKey: true });
  return dia;
}

/**
 * POST /admin/grupos/:grupoId/agenda-entrevistas/dias/lote
 * `{ bloques: [{inicio, fin}], nota?, simular? }`
 *
 * Abrir un mes de entrevistas era abrir el modal treinta veces. Aquí llegan
 * todos los bloques de golpe —ya expandidos por el navegador, que es quien sabe
 * qué fechas caen en martes y en qué zona está el profesor— y el servidor decide
 * cuáles entran.
 *
 * Con `simular` no escribe nada y devuelve el mismo plan: es la vista previa,
 * que dice exactamente qué se va a crear ANTES de pulsar. Sin ella, «abrir 7
 * bloques» es un botón a ciegas.
 */
export async function crearDiasEnLote(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const crudos = req.body?.bloques;
  if (!Array.isArray(crudos) || crudos.length === 0) {
    res.status(400).json({ status: 'error', message: 'No hay ningún bloque que abrir' });
    return;
  }
  if (crudos.length > MAX_BLOQUES_POR_LOTE) {
    res.status(400).json({
      status: 'error',
      message: `De una vez se pueden abrir hasta ${MAX_BLOQUES_POR_LOTE} bloques`,
    });
    return;
  }

  const candidatos: Rango[] = [];
  for (const crudo of crudos) {
    const rango = leerRango(crudo);
    if (!rango) {
      res.status(400).json({ status: 'error', message: 'Hay un bloque con horas no válidas' });
      return;
    }
    candidatos.push(rango);
  }

  try {
    const plan = planificarBloques(candidatos, await rangosDelGrupo(grupoId));
    const nuevos = plan.filter((p) => p.estado === 'nuevo');

    if (req.body?.simular === true) {
      res.json({ status: 'ok', plan: plan.map(filaJSON), simulado: true });
      return;
    }

    const duracion = await duracionDelGrupo(grupoId);
    // En serie y no en paralelo: son escrituras contra una base remota y el
    // profesor está esperando a que vuelva la lista, no a que vuelva rápido.
    // Treinta `save` a la vez es lo que la tumba.
    for (const fila of nuevos) {
      await abrirDia(grupoId, fila, req.body?.nota, duracion);
    }
    res.status(201).json({ status: 'ok', plan: plan.map(filaJSON), creados: nuevos.length });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al abrir los días' });
  }
}

function filaJSON(fila: FilaPlan) {
  return {
    inicio: fila.inicio.toISOString(),
    fin: fila.fin.toISOString(),
    estado: fila.estado,
    choca: fila.choca
      ? { inicio: fila.choca.inicio.toISOString(), fin: fila.choca.fin.toISOString() }
      : null,
  };
}

/**
 * PUT /admin/grupos/:grupoId/agenda-entrevistas/dias/:diaId/huecos
 * `{ inicio, cerrado }`
 *
 * Cerrar o reabrir UN hueco. Es lo que el profesor hace de verdad: cerrar el día
 * entero es todo o nada, y lo que quiere tapar son ratos sueltos —la comida, la
 * clase que le pisa las once, el respiro que se guarda—.
 *
 * Un hueco ocupado no se cierra: eso no es taparlo, es dejar a alguien con una
 * cita que ya no existe. Primero se cancela la cita, que es una decisión que se
 * toma mirándola.
 */
export async function cerrarHueco(req: Request, res: Response): Promise<void> {
  const { grupoId, diaId } = req.params;
  const { inicio, cerrado } = req.body ?? {};
  if (!inicio || typeof cerrado !== 'boolean') {
    res.status(400).json({ status: 'error', message: 'Falta el hueco o qué hacer con él' });
    return;
  }
  const momento = new Date(inicio);
  if (Number.isNaN(momento.getTime())) {
    res.status(400).json({ status: 'error', message: 'Hora no válida' });
    return;
  }

  try {
    const q = new Parse.Query<DiaEntrevistas>('DiaEntrevistas');
    q.equalTo('exists' as any, true as any);
    const dia = await q.get(diaId, { useMasterKey: true }).catch(() => null);
    if (!dia || dia.getGrupo()?.id !== grupoId) {
      res.status(404).json({ status: 'error', message: 'Ese día de entrevistas no existe' });
      return;
    }

    const esHueco = huecosDelDia(dia.getInicio(), dia.getFin(), dia.getDuracionSegundos())
      .some((h) => h.getTime() === momento.getTime());
    if (!esHueco) {
      res.status(400).json({ status: 'error', message: 'Esa hora no es uno de los huecos del día' });
      return;
    }

    if (cerrado) {
      const citas = await citasDelGrupo(grupoId);
      if (citas.some((c) => c.getInicio()?.getTime() === momento.getTime())) {
        res.status(409).json({
          status: 'error',
          message: 'Ese hueco tiene una entrevista apuntada. Cancélala antes de cerrarlo.',
        });
        return;
      }
    }

    const iso = momento.toISOString();
    if (cerrado) dia.cerrarHueco(iso);
    else dia.abrirHueco(iso);
    await dia.save(null, { useMasterKey: true });
    res.json({ status: 'ok', dia: dia.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al guardar el hueco' });
  }
}

/** PUT /admin/grupos/:grupoId/agenda-entrevistas/dias/:diaId */
export async function actualizarDia(req: Request, res: Response): Promise<void> {
  const { grupoId, diaId } = req.params;
  try {
    const q = new Parse.Query<DiaEntrevistas>('DiaEntrevistas');
    q.equalTo('exists' as any, true as any);
    const dia = await q.get(diaId, { useMasterKey: true });
    if (dia.getGrupo()?.id !== grupoId) {
      res.status(403).json({ status: 'error', message: 'Ese día no es de este grupo' });
      return;
    }
    if (req.body?.inicio !== undefined || req.body?.fin !== undefined) {
      const rango = leerRango({
        inicio: req.body?.inicio ?? dia.getInicio().toISOString(),
        fin: req.body?.fin ?? dia.getFin().toISOString(),
      });
      if (!rango) {
        res.status(400).json({ status: 'error', message: 'El fin tiene que ir después del inicio' });
        return;
      }
      dia.setInicio(rango.inicio);
      dia.setFin(rango.fin);
    }
    if (req.body?.nota !== undefined) dia.setNota(String(req.body.nota).trim());
    if (req.body?.cerrado !== undefined) dia.setCerrado(req.body.cerrado === true);
    await dia.save(null, { useMasterKey: true });
    res.json({ status: 'ok', dia: dia.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al guardar el día' });
  }
}

/**
 * DELETE /admin/grupos/:grupoId/agenda-entrevistas/dias/:diaId
 *
 * Se niega si queda alguien apuntado: borrar el día dejaría a esos alumnos sin
 * cita y sin enterarse. Primero se cancelan sus citas, que es una decisión que
 * se toma mirándolas.
 */
export async function borrarDia(req: Request, res: Response): Promise<void> {
  const { grupoId, diaId } = req.params;
  try {
    const q = new Parse.Query<DiaEntrevistas>('DiaEntrevistas');
    q.equalTo('exists' as any, true as any);
    const dia = await q.get(diaId, { useMasterKey: true });
    if (dia.getGrupo()?.id !== grupoId) {
      res.status(403).json({ status: 'error', message: 'Ese día no es de este grupo' });
      return;
    }
    const citas = (await citasDelGrupo(grupoId)).filter((c) => c.getDia()?.id === diaId);
    if (citas.length > 0) {
      res.status(409).json({
        status: 'error',
        message: `Ese día tiene ${citas.length} cita${citas.length === 1 ? '' : 's'} apuntada${citas.length === 1 ? '' : 's'}. Cancélalas antes de borrarlo.`,
      });
      return;
    }
    dia.softDelete();
    await dia.save(null, { useMasterKey: true });
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al borrar el día' });
  }
}

/**
 * Alta de una cita, común al alumno y al profesor.
 *
 * `comoAlumno` es lo único que cambia: al alumno se le exige la antelación de 24
 * horas hábiles, al profesor no —está apuntando a alguien que tiene delante—.
 * El tope de intentos se aplica a los dos: esa no es una regla de cortesía.
 */
/**
 * Quita un hueco de la lista de cerrados, si estaba. Se llama al meterle una
 * cita: un hueco ocupado y a la vez cerrado no significa nada, y dejarlo así
 * haría que al cancelar la cita el hueco reapareciera cerrado sin que nadie lo
 * hubiera cerrado.
 */
async function reabrirHueco(dia: DiaEntrevistas, inicio: Date): Promise<void> {
  const iso = inicio.toISOString();
  if (!dia.getHuecosCerrados().includes(iso)) return;
  dia.abrirHueco(iso);
  await dia.save(null, { useMasterKey: true });
}

async function altaDeCita(
  res: Response,
  grupoId: string,
  datos: { diaId: string; inicio: string; alumnoId: string; competenciaId: string },
  quien: AppUser,
  comoAlumno: boolean,
): Promise<void> {
  const inicio = new Date(datos.inicio);
  if (Number.isNaN(inicio.getTime())) {
    res.status(400).json({ status: 'error', message: 'Hora no válida' });
    return;
  }

  const qDia = new Parse.Query<DiaEntrevistas>('DiaEntrevistas');
  qDia.equalTo('exists' as any, true as any);
  const dia = await qDia.get(datos.diaId, { useMasterKey: true }).catch(() => null);
  if (!dia || dia.getGrupo()?.id !== grupoId) {
    res.status(404).json({ status: 'error', message: 'Ese día de entrevistas no existe' });
    return;
  }
  if (comoAlumno && dia.getCerrado()) {
    res.status(409).json({ status: 'error', message: 'Ese día ya no admite reservas' });
    return;
  }
  if (comoAlumno && !huecoAbierto(false, dia.getHuecosCerrados(), inicio)) {
    res.status(409).json({ status: 'error', message: 'Esa hora ya no está disponible' });
    return;
  }

  // La hora tiene que ser uno de los huecos del día, no una hora cualquiera:
  // si no, dos citas solapadas partirían la fila del profesor.
  const esHueco = huecosDelDia(dia.getInicio(), dia.getFin(), dia.getDuracionSegundos())
    .some((h) => h.getTime() === inicio.getTime());
  if (!esHueco) {
    res.status(400).json({ status: 'error', message: 'Esa hora no es uno de los huecos del día' });
    return;
  }

  if (comoAlumno && !puedeAgendar(inicio, new Date())) {
    res.status(409).json({
      status: 'error',
      message: `Hay que agendar con al menos ${HORAS_HABILES_ANTELACION} horas hábiles de anticipación`,
    });
    return;
  }

  const citas = await citasDelGrupo(grupoId);
  if (citas.some((c) => c.getInicio()?.getTime() === inicio.getTime())) {
    res.status(409).json({ status: 'error', message: 'Ese hueco lo acaban de tomar' });
    return;
  }

  const yaTiene = citasDe(citas, datos.alumnoId, datos.competenciaId);
  if (yaTiene.length >= MAX_INTENTOS) {
    res.status(409).json({
      status: 'error',
      message: `Solo hay ${MAX_INTENTOS} oportunidades por competencia y ya están agendadas`,
    });
    return;
  }

  // El segundo intento va en un día POSTERIOR al primero. El mismo día son la
  // misma entrevista repetida —no da tiempo a repasar nada—, y antes es peor:
  // como el número sale del orden de reserva, se podía apuntar el «primero» el
  // día 3 y el «segundo» el día 1.
  //
  // Solo al alumno: el profesor apunta a mano para arreglar el día de las
  // entrevistas, y ahí manda lo que decida él.
  if (comoAlumno && !puedeSerOtroIntento(yaTiene.map((c) => c.getInicio()), inicio)) {
    res.status(409).json({
      status: 'error',
      message: 'Tu otra entrevista de esa competencia es ese día o después.'
        + ' El siguiente intento tiene que ser en un día posterior.',
    });
    return;
  }

  // El profesor sí puede apuntar a alguien en un hueco que había cerrado —lo
  // cierra para que nadie lo tome, no para no poder usarlo él—. Pero entonces
  // deja de estar cerrado: si no, el hueco quedaría marcado con una cita dentro.
  await reabrirHueco(dia, inicio);

  const cita = new CitaEntrevista().initDefaults();
  cita.setGrupo(Grupo.createWithoutData(grupoId) as Grupo);
  cita.setDia(dia);
  cita.setAlumno(AppUser.createWithoutData(datos.alumnoId) as AppUser);
  cita.setCompetencia(Competencia.createWithoutData(datos.competenciaId));
  cita.setInicio(inicio);
  cita.setCreadaPor(quien);
  await cita.save(null, { useMasterKey: true });

  // Si canceló y vuelve, se le devuelven las evidencias que dejó sueltas: no
  // tiene por qué pegar otra vez los mismos enlaces. Solo las sueltas, así que
  // nunca se le quitan a una entrevista viva.
  const recuperadas = await engancharSueltas(
    grupoId, datos.alumnoId, datos.competenciaId, cita,
  );

  res.status(201).json({
    status: 'ok',
    cita: cita.toSafeJSON(),
    intento: yaTiene.length + 1,
    evidenciasRecuperadas: recuperadas,
  });
}

/** POST /admin/grupos/:grupoId/agenda-entrevistas/citas */
export async function crearCitaProfesor(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { diaId, inicio, alumnoId, competenciaId } = req.body ?? {};
  if (!diaId || !inicio || !alumnoId || !competenciaId) {
    res.status(400).json({ status: 'error', message: 'Faltan datos de la cita' });
    return;
  }
  try {
    await altaDeCita(res, grupoId, { diaId, inicio, alumnoId, competenciaId }, req.appUser!, false);
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al agendar la cita' });
  }
}

/**
 * PUT /admin/grupos/:grupoId/agenda-entrevistas/citas/:citaId — `{ diaId, inicio }`.
 *
 * Cambiar una cita de hueco, incluso a otro día. Es lo que más se pide el día de
 * las entrevistas: dos alumnos se cambian entre ellos, uno llega tarde y se le
 * pasa al final, hay que juntar a los de una competencia. Antes había que
 * cancelar y volver a apuntar, y por el camino se perdía el orden.
 *
 * No se comprueban las oportunidades: mover no crea ninguna cita, la misma
 * cambia de sitio. Lo que sí puede cambiar es su NÚMERO de intento, y está
 * bien: el intento sale del orden de las citas, así que adelantar a alguien lo
 * convierte de verdad en su primero.
 */
export async function moverCitaProfesor(req: Request, res: Response): Promise<void> {
  const { grupoId, citaId } = req.params;
  const { diaId, inicio: inicioCrudo } = req.body ?? {};
  if (!diaId || !inicioCrudo) {
    res.status(400).json({ status: 'error', message: 'Falta el día o la hora de destino' });
    return;
  }
  const inicio = new Date(inicioCrudo);
  if (Number.isNaN(inicio.getTime())) {
    res.status(400).json({ status: 'error', message: 'Hora no válida' });
    return;
  }

  try {
    const q = new Parse.Query<CitaEntrevista>('CitaEntrevista');
    q.equalTo('exists' as any, true as any);
    const cita = await q.get(citaId, { useMasterKey: true }).catch(() => null);
    if (!cita || cita.getGrupo()?.id !== grupoId) {
      res.status(404).json({ status: 'error', message: 'Esa cita no es de este grupo' });
      return;
    }

    const qDia = new Parse.Query<DiaEntrevistas>('DiaEntrevistas');
    qDia.equalTo('exists' as any, true as any);
    const dia = await qDia.get(diaId, { useMasterKey: true }).catch(() => null);
    if (!dia || dia.getGrupo()?.id !== grupoId) {
      res.status(404).json({ status: 'error', message: 'Ese día de entrevistas no existe' });
      return;
    }

    const esHueco = huecosDelDia(dia.getInicio(), dia.getFin(), dia.getDuracionSegundos())
      .some((h) => h.getTime() === inicio.getTime());
    if (!esHueco) {
      res.status(400).json({ status: 'error', message: 'Esa hora no es uno de los huecos del día' });
      return;
    }

    // Que el destino esté libre. La propia cita no cuenta: mover algo a donde ya
    // está no es un choque, es un gesto que no cambia nada.
    const citas = await citasDelGrupo(grupoId);
    const chocaCon = citas.find(
      (c) => c.id !== citaId && c.getInicio()?.getTime() === inicio.getTime(),
    );
    if (chocaCon) {
      res.status(409).json({ status: 'error', message: 'Ese hueco ya está ocupado' });
      return;
    }

    await reabrirHueco(dia, inicio);
    cita.setDia(dia);
    cita.setInicio(inicio);
    await cita.save(null, { useMasterKey: true });
    res.json({ status: 'ok', cita: cita.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al mover la cita' });
  }
}

/* ── Evidencias ───────────────────────────────────────────────────────── */

/**
 * POST /alumno/grupos/:grupoId/agenda-entrevistas/evidencias
 * `{ citaId, url, titulo }`
 *
 * El alumno deja el enlace de lo que trae a su entrevista. La evidencia se
 * guarda por (alumno, competencia) y apuntando a la CITA, que es lo que la
 * mantiene en su sitio cuando la cita se mueve o se renumera.
 */
export async function crearEvidenciaAlumno(req: Request, res: Response): Promise<void> {
  const alumnoId = await exigirAlumnoDelGrupo(req, res);
  if (!alumnoId) return;
  const { grupoId } = req.params;
  const { citaId, titulo } = req.body ?? {};

  const url = urlDeEvidencia(req.body?.url);
  if (!url) {
    res.status(400).json({
      status: 'error',
      message: 'Pon un enlace que empiece por http:// o https://',
    });
    return;
  }
  if (!citaId) {
    res.status(400).json({ status: 'error', message: 'Falta la entrevista' });
    return;
  }

  try {
    const q = new Parse.Query<CitaEntrevista>('CitaEntrevista');
    q.equalTo('exists' as any, true as any);
    const cita = await q.get(citaId, { useMasterKey: true }).catch(() => null);
    if (!cita || cita.getGrupo()?.id !== grupoId || cita.getAlumno()?.id !== alumnoId) {
      res.status(403).json({ status: 'error', message: 'Esa entrevista no es tuya' });
      return;
    }
    const competenciaId = cita.getCompetencia()?.id;
    if (!competenciaId) {
      res.status(409).json({ status: 'error', message: 'Esa entrevista no tiene competencia' });
      return;
    }

    const suyas = (await evidenciasDelGrupo(grupoId))
      .filter((e) => e.getAlumno()?.id === alumnoId && e.getCita()?.id === citaId);
    if (suyas.length >= MAX_EVIDENCIAS) {
      res.status(409).json({
        status: 'error',
        message: `Como mucho ${MAX_EVIDENCIAS} evidencias por entrevista`,
      });
      return;
    }
    // Repetir el mismo enlace no añade nada y ensucia la lista del profesor.
    if (suyas.some((e) => e.getUrl() === url)) {
      res.status(409).json({ status: 'error', message: 'Ese enlace ya está puesto' });
      return;
    }

    const evidencia = new EvidenciaCompetencia().initDefaults();
    evidencia.setGrupo(Grupo.createWithoutData(grupoId) as Grupo);
    evidencia.setAlumno(AppUser.createWithoutData(alumnoId) as AppUser);
    evidencia.setCompetencia(Competencia.createWithoutData(competenciaId));
    evidencia.setCita(cita);
    evidencia.setOrigen('entrevista');
    evidencia.setUrl(url);
    evidencia.setTitulo(String(titulo ?? '').trim().slice(0, 120));
    await evidencia.save(null, { useMasterKey: true });

    res.status(201).json({ status: 'ok', evidencia: evidencia.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al guardar la evidencia' });
  }
}

/**
 * DELETE /alumno/grupos/:grupoId/agenda-entrevistas/evidencias/:evidenciaId
 *
 * Borrado suave, como todo lo demás: lo que el alumno entregó y luego quitó
 * sigue existiendo para quien tenga que revisar qué pasó.
 */
export async function borrarEvidenciaAlumno(req: Request, res: Response): Promise<void> {
  const alumnoId = await exigirAlumnoDelGrupo(req, res);
  if (!alumnoId) return;
  const { grupoId, evidenciaId } = req.params;
  try {
    const q = new Parse.Query<EvidenciaCompetencia>('EvidenciaCompetencia');
    q.equalTo('exists' as any, true as any);
    const evidencia = await q.get(evidenciaId, { useMasterKey: true }).catch(() => null);
    if (!evidencia || evidencia.getGrupo()?.id !== grupoId || evidencia.getAlumno()?.id !== alumnoId) {
      res.status(403).json({ status: 'error', message: 'Esa evidencia no es tuya' });
      return;
    }
    evidencia.softDelete();
    await evidencia.save(null, { useMasterKey: true });
    res.json({ status: 'ok' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al borrar la evidencia' });
  }
}

/** DELETE /admin/grupos/:grupoId/agenda-entrevistas/citas/:citaId */
export async function borrarCitaProfesor(req: Request, res: Response): Promise<void> {
  const { grupoId, citaId } = req.params;
  try {
    const q = new Parse.Query<CitaEntrevista>('CitaEntrevista');
    q.equalTo('exists' as any, true as any);
    const cita = await q.get(citaId, { useMasterKey: true });
    if (cita.getGrupo()?.id !== grupoId) {
      res.status(403).json({ status: 'error', message: 'Esa cita no es de este grupo' });
      return;
    }
    // Sin margen: el profesor cancela también la de dentro de dos minutos, que
    // es justo cuando hace falta —el alumno no llegó—.
    cita.cancelar();
    await cita.save(null, { useMasterKey: true });
    // Lo que ya había entregado NO se va con la cita: se queda suelto en su
    // competencia y vuelve solo si reserva otra vez.
    const sueltas = await soltarEvidenciasDeCita(cita.id!);
    res.json({ status: 'ok', evidenciasSueltas: sueltas });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al cancelar la cita' });
  }
}

/* ------------------------------------------------------------------ */
/*  Alumno                                                             */
/* ------------------------------------------------------------------ */

async function exigirAlumnoDelGrupo(req: Request, res: Response): Promise<string | null> {
  const { grupoId } = req.params;
  const alumnoId = req.appUser?.id;
  if (!alumnoId || !grupoId) {
    res.status(400).json({ status: 'error', message: 'Datos incompletos' });
    return null;
  }
  if (!(await getVinculoConGrupoActivo(alumnoId, grupoId))) {
    res.status(403).json({ status: 'error', message: 'No perteneces a este grupo' });
    return null;
  }
  return alumnoId;
}

/**
 * GET /alumno/grupos/:grupoId/agenda-entrevistas
 *
 * Los huecos ajenos salen como «ocupado» y SIN nombre. En la hoja compartida
 * todo el mundo leía la agenda entera de todo el mundo; aquí lo único que hace
 * falta para elegir es saber si el hueco está libre.
 */
export async function getAgendaAlumno(req: Request, res: Response): Promise<void> {
  const alumnoId = await exigirAlumnoDelGrupo(req, res);
  if (!alumnoId) return;
  const { grupoId } = req.params;
  try {
    const [dias, citas, competencias, evidencias] = await Promise.all([
      diasDelGrupo(grupoId),
      citasDelGrupo(grupoId),
      competenciasDelBanco(grupoId),
      evidenciasDelGrupo(grupoId),
    ]);
    const intentos = intentosDeTodas(citas);
    const mias = citas.filter((c) => c.getAlumno()?.id === alumnoId);
    const ahora = new Date();
    const misEvidencias = evidencias.filter((e) => e.getAlumno()?.id === alumnoId);
    const porLlave = agruparEvidencias(misEvidencias, llaveDeEvidencia);

    res.json({
      status: 'ok',
      serverNow: ahora.toISOString(),
      // Ya calculado aquí: si cada navegador lo dedujera por su cuenta, dos
      // alumnos con el reloj distinto verían huecos distintos.
      agendableDesde: sumarHorasHabiles(ahora).toISOString(),
      reglas: REGLAS,
      competencias: competencias.map((c) => ({
        ...c,
        usados: citasDe(citas, alumnoId, c.id).length,
      })),
      misCitas: mias.map((c) => ({
        ...c.toSafeJSON(),
        alumno: undefined,
        intento: intentos.get(c.id!) ?? 1,
        diaNota: c.getDia()?.get('nota') ?? '',
        cancelable: puedeCancelar(c.getInicio(), ahora),
        evidencias: (porLlave.get(`cita:${c.id}`) ?? []).map((e) => e.toSafeJSON()),
      })),
      // Las que quedaron sin cita porque canceló. Se le siguen enseñando —no se
      // pierde lo entregado— y vuelven solas a la próxima cita de esa
      // competencia que reserve.
      evidenciasSueltas: misEvidencias
        .filter((e) => !e.getCita())
        .map((e) => e.toSafeJSON()),
      dias: dias.filter((d) => !d.getCerrado() || citas.some((c) => c.getDia()?.id === d.id))
        .map((dia) => ({
          ...dia.toSafeJSON(),
          // Un hueco cerrado no se le enseña al alumno ni siquiera tachado: lo
          // que se cierra es un rato en que el profesor no está, y una fila que
          // solo sirve para no poder pulsarla es ruido. Los que ya tienen cita
          // se quedan: el profesor no puede cerrar uno ocupado.
          huecos: huecosDelDia(dia.getInicio(), dia.getFin(), dia.getDuracionSegundos())
            .filter((inicio) => huecoAbierto(false, dia.getHuecosCerrados(), inicio)
              || citas.some((c) => c.getInicio()?.getTime() === inicio.getTime()))
            .map((inicio) => {
              const cita = citas.find((c) => c.getInicio()?.getTime() === inicio.getTime());
              return {
                inicio: inicio.toISOString(),
                ocupado: !!cita,
                // De las ajenas no se dice ni quién ni de qué.
                mia: cita?.getAlumno()?.id === alumnoId
                  ? { id: cita!.id, competencia: cita!.getCompetencia()?.get('competencia') ?? '' }
                  : null,
              };
            }),
        })),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al leer la agenda' });
  }
}

/** POST /alumno/grupos/:grupoId/agenda-entrevistas/citas */
export async function crearCitaAlumno(req: Request, res: Response): Promise<void> {
  const alumnoId = await exigirAlumnoDelGrupo(req, res);
  if (!alumnoId) return;
  const { grupoId } = req.params;
  const { diaId, inicio, competenciaId } = req.body ?? {};
  if (!diaId || !inicio || !competenciaId) {
    res.status(400).json({ status: 'error', message: 'Faltan datos de la cita' });
    return;
  }
  try {
    await altaDeCita(res, grupoId, { diaId, inicio, alumnoId, competenciaId }, req.appUser!, true);
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al agendar la cita' });
  }
}

/** DELETE /alumno/grupos/:grupoId/agenda-entrevistas/citas/:citaId */
export async function borrarCitaAlumno(req: Request, res: Response): Promise<void> {
  const alumnoId = await exigirAlumnoDelGrupo(req, res);
  if (!alumnoId) return;
  const { grupoId, citaId } = req.params;
  try {
    const q = new Parse.Query<CitaEntrevista>('CitaEntrevista');
    q.equalTo('exists' as any, true as any);
    const cita = await q.get(citaId, { useMasterKey: true });
    if (cita.getGrupo()?.id !== grupoId || cita.getAlumno()?.id !== alumnoId) {
      res.status(403).json({ status: 'error', message: 'Esa cita no es tuya' });
      return;
    }
    if (!puedeCancelar(cita.getInicio(), new Date())) {
      res.status(409).json({
        status: 'error',
        message: `Ya no se puede cancelar: el margen es de ${MARGEN_CANCELACION_MINUTOS} minutos antes de la hora`,
      });
      return;
    }
    cita.cancelar();
    await cita.save(null, { useMasterKey: true });
    // Igual que cuando cancela el profesor: lo entregado se queda suelto en su
    // competencia, no se va con la cita.
    const sueltas = await soltarEvidenciasDeCita(cita.id!);
    res.json({ status: 'ok', evidenciasSueltas: sueltas });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al cancelar la cita' });
  }
}
