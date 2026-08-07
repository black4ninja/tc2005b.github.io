/**
 * Definición de los ejercicios de diagrama y composición de su enunciado.
 *
 * Hermano de `scripts/ejercicios-mvvm/tipos.ts`, y hereda su regla de registro
 * porque el problema era el mismo: el material se leía escrito por una máquina.
 *
 * ---------------------------------------------------------------------------
 * REGLA DE REGISTRO (obligatoria en TODO texto que lea el alumno)
 *
 * Es un proyecto universitario serio. El lenguaje debe ser FORMAL y NEUTRO, sin
 * que eso lo vuelva impenetrable: se explica con precisión, no con solemnidad.
 *
 * PROHIBIDO:
 *  - Comentario de estado mental: "no te preocupes", "verás que es fácil",
 *    "esto puede parecer confuso", "no es magia".
 *  - Coloquialismos y muletillas: "ojo", "truco", "en pocas palabras", "básicamente".
 *  - Interpelación constante en segunda persona fuera de las secciones de
 *    instrucción. El resto del enunciado describe, no conversa.
 *  - Signos de exclamación. Preguntas retóricas.
 *  - Metáforas decorativas que no aporten precisión.
 *
 * PERMITIDO:
 *  - Imperativo en "Qué dibujas" y "Paso a paso": son instrucciones.
 *  - Vocabulario técnico sin diluir, siempre que se defina la primera vez.
 * ---------------------------------------------------------------------------
 */
import type { Asercion, Motor, TipoDiagrama } from '../../src/services/juez-diagramas/index.js';

export type Nivel = 'guiado' | 'base' | 'reto';

export interface DiagramaContexto {
  nombre: string;
  titulo?: string;
  tipo: TipoDiagrama;
  motor: Motor;
  codigo: string;
}

export interface EjercicioDiagramaDef {
  slug: string;
  titulo: string;
  /** Categoría a la que pertenece; el seed la crea si no existe. */
  categoria: string;
  /** Bloque por encima de la categoría. */
  bloque: string;
  nivel: Nivel;
  orden: number;
  /** Ejemplo resuelto: abre con el diagrama ya completo y no cuenta para el progreso. */
  esEjemplo?: boolean;
  motor: Motor;
  tipoDiagrama: TipoDiagrama;

  // --- Secciones del enunciado ---------------------------------------------
  /** Qué problema resuelve este diagrama. Dos o tres frases. */
  problema: string;
  /** Origen de la notación: de dónde viene y quién la introdujo. */
  procedencia: string;
  /** En qué momento del diseño se usa y qué pregunta responde. */
  encaje: string;
  /** Elementos notacionales y qué SIGNIFICA cada uno. Filas de tabla. */
  anatomia: Array<{ elemento: string; significado: string }>;
  /** Dónde se usa la misma idea fuera de UML. */
  otrosUsos: string;
  /** Errores documentados que este ejercicio busca evitar. */
  erroresTipicos: string[];
  /** Qué debe dibujar el alumno. */
  queDibujas: string;
  /** Solo en 'guiado': los pasos, en orden. */
  pasoAPaso?: string[];
  /** Sintaxis del diagramador que hace falta, separada de la teoría. */
  sintaxis: Array<{ para: string; escribes: string }>;

  // --- Material del ejercicio ----------------------------------------------
  codigoInicial: string;
  diagramasContexto?: DiagramaContexto[];
  aserciones: Asercion[];
  /** Varias soluciones válidas y DISTINTAS entre sí. */
  diagramasReferencia: string[];
  /** Debe fallar al menos una aserción. */
  diagramaTrampa: string;
}

const NOMBRE_TIPO: Record<string, string> = {
  clases: 'diagrama de clases',
  secuencia: 'diagrama de secuencia',
  estados: 'máquina de estados',
  er: 'diagrama entidad-relación',
  flujo: 'diagrama de flujo',
  'casos-de-uso': 'diagrama de casos de uso',
  componentes: 'diagrama de componentes',
  paquetes: 'diagrama de paquetes',
};

const ETIQUETA_NIVEL: Record<Nivel, string> = {
  guiado: 'Guiado',
  base: 'Base',
  reto: 'Reto',
};

function tabla(cabeceras: [string, string], filas: Array<[string, string]>): string {
  const cuerpo = filas.map(([a, b]) => `| ${a} | ${b} |`).join('\n');
  return `| ${cabeceras[0]} | ${cabeceras[1]} |\n| --- | --- |\n${cuerpo}`;
}

function seccionContexto(e: EjercicioDiagramaDef): string {
  if (!e.diagramasContexto?.length) return '';
  const bloques = e.diagramasContexto
    .map((c) => `**${c.titulo ?? c.nombre}**\n\n\`\`\`${c.motor}\n${c.codigo.trim()}\n\`\`\``)
    .join('\n\n');
  return `## Lo que ya está decidido

Estos diagramas se proporcionan y **no debes volver a dibujarlos**. Tu diagrama
tiene que ser coherente con ellos: es justo lo que se comprueba.

${bloques}

`;
}

function seccionPasoAPaso(e: EjercicioDiagramaDef): string {
  if (!e.pasoAPaso?.length) return '';
  const pasos = e.pasoAPaso.map((p, i) => `${i + 1}. ${p}`).join('\n');
  return `## Paso a paso

${pasos}

`;
}

/**
 * Compone el enunciado completo en Markdown.
 *
 * El orden de las secciones no es decorativo: la teoría va ANTES de la
 * instrucción porque el problema documentado de los alumnos no es la notación
 * sino no saber qué modelar. La sintaxis del diagramador va al final y separada,
 * para que no se confunda con el concepto.
 */
export function componerEnunciado(e: EjercicioDiagramaDef): string {
  const tipo = NOMBRE_TIPO[e.tipoDiagrama] ?? e.tipoDiagrama;

  return `# ${e.titulo}

**${ETIQUETA_NIVEL[e.nivel]}** · ${tipo}

## El problema

${e.problema}

## De dónde viene

${e.procedencia}

## Dónde encaja

${e.encaje}

## Anatomía del diagrama

${tabla(['Elemento', 'Qué significa'], e.anatomia.map((a) => [a.elemento, a.significado]))}

## Dónde más lo verás

${e.otrosUsos}

## Errores típicos

${e.erroresTipicos.map((x) => `- ${x}`).join('\n')}

${seccionContexto(e)}## Qué dibujas

${e.queDibujas}

${seccionPasoAPaso(e)}## Sintaxis del diagramador

${tabla(['Para', 'Escribes'], e.sintaxis.map((s) => [s.para, `\`${s.escribes}\``]))}

## Cómo se comprueba

Al enviar, cada **comprobación** se evalúa sobre el modelo de tu diagrama, no
sobre su texto: da igual el orden en que declares las cosas o cómo las nombres
en mayúsculas. Las comprobaciones visibles aparecen listadas; las ocultas solo
indican si pasaron.
`;
}
