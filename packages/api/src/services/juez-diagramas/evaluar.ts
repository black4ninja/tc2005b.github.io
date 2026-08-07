/**
 * Evalúa el diagrama de un alumno contra las aserciones del ejercicio.
 *
 * Estructura deliberadamente igual a la del juez de programación: sintaxis
 * primero —equivale al error de compilación y corta la evaluación—, y si el
 * diagrama se entiende, cada aserción es UN CASO con su veredicto. Esa simetría
 * no es estética: el alumno ya aprendió a leer ese informe en los ejercicios de
 * código.
 *
 * A diferencia del juez de código, aquí no hay proceso que aislar ni tiempo que
 * limitar: parsear y recorrer un grafo de aula son milisegundos, así que la
 * evaluación es síncrona y sin cola de trabajos.
 */
import { CATALOGO } from './catalogo.js';
import { describir } from './describir.js';
import { normalizarMermaid } from './normalizar-mermaid.js';
import { normalizarPlantuml } from './normalizar-plantuml.js';
import {
  ErrorSintaxisDiagrama, ROTULO_OCULTA,
  type Asercion, type ContextoEvaluacion, type Motor, type ModeloDiagrama,
  type ResultadoAsercion, type ResultadoDiagrama, type TipoDiagrama,
} from './tipos.js';

export interface DiagramaContexto {
  /** Nombre con el que la aserción lo referencia. */
  nombre: string;
  tipo: TipoDiagrama;
  motor: Motor;
  codigo: string;
}

export interface OpcionesEvaluacion {
  motor: Motor;
  tipoDiagrama: TipoDiagrama;
  codigo: string;
  aserciones: Asercion[];
  /** Diagramas ya dados con los que el del alumno debe ser coherente. */
  contexto?: DiagramaContexto[];
}

/** Construye el modelo normalizado del motor que toque. */
export async function parsear(
  motor: Motor,
  tipo: TipoDiagrama,
  codigo: string,
): Promise<ModeloDiagrama> {
  if (motor === 'mermaid') return normalizarMermaid(tipo, codigo);
  // PlantUML se lee con un parser propio y síncrono: su motor oficial no corre
  // en el servidor (ver la cabecera de `normalizar-plantuml.ts`).
  if (motor === 'plantuml') return normalizarPlantuml(tipo, codigo);
  throw new Error(`El motor «${motor}» todavía no tiene normalizador.`);
}

export async function evaluarDiagrama(op: OpcionesEvaluacion): Promise<ResultadoDiagrama> {
  let modelo: ModeloDiagrama;
  try {
    modelo = await parsear(op.motor, op.tipoDiagrama, op.codigo);
  } catch (e) {
    if (e instanceof ErrorSintaxisDiagrama) {
      return {
        veredicto: 'error_sintaxis',
        errorSintaxis: e.message,
        asercionesPasadas: 0,
        asercionesTotales: op.aserciones.length,
        aserciones: [],
      };
    }
    throw e;
  }

  // Los diagramas de contexto los escribió el AUTOR, no el alumno: si uno no
  // parsea es un fallo del ejercicio y debe estallar como tal, no convertirse en
  // un veredicto de sintaxis que culparía al alumno de un error ajeno.
  const contexto = new Map<string, ModeloDiagrama>();
  for (const c of op.contexto ?? []) {
    try {
      contexto.set(c.nombre, await parsear(c.motor, c.tipo, c.codigo));
    } catch (e) {
      const razon = e instanceof Error ? e.message : String(e);
      throw new Error(`El diagrama de contexto «${c.nombre}» del ejercicio no es válido: ${razon}`);
    }
  }

  const ctx: ContextoEvaluacion = { modelo, contexto };
  const resultados: ResultadoAsercion[] = [];
  let pasadas = 0;

  op.aserciones.forEach((asercion, indice) => {
    const oculta = asercion.oculta === true;
    // El rótulo de una comprobación oculta NO sale de aquí. `describir()` redacta
    // los parámetros en prosa —«Pedido declara el atributo folio de tipo
    // String»—, así que enseñarlo entrega la solución exactamente igual que el
    // detalle, y con un solo envío vacío se enumeraba el ejercicio entero.
    const comprobacion = oculta ? ROTULO_OCULTA : describir(asercion);
    const evaluador = CATALOGO[asercion.tipo];

    if (!evaluador) {
      // Aserción desconocida: es un defecto de autoría. Se reporta como fallo
      // explícito en vez de darse por buena, que dejaría pasar cualquier envío.
      resultados.push({
        indice, oculta, paso: false, comprobacion,
        detalle: `El juez no conoce la comprobación «${asercion.tipo}».`,
      });
      return;
    }

    let paso: boolean;
    let detalle: string | undefined;
    try {
      const r = evaluador(asercion, ctx);
      paso = r.paso;
      detalle = r.detalle;
    } catch (e) {
      paso = false;
      detalle = e instanceof Error ? e.message : String(e);
    }

    if (paso) pasadas++;
    resultados.push({
      indice, oculta, paso, comprobacion,
      // En las ocultas el alumno sabe QUE falló, no POR QUÉ: revelar el detalle
      // de una comprobación oculta equivale a entregarle la solución.
      detalle: paso || oculta ? undefined : detalle,
    });
  });

  return {
    veredicto: pasadas === op.aserciones.length ? 'aceptado' : 'aserciones_fallidas',
    asercionesPasadas: pasadas,
    asercionesTotales: op.aserciones.length,
    aserciones: resultados,
  };
}
