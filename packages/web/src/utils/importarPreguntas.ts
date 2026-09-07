/**
 * Trocear la bitácora de entrevistas para llevarla al banco de preguntas.
 *
 * El archivo NO es un banco: es el cuaderno de las entrevistas, escrito a mano
 * a lo largo de un semestre. Cada entrada es un encabezado con el nombre del
 * alumno y la competencia, y debajo la pregunta que se le hizo:
 *
 *     Daniel Aguilar Desarrollo de escenarios (SICT0203)
 *     La empresa en la que trabajas ha sido demandada por un competidor…
 *
 * De ahí salen las cuatro cosas de las que se ocupa este módulo:
 *
 *  1. **El nombre del alumno se tira.** La pregunta se reutiliza con otras
 *     generaciones; quién la contestó una vez no pinta nada en el banco.
 *  2. **La misma pregunta se repite** —se le hizo a varios alumnos— y muchas ya
 *     están en el banco de importaciones anteriores. Nada entra dos veces.
 *  3. **Debajo de la pregunta a veces están las notas del profesor sobre la
 *     RESPUESTA**, que no son preguntas. Se apartan en vez de colarse.
 *  4. **El encabezado se escribe de mil maneras**: con guion o sin él, con la
 *     clave entre paréntesis o sin ella, con erratas («Desarollo»), en
 *     minúsculas, y con la clave contradiciendo al nombre. Manda el nombre.
 *
 * Nada de esto acierta siempre, y por eso el resultado se PREVISUALIZA: cada
 * fila sale con su estado y se puede dejar fuera antes de guardar.
 */

/** Una competencia del banco contra la que emparejar lo que dice el archivo. */
export interface CompetenciaConocida {
  id: string;
  /** Como está en la BD: «SICT0203. Desarrollo de escenarios». */
  nombre: string;
}

export type EstadoFila =
  /** No está en el banco ni se ha visto antes en el archivo. */
  | 'nueva'
  /** Ya salió antes en este mismo archivo. */
  | 'repetida'
  /** El banco ya la tiene. */
  | 'en-banco';

export interface FilaImportada {
  /** Línea del archivo donde empieza, para poder señalarla. */
  linea: number;
  texto: string;
  estado: EstadoFila;
  competenciaId: string | null;
  /** El encabezado tal cual, sin el nombre del alumno. Para poder cotejar. */
  competenciaEnArchivo: string;
  claveEnArchivo: string | null;
  /**
   * La clave entre paréntesis apunta a OTRA competencia que el nombre. Se
   * resuelve por el nombre —es lo que el profesor escribió pensando en la
   * pregunta, y 145 entradas no traen clave— pero se avisa.
   */
  conflictoDeClave: boolean;
  /** Párrafos que venían debajo y no parecen parte de la pregunta. */
  notasApartadas: string[];
}

export interface ResumenImportacion {
  filas: FilaImportada[];
  /** Líneas con texto que no cayeron en ninguna entrada. */
  huerfanas: number;
}

/**
 * La forma en que se comparan dos enunciados: sin acentos, sin mayúsculas, sin
 * puntuación y con los espacios colapsados.
 *
 * Es la misma normalización que usaba el script de línea de comandos, y por eso
 * caza las repeticiones reales del archivo —«¿Cuántas pelotas de golf caben en
 * un autobús?» escrita dos veces con distinto espaciado— sin pedirle al
 * profesor que las encuentre a ojo.
 *
 * NO caza las PARECIDAS. Dos versiones de la misma pregunta con distinto final
 * son, para esto, dos preguntas. Fusionarlas sería decidir por él.
 */
