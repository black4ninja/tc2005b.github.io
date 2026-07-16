/**
 * Evalúa un envío del alumno: compila una vez y corre todos los casos, mapeando
 * cada uno a un veredicto. `aceptado` solo si TODOS pasan; si no, gana el
 * veredicto del primer caso que falla. Encolado para no saturar el servidor.
 */
import { config } from '../../config/index.js';
import type {
  Caso,
  Lenguaje,
  Limites,
  ResultadoCaso,
  ResultadoEvaluacion,
} from './tipos.js';
import { veredictoDeCorrida } from './comparacion.js';
import { compilar, correrEntrada, limpiarWorkdir, prepararWorkdir } from './ejecutar.js';
import { Semaforo } from './cola.js';

const cola = new Semaforo(config.juez.concurrencia);

export interface OpcionesEvaluacion {
  lenguaje: Lenguaje;
  codigo: string;
  casos: Caso[];
  /** Límites por corrida; por defecto los del config. */
  limites?: Partial<Limites>;
}

/** Detalle de un caso ocultando entrada/esperado/obtenido si es oculto. */
function aResultadoCaso(
  indice: number,
  caso: Caso,
  veredicto: ResultadoCaso['veredicto'],
  paso: boolean,
  salidaObtenida: string,
  duracionMs: number,
): ResultadoCaso {
  const base: ResultadoCaso = { indice, oculto: !!caso.oculto, paso, veredicto, duracionMs };
  if (caso.oculto) return base;
  return {
    ...base,
    entrada: caso.entrada,
    salidaEsperada: caso.salidaEsperada,
    salidaObtenida,
  };
}

export function evaluar(op: OpcionesEvaluacion): Promise<ResultadoEvaluacion> {
  const limites: Limites = { ...config.juez.limites, ...op.limites };
  return cola.ejecutar(async () => {
    const wd = await prepararWorkdir(op.lenguaje, op.codigo);
    try {
      const comp = await compilar(wd);
      if (!comp.ok) {
        return {
          veredicto: 'error_compilacion',
          casosPasados: 0,
          casosTotales: op.casos.length,
          errorCompilacion: comp.error,
          casos: [],
          tiempoMaxMs: 0,
        };
      }

      const casos: ResultadoCaso[] = [];
      let pasados = 0;
      let tiempoMax = 0;
      let veredictoGlobal: ResultadoEvaluacion['veredicto'] = 'aceptado';

      for (let i = 0; i < op.casos.length; i++) {
        const caso = op.casos[i];
        const corrida = await correrEntrada(wd, caso.entrada, limites);
        tiempoMax = Math.max(tiempoMax, corrida.duracionMs);
        const oom = wd.lang.esOom(corrida.error);
        const v = veredictoDeCorrida(corrida, caso.salidaEsperada, oom);
        casos.push(aResultadoCaso(i, caso, v.veredicto, v.paso, v.salidaObtenida, corrida.duracionMs));
        if (v.paso) {
          pasados++;
        } else if (veredictoGlobal === 'aceptado') {
          veredictoGlobal = v.veredicto; // primer fallo manda
        }
      }

      return {
        veredicto: veredictoGlobal,
        casosPasados: pasados,
        casosTotales: op.casos.length,
        casos,
        tiempoMaxMs: tiempoMax,
      };
    } finally {
      await limpiarWorkdir(wd);
    }
  });
}
