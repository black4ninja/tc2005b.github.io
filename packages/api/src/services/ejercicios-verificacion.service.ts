/**
 * Verificación de AUTORÍA de ejercicios: revisa que un ejercicio sea resoluble,
 * que su código inicial no esté roto y que sus casos discriminen. Es la puerta
 * de calidad para generar material en lote (a mano o con agentes) sin resolver
 * cada ejercicio manualmente.
 *
 * Trabaja sobre un objeto PLANO (`EjercicioVerificable`), no sobre el modelo de
 * Parse: así los chequeos estructurales se prueban sin servidor ni BD, como el
 * resto de la lógica pura del repo.
 */
import {
  componerCodigo,
  MARCADOR_SOLUCION,
  type CasoPrueba,
  type CodigoPorLenguaje,
  type ModoEvaluacion,
  type SolucionesPorLenguaje,
} from '../models/EjercicioProgramacion.js';
import {
  evaluar,
  normalizarSalida,
  type Caso,
  type Lenguaje,
  type ResultadoEvaluacion,
} from './judge/index.js';

/** Lo que el verificador necesita saber de un ejercicio. */
export interface EjercicioVerificable {
  slug: string;
  titulo: string;
  publicado: boolean;
  lenguajes: Lenguaje[];
  modoEvaluacion: ModoEvaluacion;
  plantillaCodigo: CodigoPorLenguaje;
  codigoInicial: CodigoPorLenguaje;
  solucionesReferencia: SolucionesPorLenguaje;
  casos: CasoPrueba[];
  limiteTiempoMs: number;
  limiteMemoriaMb: number;
}

export type NivelHallazgo = 'error' | 'aviso';

export interface Hallazgo {
  nivel: NivelHallazgo;
  /** Clave estable para filtrar/silenciar desde otras herramientas. */
  codigo: string;
  lenguaje?: Lenguaje;
  mensaje: string;
}

/** Resume por qué falló una evaluación, nombrando los casos que no pasaron. */
function detalleFallo(r: ResultadoEvaluacion): string {
  if (r.veredicto === 'error_compilacion') {
    const msg = (r.errorCompilacion ?? '').split('\n')[0].slice(0, 160);
    return `error de compilación: ${msg}`;
  }
  const fallidos = r.casos.filter((c) => !c.paso).map((c) => c.indice);
  const cuales = fallidos.length ? ` (casos ${fallidos.join(', ')})` : '';
  return `${r.veredicto}${cuales} — ${r.casosPasados}/${r.casosTotales} casos`;
}

/**
 * Chequeos que NO compilan nada. Baratos: sirven para pasar por todo el catálogo
 * antes de gastar compilaciones.
 *
 * Sobre "casos frágiles": `normalizarSalida` ya absorbe CRLF, espacios al final
 * de línea y saltos finales, así que nada de eso hace frágil un caso — no tiene
 * sentido marcarlo. Lo que sí se marca es la salida esperada VACÍA al normalizar
 * (la pasa cualquier programa que no imprima) y las entradas repetidas. La
 * fragilidad de verdad —depender del orden o de un formato accidental— no se ve
 * leyendo: la detecta `revisarEjecucion` con varias soluciones de referencia.
 */
