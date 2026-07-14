import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { CompetenciaAlumno } from '../models/CompetenciaAlumno.js';
import { Competencia } from '../models/Competencia.js';
import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';
import { getAlumnosDeGrupo } from '../services/grupo-alumno.service.js';
import { competenciasDeGrupo } from '../services/competencias.service.js';

export async function crearCompetenciasAlumno(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    // La malla se materializa SOLO con las competencias de las colecciones del
    // grupo. Antes se usaba la lista global: todos los grupos recibían todas las
    // competencias, incluso las de otra materia.
    const { competencias, sinColecciones } = await competenciasDeGrupo(grupoId);

    // Los dos vacíos se distinguen a propósito: "el grupo no tiene materia" y
    // "la materia no tiene competencias" son problemas distintos, y un mensaje
    // genérico manda al admin a buscar en el sitio equivocado.
    if (sinColecciones) {
      res.status(400).json({
        status: 'error',
        message: 'El grupo no tiene colecciones asignadas: asígnale una materia en Editar Grupo para poder crear su malla.',
      });
      return;
    }
    if (competencias.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Las colecciones de este grupo no tienen competencias activas.',
      });
      return;
    }

    // Fetch alumnos activos del grupo vía GrupoAlumno
    const alumnos = await getAlumnosDeGrupo(grupoId);

    if (alumnos.length === 0) {
      res.status(404).json({ status: 'error', message: 'No hay alumnos activos en el grupo' });
      return;
    }

    let created = 0;
    let skipped = 0;
    const toSave: CompetenciaAlumno[] = [];

    for (const item of alumnos) {
      const alumno = item.alumno;
      const countQuery = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
      countQuery.equalTo('exists' as any, true as any);
      countQuery.equalTo('alumno' as any, alumno as any);
      countQuery.equalTo('grupo' as any, grupoPointer as any);
      const count = await countQuery.count({ useMasterKey: true });

      if (count > 0) {
        skipped++;
        continue;
      }

      for (const comp of competencias) {
        const registro = new CompetenciaAlumno().initDefaults();
        registro.setGrupo(grupoPointer);
        registro.setAlumno(alumno);
        registro.setCompetencia(comp);
        registro.setValorPeriodo1('0');
        registro.setValorPeriodo2('0');
        registro.setRetroPeriodo1('');
        registro.setRetroPeriodo2('');
        toSave.push(registro);
      }
      created++;
    }

    if (toSave.length > 0) {
      await Parse.Object.saveAll(toSave, { useMasterKey: true });
    }

    res.status(201).json({ status: 'ok', created, skipped });
  } catch (error: any) {
    console.error('[crearCompetenciasAlumno] Error:', error?.message ?? error);
    console.error('[crearCompetenciasAlumno] Stack:', error?.stack);
    res.status(500).json({ status: 'error', message: 'Error al crear competencias de alumnos', detail: error?.message });
  }
}

