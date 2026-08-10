import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Semana } from '../models/Semana.js';
import { Actividad } from '../models/Actividad.js';
import { DIAS_POR_DEFECTO, normalizarDias } from '../constants/dias.js';

export async function createSemana(req: Request, res: Response): Promise<void> {
  const { grupoId, tipo, fechaInicio, fechaFin, diasActivos, titulo, mensaje, mensajeImportante } = req.body;

  if (!grupoId || typeof grupoId !== 'string') {
    res.status(400).json({ status: 'error', message: 'grupoId es requerido' });
    return;
  }
  if (!['normal', 'especial'].includes(tipo)) {
    res.status(400).json({ status: 'error', message: 'tipo debe ser "normal" o "especial"' });
    return;
  }
  if (!fechaInicio || !fechaFin) {
    res.status(400).json({ status: 'error', message: 'fechaInicio y fechaFin son requeridos' });
    return;
  }
  if (tipo === 'especial') {
    if (!titulo || !mensaje) {
      res.status(400).json({ status: 'error', message: 'titulo y mensaje son requeridos para semanas especiales' });
      return;
    }
  }

  let dias: string[] = [];
  if (tipo === 'normal') {
    dias = diasActivos === undefined ? [...DIAS_POR_DEFECTO] : normalizarDias(diasActivos);
    if (dias.length === 0) {
      res.status(400).json({ status: 'error', message: 'diasActivos debe incluir al menos un día válido (lunes a viernes)' });
      return;
    }
  }

  try {
    const grupo = await new Parse.Query('Grupo').get(grupoId, { useMasterKey: true });
    if (!grupo) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }

    // Calculate orden: max orden + 1
    const ordenQuery = new Parse.Query<Semana>('Semana');
    ordenQuery.equalTo('grupo', grupo);
    ordenQuery.equalTo('active' as any, true as any);
    ordenQuery.descending('orden');
    ordenQuery.limit(1);
    const topSemana = await ordenQuery.first({ useMasterKey: true });
    const orden = topSemana ? topSemana.getOrden() + 1 : 0;

    // Calculate numero
    let numero: string;
    if (tipo === 'normal') {
      const countQuery = new Parse.Query<Semana>('Semana');
      countQuery.equalTo('grupo', grupo);
      countQuery.equalTo('active' as any, true as any);
      countQuery.equalTo('tipo', 'normal');
      const normalCount = await countQuery.count({ useMasterKey: true });
      numero = String(normalCount + 1);
    } else {
      numero = 'E';
    }

    const semana = new Semana();
    semana.initDefaults();
    semana.setGrupo(grupo);
    semana.setNumero(numero);
    semana.setFechaInicio(fechaInicio);
    semana.setFechaFin(fechaFin);
    semana.setTipo(tipo);
    semana.setOrden(orden);
    if (tipo === 'normal') semana.setDiasActivos(dias);

    if (titulo) semana.setTitulo(titulo);
    if (mensaje) semana.setMensaje(mensaje);
    if (mensajeImportante) semana.setMensajeImportante(mensajeImportante);

    await semana.save(null, { useMasterKey: true });

    res.json({ status: 'ok', semana: semana.toSafeJSON() });
  } catch (error) {
    console.error('Error creating semana:', error);
    res.status(500).json({ status: 'error', message: 'Error al crear semana' });
  }
}

