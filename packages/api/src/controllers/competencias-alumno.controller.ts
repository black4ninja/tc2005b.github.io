import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { CompetenciaAlumno } from '../models/CompetenciaAlumno.js';
import { Competencia } from '../models/Competencia.js';
import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';

export async function crearCompetenciasAlumno(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    // Fetch competencias activas
    const compQuery = new Parse.Query<Competencia>('Competencia');
    compQuery.equalTo('exists' as any, true as any);
    compQuery.equalTo('active' as any, true as any);
    compQuery.ascending('orden');
    compQuery.limit(1000);
    const competencias = await compQuery.find({ useMasterKey: true });

    if (competencias.length === 0) {
      res.status(404).json({ status: 'error', message: 'No hay competencias activas' });
      return;
    }

    // Fetch alumnos activos del grupo
    const alumnoQuery = new Parse.Query<AppUser>('AppUser');
    alumnoQuery.equalTo('exists' as any, true as any);
    alumnoQuery.equalTo('active' as any, true as any);
    alumnoQuery.equalTo('userType' as any, 'alumno' as any);
    alumnoQuery.equalTo('grupo' as any, grupoPointer as any);
    alumnoQuery.limit(1000);
    const alumnos = await alumnoQuery.find({ useMasterKey: true });

    if (alumnos.length === 0) {
      res.status(404).json({ status: 'error', message: 'No hay alumnos activos en el grupo' });
      return;
    }

    let created = 0;
    let skipped = 0;
    const toSave: CompetenciaAlumno[] = [];

    for (const alumno of alumnos) {
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
        registro.setValorPeriodo1('');
        registro.setValorPeriodo2('');
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
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear competencias de alumnos' });
  }
}

export async function getCompetenciasStatus(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    const alumnoQuery = new Parse.Query<AppUser>('AppUser');
    alumnoQuery.equalTo('exists' as any, true as any);
    alumnoQuery.equalTo('active' as any, true as any);
    alumnoQuery.equalTo('userType' as any, 'alumno' as any);
    alumnoQuery.equalTo('grupo' as any, grupoPointer as any);
    alumnoQuery.limit(1000);
    const alumnos = await alumnoQuery.find({ useMasterKey: true });

    let alumnosConCompetencias = 0;
    let alumnosSinCompetencias = 0;

    for (const alumno of alumnos) {
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

    // Fetch competencias del alumno con include del pointer
    const query = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
    query.equalTo('exists' as any, true as any);
    query.equalTo('grupo' as any, grupoPointer as any);
    query.equalTo('alumno' as any, alumnoPointer as any);
    query.include('competencia' as any);
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

export async function updateCompetenciaAlumno(req: Request, res: Response): Promise<void> {
  const { compAlumnoId } = req.params;

  try {
    const query = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
    query.equalTo('exists' as any, true as any);
    const registro = await query.get(compAlumnoId, { useMasterKey: true });

    const { valorPeriodo1, valorPeriodo2, retroPeriodo1, retroPeriodo2 } = req.body;

    if (typeof valorPeriodo1 === 'string') registro.setValorPeriodo1(valorPeriodo1);
    if (typeof valorPeriodo2 === 'string') registro.setValorPeriodo2(valorPeriodo2);
    if (typeof retroPeriodo1 === 'string') registro.setRetroPeriodo1(retroPeriodo1);
    if (typeof retroPeriodo2 === 'string') registro.setRetroPeriodo2(retroPeriodo2);

    await registro.save(null, { useMasterKey: true });

    // Re-fetch with include to return full data
    const fetchQuery = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
    fetchQuery.include('competencia' as any);
    const updated = await fetchQuery.get(registro.id, { useMasterKey: true });

    res.json({ status: 'ok', competencia: updated.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al actualizar competencia del alumno' });
  }
}