export async function getCompetenciasStatus(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    // Fetch alumnos activos del grupo vía GrupoAlumno
    const alumnos = await getAlumnosDeGrupo(grupoId);

    let alumnosConCompetencias = 0;
    let alumnosSinCompetencias = 0;

    for (const item of alumnos) {
      const alumno = item.alumno;
      const countQuery = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
      countQuery.equalTo('exists' as any, true as any);
      countQuery.equalTo('alumno' as any, alumno as any);
      countQuery.equalTo('grupo' as any, grupoPointer as any);
      const count = await countQuery.count({ useMasterKey: true });

      if (count > 0) {
        alumnosConCompetencias++;
      } else {
        alumnosSinCompetencias++;
      }
    }

    res.json({
      status: 'ok',
      totalAlumnos: alumnos.length,
      alumnosConCompetencias,
      alumnosSinCompetencias,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener estado de competencias' });
  }
}

export async function getCompetenciasAlumno(req: Request, res: Response): Promise<void> {
  const { grupoId, alumnoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
    const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId) as AppUser;

    // Fetch alumno data
    const alumnoQuery = new Parse.Query<AppUser>('AppUser');
    const alumno = await alumnoQuery.get(alumnoId, { useMasterKey: true });

    // Fetch competencias del alumno con include del pointer y dependencias
    const query = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
    query.equalTo('exists' as any, true as any);
    query.equalTo('grupo' as any, grupoPointer as any);
    query.equalTo('alumno' as any, alumnoPointer as any);
    query.include('competencia' as any);
    query.include('competencia.dependencias' as any);
    query.ascending('orden');
    query.limit(1000);
    const competencias = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      competencias: competencias.map((c) => c.toSafeJSON()),
      alumno: {
        id: alumno.id,
        name: alumno.get('name') ?? '',
        email: alumno.get('email') ?? '',
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener competencias del alumno' });
  }
}

/**
 * Recalculates all computed (esCalculada) CompetenciaAlumno records that depend
 * on the given competencia for the same alumno+grupo. Uses MIN logic:
 * - If any dependency has no value (empty/0) → leave as empty (sin evaluar)
 * - Otherwise → MIN of all dependency values
 */
async function recalcularCalculadas(
  competenciaId: string,
  alumnoPointer: Parse.Object,
  grupoPointer: Parse.Object,
): Promise<void> {
  // Find all calculated competencias that have this one as a dependency
  const compQuery = new Parse.Query<Competencia>('Competencia');
  compQuery.equalTo('exists' as any, true as any);
  compQuery.equalTo('esCalculada' as any, true as any);
  compQuery.equalTo('dependencias' as any, Parse.Object.extend('Competencia').createWithoutData(competenciaId) as any);
  compQuery.include('dependencias' as any);
  const calculadas = await compQuery.find({ useMasterKey: true });

  for (const calculada of calculadas) {
    const depIds: string[] = (calculada.getDependencias() ?? []).map((d) => d.id);
    if (depIds.length === 0) continue;

    // Get all CompetenciaAlumno records for the dependencies
    const depPointers = depIds.map((id) => Parse.Object.extend('Competencia').createWithoutData(id));
    const caQuery = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
    caQuery.equalTo('exists' as any, true as any);
    caQuery.equalTo('alumno' as any, alumnoPointer as any);
    caQuery.equalTo('grupo' as any, grupoPointer as any);
    caQuery.containedIn('competencia' as any, depPointers as any);
    caQuery.limit(1000);
    const depRecords = await caQuery.find({ useMasterKey: true });

    // Calculate MIN for each periodo
    for (const periodo of ['valorPeriodo1', 'valorPeriodo2'] as const) {
      const values: number[] = [];
      let allEvaluated = true;

      for (const depId of depIds) {
        const record = depRecords.find((r) => r.getCompetencia()?.id === depId);
        const rawVal = record ? record.get(periodo) : undefined;

        // '' or undefined/null = sin evaluar; 0 = Incipiente B (válido)
        if (!record || rawVal === '' || rawVal === undefined || rawVal === null) {
          allEvaluated = false;
          break;
        }
        const numVal = typeof rawVal === 'number' ? rawVal : Number(rawVal);
        values.push(numVal);
      }

      // Find or create the CompetenciaAlumno for the calculated competencia
      const calcQuery = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
      calcQuery.equalTo('exists' as any, true as any);
      calcQuery.equalTo('alumno' as any, alumnoPointer as any);
      calcQuery.equalTo('grupo' as any, grupoPointer as any);
      calcQuery.equalTo('competencia' as any, calculada as any);
      const calcRecord = await calcQuery.first({ useMasterKey: true });

      if (calcRecord) {
        const newValue = allEvaluated && values.length === depIds.length
          ? Math.min(...values)
          : '';
        calcRecord.set(periodo, newValue);
        await calcRecord.save(null, { useMasterKey: true });
      }
    }
  }
}

export async function propagarCompetencias(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { periodoOrigen, periodoDestino, competenciaId } = req.body;

  const periodosValidos = ['valorPeriodo1', 'valorPeriodo2'];
  if (!periodosValidos.includes(periodoOrigen) || !periodosValidos.includes(periodoDestino)) {
    res.status(400).json({ status: 'error', message: 'Periodos inválidos' });
    return;
  }
  if (periodoOrigen === periodoDestino) {
    res.status(400).json({ status: 'error', message: 'El periodo origen y destino deben ser diferentes' });
    return;
  }

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    // Fetch CompetenciaAlumno del grupo, optionally filtered by competencia
    const query = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
    query.equalTo('exists' as any, true as any);
    query.equalTo('grupo' as any, grupoPointer as any);
    if (competenciaId) {
      const compPointer = Parse.Object.extend('Competencia').createWithoutData(competenciaId);
      query.equalTo('competencia' as any, compPointer as any);
    }
    query.include('competencia' as any);
    query.limit(10000);
    const registros = await query.find({ useMasterKey: true });

    let updated = 0;
    const toSave: CompetenciaAlumno[] = [];

    for (const registro of registros) {
      const comp = registro.getCompetencia();
      if (comp?.get('esCalculada') === true) continue; // skip calculadas

      const valorOrigen = registro.get(periodoOrigen);
      registro.set(periodoDestino, valorOrigen);
      toSave.push(registro);
      updated++;
    }

    if (toSave.length > 0) {
      await Parse.Object.saveAll(toSave, { useMasterKey: true });
    }

    // Recalcular calculadas para todos los alumnos
    const alumnoIds = [...new Set(registros.map(r => r.getAlumno()?.id).filter(Boolean))] as string[];
    const compIds = [...new Set(registros.map(r => r.getCompetencia()?.id).filter(Boolean))] as string[];

    for (const alumnoId of alumnoIds) {
      const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId);
      for (const compId of compIds) {
        await recalcularCalculadas(compId, alumnoPointer, grupoPointer);
      }
    }

    res.json({ status: 'ok', updated });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al propagar competencias' });
  }
}

