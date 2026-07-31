/**
 * Tipos y utilidades compartidas por los ejercicios de arquitectura MVVM.
 *
 * Los ejercicios viven en un módulo por categoría (`cat1-…`, `cat2-…`) en vez de
 * en un solo archivo: son 36, cada uno con enunciado largo, plantilla, código
 * inicial, casos y soluciones, y en un único fichero serían miles de líneas
 * imposibles de revisar.
 */

/**
 * REGISTRO DEL ENUNCIADO — aplica a los 36, sin excepción.
 *
 * Material académico: formal y neutro, pero legible. La formalidad está en la
 * precisión y en la ausencia de coloquialismos, NO en alargar las frases.
 *
 * Prohibido:
 * - Comentarios sobre el estado mental del alumno: "esto es lo que más
 *   confunde", "no te preocupes si no lo ves a la primera".
 * - Coloquialismos y muletillas: "no es magia", "ojo", "y ya", "gratis",
 *   "te regala", "ponlo del revés", "fíjate", "pista:".
 * - Apelación directa constante: "te damos", "tú decides", "vas a escribir",
 *   "tu app". Se prefiere la forma impersonal ("se proporciona", "queda a
 *   criterio propio", "la aplicación").
 * - Jerga interna del juez: "driver". En el enunciado es "el programa de
 *   comprobación".
 *
 * Permitido:
 * - Imperativo en "Qué escribes" y "Paso a paso": son instrucciones, y la forma
 *   impersonal ahí resulta más confusa, no más formal.
 * - Segunda persona puntual cuando evita una perífrasis peor.
 */

/** El dominio es NEUTRO a propósito: `Item`, no un dominio concreto. */
export const DOMINIO = 'Item';

export interface Caso {
  entrada: string;
  salidaEsperada: string;
  oculto: boolean;
}

export type Nivel = 'guiado' | 'base' | 'reto';

/**
 * OJO al autorar: los `casos` son **compartidos por todos los lenguajes** del
 * ejercicio. Si un ejercicio es bilingüe, los dos drivers tienen que reconocer
 * los MISMOS nombres de caso y producir la MISMA salida esperada. Cuando lo que
 * se pide difiere entre pistas, se parte en dos ejercicios, uno por lenguaje.
 */
export interface Ejercicio {
  /** Sin sufijo de nivel: se añade solo. */
  slugBase: string;
  /** Sin sufijo de nivel: se añade solo. */
  tituloBase: string;
  nivel: Nivel;
  categoria: string;
  lenguajes: ('kotlin' | 'swift')[];
  /** Capa + archivo exacto, para la cabecera. */
  capa: string;
  /** Secciones del enunciado, en el orden fijo del goal. */
  problema: string;
  deDondeViene: string;
  diagrama: string;
  dondeMasLoVeras: string;
  queEscribes: string;
  pasoAPaso: string;
  erroresTipicos: string;
  comoSeComprueba: string;
  /**
   * Superficie de API de los tipos que el ejercicio da por escritos.
   *
   * OBLIGATORIO siempre que el enunciado diga "ya está declarado". El estudio a
   * ciegas de los 36 dio 16 fallos y los 16 fueron de compilación, ninguno de
   * comprensión: el alumno razonaba bien pero adivinaba mal un nombre que nunca
   * se le mostró (`getItems` por `obtenerTodos`, `items` por `datos`). En un
   * lenguaje de tipado estático eso no es un matiz, es no poder entregar.
   *
   * Van FIRMAS, no cuerpos: el cuerpo de `GetItemsUseCase` es la solución del
   * ejercicio del caso de uso, y mostrarlo aquí lo regalaría.
   */
  yaDeclarado?: { kotlin?: string; swift?: string };
  /** Plantilla con el driver oculto; `{{solucion}}` marca dónde entra el alumno. */
  plantilla: { kotlin?: string; swift?: string };
  inicial: { kotlin?: string; swift?: string };
  casos: Caso[];
  soluciones: { kotlin?: string[]; swift?: string[] };
}

const SUFIJO: Record<Nivel, string> = { guiado: '-guiado', base: '', reto: '-reto' };
const ETIQUETA: Record<Nivel, string> = { guiado: ' — Guiado', base: '', reto: ' — Reto' };

