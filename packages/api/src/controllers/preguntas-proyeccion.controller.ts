import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Grupo } from '../models/Grupo.js';
import { PreguntaAsignacion } from '../models/PreguntaAsignacion.js';
import {
  ProyeccionPregunta, ESTADOS_PROYECCION, type EstadoProyeccion,
} from '../models/ProyeccionPregunta.js';
import { coleccionesDeGrupo } from '../services/grupo-colecciones.service.js';
import { DURACION_POR_DEFECTO, GRACIA_SEGUNDOS } from '../constants/preguntas.js';

/**
 * Qué se proyecta AHORA en un grupo: el mando a distancia del módulo.
 *
 * La proyección vive en otra pantalla —el iPad del alumno, el cañón del aula— y
 * se dirige desde el panel del profesor, que suele estar en otro aparato. Por
 * eso el estado pasa por el servidor y no por el navegador: dos pestañas del
 * mismo Chrome se habrían entendido solas, dos dispositivos no.
 *
 * El servidor NO cuenta el tiempo. Guarda el instante de arranque y devuelve su
 * propio reloj en cada respuesta; cada pantalla calcula lo que queda con la
 * diferencia. Así no hay temporizadores en el servidor, entrar a mitad enseña el
 * número correcto y los relojes desajustados de los aparatos no importan.
 */

/** Estado de un grupo que todavía no ha proyectado nada. */
function vacia(duracionSegundos: number) {
  return {
    estado: 'espera' as EstadoProyeccion,
    iniciadoEn: null,
    asignacionId: null,
    alumno: null,
    competencia: null,
    intento: null,
    textoHtml: null,
    texto: null,
    duracionSegundos,
    graciaSegundos: GRACIA_SEGUNDOS,
  };
}

/** El tiempo que rige en este grupo. Igual que en el roster: grupo → materia → módulo. */
async function duracionDelGrupo(grupoId: string, grupo: Grupo | null): Promise<number> {
  const delGrupo = grupo?.get('preguntasDuracionSegundos') as number | undefined;
  if (delGrupo != null) return delGrupo;
  const colecciones = await coleccionesDeGrupo(grupoId, 'preguntas');
  for (const c of colecciones) {
    const suyo = c.get('preguntasDuracionSegundos') as number | undefined;
    if (suyo != null) return suyo;
  }
  return DURACION_POR_DEFECTO;
}

async function cargarGrupo(grupoId: string): Promise<Grupo | null> {
  try {
    const q = new Parse.Query<Grupo>('Grupo');
    q.equalTo('exists' as any, true as any);
    return await q.get(grupoId, { useMasterKey: true });
  } catch {
    return null;
  }
}

/** La fila del grupo, o null si nunca ha proyectado. Hay UNA por grupo. */
async function cargarProyeccion(grupoId: string): Promise<ProyeccionPregunta | null> {
  const q = new Parse.Query<ProyeccionPregunta>('ProyeccionPregunta');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  q.equalTo('exists' as any, true as any);
  q.include('asignacion' as any);
  q.include('asignacion.alumno' as any);
  q.include('asignacion.pregunta' as any);
  q.include('asignacion.pregunta.competencia' as any);
  q.include('asignacion.pregunta.coleccion' as any);
  q.descending('updatedAt');
  return (await q.first({ useMasterKey: true })) ?? null;
}

