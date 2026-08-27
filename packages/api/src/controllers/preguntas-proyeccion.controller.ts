import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Grupo } from '../models/Grupo.js';
import { PreguntaAsignacion } from '../models/PreguntaAsignacion.js';
import {
  ProyeccionPregunta, ESTADOS_PROYECCION, type EstadoProyeccion,
} from '../models/ProyeccionPregunta.js';
import { coleccionesDeGrupo } from '../services/grupo-colecciones.service.js';
import { publicar, suscribir } from '../services/proyeccion-bus.js';
import { DURACION_POR_DEFECTO, GRACIA_SEGUNDOS } from '../constants/preguntas.js';

/**
 * Qué se proyecta AHORA en un grupo: el mando a distancia del módulo.
 *
 * La proyección vive en otra pantalla —el iPad del alumno, el cañón del aula— y
 * se dirige desde el panel del profesor, que suele estar en otro aparato. Por
 * eso el estado pasa por el servidor y no por el navegador: dos pestañas del
 * mismo Chrome se habrían entendido solas, dos dispositivos no.
 *
 * Aquí el tiempo IMPORTA: son entrevistas de tres minutos y el profesor pulsa
 * «Iniciar» con el alumno delante. Dos decisiones vienen de ahí:
 *
 *  1. La pantalla NO pregunta, ESCUCHA (`/proyeccion/stream`). Sondear una vez
 *     por segundo costaba validar la sesión, comprobar el acceso al grupo y leer
 *     la fila —casi un segundo contra Atlas— para contestar «no ha cambiado» el
 *     99 % de las veces. Ahora abre una conexión y el servidor le avisa.
 *  2. La fila lleva una FOTO de lo que se proyecta. Resolver los punteros hasta
 *     la competencia y la colección eran 310 ms; leerlos copiados, 70.
 *
 * El servidor NO cuenta el tiempo. Guarda el instante de arranque y devuelve su
 * propio reloj; cada pantalla calcula lo que queda con la diferencia. Así entrar
 * a mitad enseña el número correcto y los relojes desajustados no importan.
 */

/** Latido del stream. Sin él, algún proxy da la conexión por muerta. */
const LATIDO_MS = 25000;

async function cargarGrupo(grupoId: string): Promise<Grupo | null> {
  try {
    const q = new Parse.Query<Grupo>('Grupo');
    q.equalTo('exists' as any, true as any);
    return await q.get(grupoId, { useMasterKey: true });
  } catch {
    return null;
  }
}

/**
 * La fila del grupo, o null si nunca ha proyectado. Hay UNA por grupo.
 *
 * Un solo `include`, el del grupo, porque su tiempo se lee VIVO —el profesor
 * puede cambiarlo a mitad de sesión—. Todo lo demás sale de la foto.
 */
async function cargarProyeccion(grupoId: string): Promise<ProyeccionPregunta | null> {
  const q = new Parse.Query<ProyeccionPregunta>('ProyeccionPregunta');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  q.equalTo('exists' as any, true as any);
  q.include('grupo' as any);
  q.descending('updatedAt');
  return (await q.first({ useMasterKey: true })) ?? null;
}

/**
 * El tiempo que rige cuando no hay pregunta puesta. Igual que en el roster:
 * grupo → materia → módulo. Solo se llama en ese caso: mirar las colecciones del
 * grupo es la consulta más cara y con pregunta en pantalla el dato ya está en la
 * foto.
 */
async function duracionSinPregunta(grupoId: string, grupo: Grupo | null): Promise<number> {
  const delGrupo = grupo?.get('preguntasDuracionSegundos') as number | undefined;
  if (delGrupo != null) return delGrupo;
  const colecciones = await coleccionesDeGrupo(grupoId, 'preguntas');
  for (const c of colecciones) {
    const suyo = c.get('preguntasDuracionSegundos') as number | undefined;
    if (suyo != null) return suyo;
  }
  return DURACION_POR_DEFECTO;
}

interface EstadoProyectado {
  estado: EstadoProyeccion;
  iniciadoEn: string | null;
  asignacionId: string | null;
  alumno: { name: string } | null;
  competencia: string | null;
  intento: number | null;
  textoHtml: string | null;
  texto: string | null;
  duracionSegundos: number;
  graciaSegundos: number;
}