export async function updateSemana(req: Request, res: Response): Promise<void> {
  const { semanaId } = req.params;
  const { fechaInicio, fechaFin, diasActivos, titulo, mensaje, mensajeImportante } = req.body;

  try {
    const semana = await new Parse.Query<Semana>('Semana').get(semanaId, { useMasterKey: true });
    if (!semana || !semana.isActive()) {
      res.status(404).json({ status: 'error', message: 'Semana no encontrada' });
      return;
    }

    const esNormal = semana.getTipo() === 'normal';

    if (fechaInicio !== undefined) {
      if (!fechaInicio) {
        res.status(400).json({ status: 'error', message: 'fechaInicio no puede estar vacía' });
        return;
      }
      semana.setFechaInicio(fechaInicio);
    }
    if (fechaFin !== undefined) {
      if (!fechaFin) {
        res.status(400).json({ status: 'error', message: 'fechaFin no puede estar vacía' });
        return;
      }
      semana.setFechaFin(fechaFin);
    }

    if (esNormal && diasActivos !== undefined) {
      const dias = normalizarDias(diasActivos);
      if (dias.length === 0) {
        res.status(400).json({ status: 'error', message: 'diasActivos debe incluir al menos un día válido (lunes a viernes)' });
        return;
      }

      // No se pueden quitar días con actividades: quedarían fuera del calendario.
      const actQuery = new Parse.Query<Actividad>('Actividad');
      actQuery.equalTo('semana', semana);
      actQuery.equalTo('active' as any, true as any);
      actQuery.notContainedIn('dia', dias);
      actQuery.limit(1000);
      const huerfanas = await actQuery.find({ useMasterKey: true });

      if (huerfanas.length > 0) {
        const diasConActividades = [...new Set(huerfanas.map((a) => a.getDia()))];
        res.status(400).json({
          status: 'error',
          message: `No se pueden quitar días con actividades: ${diasConActividades.join(', ')}`,
        });
        return;
      }

      semana.setDiasActivos(dias);
    }

    if (!esNormal) {
      if (titulo !== undefined && titulo !== '') semana.setTitulo(titulo);
      if (mensaje !== undefined && mensaje !== '') semana.setMensaje(mensaje);
      if (mensajeImportante !== undefined) {
        if (mensajeImportante === '') semana.unset('mensajeImportante');
        else semana.setMensajeImportante(mensajeImportante);
      }
    }

    await semana.save(null, { useMasterKey: true });

    res.json({ status: 'ok', semana: semana.toSafeJSON() });
  } catch (error) {
    console.error('Error updating semana:', error);
    res.status(500).json({ status: 'error', message: 'Error al actualizar semana' });
  }
}

export async function reorderSemanas(req: Request, res: Response): Promise<void> {
  const { grupoId, orderedIds } = req.body;

  if (!grupoId || typeof grupoId !== 'string') {
    res.status(400).json({ status: 'error', message: 'grupoId es requerido' });
    return;
  }
  if (!orderedIds || !Array.isArray(orderedIds) || orderedIds.length === 0) {
    res.status(400).json({ status: 'error', message: 'orderedIds es requerido (array)' });
    return;
  }

  try {
    const query = new Parse.Query<Semana>('Semana');
    query.containedIn('objectId', orderedIds);
    query.limit(orderedIds.length);
    const semanas = await query.find({ useMasterKey: true });

    if (semanas.length !== orderedIds.length) {
      const foundIds = new Set(semanas.map((s) => s.id));
      const missing = orderedIds.filter((id: string) => !foundIds.has(id));
      res.status(404).json({ status: 'error', message: `Semanas no encontradas: ${missing.join(', ')}` });
      return;
    }

    const semanaMap = new Map<string, Semana>(semanas.map((s) => [s.id!, s]));

    let normalCounter = 1;
    for (let i = 0; i < orderedIds.length; i++) {
      const semana = semanaMap.get(orderedIds[i])!;
      semana.setOrden(i);
      if (semana.getTipo() === 'normal') {
        semana.setNumero(normalCounter++);
      }
    }

    await Parse.Object.saveAll(semanas, { useMasterKey: true });

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error reordering semanas:', error);
    res.status(500).json({ status: 'error', message: 'Error al reordenar semanas' });
  }
}

export async function deleteSemana(req: Request, res: Response): Promise<void> {
  const { semanaId } = req.params;

  if (!semanaId || typeof semanaId !== 'string') {
    res.status(400).json({ status: 'error', message: 'semanaId es requerido' });
    return;
  }

  try {
    const semana = await new Parse.Query<Semana>('Semana').get(semanaId, { useMasterKey: true });
    if (!semana || !semana.isActive()) {
      res.status(404).json({ status: 'error', message: 'Semana no encontrada' });
      return;
    }

    // Check for active actividades in this semana
    const actQuery = new Parse.Query<Actividad>('Actividad');
    actQuery.equalTo('semana', semana);
    actQuery.equalTo('active' as any, true as any);
    const actCount = await actQuery.count({ useMasterKey: true });

    if (actCount > 0) {
      res.status(400).json({ status: 'error', message: 'No se puede eliminar una semana con actividades' });
      return;
    }

    semana.softDelete();
    await semana.save(null, { useMasterKey: true });

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error deleting semana:', error);
    res.status(500).json({ status: 'error', message: 'Error al eliminar semana' });
  }
}
