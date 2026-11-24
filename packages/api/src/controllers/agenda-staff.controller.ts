import type { Request, Response } from 'express';
import Parse from 'parse/node';
import type { AppUser } from '../models/AppUser.js';
import type { Grupo } from '../models/Grupo.js';
import { getGruposDeStaff } from '../services/grupo-admin.service.js';
import { DIAS_SEMANA } from '../constants/dias.js';
import type { Actividad } from '../models/Actividad.js';
import { actividadToJSON } from './calendario.controller.js';
import {
  eventoDeEntrevistas,
  huecosDeEntrevistas,
  normalizarPreferenciasAgenda,
  sesionesDelGrupo,
  sumarDiasFecha,
  type ActividadParaAgenda,
  type HorarioClase,
  type EventoAgenda,
} from '../services/agenda-staff.js';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Horario de relleno para contar días de clase de un grupo que no tiene hora. */
const TODO_EL_DIA = Object.fromEntries(
  DIAS_SEMANA.map((d) => [d, { inicio: '00:00', fin: '23:59' }]),
) as HorarioClase;

/** La vista más larga es la del año. */
const MAX_DIAS_RANGO = 366;

/** Hasta qué rango va el detalle de cada evento: la vista del mes (seis semanas). */
const MAX_DIAS_CON_CITAS = 42;

/**
 * Grupos que entran en la agenda: el profesor, los suyos; el admin, todos los
 * activos. `esMio` dice si la persona figura en `Grupo.admins`: el admin ve por
 * defecto solo esos, y los demás los enciende él.
 */
async function gruposDeLaAgenda(user: AppUser): Promise<Grupo[]> {
  if (user.isAdmin()) {
    const q = new Parse.Query<Grupo>('Grupo');
    q.equalTo('exists' as any, true as any);
    q.equalTo('active' as any, true as any);
    q.include('admins' as any);
    q.ascending('name');
    q.limit(1000);
    return q.find({ useMasterKey: true });
  }
  const propios = await getGruposDeStaff(user.id);
  return propios.filter((g) => g.get('active') === true);
}

/**
 * GET /admin/agenda?desde=AAAA-MM-DD&hasta=AAAA-MM-DD — sesiones y días de
 * entrevistas de los grupos del staff en ese rango (hasta un año), con las
 * citas de cada bloque si el rango es corto, más sus preferencias de color.
 * Solo lectura: la agenda no edita nada de los grupos.
 */
