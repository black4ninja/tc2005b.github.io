import type { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';
import {
  getAlumnosDeGrupo,
  findGrupoAlumnoLink,
  createGrupoAlumnoLink,
} from '../services/grupo-alumno.service.js';

export async function listAlumnos(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const alumnos = await getAlumnosDeGrupo(grupoId);

    res.json({
      status: 'ok',
      alumnos: alumnos.map((item) => ({
        ...item.alumno.toSafeJSON(),
        repositorioIndividual: item.repositorioIndividual,
        experiencia: item.experiencia,
        expectativas: item.expectativas,
        compromiso: item.compromiso,
        situacionesEspeciales: item.situacionesEspeciales,
        perfilCompleto: item.perfilCompleto,
      })),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener alumnos' });
  }
}

export async function createAlumno(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { name, email, matricula } = req.body;

  if (!name || !email || !matricula) {
    res.status(400).json({ status: 'error', message: 'Nombre, correo y matrícula son requeridos' });
    return;
  }

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
    const normalizedEmail = email.toLowerCase().trim();

    // Buscar usuario existente por email
    const existQuery = BaseModel.queryActive<AppUser>('AppUser');
    existQuery.equalTo('email', normalizedEmail);
    const existing = await existQuery.first({ useMasterKey: true });

    if (existing) {
      // Verificar si ya tiene link con este grupo
      const existingLink = await findGrupoAlumnoLink(existing.id, grupoId);
      if (existingLink && existingLink.get('exists') && existingLink.get('active')) {
        res.status(409).json({ status: 'error', message: 'El alumno ya pertenece a este grupo' });
        return;
      }

      // Reactivar link soft-deleted o crear nuevo
      if (existingLink) {
        existingLink.set('active', true);
        existingLink.set('exists', true);
        await existingLink.save(null, { useMasterKey: true });
      } else {
        await createGrupoAlumnoLink(existing, grupoPointer);
      }

      res.status(201).json({
        status: 'ok',
        alumno: existing.toSafeJSON(),
      });
      return;
    }

    // Usuario nuevo
    const generatedPassword = crypto.randomBytes(6).toString('base64url').slice(0, 8);
    const hash = await bcrypt.hash(generatedPassword, 10);

    const alumno = new AppUser().initDefaults();
    alumno.setName(name.trim());
    alumno.setEmail(normalizedEmail);
    alumno.setMatricula(matricula.trim());
    alumno.setUserType('alumno');
    alumno.setPasswordHash(hash);
    alumno.setAttributes({});

    await alumno.save(null, { useMasterKey: true });
    await createGrupoAlumnoLink(alumno, grupoPointer);

    res.status(201).json({
      status: 'ok',
      alumno: alumno.toSafeJSON(),
      generatedPassword,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear alumno' });
  }
}

export async function updateAlumno(req: Request, res: Response): Promise<void> {
  const { alumnoId } = req.params;
  const { name, email, matricula } = req.body;

  try {
    const query = BaseModel.queryActive<AppUser>('AppUser');
    const alumno = await query.get(alumnoId, { useMasterKey: true });

    if (name !== undefined) alumno.setName(name.trim());
    if (email !== undefined) alumno.setEmail(email.toLowerCase().trim());
    if (matricula !== undefined) alumno.setMatricula(matricula.trim());

    await alumno.save(null, { useMasterKey: true });

    res.json({ status: 'ok', alumno: alumno.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Alumno no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar alumno' });
  }
}

export async function archiveAlumno(req: Request, res: Response): Promise<void> {
  const { alumnoId, grupoId } = req.params;

  try {
    const link = await findGrupoAlumnoLink(alumnoId, grupoId);
    if (!link || !link.get('exists')) {
      res.status(404).json({ status: 'error', message: 'Alumno no encontrado en este grupo' });
      return;
    }

    if (link.get('active')) {
      link.deactivate();
    } else {
      link.activate();
    }
    await link.save(null, { useMasterKey: true });

    // Fetch alumno for response
    const alumnoQuery = new Parse.Query<AppUser>('AppUser');
    const alumno = await alumnoQuery.get(alumnoId, { useMasterKey: true });

    res.json({ status: 'ok', alumno: alumno.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Alumno no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al cambiar estado del alumno' });
  }
}

export async function deleteAlumno(req: Request, res: Response): Promise<void> {
  const { alumnoId, grupoId } = req.params;

  try {
    const link = await findGrupoAlumnoLink(alumnoId, grupoId);
    if (!link || !link.get('exists')) {
      res.status(404).json({ status: 'error', message: 'Alumno no encontrado en este grupo' });
      return;
    }

    link.softDelete();
    await link.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Alumno eliminado del grupo' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Alumno no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar alumno' });
  }
}

export async function importAlumnosCSV(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { csv } = req.body;

  if (!csv || typeof csv !== 'string') {
    res.status(400).json({ status: 'error', message: 'Se requiere el contenido CSV' });
    return;
  }

  try {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      res.status(400).json({ status: 'error', message: 'El CSV debe tener al menos una fila de datos' });
      return;
    }

    const headerLine = lines[0].toLowerCase().trim();
    const headers = parseCsvLine(headerLine);
    const nameIdx = headers.findIndex((h) => h === 'alumno' || h === 'nombre');
    const matriculaIdx = headers.findIndex((h) => h === 'matricula' || h === 'matrícula');
    const emailIdx = headers.findIndex((h) => h === 'correo' || h === 'email');

    if (nameIdx === -1 || matriculaIdx === -1 || emailIdx === -1) {
      res.status(400).json({
        status: 'error',
        message: 'El CSV debe tener columnas: alumno, matricula, correo',
      });
      return;
    }

    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
    const imported: number[] = [];
    const linked: { email: string; name: string }[] = [];
    const skipped: { email: string; reason: string }[] = [];
    const credentials: { email: string; name: string; password: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const alumnoName = cols[nameIdx]?.trim();
      const matricula = cols[matriculaIdx]?.trim();
      const email = cols[emailIdx]?.trim().toLowerCase();

      if (!alumnoName || !email) {
        skipped.push({ email: email || `fila ${i + 1}`, reason: 'Datos incompletos' });
        continue;
      }

      const existQuery = BaseModel.queryActive<AppUser>('AppUser');
      existQuery.equalTo('email', email);
      const existing = await existQuery.first({ useMasterKey: true });

      if (existing) {
        // Verificar si ya tiene link con este grupo
        const existingLink = await findGrupoAlumnoLink(existing.id, grupoId);
        if (existingLink && existingLink.get('exists') && existingLink.get('active')) {
          skipped.push({ email, reason: 'El alumno ya pertenece a este grupo' });
          continue;
        }

        // Reactivar o crear link
        if (existingLink) {
          existingLink.set('active', true);
          existingLink.set('exists', true);
          await existingLink.save(null, { useMasterKey: true });
        } else {
          await createGrupoAlumnoLink(existing, grupoPointer);
        }
        imported.push(i);
        linked.push({ email, name: alumnoName });
        continue;
      }

      // Usuario nuevo
      const password = crypto.randomBytes(6).toString('base64url').slice(0, 8);
      const hash = await bcrypt.hash(password, 10);

      const alumno = new AppUser().initDefaults();
      alumno.setName(alumnoName);
      alumno.setEmail(email);
      alumno.setMatricula(matricula || '');
      alumno.setUserType('alumno');
      alumno.setPasswordHash(hash);
      alumno.setAttributes({});

      await alumno.save(null, { useMasterKey: true });
      await createGrupoAlumnoLink(alumno, grupoPointer);
      imported.push(i);
      credentials.push({ email, name: alumnoName, password });
    }

    res.json({
      status: 'ok',
      imported: imported.length,
      linked,
      skipped,
      credentials,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al importar alumnos' });
  }
}

export async function downloadTemplate(_req: Request, res: Response): Promise<void> {
  const csvContent = 'alumno,matricula,correo\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_alumnos.csv"');
  res.send(csvContent);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}
