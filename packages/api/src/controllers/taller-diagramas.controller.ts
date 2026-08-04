import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { DiagramaTaller } from '../models/DiagramaTaller.js';
import { resolverAccesoDiagramas } from '../services/diagramas-alumno.service.js';
import { TIPOS_DIAGRAMA, type Motor, type TipoDiagrama } from '../services/juez-diagramas/index.js';

/**
 * Taller de diagramas: CRUD de los diagramas libres de CADA usuario.
 *
 * No cuelga de una colección ni de un ejercicio, así que no usa el slug del
 * visor. Lo que sí comparte con el módulo es la puerta: solo entra quien tenga
 * «diagramas» encendido en alguna de sus colecciones, para que el taller no
 * aparezca en cursos donde el módulo no se usa.
 *
 * Cada operación comprueba la PROPIEDAD del diagrama, no solo la sesión: sin
 * eso, conocer un identificador ajeno bastaría para leer o borrar el trabajo de
 * otro alumno.
 */

const MOTORES: Motor[] = ['mermaid', 'plantuml'];
const NOMBRE_MAX = 120;
const CODIGO_MAX = 20000;

/** ¿Tiene el módulo encendido en alguna colección? Si no, 404 como el resto. */
async function tieneAcceso(user: AppUser): Promise<boolean> {
  const accesos = await resolverAccesoDiagramas(user);
  return accesos.size > 0;
}

function normalizarMotor(valor: unknown): Motor {
  return MOTORES.includes(valor as Motor) ? (valor as Motor) : 'mermaid';
}

function normalizarTipo(valor: unknown): TipoDiagrama {
  return TIPOS_DIAGRAMA.includes(valor as TipoDiagrama) ? (valor as TipoDiagrama) : 'clases';
}

/** Nombre válido y acotado, o el error a devolver. */
function normalizarNombre(valor: unknown): string | { error: string } {
  if (typeof valor !== 'string' || !valor.trim()) {
    return { error: 'El diagrama necesita un nombre' };
  }
  const nombre = valor.trim();
  if (nombre.length > NOMBRE_MAX) {
    return { error: `El nombre no puede pasar de ${NOMBRE_MAX} caracteres` };
  }
  return nombre;
}

function normalizarCodigo(valor: unknown): string | { error: string } {
  const codigo = typeof valor === 'string' ? valor : '';
  // Un tope alto pero real: el campo va a la BD y el editor no debería poder
  // guardar un documento arbitrariamente grande por un pegado accidental.
  if (codigo.length > CODIGO_MAX) {
    return { error: `El diagrama no puede pasar de ${CODIGO_MAX} caracteres` };
  }
  return codigo;
}

/** Carga un diagrama comprobando que sea DEL usuario. */
async function cargarPropio(user: AppUser, id: string): Promise<DiagramaTaller | null> {
  try {
    const q = new Parse.Query<DiagramaTaller>('DiagramaTaller');
    q.equalTo('exists' as any, true as any);
    const diagrama = await q.get(id, { useMasterKey: true });
    // Ajeno o de nadie ⇒ se responde igual que si no existiera: revelar la
    // diferencia confirmaría al curioso que ese identificador es real.
    if (diagrama.getAutor()?.id !== user.id) return null;
    return diagrama;
  } catch {
    return null;
  }
}

/** GET /me/diagramas-taller */
export async function listDiagramasTaller(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  try {
    if (!(await tieneAcceso(user))) {
      res.status(404).json({ status: 'error', message: 'No encontrado' });
      return;
    }
    const q = new Parse.Query<DiagramaTaller>('DiagramaTaller');
    q.equalTo('autor' as any, user as any);
    q.equalTo('exists' as any, true as any);
    // El listado no necesita el código, que es el campo grande: se pide al abrir
    // cada diagrama. Es la misma lección que dejaron los listados de ejercicios.
    q.select('nombre' as any, 'motor' as any, 'tipoDiagrama' as any);
    q.descending('updatedAt');
    q.limit(500);
    const diagramas = await q.find({ useMasterKey: true });
    res.json({
      status: 'ok',
      diagramas: diagramas.map((d) => ({
        id: d.id,
        nombre: d.getNombre(),
        motor: d.getMotor(),
        tipoDiagrama: d.getTipoDiagrama(),
        updatedAt: d.updatedAt,
      })),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener los diagramas' });
  }
}

/** GET /me/diagramas-taller/:id */
export async function getDiagramaTaller(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const diagrama = await cargarPropio(user, req.params.id);
  if (!diagrama) {
    res.status(404).json({ status: 'error', message: 'Diagrama no encontrado' });
    return;
  }
  res.json({ status: 'ok', diagrama: diagrama.toSafeJSON() });
}

/** POST /me/diagramas-taller */
export async function createDiagramaTaller(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const { nombre, motor, tipoDiagrama, codigo } = req.body ?? {};

  const nombreValido = normalizarNombre(nombre);
  if (typeof nombreValido !== 'string') {
    res.status(400).json({ status: 'error', message: nombreValido.error });
    return;
  }
  const codigoValido = normalizarCodigo(codigo);
  if (typeof codigoValido !== 'string') {
    res.status(400).json({ status: 'error', message: codigoValido.error });
    return;
  }

  try {
    if (!(await tieneAcceso(user))) {
      res.status(404).json({ status: 'error', message: 'No encontrado' });
      return;
    }
    const diagrama = new DiagramaTaller().initDefaults();
    diagrama.setAutor(user);
    diagrama.setNombre(nombreValido);
    diagrama.setMotor(normalizarMotor(motor));
    diagrama.setTipoDiagrama(normalizarTipo(tipoDiagrama));
    diagrama.setCodigo(codigoValido);
    await diagrama.save(null, { useMasterKey: true });
    res.status(201).json({ status: 'ok', diagrama: diagrama.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al guardar el diagrama' });
  }
}

/** PUT /me/diagramas-taller/:id */
export async function updateDiagramaTaller(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const diagrama = await cargarPropio(user, req.params.id);
  if (!diagrama) {
    res.status(404).json({ status: 'error', message: 'Diagrama no encontrado' });
    return;
  }
  const { nombre, motor, tipoDiagrama, codigo } = req.body ?? {};

  try {
    if (nombre !== undefined) {
      const nombreValido = normalizarNombre(nombre);
      if (typeof nombreValido !== 'string') {
        res.status(400).json({ status: 'error', message: nombreValido.error });
        return;
      }
      diagrama.setNombre(nombreValido);
    }
    if (codigo !== undefined) {
      const codigoValido = normalizarCodigo(codigo);
      if (typeof codigoValido !== 'string') {
        res.status(400).json({ status: 'error', message: codigoValido.error });
        return;
      }
      diagrama.setCodigo(codigoValido);
    }
    if (motor !== undefined) diagrama.setMotor(normalizarMotor(motor));
    if (tipoDiagrama !== undefined) diagrama.setTipoDiagrama(normalizarTipo(tipoDiagrama));

    await diagrama.save(null, { useMasterKey: true });
    res.json({ status: 'ok', diagrama: diagrama.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al actualizar el diagrama' });
  }
}

/** DELETE /me/diagramas-taller/:id (borrado suave) */
export async function deleteDiagramaTaller(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const diagrama = await cargarPropio(user, req.params.id);
  if (!diagrama) {
    res.status(404).json({ status: 'error', message: 'Diagrama no encontrado' });
    return;
  }
  try {
    diagrama.softDelete();
    await diagrama.save(null, { useMasterKey: true });
    res.json({ status: 'ok', message: 'Diagrama eliminado' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al eliminar el diagrama' });
  }
}
