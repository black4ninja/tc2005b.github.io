import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { DiagramaTaller } from '../models/DiagramaTaller.js';
import { resolverAccesoDiagramas } from '../services/diagramas-alumno.service.js';
import { esTipoConocido, motorPorOmision, motoresDe } from '@tc2005b/diagramas-catalogo';
import { type Motor } from '../services/juez-diagramas/index.js';

/**
 * Taller de diagramas: CRUD de los diagramas libres de CADA usuario.
 *
 * No cuelga de una colección ni de un ejercicio, así que no usa el slug del
 * visor.
 *
 * Hay DOS comprobaciones distintas, y no cubren lo mismo a propósito:
 *
 * - **La puerta del módulo** (`tieneAcceso`) cubre `list` y `create`, que son las
 *   que ofrecen el taller: si «diagramas» no está encendido en ninguna colección
 *   del alumno, el taller no aparece ni se puede empezar nada nuevo.
 * - **La propiedad del objeto** cubre además `get`, `update` y `delete`. Estas
 *   tres NO pasan por la puerta: un diagrama del taller es del alumno y no del
 *   curso, así que apagar el módulo —o cambiar de grupo— no debe convertir su
 *   propio trabajo en algo que ya no puede abrir ni borrar. Sin la lista no se
 *   llega a ellos desde la interfaz, y por identificador solo alcanza a los
 *   suyos, así que esto no abre nada de nadie más.
 *
 * Que la propiedad se compruebe en TODAS las operaciones no es opcional: sin eso,
 * conocer un identificador ajeno bastaría para leer o borrar el trabajo de otro
 * alumno.
 */

const MOTORES: Motor[] = ['mermaid', 'plantuml'];
const NOMBRE_MAX = 120;
const CODIGO_MAX = 20000;

/** ¿Tiene el módulo encendido en alguna colección? Si no, 404 como el resto. */
async function tieneAcceso(user: AppUser): Promise<boolean> {
  const accesos = await resolverAccesoDiagramas(user);
  return accesos.size > 0;
}

/**
 * Tipo del CATÁLOGO, no de los que el juez sabe evaluar.
 *
 * Aquí no se corrige nada, así que la única condición es que algún motor sepa
 * dibujarlo. Un tipo desconocido se RECHAZA, siguiendo el mismo patrón que
 * `normalizarNombre` y `normalizarCodigo`: adivinar `clases` es justo la
 * corrupción silenciosa que este catálogo vino a quitar —el trabajo se guarda
 * mal etiquetado y nadie se entera—, solo que con menos entradas afectadas.
 */
function normalizarTipo(valor: unknown): string | { error: string } {
  if (valor === undefined || valor === null) return 'clases';
  if (typeof valor !== 'string' || !esTipoConocido(valor)) {
    return { error: 'El tipo de diagrama no existe en el catálogo' };
  }
  return valor;
}

/**
 * Motor válido PARA ESE TIPO. La mayoría del catálogo existe en un solo motor, y
 * guardar la combinación imposible dejaría el diagrama sin poder dibujarse al
 * reabrirlo.
 *
 * El respaldo es `motorPorOmision` y no `motoresDe(tipo)[0]`: los tres tipos de
 * arquitectura se dibujan también en Mermaid con una aproximación en `flowchart`
 * que su notación rechaza, y `motoresDe` devuelve Mermaid primero.
 */
function normalizarMotor(valor: unknown, tipo: string): Motor {
  const posibles = motoresDe(tipo);
  if (posibles.includes(valor as Motor)) return valor as Motor;
  if (posibles.length) return motorPorOmision(tipo);
  return MOTORES.includes(valor as Motor) ? (valor as Motor) : 'mermaid';
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
  const tipo = normalizarTipo(tipoDiagrama);
  if (typeof tipo !== 'string') {
    res.status(400).json({ status: 'error', message: tipo.error });
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
    diagrama.setTipoDiagrama(tipo);
    diagrama.setMotor(normalizarMotor(motor, tipo));
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
    // El tipo se fija ANTES que el motor porque lo acota: cambiar a un tipo que
    // solo existe en un motor tiene que arrastrar el motor con él, o el diagrama
    // quedaría guardado en una combinación que no se puede dibujar.
    if (tipoDiagrama !== undefined) {
      const tipo = normalizarTipo(tipoDiagrama);
      if (typeof tipo !== 'string') {
        res.status(400).json({ status: 'error', message: tipo.error });
        return;
      }
      diagrama.setTipoDiagrama(tipo);
    }
    // Se reacota SIEMPRE, no solo cuando llega `motor`: un PUT que cambia solo
    // el tipo —el renombrado de la lista ya demuestra que los PUT parciales son
    // una forma admitida— dejaría si no el motor anterior sobre un tipo que no
    // sabe dibujar, que es exactamente el par imposible que esto evita.
    if (tipoDiagrama !== undefined || motor !== undefined) {
      const deseado = motor !== undefined ? motor : diagrama.getMotor();
      diagrama.setMotor(normalizarMotor(deseado, diagrama.getTipoDiagrama()));
    }

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
