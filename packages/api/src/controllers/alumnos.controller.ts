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
import { invalidateColeccionesPermitidas } from '../services/contenidos.service.js';
import { escaparRegex } from '../utils/regex.js';

export async function listAlumnos(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    // Admin necesita ver TAMBIÉN los dados de baja para poder reactivarlos.
    const alumnos = await getAlumnosDeGrupo(grupoId, { includeInactive: true });

    res.json({
      status: 'ok',
      alumnos: alumnos.map((item) => ({
        ...item.alumno.toSafeJSON(),
        // Override: el `active` que importa al admin del grupo es el del LINK
        // GrupoAlumno (alumno dado de baja DEL GRUPO), no el de AppUser.
        active: item.active,
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

/** Mínimo de caracteres para buscar: menos devuelve medio padrón por un tecleo. */
const BUSCAR_MIN = 2;
/** Tope de resultados. Es un buscador para identificar a alguien, no un listado. */
const BUSCAR_MAX = 20;

/**
 * GET /admin/grupos/:grupoId/alumnos/buscar?q=… — alumnos YA DADOS DE ALTA en el
 * sistema que casen por matrícula, nombre o correo, para meterlos al grupo sin
 * volver a crearlos.
 *
 * Busca en TODO el padrón, no solo en el grupo: el caso de uso es justo el
 * alumno que viene de otro grupo o de un semestre anterior. Por eso devuelve lo
 * mínimo para identificarlo (nombre, matrícula, correo) y nada del perfil.
 *
 * `enGrupo`/`baja` viajan con cada resultado para que la interfaz no ofrezca
 * agregar a quien ya está, y distinga a quien solo hay que reactivar.
 */
export async function buscarAlumnos(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  if (q.length < BUSCAR_MIN) {
    res.status(400).json({ status: 'error', message: `La búsqueda necesita al menos ${BUSCAR_MIN} caracteres` });
    return;
  }

  try {
    // El texto va escapado: sin eso, un `(((` del usuario es una regex inválida
    // (500) y un `(a+)+$` es un cuelgue del servidor.
    const patron = new RegExp(escaparRegex(q), 'i');
    const porCampo = (campo: string) => {
      const query = BaseModel.queryActive<AppUser>('AppUser');
      query.equalTo('userType' as any, 'alumno' as any);
      query.matches(campo as any, patron as any);
      return query;
    };

    const query = Parse.Query.or(porCampo('matricula'), porCampo('name'), porCampo('email'));
    query.ascending('name');
    query.limit(BUSCAR_MAX);
    const alumnos = await query.find({ useMasterKey: true });

    // Una consulta por alumno bastaría, pero son <= BUSCAR_MAX y `findGrupoAlumnoLink`
    // ya existe; se resuelven en paralelo para no encadenar 20 viajes.
    const links = await Promise.all(alumnos.map((a) => findGrupoAlumnoLink(a.id, grupoId)));

    res.json({
      status: 'ok',
      alumnos: alumnos.map((alumno, i) => {
        const link = links[i];
        const vinculado = !!link && link.get('exists') === true;
        return {
          id: alumno.id,
          name: alumno.getName(),
          email: alumno.getEmail(),
          matricula: alumno.getMatricula(),
          // Ya está en el grupo y activo: no hay nada que hacer con él.
          enGrupo: vinculado && link!.get('active') === true,
          // Estuvo y se le dio de baja: agregarlo lo reactiva, no lo duplica.
          baja: vinculado && link!.get('active') !== true,
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al buscar alumnos' });
  }
}

/**
 * POST /admin/grupos/:grupoId/alumnos/vincular — mete al grupo un alumno que ya
 * existe, por id. Es el gemelo de `createAlumno` para el caso "ya está dado de
 * alta": ni crea usuario ni genera contraseña, así que el alumno conserva la
 * suya y su historial.
 */
export async function vincularAlumno(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { alumnoId } = req.body;

  if (!alumnoId || typeof alumnoId !== 'string') {
    res.status(400).json({ status: 'error', message: 'Se requiere el id del alumno' });
    return;
  }

  try {
    const query = BaseModel.queryActive<AppUser>('AppUser');
    query.equalTo('userType' as any, 'alumno' as any);
    const alumno = await query.get(alumnoId, { useMasterKey: true });

    const link = await findGrupoAlumnoLink(alumno.id, grupoId);
    if (link && link.get('exists') === true && link.get('active') === true) {
      res.status(409).json({ status: 'error', message: 'El alumno ya pertenece a este grupo' });
      return;
    }

    if (link) {
      // Reactivar el vínculo de una baja anterior conserva su perfil del grupo
      // (repositorio, experiencia, expectativas…), que cuelga del propio link.
      link.set('active', true);
      link.set('exists', true);
      await link.save(null, { useMasterKey: true });
    } else {
      const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
      await createGrupoAlumnoLink(alumno, grupoPointer);
    }
    invalidateColeccionesPermitidas(alumno.id);

    res.status(201).json({ status: 'ok', alumno: alumno.toSafeJSON(), reactivado: !!link });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Alumno no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al agregar el alumno al grupo' });
  }
}

export async function createAlumno(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { name, email, matricula } = req.body;

  // `typeof` además de vacío: un payload con un número donde va el nombre hacía
  // reventar el `.trim()` de más abajo y salía como 500 en vez de 400.
  const textoNoVacio = (v: unknown) => typeof v === 'string' && v.trim() !== '';
  if (!textoNoVacio(name) || !textoNoVacio(email) || !textoNoVacio(matricula)) {
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
      invalidateColeccionesPermitidas(existing.id);

      res.status(201).json({
        status: 'ok',
        alumno: existing.toSafeJSON(),
      });
      return;
    }

    // La deduplicación por correo (arriba) no ve al mismo alumno dado de alta con
    // OTRO correo, que es como se cuelan los duplicados: el mismo humano con dos
    // usuarios y el historial partido. La matrícula sí lo identifica.
    //
    // Solo se comprueba si viene con contenido: los alumnos importados por CSV
    // sin matrícula la tienen en '', y buscar por '' los casaría a todos.
    const matriculaLimpia = matricula.trim();
    if (matriculaLimpia) {
      const porMatricula = BaseModel.queryActive<AppUser>('AppUser');
      porMatricula.equalTo('matricula' as any, matriculaLimpia as any);
      const mismaMatricula = await porMatricula.first({ useMasterKey: true });
      if (mismaMatricula) {
        res.status(409).json({
          status: 'error',
          message:
            `La matrícula ${matriculaLimpia} ya es de ${mismaMatricula.getName()} ` +
            `(${mismaMatricula.getEmail()}). Búscalo en "Buscar existente" para agregarlo al grupo.`,
        });
        return;
      }
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
    invalidateColeccionesPermitidas(alumno.id);

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
    invalidateColeccionesPermitidas(alumnoId);

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
    invalidateColeccionesPermitidas(alumnoId);

    res.json({ status: 'ok', message: 'Alumno eliminado del grupo' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Alumno no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar alumno' });
  }
}

/**
 * ¿La matrícula y el correo de una fila del CSV se contradicen?
 *
 * En el Tec el correo institucional SE DERIVA de la matrícula
 * (`A01278654` → `a01278654@tec.mx`), así que las dos columnas dicen lo mismo
 * dos veces. Cuando no coinciden, no es un alumno raro: es una errata de quien
 * editó el CSV a mano, y hoy pasa en silencio — la fila se importa con la
 * matrícula de un alumno y el correo de otro, y como la deduplicación mira el
 * CORREO, el alumno de esa matrícula acaba duplicado más adelante.
 *
 * Solo se compara la parte local, no el dominio: un correo que no sea `@tec.mx`
 * (personal, o el `@itesm.mx` viejo) no es motivo para rechazar la fila.
 *
 * Devuelve el motivo a reportar, o `null` si la fila es coherente. Sin matrícula
 * no hay nada que contrastar y se deja pasar, como hasta ahora.
 */
export function motivoIncoherenciaCsv(matricula: string | undefined, correo: string): string | null {
  const m = (matricula ?? '').trim().toLowerCase();
  if (!m) return null;

  const local = correo.trim().toLowerCase().split('@')[0];
  if (!local || local === m) return null;

  return `La matrícula ${matricula!.trim()} no concuerda con el correo ${correo.trim()}; revisa la fila`;
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

      const incoherencia = motivoIncoherenciaCsv(matricula, email);
      if (incoherencia) {
        skipped.push({ email, reason: incoherencia });
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

    // Enrollment masivo: invalidar todo el cache de permisos una vez.
    if (imported.length > 0) {
      invalidateColeccionesPermitidas();
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