export async function getAgenda(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const desde = String(req.query.desde ?? '');
  const hasta = String(req.query.hasta ?? '');
  if (!FECHA.test(desde) || !FECHA.test(hasta) || hasta < desde) {
    res.status(400).json({ status: 'error', message: 'desde y hasta deben ser fechas AAAA-MM-DD, con desde ≤ hasta' });
    return;
  }
  if (sumarDiasFecha(desde, MAX_DIAS_RANGO) < hasta) {
    res.status(400).json({ status: 'error', message: `El rango no puede pasar de ${MAX_DIAS_RANGO} días` });
    return;
  }

  // Rango corto (hasta la vista del mes): va con el detalle que pinta el modal
  // de cada evento —actividades de la sesión, citas del bloque de entrevistas—.
  // En el año solo se pintan puntos y serían cientos de registros de más.
  const conDetalle = sumarDiasFecha(desde, MAX_DIAS_CON_CITAS) > hasta;

  try {
    const grupos = await gruposDeLaAgenda(user);
    const eventos: EventoAgenda[] = [];
    // Grupos con días de clase en el rango aunque no tengan hora: son los que
    // la vista avisa de que les falta el horario. Los que esta semana no dan
    // clase no tienen nada que avisar.
    const conClaseSinHora = new Set<string>();

    if (grupos.length > 0) {
      // Sesiones. Una semana empieza en lunes: la que arranca hasta 6 días
      // antes de `desde` todavía puede tener días dentro del rango.
      const qSem = new Parse.Query('Semana');
      qSem.containedIn('grupo', grupos);
      qSem.equalTo('exists', true);
      qSem.equalTo('active', true);
      qSem.notEqualTo('tipo', 'especial');
      qSem.greaterThanOrEqualTo('fechaInicio', sumarDiasFecha(desde, -6));
      qSem.lessThanOrEqualTo('fechaInicio', hasta);
      qSem.select('grupo', 'numero', 'fechaInicio', 'diasActivos');
      qSem.limit(2000);
      const semanas = await qSem.find({ useMasterKey: true });

      let actividades: ActividadParaAgenda[] = [];
      if (semanas.length > 0) {
        const qAct = new Parse.Query('Actividad');
        qAct.containedIn('semana', semanas);
        qAct.equalTo('active', true);
        qAct.notEqualTo('isPrevio', true);
        if (!conDetalle) qAct.select('semana', 'dia', 'tipo', 'titulo');
        qAct.ascending('orden');
        qAct.limit(10000);
        actividades = (await qAct.find({ useMasterKey: true })).map((a) => ({
          semanaId: a.get('semana')?.id ?? '',
          dia: a.get('dia') ?? '',
          tipo: a.get('tipo') ?? '',
          titulo: a.get('titulo') ?? '',
          ...(conDetalle ? { detalle: actividadToJSON(a as Actividad) } : {}),
        }));
      }

      for (const g of grupos) {
        const deEste = semanas
          .filter((s) => s.get('grupo')?.id === g.id)
          .map((s) => ({ id: s.id!, numero: s.get('numero'), fechaInicio: s.get('fechaInicio') ?? '', diasActivos: s.get('diasActivos') }));
        const horario = g.getHorarioClase();
        eventos.push(...sesionesDelGrupo(g.id!, horario, deEste, actividades, desde, hasta));
        if (Object.keys(horario).length === 0 && sesionesDelGrupo(g.id!, TODO_EL_DIA, deEste, actividades, desde, hasta).length > 0) {
          conClaseSinHora.add(g.id!);
        }
      }

      // Entrevistas: instantes absolutos. Se pide con un día de holgura por
      // lado (la zona del curso va 6 h detrás de UTC) y se recorta por fecha
      // de reloj ya convertida.
      const qDias = new Parse.Query('DiaEntrevistas');
      qDias.containedIn('grupo', grupos);
      qDias.equalTo('exists', true);
      qDias.greaterThanOrEqualTo('fin', new Date(`${sumarDiasFecha(desde, -1)}T00:00:00Z`));
      qDias.lessThanOrEqualTo('inicio', new Date(`${sumarDiasFecha(hasta, 2)}T00:00:00Z`));
      qDias.limit(2000);
      const diasEnRango = (await qDias.find({ useMasterKey: true })).map((d) => ({
        d,
        ev: eventoDeEntrevistas(
          d.id!, d.get('grupo')?.id ?? '', d.get('inicio'), d.get('fin'), d.get('nota') ?? '', d.get('cerrado') === true,
        ),
      })).filter(({ ev }) => ev.fecha >= desde && ev.fecha <= hasta);

      // Quién ocupa cada hueco: así se ve qué parte del bloque ya está
      // comprometida y cuál sigue libre.
      const citasPorDia = new Map<string, { inicio: Date; alumno: string; competencia: string }[]>();
      if (conDetalle && diasEnRango.length > 0) {
        const qCitas = new Parse.Query('CitaEntrevista');
        qCitas.containedIn('dia', diasEnRango.map(({ d }) => d));
        qCitas.equalTo('exists', true);
        qCitas.include('alumno');
        qCitas.include('competencia');
        qCitas.select('dia', 'inicio', 'alumno.name', 'competencia.competencia');
        qCitas.limit(5000);
        for (const c of await qCitas.find({ useMasterKey: true })) {
          const diaId = c.get('dia')?.id ?? '';
          const lista = citasPorDia.get(diaId) ?? [];
          lista.push({
            inicio: c.get('inicio'),
            alumno: c.get('alumno')?.get('name') ?? '',
            competencia: c.get('competencia')?.get('competencia') ?? '',
          });
          citasPorDia.set(diaId, lista);
        }
      }

      for (const { d, ev } of diasEnRango) {
        if (conDetalle) {
          ev.huecos = huecosDeEntrevistas(
            d.get('inicio'), d.get('fin'), d.get('duracionSegundos') ?? 300,
            citasPorDia.get(d.id!) ?? [],
            Array.isArray(d.get('huecosCerrados')) ? d.get('huecosCerrados') : [],
          );
        }
        eventos.push(ev);
      }
    }

    eventos.sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio));

    // Qué tiene cada grupo EN GENERAL, no solo en el rango: el panel de
    // calendarios ofrece «Calendario» y «Entrevistas» solo a quien los tiene,
    // y no tiene que cambiar al pasar de una semana vacía a otra.
    const conSesiones = new Set<string>();
    const conEntrevistas = new Set<string>();
    if (grupos.length > 0) {
      const [todasSemanas, todosDias] = await Promise.all([
        (() => {
          const q = new Parse.Query('Semana');
          q.containedIn('grupo', grupos);
          q.equalTo('exists', true);
          q.equalTo('active', true);
          q.notEqualTo('tipo', 'especial');
          q.select('grupo');
          q.limit(5000);
          return q.find({ useMasterKey: true });
        })(),
        (() => {
          const q = new Parse.Query('DiaEntrevistas');
          q.containedIn('grupo', grupos);
          q.equalTo('exists', true);
          q.select('grupo');
          q.limit(5000);
          return q.find({ useMasterKey: true });
        })(),
      ]);
      for (const s of todasSemanas) conSesiones.add(s.get('grupo')?.id ?? '');
      for (const d of todosDias) conEntrevistas.add(d.get('grupo')?.id ?? '');
    }

    res.json({
      status: 'ok',
      grupos: grupos.map((g) => ({
        id: g.id,
        name: g.get('name') ?? '',
        esMio: ((g.get('admins') ?? []) as Parse.Object[]).some((a) => a?.id === user.id),
        conHorario: Object.keys(g.getHorarioClase()).length > 0,
        sinHoraConClase: conClaseSinHora.has(g.id!),
        tieneSesiones: conSesiones.has(g.id!),
        tieneEntrevistas: conEntrevistas.has(g.id!),
      })),
      eventos,
      preferencias: user.getPreferenciasAgenda(),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener la agenda' });
  }
}

/**
 * PUT /me/preferencias/agenda — { preferencias: { [grupoId]: { sesiones?, entrevistas?, oculto? } } }
 *
 * Reemplaza las preferencias enteras: la vista siempre manda el mapa completo.
 * Son de la persona (el id sale de la sesión), así que no se comprueba que los
 * grupos sean suyos: pintar un grupo ajeno no le da acceso a nada.
 */
export async function setPreferenciasAgenda(req: Request, res: Response): Promise<void> {
  const limpias = normalizarPreferenciasAgenda(req.body?.preferencias);
  if (limpias === 'invalido') {
    res.status(400).json({ status: 'error', message: 'preferencias inválidas: colores #rrggbb y oculto booleano por grupo' });
    return;
  }
  try {
    const actual = req.appUser as AppUser;
    const usuario = await new Parse.Query<AppUser>('AppUser').get(actual.id, { useMasterKey: true });
    usuario.setPreferenciasAgenda(limpias);
    await usuario.save(null, { useMasterKey: true });
    res.json({ status: 'ok', preferencias: limpias });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al guardar las preferencias' });
  }
}
