import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Actividad } from '../models/Actividad.js';
import { DIAS_SEMANA } from '../constants/dias.js';
import { esTipoActividad } from '../constants/actividades.js';
import { normalizarFranjaActividad, normalizarResponsables, staffDelGrupo } from '../services/imparten.js';

const VALID_DIAS: readonly string[] = DIAS_SEMANA;

export const MENSAJE_FRANJA = 'horaInicio y horaFin: las dos en HH:MM, con el inicio antes del fin, o ninguna';
export const MENSAJE_RESPONSABLES = 'responsables inválido: una lista de ids del staff del grupo';

export async function createActividad(req: Request, res: Response): Promise<void> {
  const {
    semanaId, dia, isPrevio, tipo,
    titulo, descripcion, enlace, externo,
    duracion, fechaEntrega, enlacesExtra,
    horaInicio, horaFin, responsables,
  } = req.body;

  // Validate required fields
  if (!semanaId || typeof semanaId !== 'string') {
    res.status(400).json({ status: 'error', message: 'semanaId es requerido' });
    return;
  }
  if (!VALID_DIAS.includes(dia)) {
    res.status(400).json({ status: 'error', message: `dia inválido: ${dia}` });
    return;
  }
  if (typeof isPrevio !== 'boolean') {
    res.status(400).json({ status: 'error', message: 'isPrevio es requerido (boolean)' });
    return;
  }
  if (!esTipoActividad(tipo)) {
    res.status(400).json({ status: 'error', message: `tipo inválido: ${tipo}` });
    return;
  }

  const franja = horaInicio === undefined && horaFin === undefined
    ? null
    : normalizarFranjaActividad(horaInicio ?? null, horaFin ?? null);
  if (franja === 'invalido') {
    res.status(400).json({ status: 'error', message: MENSAJE_FRANJA });
    return;
  }

  try {
    // Verify semana exists
    const semanaQuery = new Parse.Query('Semana');
    const semana = await semanaQuery.get(semanaId, { useMasterKey: true });
    if (!semana) {
      res.status(404).json({ status: 'error', message: 'Semana no encontrada' });
      return;
    }

    let ids: string[] = [];
    if (responsables !== undefined) {
      const grupo = await new Parse.Query('Grupo').get(semana.get('grupo')?.id, { useMasterKey: true });
      const limpio = normalizarResponsables(responsables, staffDelGrupo(grupo));
      if (limpio === 'invalido') {
        res.status(400).json({ status: 'error', message: MENSAJE_RESPONSABLES });
        return;
      }
      ids = limpio;
    }

    // Calculate orden: max orden of existing activities in same semana+dia+isPrevio + 1
    const ordenQuery = new Parse.Query<Actividad>('Actividad');
    ordenQuery.equalTo('semana', semana);
    ordenQuery.equalTo('dia', dia);
    ordenQuery.equalTo('isPrevio', isPrevio);
    ordenQuery.descending('orden');
    ordenQuery.limit(1);
    const topAct = await ordenQuery.first({ useMasterKey: true });
    const orden = topAct ? topAct.getOrden() + 1 : 0;

    // Create actividad
    const act = new Actividad();
    act.initDefaults();
    act.setSemana(semana);
    act.setDia(dia);
    act.setIsPrevio(isPrevio);
    act.setOrden(orden);
    act.setTipo(tipo);

    if (titulo) act.setTitulo(titulo);
    if (descripcion) act.setDescripcion(descripcion);
    if (enlace) act.setEnlace(enlace);
    if (typeof externo === 'boolean') act.setExterno(externo);
    if (duracion) act.setDuracion(duracion);
    if (fechaEntrega) act.setFechaEntrega(fechaEntrega);
    if (enlacesExtra && Array.isArray(enlacesExtra)) act.setEnlacesExtra(enlacesExtra);

    // Las previas son antes de clase: no tienen hora ni quién las da.
    if (!isPrevio) {
      act.setFranja(franja);
      act.setResponsables(ids);
    }

    await act.save(null, { useMasterKey: true });

    res.json({ status: 'ok', actividad: act.toSafeJSON() });
  } catch (error) {
    console.error('Error creating actividad:', error);
    res.status(500).json({ status: 'error', message: 'Error al crear actividad' });
  }
}