/** Lo que leen las dos pantallas, ya resuelto. */
async function construirEstado(
  grupoId: string,
  proyeccion: ProyeccionPregunta | null,
): Promise<EstadoProyectado> {
  const grupo = (proyeccion?.getGrupo() as Grupo | undefined) ?? null;
  const foto = proyeccion?.getFoto();
  const asignacionId = proyeccion?.getAsignacion()?.id ?? null;

  if (!proyeccion || !asignacionId || !foto) {
    return {
      estado: 'espera',
      iniciadoEn: null,
      asignacionId: null,
      alumno: null,
      competencia: null,
      intento: null,
      textoHtml: null,
      texto: null,
      duracionSegundos: await duracionSinPregunta(grupoId, grupo ?? await cargarGrupo(grupoId)),
      graciaSegundos: GRACIA_SEGUNDOS,
    };
  }

  // El grupo manda sobre la materia, y se lee vivo: el profesor puede ajustarlo
  // desde el panel sin cambiar de pregunta.
  const duracionSegundos = (grupo?.get('preguntasDuracionSegundos') as number | undefined)
    ?? foto.duracionColeccion ?? DURACION_POR_DEFECTO;

  return {
    estado: proyeccion.getEstado(),
    iniciadoEn: proyeccion.getIniciadoEn()?.toISOString() ?? null,
    asignacionId,
    alumno: { name: foto.alumnoNombre },
    // Lo que va bajo el nombre en la pantalla del alumno: qué se le evalúa.
    competencia: foto.competencia,
    intento: foto.intento,
    // ⚠️ Las NOTAS de la pregunta no salen de aquí: esto lo pinta una pantalla
    // que ve el alumno.
    textoHtml: foto.textoHtml,
    texto: foto.texto,
    duracionSegundos,
    graciaSegundos: GRACIA_SEGUNDOS,
  };
}

function sobre(estado: EstadoProyectado) {
  return { status: 'ok', serverNow: new Date().toISOString(), proyeccion: estado };
}

/**
 * GET /admin/grupos/:grupoId/preguntas/proyeccion
 *
 * Queda para la primera carga y como red de seguridad del stream; la pantalla
 * proyectada ya no vive de esto.
 */
export async function getProyeccion(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  try {
    res.json(sobre(await construirEstado(grupoId, await cargarProyeccion(grupoId))));
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al leer la proyección' });
  }
}

/**
 * GET /admin/grupos/:grupoId/preguntas/proyeccion/stream — Server-Sent Events.
 *
 * La conexión se autentica UNA vez y a partir de ahí el servidor empuja. Es la
 * diferencia entre que el alumno vea la pregunta al pulsar o hasta dos segundos
 * después, que en una entrevista de tres minutos no es un detalle.
 *
 * `EventSource` no manda cabeceras propias, así que la sesión viaja en la cookie
 * —que ya existe para las navegaciones normales— y no en la URL: un token en la
 * barra de direcciones acaba en los registros del servidor.
 */
export async function streamProyeccion(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  // `no-transform` además de `no-cache`: es lo que impide que un proxy por el
  // medio decida comprimir el flujo y, al hacerlo, lo deje en un búfer.
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  function enviar(estado: unknown) {
    res.write(`data: ${JSON.stringify(sobre(estado as EstadoProyectado))}\n\n`);
  }

  // Suscribir ANTES de leer: si el profesor pulsa justo mientras se resuelve la
  // primera lectura, el aviso llega igual y no se pierde el cambio.
  const baja = suscribir(grupoId, enviar);
  const latido = setInterval(() => res.write(': latido\n\n'), LATIDO_MS);
  req.on('close', () => { baja(); clearInterval(latido); });

  try {
    enviar(await construirEstado(grupoId, await cargarProyeccion(grupoId)));
  } catch {
    res.write('event: error\ndata: {}\n\n');
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
        proyeccion.setFoto(null);
      } else if (proyeccion.getAsignacion()?.id !== asignacionId || !proyeccion.getFoto()) {
        // Los `include` se pagan AQUÍ, una vez por cambio de pregunta, y no en
        // cada lectura de la pantalla.
        const q = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
        q.equalTo('exists' as any, true as any);
        q.include('alumno' as any);
        q.include('pregunta' as any);
        q.include('pregunta.competencia' as any);
        q.include('pregunta.coleccion' as any);
        let asignacion: PreguntaAsignacion;
        try {
          asignacion = await q.get(asignacionId, { useMasterKey: true });
        } catch {
          res.status(404).json({ status: 'error', message: 'La asignación no existe' });
          return;
        }
        // Que la asignación sea de ESTE grupo: la ruta comprueba el acceso al
        // grupo, no que lo que se proyecta le pertenezca.
        if (asignacion.get('grupo')?.id !== grupoId) {
          res.status(403).json({ status: 'error', message: 'Esa asignación no es de este grupo' });
          return;
        }
        const pregunta = asignacion.getPregunta();
        cambioDeAsignacion = true;
        proyeccion.setAsignacion(asignacion);
        proyeccion.setFoto({
          alumnoNombre: asignacion.getAlumno()?.get('name') ?? '',
          competencia: pregunta?.get('competencia')?.get('competencia') ?? null,
          textoHtml: pregunta?.get('textoHtml') ?? '',
          texto: pregunta?.get('texto') ?? '',
          intento: asignacion.getIntento(),
          duracionColeccion: (pregunta?.get('coleccion')?.get('preguntasDuracionSegundos') as number | undefined) ?? null,
        });
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
    const nuevoEstado = await construirEstado(grupoId, proyeccion);
    // A las pantallas primero: son las que están esperando: el panel ya pintó su
    // cambio antes de mandarlo.
    publicar(grupoId, nuevoEstado);
    res.json(sobre(nuevoEstado));
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al cambiar la proyección' });
  }
}