export const slugDe = (e: Ejercicio): string => `${e.slugBase}${SUFIJO[e.nivel]}`;
export const tituloDe = (e: Ejercicio): string => `${e.tituloBase}${ETIQUETA[e.nivel]}`;

/**
 * Compone el enunciado en Markdown con la estructura fija: cabecera, el
 * problema, de dónde viene, dónde encaja (diagrama), dónde más lo verás, cómo se
 * ejecuta lo que escribes, lo que ya está escrito, qué escribes, paso a paso,
 * errores típicos y cómo se comprueba.
 *
 * ORDEN DELIBERADO de las tres secciones centrales. El estudio a ciegas señaló
 * "Cómo se ejecuta lo que escribes" como el apartado más costoso en 20 de 36
 * ejercicios: el formato Entrada/Salida de los casos contradice visualmente el
 * "no imprimas", y leerlo DESPUÉS de la firma llega tarde. Va antes, seguido de
 * la superficie de API, y solo entonces se pide escribir:
 *
 *   cómo se ejecuta  ->  con qué nombres hablas  ->  qué escribes
 *
 * Está centralizado para que los 36 se lean igual: si el alumno aprende dónde
 * mirar en uno, lo sabe en todos.
 */
/**
 * Sección "Lo que ya está escrito", justo ANTES de "Qué escribes".
 *
 * El orden importa: el alumno necesita conocer la superficie con la que va a
 * hablar antes de que se le pida escribir contra ella.
 */
function seccionYaDeclarado(e: Ejercicio): string {
  const y = e.yaDeclarado;
  if (!y || (!y.kotlin && !y.swift)) return '';
  const bloques: string[] = [];
  if (y.kotlin) bloques.push(`\`\`\`kotlin\n${y.kotlin.trim()}\n\`\`\``);
  if (y.swift) bloques.push(`\`\`\`swift\n${y.swift.trim()}\n\`\`\``);
  return `## Lo que ya está escrito

Estos tipos se proporcionan y **no debes declararlos otra vez**: hacerlo produce
un error de redeclaración. Se muestran sus firmas para que sepas con qué nombres
hablar; los cuerpos no se incluyen porque no los necesitas.

${bloques.join('\n\n')}

`;
}

export function componerEnunciado(e: Ejercicio): string {
  const intro: Record<Nivel, string> = {
    guiado:
      '> **Nivel guiado.** Se proporcionan la firma y el esqueleto. El apartado ' +
      '"Paso a paso" indica el orden de trabajo.',
    base: '> **Nivel base.** Se proporciona la firma; la implementación corresponde al alumno.',
    reto:
      '> **Nivel reto.** Se proporciona únicamente el comportamiento esperado. ' +
      'La estructura queda a criterio del alumno.',
  };

  return `# ${tituloDe(e)}

**Capa:** ${e.capa}

${intro[e.nivel]}

## El problema

${e.problema.trim()}

## De dónde viene

${e.deDondeViene.trim()}

## Dónde encaja

\`\`\`mermaid
${e.diagrama.trim()}
\`\`\`

## Dónde más lo verás

${e.dondeMasLoVeras.trim()}

## Cómo se ejecuta lo que escribes

**No se debe escribir \`main\`, ni imprimir, ni leer la entrada.** El código a
entregar es únicamente el que describe el apartado "Qué escribes".

Ese código se inserta en un programa de comprobación que ya existe y que no es
visible. Dicho programa:

1. Recibe por su entrada **el nombre de una comprobación**, no datos.
2. Ejecuta esa comprobación sobre el código entregado.
3. Imprime el resultado.

Por ese motivo, en "Casos de ejemplo" cada caso muestra la **Comprobación** —el
nombre que se ejecuta— y lo que **la comprobación imprime** cuando el código es
correcto. Ese texto lo escribe el programa de comprobación, no tu código: los
separadores \`|\` y \`:\` los añade él para mostrar varios valores en una línea.

${seccionYaDeclarado(e)}## Qué escribes

${e.queEscribes.trim()}

## Paso a paso

${e.pasoAPaso.trim()}

## Errores típicos

${e.erroresTipicos.trim()}

## Cómo se comprueba

${e.comoSeComprueba.trim()}
`;
}
