import Parse from 'parse/node';
import { moduloHabilitado, type ModuloContenido } from '../models/modulos-contenido.js';

/**
 * Resolución de "qué le toca a un grupo" a partir de sus colecciones.
 *
 * La cadena es `Grupo.colecciones[]` → `<Entidad>.coleccion`, y hoy la recorren
 * dos entidades: `Competencia` (de la que cuelga la malla del alumno) y
 * `ActividadEvaluacion` (la plantilla que se estampa en el grupo).
 *
 * Vive aquí y no en cada controller porque la necesitan varios —crear la malla,
 * copiar la plantilla, validar el plan, poblar los selectores del admin— y si
 * cada uno la reimplementa, divergen: que es exactamente lo que ya pasó con
 * `recalcularCalculadas`, duplicada en dos archivos.
 */

/**
 * Colecciones (pointers) asignadas al grupo. Vacío si no tiene o no existe.
 *
 * Con `modulo`, además filtra a las colecciones donde ESE módulo está habilitado
 * para el grupo (`Grupo.modulosDeshabilitados`): así cada parte —Documentación,
 * Páginas, Competencias, Actividades— solo ve las colecciones que la comparten.
 */
export async function coleccionesDeGrupo(
  grupoId: string,
  modulo?: ModuloContenido,
): Promise<Parse.Object[]> {
  const query = new Parse.Query('Grupo');
  query.equalTo('exists' as any, true as any);
  query.include('colecciones' as any);
  try {
    const grupo = await query.get(grupoId, { useMasterKey: true });
    const cols = ((grupo.get('colecciones') ?? []) as Parse.Object[])
      .filter((c) => c && c.get('exists') !== false);
    if (!modulo) return cols;
    const apagados = grupo.get('modulosDeshabilitados') as Record<string, string[]> | undefined;
    return cols.filter((c) => moduloHabilitado(apagados, c.id!, modulo));
  } catch {
    return [];
  }
}

export interface CompetenciasDeGrupo {
  competencias: Parse.Object[];
  /**
   * El grupo no tiene ninguna colección asignada. Se distingue de "tiene
   * colecciones pero están vacías de competencias" a propósito: son problemas
   * distintos y el mensaje de error debe decir cuál es.
   */
  sinColecciones: boolean;
}

/**
 * Competencias ACTIVAS de las colecciones del grupo, ordenadas.
 *
 * Ojo: filtra por `active`, igual que hacía el query global que sustituye. La
 * lista del admin (`listCompetencias`) NO filtra `active` — esa asimetría ya
 * existía y no la toco aquí, pero es la razón de que una competencia inactiva se
 * vea en el admin y nunca aparezca en la malla de nadie.
 */
export async function competenciasDeGrupo(grupoId: string): Promise<CompetenciasDeGrupo> {
  const colecciones = await coleccionesDeGrupo(grupoId, 'competencias');
  if (colecciones.length === 0) {
    return { competencias: [], sinColecciones: true };
  }

  const query = new Parse.Query('Competencia');
  query.equalTo('exists' as any, true as any);
  query.equalTo('active' as any, true as any);
  query.containedIn('coleccion' as any, colecciones as any);
  query.ascending('orden');
  query.include('dependencias' as any);
  query.limit(1000);
  const competencias = await query.find({ useMasterKey: true });

  return { competencias, sinColecciones: false };
}

export interface PlantillasDeGrupo {
  plantillas: Parse.Object[];
  sinColecciones: boolean;
}

/**
 * Plantillas de actividades de evaluación (`ActividadEvaluacion`) de las
 * colecciones del grupo, ordenadas.
 *
 * Es el troquel: de aquí sale lo que `copiarPlantilla` estampa como
 * `ActividadEvaluacionGrupo`. Nada de lo ya estampado depende de esto.
 */
export async function plantillasDeGrupo(grupoId: string): Promise<PlantillasDeGrupo> {
  const colecciones = await coleccionesDeGrupo(grupoId, 'actividades');
  if (colecciones.length === 0) {
    return { plantillas: [], sinColecciones: true };
  }

  const query = new Parse.Query('ActividadEvaluacion');
  query.equalTo('exists' as any, true as any);
  query.containedIn('coleccion' as any, colecciones as any);
  query.ascending('orden');
  query.limit(1000);
  const plantillas = await query.find({ useMasterKey: true });

  return { plantillas, sinColecciones: false };
}
