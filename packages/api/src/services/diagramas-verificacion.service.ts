/**
 * Verificación de AUTORÍA de un ejercicio de diagrama.
 *
 * Responde a la pregunta que el autor no puede contestar leyendo su propio
 * ejercicio: ¿las aserciones dicen lo que creo que dicen?
 *
 * Dos comprobaciones, y la segunda es la que de verdad importa:
 *  1. Todo diagrama de REFERENCIA pasa todas las aserciones. Si una referencia
 *     legítima falla, la aserción está SOBREAJUSTADA: exige un detalle
 *     accidental de la solución que el autor tenía en la cabeza.
 *  2. El diagrama TRAMPA falla al menos una. Si la trampa pasa, las aserciones
 *     son demasiado laxas y el ejercicio se aprueba solo. Sin esta segunda
 *     comprobación, un conjunto de aserciones vacío o trivial parecería
 *     perfecto: todas las referencias lo cumplirían.
 *
 * Es el equivalente de las soluciones de referencia múltiples del juez de
 * programación, y existe por el mismo motivo: dos soluciones válidas con
 * veredictos distintos delatan un caso mal escrito.
 *
 * Recibe un objeto plano, no un `Parse.Object`, para poder usarse desde el
 * controller, desde un script de autoría y desde los tests sin base de datos.
 */
import { esTipoDeAsercionValido, evaluarDiagrama } from './juez-diagramas/index.js';
import { metadatoDe } from './juez-diagramas/metadatos.js';
import type { Asercion, Motor, TipoDiagrama, Veredicto } from './juez-diagramas/index.js';

export interface EjercicioVerificable {
  motor: Motor;
  tipoDiagrama: TipoDiagrama;
  aserciones: Asercion[];
  diagramasContexto?: { nombre: string; tipo: TipoDiagrama; motor: Motor; codigo: string }[];
  diagramasReferencia: string[];
  diagramaTrampa?: string;
}

export interface ResultadoReferencia {
  indice: number;
  veredicto: Veredicto;
  asercionesPasadas: number;
  asercionesTotales: number;
  /** Comprobaciones que esta referencia NO cumple, ya redactadas. */
  fallos: string[];
}

export interface InformeVerificacion {
  ok: boolean;
  /** Defectos del ejercicio, no de ningún diagrama concreto. */
  problemas: string[];
  referencias: ResultadoReferencia[];
  trampa?: { detecta: boolean; veredicto: Veredicto };
}

export async function verificarEjercicioDiagrama(
  ej: EjercicioVerificable,
): Promise<InformeVerificacion> {
  const problemas: string[] = [];

  if (!ej.aserciones.length) {
    problemas.push('El ejercicio no tiene ninguna comprobación: cualquier diagrama lo aprobaría.');
  }
  for (const a of ej.aserciones) {
    if (!esTipoDeAsercionValido(a.tipo)) {
      problemas.push(`La comprobación «${a.tipo}» no existe en el catálogo del juez.`);
      continue;
    }
    // Una comprobación aplicada al tipo de diagrama equivocado es peor que
    // inútil: varias PASAN EN VERDE sin comprobar nada porque recorren una
    // colección vacía —las cruzadas de mensajes sobre un diagrama de clases, por
    // ejemplo—. El editor ya filtra por `aplicaA`, pero un script de autoría o
    // una llamada directa a la API pueden saltárselo, y el resultado sería un
    // ejercicio que aprueba a cualquiera sin que nadie lo note.
    const meta = metadatoDe(a.tipo);
    if (meta && !meta.aplicaA.includes(ej.tipoDiagrama)) {
      problemas.push(
        `La comprobación «${a.tipo}» no aplica a un diagrama de tipo «${ej.tipoDiagrama}» ` +
        `(aplica a: ${meta.aplicaA.join(', ')}). Aquí no comprobaría nada.`,
      );
    }
  }

  // Las cruzadas referencian un diagrama de contexto por nombre; comprobarlo
  // aquí da un error de autoría claro en vez de un fallo por ejercicio evaluado.
  const nombresContexto = new Set((ej.diagramasContexto ?? []).map((c) => c.nombre));
  for (const a of ej.aserciones) {
    const referido = a.parametros?.contexto;
    if (typeof referido === 'string' && !nombresContexto.has(referido)) {
      problemas.push(`La comprobación «${a.tipo}» referencia el contexto «${referido}», que el ejercicio no define.`);
    }
  }

  const referencias: ResultadoReferencia[] = [];
  if (!ej.diagramasReferencia.length) {
    problemas.push('Sin diagramas de referencia no se puede comprobar que el ejercicio sea resoluble.');
  }

  const comun = {
    motor: ej.motor,
    tipoDiagrama: ej.tipoDiagrama,
    aserciones: ej.aserciones,
    contexto: ej.diagramasContexto,
  };

  for (let i = 0; i < ej.diagramasReferencia.length; i++) {
    try {
      const r = await evaluarDiagrama({ ...comun, codigo: ej.diagramasReferencia[i] });
      referencias.push({
        indice: i,
        veredicto: r.veredicto,
        asercionesPasadas: r.asercionesPasadas,
        asercionesTotales: r.asercionesTotales,
        // El informe es para el AUTOR, así que aquí sí se revela el detalle de
        // las comprobaciones ocultas: sin él no podría arreglar su ejercicio.
        fallos: r.aserciones.filter((x) => !x.paso).map((x) => x.comprobacion),
      });
      if (r.veredicto === 'error_sintaxis') {
        problemas.push(`El diagrama de referencia ${i + 1} no es válido: ${r.errorSintaxis ?? ''}`.trim());
      } else if (r.veredicto !== 'aceptado') {
        problemas.push(
          `El diagrama de referencia ${i + 1} no pasa sus propias comprobaciones (${r.asercionesPasadas}/${r.asercionesTotales}): alguna aserción está sobreajustada.`,
        );
      }
    } catch (e) {
      problemas.push(`El diagrama de referencia ${i + 1} rompió la evaluación: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  let trampa: InformeVerificacion['trampa'];
  if (ej.diagramaTrampa && ej.diagramaTrampa.trim()) {
    try {
      const r = await evaluarDiagrama({ ...comun, codigo: ej.diagramaTrampa });
      const detecta = r.veredicto !== 'aceptado';
      trampa = { detecta, veredicto: r.veredicto };
      if (!detecta) {
        problemas.push(
          'El diagrama trampa pasa todas las comprobaciones: las aserciones son demasiado laxas y el ejercicio se aprueba solo.',
        );
      }
    } catch (e) {
      problemas.push(`El diagrama trampa rompió la evaluación: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    problemas.push(
      'Sin diagrama trampa no hay forma de saber si las comprobaciones son demasiado laxas.',
    );
  }

  return { ok: problemas.length === 0, problemas, referencias, trampa };
}
