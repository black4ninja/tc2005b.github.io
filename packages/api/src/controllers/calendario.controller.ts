import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Grupo } from '../models/Grupo.js';
import { Semana } from '../models/Semana.js';
import { Actividad } from '../models/Actividad.js';

export async function getCalendarioByGrupo(req: Request, res: Response): Promise<void> {
  const { grupoIdentifier } = req.params;

  try {
    // Try by Parse ID first, then fall back to name lookup
    let grupo: Grupo | undefined;
    try {
      const byId = await new Parse.Query<Grupo>('Grupo').get(grupoIdentifier, { useMasterKey: true });
      if (byId.get('exists')) grupo = byId;
    } catch {
      // Not a valid Parse ID — try by name
      const q = new Parse.Query<Grupo>('Grupo');
      q.equalTo('name', grupoIdentifier);
      q.equalTo('exists' as any, true as any);
      grupo = (await q.first({ useMasterKey: true })) ?? undefined;
    }

    if (!grupo) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }

    // Query 1: All semanas for this grupo, ordered by orden
    const semanaQuery = new Parse.Query<Semana>('Semana');
    semanaQuery.equalTo('grupo', grupo);
    semanaQuery.equalTo('active' as any, true as any);
    semanaQuery.ascending('orden');
    semanaQuery.limit(100);
    const semanas = await semanaQuery.find({ useMasterKey: true });

    // Query 2: All actividades where semana is in our semanas
    const actividadQuery = new Parse.Query<Actividad>('Actividad');
    actividadQuery.containedIn('semana', semanas);
    actividadQuery.equalTo('active' as any, true as any);
    actividadQuery.ascending('orden');
    actividadQuery.limit(1000);
    const actividades = await actividadQuery.find({ useMasterKey: true });

    // Group actividades by semana id
    const actividadesBySemana = new Map<string, Actividad[]>();
    for (const act of actividades) {
      const semanaId = act.getSemana()?.id;
      if (!semanaId) continue;
      if (!actividadesBySemana.has(semanaId)) {
        actividadesBySemana.set(semanaId, []);
      }
      actividadesBySemana.get(semanaId)!.push(act);
    }

    // Assemble response in the Calendario shape
    const semanasJSON = semanas.map((semana) => {
      const tipo = semana.getTipo();

      // Convert numeric strings back to numbers for frontend compatibility
      const rawNumero = semana.getNumero();
      const numero = /^\d+$/.test(rawNumero) ? parseInt(rawNumero, 10) : rawNumero;

      if (tipo === 'especial') {
        return {
          id: semana.id,
          numero,
          fechaInicio: semana.getFechaInicio(),
          fechaFin: semana.getFechaFin(),
          tipo: 'especial' as const,
          titulo: semana.getTitulo() ?? '',
          mensaje: semana.getMensaje() ?? '',
          mensajeImportante: semana.getMensajeImportante(),
        };
      }

      // Normal week: group actividades by dia
      const semanaActividades = actividadesBySemana.get(semana.id!) ?? [];
      const notas = semana.getNotas() ?? {};
      const dias: Record<string, any> = {};
      const diasOrden = ['lunes', 'martes', 'miercoles', 'jueves'];

      for (const dia of diasOrden) {
        const diaActividades = semanaActividades.filter((a) => a.getDia() === dia);
        if (diaActividades.length === 0 && !notas[dia]) continue;

        const previo = diaActividades
          .filter((a) => a.getIsPrevio())
          .map(actividadToJSON);
        const acts = diaActividades
          .filter((a) => !a.getIsPrevio())
          .map(actividadToJSON);

        const diaObj: any = {};
        if (notas[dia]) diaObj.nota = notas[dia];
        if (previo.length > 0) diaObj.previo = previo;
        if (acts.length > 0) diaObj.actividades = acts;

        dias[dia] = diaObj;
      }

      return {
        id: semana.id,
        numero,
        fechaInicio: semana.getFechaInicio(),
        fechaFin: semana.getFechaFin(),
        tipo: 'normal' as const,
        dias,
      };
    });

    res.json({
      calendario: {
        grupoId: grupo.id,
        curso: grupo.getCurso(),
        nombreCurso: grupo.getNombreCurso(),
        grupo: grupo.getName(),
        salon: grupo.getSalon(),
        enlaces: grupo.getEnlaces(),
        semanas: semanasJSON,
      },
    });
  } catch (error) {
    console.error('Error fetching calendario:', error);
    res.status(500).json({ status: 'error', message: 'Error al obtener calendario' });
  }
}

function actividadToJSON(act: Actividad): Record<string, any> {
  const obj: Record<string, any> = { id: act.id, tipo: act.getTipo() };
  if (act.getTitulo()) obj.titulo = act.getTitulo();
  if (act.getDescripcion()) obj.descripcion = act.getDescripcion();
  if (act.getEnlace()) obj.enlace = act.getEnlace();
  if (act.getExterno()) obj.externo = true;
  if (act.getDuracion()) obj.duracion = act.getDuracion();
  if (act.getFechaEntrega()) obj.fechaEntrega = act.getFechaEntrega();
  const extras = act.getEnlacesExtra();
  if (extras && extras.length > 0) obj.enlacesExtra = extras;
  return obj;
}
