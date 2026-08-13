import type { Actividad, ActividadTipo, Calendario, Dia } from '../types/calendario';

/** Días de clase, en el orden en que ocurren. El calendario no guarda fecha por día. */
const DIAS: (keyof SemanaDias)[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

interface SemanaDias {
  lunes?: Dia;
  martes?: Dia;
  miercoles?: Dia;
  jueves?: Dia;
  viernes?: Dia;
}

/** Una fila del Hub: la actividad más de dónde sale en el calendario. */
export interface Material {
  id: string;
  tipo: ActividadTipo;
  titulo: string;
  descripcion?: string;
  /** Número de semana tal y como lo muestra el calendario. */
  semana: number | string;
  /** Para ordenar y para el título de la columna: "Semana 3 · martes". */
  dia: string;
  /** Antes de la sesión (material de preparación). */
  previo: boolean;
  fechaEntrega?: string;
  duracion?: string;
  /** Enlace principal, si lo tiene. */
  enlace?: string;
  externo?: boolean;
  /** Adjunto (presentaciones). Solo metadatos; el binario va por su endpoint. */
  archivoNombre?: string;
  archivoBytes?: number;
  /** Enlaces adicionales de la actividad. */
  enlacesExtra: { texto: string; url: string }[];
  /** Posición en el calendario, para ordenar sin recalcular. */
  orden: number;
}

/**
 * ¿Esta actividad es «material», o solo una marca en el calendario?
 *
 * Lo es cuando hay algo que abrir: un enlace, un adjunto o enlaces extra. Un
 * receso, un asueto o un «Instalar Unity» sin enlace son parte del calendario
 * pero no material: en una lista pensada para reencontrar cosas, una fila que
 * no lleva a ningún sitio es ruido.
 */
export function esMaterial(actividad: Actividad): boolean {
  if (actividad.enlace) return true;
  if (actividad.archivoNombre) return true;
  return (actividad.enlacesExtra?.length ?? 0) > 0;
}

/**
 * Aplana el calendario a una lista de materiales, en el orden en que ocurren.
 *
 * El calendario está pensado para responder «¿qué toca esta semana?», y por eso
 * anida semana → día → actividades. Esta lista responde la pregunta contraria
 * —«¿dónde estaba aquel laboratorio?»— y para eso hace falta plano y ordenado.
 *
 * Las semanas ESPECIALES (recesos, exámenes) no tienen días ni actividades, así
 * que no aportan nada aquí y se saltan.
 */
export function materialesDelCalendario(calendario: Calendario | null | undefined): Material[] {
  const materiales: Material[] = [];
  let orden = 0;

  for (const semana of calendario?.semanas ?? []) {
    if (semana.tipo !== 'normal') continue;

    for (const dia of DIAS) {
      const contenido = (semana.dias as SemanaDias)[dia];
      if (!contenido) continue;

      // El previo va ANTES que las actividades del día: es lo que hay que
      // llevar preparado, y en el calendario se pinta arriba.
      for (const [lista, previo] of [
        [contenido.previo ?? [], true],
        [contenido.actividades ?? [], false],
      ] as [Actividad[], boolean][]) {
        for (const actividad of lista) {
          if (!esMaterial(actividad)) continue;
          materiales.push({
            // El id puede faltar en el calendario estático de respaldo; la
            // posición sirve de clave estable dentro de un mismo render.
            id: actividad.id ?? `${semana.numero}-${dia}-${orden}`,
            tipo: actividad.tipo,
            // Sin título no hay nada que buscar ni que leer en la lista: se usa
            // el tipo como respaldo para que la fila no salga en blanco.
            titulo: actividad.titulo?.trim() || etiquetaTipo(actividad.tipo),
            descripcion: actividad.descripcion,
            semana: semana.numero,
            dia,
            previo,
            fechaEntrega: actividad.fechaEntrega,
            duracion: actividad.duracion,
            enlace: actividad.enlace,
            externo: actividad.externo,
            archivoNombre: actividad.archivoNombre,
            archivoBytes: actividad.archivoBytes,
            enlacesExtra: actividad.enlacesExtra ?? [],
            orden: orden++,
          });
        }
      }
    }
  }

  return materiales;
}

/** Nombre legible de cada tipo. Espeja las etiquetas del calendario. */
export const ETIQUETA_TIPO: Record<string, string> = {
  lab: 'Laboratorio',
  lectura: 'Lectura',
  ejercicio: 'Ejercicio',
  proyecto: 'Proyecto',
  evaluacion: 'Evaluación',
  trabajo: 'Trabajo',
  discusion: 'Discusión',
  info: 'Información',
  actividad: 'Actividad',
  presentacion: 'Presentación',
  break: 'Receso',
  asueto: 'Asueto',
};

export function etiquetaTipo(tipo: string): string {
  return ETIQUETA_TIPO[tipo] ?? tipo;
}

/**
 * Tipos presentes en la lista, en el orden del catálogo.
 *
 * Los filtros se construyen con ESTO y no con el catálogo completo: ofrecer
 * «Evaluación» en un grupo que no tiene ninguna es prometer un filtro que
 * siempre devuelve vacío.
 */
export function tiposPresentes(materiales: Material[]): string[] {
  const presentes = new Set(materiales.map((m) => m.tipo));
  const conocidos = Object.keys(ETIQUETA_TIPO).filter((t) => presentes.has(t as ActividadTipo));
  // Un tipo nuevo en la BD que aún no esté en el catálogo no debe desaparecer.
  const desconocidos = [...presentes].filter((t) => !(t in ETIQUETA_TIPO));
  return [...conocidos, ...desconocidos];
}

/**
 * Filtra por texto y por tipos. Sin tipos seleccionados = todos (no «ninguno»):
 * un filtro vacío se lee como «no he filtrado», no como «no quiero nada».
 */
export function filtrarMateriales(
  materiales: Material[],
  texto: string,
  tipos: Set<string>,
): Material[] {
  const busqueda = texto.trim().toLowerCase();
  return materiales.filter((m) => {
    if (tipos.size > 0 && !tipos.has(m.tipo)) return false;
    if (!busqueda) return true;
    // Se busca también en la descripción y en el texto de los enlaces: el
    // título de un laboratorio no siempre trae la palabra que se recuerda.
    return (
      m.titulo.toLowerCase().includes(busqueda) ||
      (m.descripcion ?? '').toLowerCase().includes(busqueda) ||
      m.enlacesExtra.some((e) => e.texto.toLowerCase().includes(busqueda))
    );
  });
}