/** La respuesta que leen las dos pantallas: todo resuelto, una sola petición. */
async function responder(
  res: Response,
  grupoId: string,
  proyeccion: ProyeccionPregunta | null,
): Promise<void> {
  const grupo = await cargarGrupo(grupoId);
  const duracionGrupo = await duracionDelGrupo(grupoId, grupo);
  const serverNow = new Date().toISOString();

  const asignacion = proyeccion?.getAsignacion() as PreguntaAsignacion | undefined;
  const pregunta = asignacion?.getPregunta();
  if (!proyeccion || !asignacion || !pregunta) {
    res.json({ status: 'ok', serverNow, proyeccion: vacia(duracionGrupo) });
    return;
  }

  // El tiempo de la materia de ESTA pregunta, si el grupo no lo anula: un grupo
  // puede llevar el módulo en dos materias con tiempos distintos.
  const deLaColeccion = pregunta.get('coleccion')?.get('preguntasDuracionSegundos') as number | undefined;
  const duracionSegundos = (grupo?.get('preguntasDuracionSegundos') as number | undefined)
    ?? deLaColeccion ?? DURACION_POR_DEFECTO;

  res.json({
    status: 'ok',
    serverNow,
    proyeccion: {
      estado: proyeccion.getEstado(),
      iniciadoEn: proyeccion.getIniciadoEn()?.toISOString() ?? null,
      asignacionId: asignacion.id,
      alumno: { name: asignacion.getAlumno()?.get('name') ?? '' },
      // Lo que va bajo el nombre en la pantalla del alumno: qué se le evalúa.
      competencia: pregunta.get('competencia')?.get('competencia') ?? null,
      intento: asignacion.getIntento(),
      // ⚠️ Las NOTAS de la pregunta no salen de aquí: esta respuesta la pinta
      // una pantalla que ve el alumno.
      textoHtml: pregunta.get('textoHtml') ?? '',
      texto: pregunta.get('texto') ?? '',
      duracionSegundos,
      graciaSegundos: GRACIA_SEGUNDOS,
    },
  });
}

/** GET /admin/grupos/:grupoId/preguntas/proyeccion */
export async function getProyeccion(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  try {
    await responder(res, grupoId, await cargarProyeccion(grupoId));
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al leer la proyección' });
  }
}

/**
 * PUT /admin/grupos/:grupoId/preguntas/proyeccion
 *
 * Body: `{ asignacionId?: string | null, estado?: 'espera' | 'corriendo' | 'detenido' }`.
 *
 * Cambiar de asignación REINICIA el reloj aunque no lo pidan: seguir contando el
 * tiempo del alumno anterior es peor que no tener temporizador.
 */
export async function setProyeccion(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { asignacionId, estado } = req.body as {
    asignacionId?: string | null;
    estado?: string;
  };

  if (estado !== undefined && !ESTADOS_PROYECCION.includes(estado as EstadoProyeccion)) {
    res.status(400).json({ status: 'error', message: 'Estado de proyección no válido' });
    return;
  }

  try {
    let proyeccion = await cargarProyeccion(grupoId);
    if (!proyeccion) {
      proyeccion = new ProyeccionPregunta().initDefaults();
      proyeccion.setGrupo(Grupo.createWithoutData(grupoId) as Grupo);
    }

    let cambioDeAsignacion = false;
    if (asignacionId !== undefined) {
      if (asignacionId === null) {
        cambioDeAsignacion = proyeccion.getAsignacion() != null;
        proyeccion.setAsignacion(null);
      } else {
        const q = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
        q.equalTo('exists' as any, true as any);
        let asignacion: PreguntaAsignacion;
        try {
          asignacion = await q.get(asignacionId, { useMasterKey: true });
        } catch {
          res.status(404).json({ status: 'error', message: 'La asignación no existe' });
          return;
        }
        // Que la asignación sea de ESTE grupo: la ruta ya comprueba el acceso al
        // grupo, no que lo que se proyecta le pertenezca.
        if (asignacion.get('grupo')?.id !== grupoId) {
          res.status(403).json({ status: 'error', message: 'Esa asignación no es de este grupo' });
          return;
        }
        cambioDeAsignacion = proyeccion.getAsignacion()?.id !== asignacionId;
        proyeccion.setAsignacion(asignacion);
      }
    }

    if (cambioDeAsignacion && estado === undefined) {
      proyeccion.setEstado('espera');
      proyeccion.setIniciadoEn(null);
    }

    if (estado !== undefined) {
      const nuevo = estado as EstadoProyeccion;
      proyeccion.setEstado(nuevo);
      // «Iniciar» sella la hora; «espera» es el reinicio y la borra. «detenido»
      // la conserva: el panel sigue pudiendo decir por dónde se quedó.
      if (nuevo === 'corriendo') proyeccion.setIniciadoEn(new Date());
      else if (nuevo === 'espera') proyeccion.setIniciadoEn(null);
    }

    await proyeccion.save(null, { useMasterKey: true });
    await responder(res, grupoId, await cargarProyeccion(grupoId));
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al cambiar la proyección' });
  }
}
