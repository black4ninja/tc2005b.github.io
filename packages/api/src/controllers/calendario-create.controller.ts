import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Actividad } from '../models/Actividad.js';

const VALID_DIAS = ['lunes', 'martes', 'miercoles', 'jueves'];
const VALID_TIPOS = [
  'lab', 'lectura', 'ejercicio', 'proyecto',
  'evaluacion', 'break', 'asueto', 'trabajo',
  'discusion', 'info',
];

export async function createActividad(req: Request, res: Response): Promise<void> {
  const {
    semanaId, dia, isPrevio, tipo,
    titulo, descripcion, enlace, externo,
    duracion, fechaEntrega, enlacesExtra,
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
  if (!VALID_TIPOS.includes(tipo)) {
    res.status(400).json({ status: 'error', message: `tipo inválido: ${tipo}` });
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

    await act.save(null, { useMasterKey: true });

    res.json({ status: 'ok', actividad: act.toSafeJSON() });
  } catch (error) {
    console.error('Error creating actividad:', error);
    res.status(500).json({ status: 'error', message: 'Error al crear actividad' });
  }
}
