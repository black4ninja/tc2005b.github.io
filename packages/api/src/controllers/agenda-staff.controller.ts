import type { Request, Response } from 'express';
import Parse from 'parse/node';
import type { AppUser } from '../models/AppUser.js';
import type { Grupo } from '../models/Grupo.js';
import { getGruposDeStaff } from '../services/grupo-admin.service.js';
import {
  eventoDeEntrevistas,
  normalizarPreferenciasAgenda,
  sesionesDelGrupo,
  sumarDiasFecha,
  type ActividadParaAgenda,
  type EventoAgenda,
} from '../services/agenda-staff.js';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Más de dos meses de golpe no lo pide la vista y solo engorda la consulta. */
const MAX_DIAS_RANGO = 62;

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
 * entrevistas de los grupos del staff en ese rango, más sus preferencias de
 * color. Solo lectura: la agenda no edita nada de los grupos.
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

  try {
    const grupos = await gruposDeLaAgenda(user);
    const eventos: EventoAgenda[] = [];

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
      qSem.select('grupo', 'fechaInicio', 'diasActivos');
      qSem.limit(2000);
      const semanas = await qSem.find({ useMasterKey: true });

      let actividades: ActividadParaAgenda[] = [];
      if (semanas.length > 0) {
        const qAct = new Parse.Query('Actividad');
        qAct.containedIn('semana', semanas);
        qAct.equalTo('active', true);
        qAct.notEqualTo('isPrevio', true);
        qAct.select('semana', 'dia', 'tipo', 'titulo');
        qAct.ascending('orden');
        qAct.limit(10000);
        actividades = (await qAct.find({ useMasterKey: true })).map((a) => ({
          semanaId: a.get('semana')?.id ?? '',
          dia: a.get('dia') ?? '',
          tipo: a.get('tipo') ?? '',
          titulo: a.get('titulo') ?? '',
        }));
      }

      for (const g of grupos) {
        const deEste = semanas
          .filter((s) => s.get('grupo')?.id === g.id)
          .map((s) => ({ id: s.id!, fechaInicio: s.get('fechaInicio') ?? '', diasActivos: s.get('diasActivos') }));
        eventos.push(...sesionesDelGrupo(g.id!, g.getHorarioClase(), deEste, actividades, desde, hasta));
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
      for (const d of await qDias.find({ useMasterKey: true })) {
        const ev = eventoDeEntrevistas(
          d.id!, d.get('grupo')?.id ?? '', d.get('inicio'), d.get('fin'), d.get('nota') ?? '', d.get('cerrado') === true,
        );
        if (ev.fecha >= desde && ev.fecha <= hasta) eventos.push(ev);
      }
    }

    eventos.sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio));

    res.json({
      status: 'ok',
      grupos: grupos.map((g) => ({
        id: g.id,
        name: g.get('name') ?? '',
        esMio: ((g.get('admins') ?? []) as Parse.Object[]).some((a) => a?.id === user.id),
        conHorario: Object.keys(g.getHorarioClase()).length > 0,
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