export function revisarEstructura(
  ej: EjercicioVerificable,
  lenguajes: Lenguaje[] = ej.lenguajes,
): Hallazgo[] {
  const out: Hallazgo[] = [];

  if (ej.casos.length === 0) {
    out.push({ nivel: 'error', codigo: 'sin-casos', mensaje: 'No tiene casos de prueba.' });
  }
  if (ej.casos.length > 0 && !ej.casos.some((c) => c.oculto)) {
    out.push({
      nivel: 'aviso',
      codigo: 'sin-casos-ocultos',
      mensaje: 'Ningún caso es oculto: el alumno ve todas las salidas esperadas.',
    });
  }

  ej.casos.forEach((c, i) => {
    if (normalizarSalida(c.salidaEsperada) === '') {
      out.push({
        nivel: 'aviso',
        codigo: 'salida-vacia',
        mensaje: `Caso ${i}: la salida esperada queda vacía al normalizar; la pasa cualquier programa que no imprima.`,
      });
    }
  });

  const vistas = new Map<string, number>();
  ej.casos.forEach((c, i) => {
    const k = normalizarSalida(c.entrada);
    const previo = vistas.get(k);
    if (previo !== undefined) {
      out.push({
        nivel: 'aviso',
        codigo: 'entrada-repetida',
        mensaje: `Caso ${i}: repite la entrada del caso ${previo}.`,
      });
    } else vistas.set(k, i);
  });

  for (const l of lenguajes) {
    if (ej.modoEvaluacion === 'plantilla') {
      const p = ej.plantillaCodigo[l];
      if (!p || !p.includes(MARCADOR_SOLUCION)) {
        out.push({
          nivel: 'error',
          codigo: 'plantilla-sin-marcador',
          lenguaje: l,
          mensaje: `La plantilla no incluye ${MARCADOR_SOLUCION}; se compilaría solo el driver.`,
        });
      }
    }
    if (!ej.codigoInicial[l]?.trim()) {
      out.push({
        nivel: 'aviso',
        codigo: 'sin-codigo-inicial',
        lenguaje: l,
        mensaje: 'Sin código inicial: el alumno arranca de cero.',
      });
    }
    if (!ej.solucionesReferencia[l]?.length) {
      out.push({
        nivel: 'aviso',
        codigo: 'sin-solucion',
        lenguaje: l,
        mensaje: 'Sin solución de referencia: no se puede verificar si es resoluble.',
      });
    }
  }
  return out;
}

/**
 * Chequeos que compilan y ejecutan. Por lenguaje:
 *  1. Cada solución de referencia debe dar `aceptado`.
 *  2. Si hay varias y NO coinciden, los casos están sobreajustados. Esta es la
 *     razón de que las soluciones sean varias y no una.
 *  3. El código inicial debe compilar y NO debe ser aceptado (si lo fuera, el
 *     ejercicio viene resuelto o los casos no discriminan). Usar el código
 *     inicial como "solución incorrecta" es mejor que inventar un programa
 *     trivial: funciona igual en modo plantilla, donde un programa vacío ni
 *     compilaría y el chequeo no probaría nada.
 */
export async function revisarEjecucion(
  ej: EjercicioVerificable,
  lenguajes: Lenguaje[] = ej.lenguajes,
): Promise<Hallazgo[]> {
  const out: Hallazgo[] = [];
  if (ej.casos.length === 0) return out; // ya reportado en estructura

  const casos: Caso[] = ej.casos;
  const limites = { tiempoMs: ej.limiteTiempoMs, memoriaMb: ej.limiteMemoriaMb };
  const componer = (l: Lenguaje, codigo: string) =>
    componerCodigo(ej.modoEvaluacion, ej.plantillaCodigo[l], codigo);

  for (const l of lenguajes) {
    const refs = ej.solucionesReferencia[l] ?? [];
    const veredictos: string[] = [];
    for (const [i, sol] of refs.entries()) {
      const r = await evaluar({ lenguaje: l, codigo: componer(l, sol), casos, limites });
      veredictos.push(r.veredicto);
      if (r.veredicto !== 'aceptado') {
        out.push({
          nivel: 'error',
          codigo: 'solucion-rechazada',
          lenguaje: l,
          mensaje: `La solución de referencia #${i + 1} no es aceptada: ${detalleFallo(r)}`,
        });
      }
    }
    if (refs.length > 1 && new Set(veredictos).size > 1) {
      out.push({
        nivel: 'error',
        codigo: 'casos-sobreajustados',
        lenguaje: l,
        mensaje:
          `Soluciones válidas con veredictos distintos (${veredictos.join(' / ')}): los casos están ` +
          'sobreajustados — dependen del orden, del formato o de algo que el enunciado no pide.',
      });
    }

    const arranque = ej.codigoInicial[l];
    if (arranque?.trim()) {
      const r = await evaluar({ lenguaje: l, codigo: componer(l, arranque), casos, limites });
      if (r.veredicto === 'error_compilacion') {
        out.push({
          nivel: 'error',
          codigo: 'inicial-no-compila',
          lenguaje: l,
          mensaje: `El código inicial no compila; el alumno arrancaría con un error ajeno: ${detalleFallo(r)}`,
        });
      } else if (r.veredicto === 'aceptado') {
        out.push({
          nivel: 'error',
          codigo: 'inicial-aceptado',
          lenguaje: l,
          mensaje: 'El código inicial ya es aceptado: el ejercicio viene resuelto o los casos no discriminan.',
        });
      }
    }
  }
  return out;
}