export function normalizarEnunciado(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * El nombre de la competencia sin su clave delante.
 *
 * En la BD se guardan como «SICT0203. Desarrollo de escenarios» o
 * «STC0204: Desarrollo de componentes de software» —el separador varía—, y en
 * el archivo el profesor escribe solo el nombre. Se compara por el nombre.
 */
function nucleoDeCompetencia(nombre: string): string {
  return normalizarEnunciado(nombre.replace(/^[a-z]{2,5}\s?\d{3,4}\s*[.:]?\s*/i, ''));
}

/** La clave de la competencia, si la lleva delante: «SICT0203». */
function claveDeCompetencia(nombre: string): string | null {
  const m = /^([a-z]{2,5}\s?\d{3,4})/i.exec(nombre.trim());
  return m ? m[1].replace(/\s+/g, '').toUpperCase() : null;
}

/**
 * Distancia de edición, recortada.
 *
 * Hace falta porque el encabezado se escribe a mano y trae erratas
 * —«Desarollo», «escenario» en singular, «SICT203»—: comparar por igualdad
 * dejaría fuera entradas perfectamente legibles. Se para en cuanto se pasa del
 * techo, que es lo que la hace barata sobre cientos de líneas.
 */
function distancia(a: string, b: string, techo: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > techo) return techo + 1;
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const fila = [i];
    let minima = i;
    for (let j = 1; j <= b.length; j += 1) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(previa[j] + 1, fila[j - 1] + 1, previa[j - 1] + coste);
      fila.push(v);
      if (v < minima) minima = v;
    }
    if (minima > techo) return techo + 1;
    previa = fila;
  }
  return previa[b.length];
}

/** Cuánta errata se tolera en un nombre: más margen cuanto más largo. */
function techoDe(nucleo: string): number {
  return Math.max(2, Math.floor(nucleo.length / 12));
}

interface Encabezado {
  competenciaId: string;
  competenciaEnArchivo: string;
  clave: string | null;
  conflicto: boolean;
}

/**
 * ¿Esta línea abre una entrada? Y si sí, ¿de qué competencia?
 *
 * Se exige que el nombre de la competencia esté al FINAL de la línea, porque lo
 * que va delante es el nombre del alumno y lo que va detrás, como mucho, la
 * clave. Sin esa exigencia, cualquier renglón de una pregunta que mencionara
 * «el diseño de componentes» abriría una entrada falsa y partiría la pregunta
 * en dos.
 */
function leerEncabezado(
  linea: string,
  competencias: CompetenciaConocida[],
): Encabezado | null {
  const limpia = linea.trim();
  // Una pregunta no es un encabezado, por mucho que acabe nombrando la
  // competencia. Y los encabezados son cortos: nombre + competencia + clave.
  if (limpia.length > 110 || limpia.includes('?') || limpia.includes('¿')) return null;

  const conClave = /^(?<cuerpo>.*?)\s*\(\s*(?<clave>[a-z]{2,5}\s?\d{3,4})\s*\)\s*$/i.exec(limpia);
  const cuerpo = conClave?.groups?.cuerpo ?? limpia;
  const clave = conClave?.groups?.clave?.replace(/\s+/g, '').toUpperCase() ?? null;

  const palabras = normalizarEnunciado(cuerpo).split(' ').filter(Boolean);
  if (palabras.length === 0) return null;

  let mejor: { comp: CompetenciaConocida; d: number; usadas: number } | null = null;
  for (const comp of competencias) {
    const nucleo = nucleoDeCompetencia(comp.nombre);
    if (!nucleo) continue;
    const suyas = nucleo.split(' ').length;
    // Se prueba con el nombre entero y también recortado, porque el archivo
    // escribe «Diseño de componentes» donde la BD dice «Diseño de componentes
    // de software».
    for (const n of new Set([suyas, Math.min(suyas, 3)])) {
      if (n > palabras.length) continue;
      const cola = palabras.slice(-n).join(' ');
      const objetivo = nucleo.split(' ').slice(0, n).join(' ');
      const d = distancia(cola, objetivo, techoDe(objetivo));
      if (d <= techoDe(objetivo) && (mejor === null || d < mejor.d)) {
        mejor = { comp, d, usadas: n };
      }
    }
  }
  if (!mejor) return null;

  // Lo que queda por delante es el nombre del alumno; se comprueba que sea
  // plausible —corto— para no tragarse una frase que acabe en la competencia.
  const nombreAlumno = palabras.slice(0, palabras.length - mejor.usadas).join(' ');
  if (nombreAlumno.length > 60) return null;

  const claveDelNombre = claveDeCompetencia(mejor.comp.nombre);
  const porClave = clave
    ? competencias.find((c) => claveDeCompetencia(c.nombre) === clave) ?? null
    : null;

  return {
    competenciaId: mejor.comp.id,
    competenciaEnArchivo: palabras.slice(palabras.length - mejor.usadas).join(' '),
    clave,
    // Solo es conflicto si la clave apunta a una competencia CONOCIDA y
    // distinta. Una clave que no está en el banco no dice nada.
    conflicto: !!porClave && !!claveDelNombre && porClave.id !== mejor.comp.id,
  };
}

