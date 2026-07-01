import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Semana } from '../models/Semana.js';
import { Actividad } from '../models/Actividad.js';

export async function copyCalendario(req: Request, res: Response): Promise<void> {
  const { sourceGrupoId, targetGrupoId } = req.body;

  if (!sourceGrupoId || typeof sourceGrupoId !== 'string') {
    res.status(400).json({ status: 'error', message: 'sourceGrupoId es requerido' });
    return;
  }
  if (!targetGrupoId || typeof targetGrupoId !== 'string') {
    res.status(400).json({ status: 'error', message: 'targetGrupoId es requerido' });
    return;
  }
  if (sourceGrupoId === targetGrupoId) {
    res.status(400).json({ status: 'error', message: 'Los grupos origen y destino deben ser diferentes' });
    return;
  }

  try {
    // Validate both groups exist
    const [sourceGrupo, targetGrupo] = await Promise.all([
      new Parse.Query('Grupo').get(sourceGrupoId, { useMasterKey: true }),
      new Parse.Query('Grupo').get(targetGrupoId, { useMasterKey: true }),
    ]);

    if (!sourceGrupo?.get('exists')) {
      res.status(404).json({ status: 'error', message: 'Grupo origen no encontrado' });
      return;
    }
    if (!targetGrupo?.get('exists')) {
      res.status(404).json({ status: 'error', message: 'Grupo destino no encontrado' });
      return;
    }

    // Step 1: Soft-delete existing target semanas and their actividades
    const targetSemanaQuery = new Parse.Query<Semana>('Semana');
    targetSemanaQuery.equalTo('grupo', targetGrupo);
    targetSemanaQuery.equalTo('active' as any, true as any);
    targetSemanaQuery.limit(200);
    const targetSemanas = await targetSemanaQuery.find({ useMasterKey: true });

    if (targetSemanas.length > 0) {
      // Delete actividades of target semanas
      const targetActQuery = new Parse.Query<Actividad>('Actividad');
      targetActQuery.containedIn('semana', targetSemanas);
      targetActQuery.equalTo('active' as any, true as any);
      targetActQuery.limit(2000);
      const targetActividades = await targetActQuery.find({ useMasterKey: true });

      for (const act of targetActividades) {
        act.softDelete();
      }
      if (targetActividades.length > 0) {
        await Parse.Object.saveAll(targetActividades, { useMasterKey: true });
      }

      // Delete target semanas
      for (const sem of targetSemanas) {
        sem.softDelete();
      }
      await Parse.Object.saveAll(targetSemanas, { useMasterKey: true });
    }

    // Step 2: Fetch source semanas
    const sourceSemanaQuery = new Parse.Query<Semana>('Semana');
    sourceSemanaQuery.equalTo('grupo', sourceGrupo);
    sourceSemanaQuery.equalTo('active' as any, true as any);
    sourceSemanaQuery.ascending('orden');
    sourceSemanaQuery.limit(200);
    const sourceSemanas = await sourceSemanaQuery.find({ useMasterKey: true });

    // Step 3: Create new semanas in target
    const semanaMap = new Map<string, Semana>(); // sourceId → newSemana
    const newSemanas: Semana[] = [];

    for (const src of sourceSemanas) {
      const sem = new Semana();
      sem.initDefaults();
      sem.setGrupo(targetGrupo);
      sem.setNumero(src.getNumero());
      sem.setFechaInicio(src.getFechaInicio());
      sem.setFechaFin(src.getFechaFin());
      sem.setTipo(src.getTipo());
      sem.setOrden(src.getOrden());

      const titulo = src.getTitulo();
      if (titulo) sem.setTitulo(titulo);
      const mensaje = src.getMensaje();
      if (mensaje) sem.setMensaje(mensaje);
      const mensajeImportante = src.getMensajeImportante();
      if (mensajeImportante) sem.setMensajeImportante(mensajeImportante);
      const notas = src.getNotas();
      if (notas) sem.setNotas(notas);

      newSemanas.push(sem);
      semanaMap.set(src.id!, sem);
    }

    if (newSemanas.length > 0) {
      await Parse.Object.saveAll(newSemanas, { useMasterKey: true });
    }

    // Step 4: Fetch source actividades and copy
    let actividadesCopied = 0;
    if (sourceSemanas.length > 0) {
      const sourceActQuery = new Parse.Query<Actividad>('Actividad');
      sourceActQuery.containedIn('semana', sourceSemanas);
      sourceActQuery.equalTo('active' as any, true as any);
      sourceActQuery.ascending('orden');
      sourceActQuery.limit(2000);
      const sourceActividades = await sourceActQuery.find({ useMasterKey: true });

      const newActividades: Actividad[] = [];
      for (const srcAct of sourceActividades) {
        const srcSemanaId = srcAct.getSemana()?.id;
        if (!srcSemanaId) continue;
        const newSemana = semanaMap.get(srcSemanaId);
        if (!newSemana) continue;

        const act = new Actividad();
        act.initDefaults();
        act.setSemana(newSemana);
        act.setDia(srcAct.getDia());
        act.setIsPrevio(srcAct.getIsPrevio());
        act.setOrden(srcAct.getOrden());
        act.setTipo(srcAct.getTipo());

        const titulo = srcAct.getTitulo();
        if (titulo) act.setTitulo(titulo);
        const descripcion = srcAct.getDescripcion();
        if (descripcion) act.setDescripcion(descripcion);
        const enlace = srcAct.getEnlace();
        if (enlace) act.setEnlace(enlace);
        if (srcAct.getExterno()) act.setExterno(true);
        const duracion = srcAct.getDuracion();
        if (duracion) act.setDuracion(duracion);
        const fechaEntrega = srcAct.getFechaEntrega();
        if (fechaEntrega) act.setFechaEntrega(fechaEntrega);
        const enlacesExtra = srcAct.getEnlacesExtra();
        if (enlacesExtra && enlacesExtra.length > 0) act.setEnlacesExtra(enlacesExtra);

        newActividades.push(act);
      }

      if (newActividades.length > 0) {
        await Parse.Object.saveAll(newActividades, { useMasterKey: true });
      }
      actividadesCopied = newActividades.length;
    }

    res.json({
      status: 'ok',
      semanasCopied: newSemanas.length,
      actividadesCopied,
    });
  } catch (error) {
    console.error('Error copying calendario:', error);
    res.status(500).json({ status: 'error', message: 'Error al copiar calendario' });
  }
}
