/**
 * Tipos y utilidades compartidas por los ejercicios de arquitectura MVVM.
 *
 * Los ejercicios viven en un módulo por categoría (`cat1-…`, `cat2-…`) en vez de
 * en un solo archivo: son 36, cada uno con enunciado largo, plantilla, código
 * inicial, casos y soluciones, y en un único fichero serían miles de líneas
 * imposibles de revisar.
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
 * problema, de dónde viene, dónde encaja (diagrama), dónde más lo verás, qué
 * escribes, paso a paso, errores típicos y cómo se comprueba.
 *
 * Está centralizado para que los 36 se lean igual: si el alumno aprende dónde
 * mirar en uno, lo sabe en todos.
 */
export function componerEnunciado(e: Ejercicio): string {
  const intro: Record<Nivel, string> = {
    guiado: '> **Nivel guiado.** Te damos la firma y el esqueleto. Sigue el paso a paso.',
    base: '> **Nivel base.** Te damos la firma; la implementación es tuya.',
    reto: '> **Nivel reto.** Te damos solo el comportamiento esperado. Tú decides la estructura.',
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

## Qué escribes

${e.queEscribes.trim()}

## Cómo se ejecuta lo que escribes

**No escribas \`main\`, ni imprimas, ni leas nada.** Escribe solo lo que pide la
sección anterior.

Tu código se inserta dentro de un programa que ya existe y que no ves. Ese
programa:

1. Recibe por su entrada **el nombre de una comprobación** (no datos: un nombre).
2. Ejecuta esa comprobación **usando lo que tú escribiste**.
3. Imprime el resultado.

Por eso, en "Casos de ejemplo", la **Entrada** es una palabra —el nombre de la
comprobación— y la **Salida** es lo que debe aparecer si tu código es correcto.
Los separadores \`|\` y \`:\` los pone ese programa para mostrar varios valores en
una línea; tú no tienes que generarlos.

## Paso a paso

${e.pasoAPaso.trim()}

## Errores típicos

${e.erroresTipicos.trim()}

## Cómo se comprueba

${e.comoSeComprueba.trim()}
`;
}