/** Una línea de fecha suelta separa jornadas: ni encabezado ni pregunta. */
function esFecha(linea: string): boolean {
  return /^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)?\s*,?\s*\d{1,2}\s+(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b.*$/i
    .test(linea.trim());
}

/**
 * Reparte los párrafos de una entrada entre la pregunta y lo que no lo es.
 *
 * La pregunta llega hasta el primer párrafo que tenga interrogación, y lo de
 * después son las notas de la respuesta. Cuando ninguno la tiene —«Vende el
 * producto» es una consigna válida— se toma solo el primero: quedarse con todos
 * metería las notas dentro del enunciado, que es el error caro de los dos.
 */
function partir(parrafos: string[]): { texto: string; notas: string[] } {
  const corte = parrafos.findIndex((p) => p.includes('?') || p.includes('¿'));
  if (corte === -1) return { texto: parrafos[0] ?? '', notas: parrafos.slice(1) };
  return {
    texto: parrafos.slice(0, corte + 1).join(' ').trim(),
    notas: parrafos.slice(corte + 1),
  };
}

/**
 * Trocea el archivo entero.
 *
 * `yaEnBanco` son los enunciados que el banco ya tiene, YA NORMALIZADOS con
 * `normalizarEnunciado`. Se pasa de fuera porque quien los tiene es la pantalla,
 * y así esto se puede probar sin servidor.
 */
export function trocearBitacora(
  contenido: string,
  competencias: CompetenciaConocida[],
  yaEnBanco: ReadonlySet<string>,
): ResumenImportacion {
  const filas: FilaImportada[] = [];
  let huerfanas = 0;

  let abierta: { cab: Encabezado; linea: number; parrafos: string[] } | null = null;
  const cerrar = () => {
    if (!abierta) return;
    const { texto, notas } = partir(abierta.parrafos);
    if (texto.trim()) {
      filas.push({
        linea: abierta.linea,
        texto: texto.trim(),
        estado: 'nueva',
        competenciaId: abierta.cab.competenciaId,
        competenciaEnArchivo: abierta.cab.competenciaEnArchivo,
        claveEnArchivo: abierta.cab.clave,
        conflictoDeClave: abierta.cab.conflicto,
        notasApartadas: notas,
      });
    }
    abierta = null;
  };

  const lineas = contenido.split(/\r?\n/);
  for (let i = 0; i < lineas.length; i += 1) {
    const linea = lineas[i].trim();
    if (!linea) continue;
    if (esFecha(linea)) { cerrar(); continue; }
    const cab = leerEncabezado(linea, competencias);
    if (cab) {
      cerrar();
      abierta = { cab, linea: i + 1, parrafos: [] };
    } else if (abierta) {
      abierta.parrafos.push(linea);
    } else {
      huerfanas += 1;
    }
  }
  cerrar();

  // El estado se decide al final y en orden: lo que el banco ya tiene manda
  // sobre lo repetido, y la PRIMERA aparición dentro del archivo es la que
  // entra —las siguientes son la repetición, no al revés—.
  const vistas = new Set<string>();
  for (const fila of filas) {
    const clave = normalizarEnunciado(fila.texto);
    if (yaEnBanco.has(clave)) fila.estado = 'en-banco';
    else if (vistas.has(clave)) fila.estado = 'repetida';
    else { fila.estado = 'nueva'; vistas.add(clave); }
  }

  return { filas, huerfanas };
}