export async function updateCompetenciaAlumno(req: Request, res: Response): Promise<void> {
  const { compAlumnoId } = req.params;

  try {
    const query = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
    query.equalTo('exists' as any, true as any);
    query.include('competencia' as any);
    const registro = await query.get(compAlumnoId, { useMasterKey: true });

    const { valorPeriodo1, valorPeriodo2, retroPeriodo1, retroPeriodo2 } = req.body;

    // Validate: reject direct value edits on calculated competencias
    const competenciaObj = registro.getCompetencia();
    if (competenciaObj?.get('esCalculada') === true) {
      if (valorPeriodo1 !== undefined || valorPeriodo2 !== undefined) {
        res.status(400).json({
          status: 'error',
          message: 'No se puede evaluar una competencia calculada directamente',
        });
        return;
      }
    }

    if (valorPeriodo1 !== undefined) {
      registro.set('valorPeriodo1', valorPeriodo1 === '' ? '' : Number(valorPeriodo1));
    }
    if (valorPeriodo2 !== undefined) {
      registro.set('valorPeriodo2', valorPeriodo2 === '' ? '' : Number(valorPeriodo2));
    }
    if (typeof retroPeriodo1 === 'string') registro.setRetroPeriodo1(retroPeriodo1);
    if (typeof retroPeriodo2 === 'string') registro.setRetroPeriodo2(retroPeriodo2);

    await registro.save(null, { useMasterKey: true });

    // Auto-recalculate computed competencias if a valor was changed
    if (valorPeriodo1 !== undefined || valorPeriodo2 !== undefined) {
      const competenciaObj = registro.getCompetencia();
      const alumnoObj = registro.getAlumno();
      const grupoObj = registro.getGrupo();
      if (competenciaObj && alumnoObj && grupoObj) {
        await recalcularCalculadas(competenciaObj.id, alumnoObj, grupoObj);
      }
    }

    // Re-fetch with include to return full data
    const fetchQuery = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
    fetchQuery.include('competencia' as any);
    const updated = await fetchQuery.get(registro.id, { useMasterKey: true });

    res.json({ status: 'ok', competencia: updated.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al actualizar competencia del alumno' });
  }
}
