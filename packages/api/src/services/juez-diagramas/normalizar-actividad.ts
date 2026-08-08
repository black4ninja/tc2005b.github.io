/**
 * Diagrama de ACTIVIDAD de UML, en PlantUML.
 *
 * Es el único tipo del temario cuya sintaxis no es declarativa sino IMPERATIVA:
 * no se declaran elementos y luego se relacionan, se describe un recorrido
 * (`start`, `:acción;`, `if … endif`, `fork … end fork`, `stop`) y las aristas
 * salen del orden en que aparecen las cosas. Por eso tiene parser propio en vez
 * de una rama más en `normalizar-plantuml.ts`: no comparte nada con él.
 *
 * ## Por qué no basta con `flujo`
 *
 * Lo que hoy se llama `flujo` es un `flowchart` de Mermaid, y le faltan las dos
 * cosas que definen un diagrama de actividad: las CALLES de responsabilidad
 * —quién hace cada acción— y el PARALELISMO de fork/join. Son justamente lo que
 * se evalúa en esta vista, así que `flujo` no puede sustituirla.
 *
 * ## Cómo se construyen las aristas
 *
 * En vez de un «nodo actual» se lleva una lista de PENDIENTES: los nodos que
 * todavía esperan una salida. Al crear un nodo, todos los pendientes se conectan
 * a él y él pasa a ser el único pendiente. Con eso, la convergencia de un
 * `endif` o de un `end fork` sale sola —basta con acumular las ramas— y no hace
 * falta un caso especial por cada estructura de control.
 */
import {
  ErrorSintaxisDiagrama, modeloVacio,
  type Arista, type ModeloDiagrama, type Nodo,
} from './tipos.js';

/** Un nodo que espera salida, con la guarda que etiquetará esa arista. */
interface Pendiente {
  id: string;
  etiqueta?: string;
}

/** Contexto de una estructura de control abierta. */
interface Contexto {
  clase: 'if' | 'fork' | 'while';
  /** Nodo de decisión o de bifurcación que la abrió. */
  cabeza: string;
  /** Salidas de las ramas ya cerradas. */
  acumuladas: Pendiente[];
  /** Solo en `while`: hay que volver a la cabeza al cerrar. */
  linea: number;
}

const ACCION = /^:([\s\S]*);$/;
const SI = /^if\s*\((.*?)\)\s*then\s*(?:\((.*?)\))?$/i;
const SI_NO_SI = /^elseif\s*\((.*?)\)\s*then\s*(?:\((.*?)\))?$/i;
const SI_NO = /^else\s*(?:\((.*?)\))?$/i;
const MIENTRAS = /^while\s*\((.*?)\)\s*(?:is\s*\((.*?)\))?$/i;
const CALLE = /^\|([^|]*)\|$/;

/** Directivas que no aportan modelo. Misma lista que el parser declarativo. */
const IGNORAR = [
  'skinparam', 'title', 'caption', 'header', 'footer', 'hide', 'show', 'scale',
  'style', 'legend', 'end legend', 'autonumber', 'left to right direction',
  'top to bottom direction',
];

function error(linea: number, mensaje: string): ErrorSintaxisDiagrama {
  return new ErrorSintaxisDiagrama(`Línea ${linea}: ${mensaje}`);
}

export function normalizarActividad(codigo: string): ModeloDiagrama {
  const modelo = modeloVacio('actividad', 'plantuml');

  let n = 0;
  const nuevoId = (prefijo: string) => `${prefijo}${++n}`;

  /** Calle activa. Las acciones que se creen cuelgan de ella. */
  let calle: string | undefined;
  const calles = new Map<string, string>();

  let pendientes: Pendiente[] = [];
  const pila: Contexto[] = [];
  let abierto = false;
  let cerrado = false;
  /** Acción de varias líneas a medio leer (`:texto` … `;`). */
  let acumulando: string | null = null;

  function conectar(destino: string): void {
    for (const p of pendientes) {
      const arista: Arista = { origen: p.id, destino, tipo: 'flujo' };
      if (p.etiqueta) arista.etiqueta = p.etiqueta;
      modelo.aristas.push(arista);
    }
  }

  function crear(nombre: string, forma: string, papel?: string): string {
    const id = nuevoId(forma === 'decision' ? 'd' : papel ? papel[0] : 'a');
    const nodo: Nodo = {
      id,
      nombre,
      clase: papel ? 'pseudoestado' : 'nodo',
      atributos: [],
      operaciones: [],
      anotaciones: [],
      forma,
      // La calle es el contenedor: es lo que permite preguntar «quién hace
      // esto», que es la mitad del valor de esta vista.
      contenedor: calle,
    };
    if (papel) nodo.papel = papel;
    modelo.nodos.push(nodo);
    conectar(id);
    pendientes = [{ id }];
    return id;
  }

  const lineas = codigo.split(/\r?\n/);

  for (let i = 0; i < lineas.length; i++) {
    const numero = i + 1;
    let linea = lineas[i].trim();
    if (!linea || linea.startsWith("'")) continue;

    // Acción repartida en varias líneas: se acumula hasta el punto y coma.
    if (acumulando !== null) {
      acumulando += ` ${linea}`;
      if (!linea.endsWith(';')) continue;
      linea = acumulando;
      acumulando = null;
    }

    const minuscula = linea.toLowerCase();

    if (minuscula.startsWith('@startuml')) {
      if (abierto || cerrado) throw error(numero, 'hay más de un @startuml.');
      abierto = true;
      continue;
    }
    if (minuscula.startsWith('@enduml')) {
      if (!abierto) throw error(numero, 'aparece @enduml sin un @startuml que lo abra.');
      if (pila.length) {
        const c = pila[pila.length - 1];
        throw error(numero, `falta cerrar el «${c.clase}» abierto en la línea ${c.linea}.`);
      }
      abierto = false;
      cerrado = true;
      continue;
    }
    if (!abierto) {
      throw cerrado
        ? error(numero, 'hay contenido después de @enduml.')
        : error(numero, 'el diagrama tiene que empezar con @startuml.');
    }

    if (IGNORAR.some((d) => minuscula === d || minuscula.startsWith(`${d} `))) continue;
    if (linea.startsWith('!')) continue;
    if (/^note\b/i.test(linea)) continue;
    if (minuscula === 'end note') continue;

    // Calle de responsabilidad.
    const c = CALLE.exec(linea);
    if (c) {
      const nombre = c[1].trim();
      if (!nombre) throw error(numero, 'hay una calle sin nombre.');
      let id = calles.get(nombre);
      if (!id) {
        id = nuevoId('calle');
        calles.set(nombre, id);
        modelo.nodos.push({
          id, nombre, clase: 'paquete',
          atributos: [], operaciones: [], anotaciones: [],
        });
      }
      calle = id;
      continue;
    }

    if (minuscula === 'start') {
      crear('inicio', 'inicio-fin', 'inicial');
      continue;
    }
    if (minuscula === 'stop' || minuscula === 'end') {
      crear('fin', 'inicio-fin', 'final');
      // Una rama terminada no continúa: lo que siga arranca de otra parte.
      pendientes = [];
      continue;
    }

    // Acción. Se prueba antes que las estructuras porque `:if (x) then;` es una
    // acción cuyo texto empieza por «if», no una condición.
    if (linea.startsWith(':')) {
      if (!linea.endsWith(';')) {
        acumulando = linea;
        continue;
      }
      const texto = ACCION.exec(linea)?.[1]?.trim().replace(/\s+/g, ' ') ?? '';
      if (!texto) throw error(numero, 'hay una acción sin texto.');
      crear(texto, 'proceso');
      continue;
    }

    const si = SI.exec(linea);
    if (si) {
      const cabeza = crear(si[1].trim() || 'decisión', 'decision');
      pendientes = [{ id: cabeza, etiqueta: si[2]?.trim() || undefined }];
      pila.push({ clase: 'if', cabeza, acumuladas: [], linea: numero });
      continue;
    }

    const sinosi = SI_NO_SI.exec(linea);
    if (sinosi) {
      const ctx = pila[pila.length - 1];
      if (!ctx || ctx.clase !== 'if') throw error(numero, 'hay un «elseif» sin su «if».');
      ctx.acumuladas.push(...pendientes);
      // Una condición encadenada es OTRA decisión, colgada de la anterior.
      pendientes = [{ id: ctx.cabeza }];
      const cabeza = crear(sinosi[1].trim() || 'decisión', 'decision');
      ctx.cabeza = cabeza;
      pendientes = [{ id: cabeza, etiqueta: sinosi[2]?.trim() || undefined }];
      continue;
    }

    const sino = SI_NO.exec(linea);
    if (sino) {
      const ctx = pila[pila.length - 1];
      if (!ctx || ctx.clase !== 'if') throw error(numero, 'hay un «else» sin su «if».');
      ctx.acumuladas.push(...pendientes);
      pendientes = [{ id: ctx.cabeza, etiqueta: sino[1]?.trim() || undefined }];
      continue;
    }

    if (minuscula === 'endif') {
      const ctx = pila.pop();
      if (!ctx || ctx.clase !== 'if') throw error(numero, 'hay un «endif» sin su «if».');
      pendientes = [...ctx.acumuladas, ...pendientes];
      continue;
    }

    if (minuscula === 'fork') {
      const cabeza = crear('bifurcación', 'fork', 'fork');
      pila.push({ clase: 'fork', cabeza, acumuladas: [], linea: numero });
      continue;
    }
    if (minuscula === 'fork again') {
      const ctx = pila[pila.length - 1];
      if (!ctx || ctx.clase !== 'fork') throw error(numero, 'hay un «fork again» sin su «fork».');
      ctx.acumuladas.push(...pendientes);
      pendientes = [{ id: ctx.cabeza }];
      continue;
    }
    if (minuscula === 'end fork' || minuscula === 'end merge') {
      const ctx = pila.pop();
      if (!ctx || ctx.clase !== 'fork') throw error(numero, 'hay un «end fork» sin su «fork».');
      pendientes = [...ctx.acumuladas, ...pendientes];
      crear('unión', 'join', 'join');
      continue;
    }

    const mientras = MIENTRAS.exec(linea);
    if (mientras) {
      const cabeza = crear(mientras[1].trim() || 'condición', 'decision');
      pila.push({ clase: 'while', cabeza, acumuladas: [], linea: numero });
      pendientes = [{ id: cabeza, etiqueta: mientras[2]?.trim() || undefined }];
      continue;
    }
    if (minuscula === 'endwhile' || minuscula.startsWith('endwhile ')) {
      const ctx = pila.pop();
      if (!ctx || ctx.clase !== 'while') throw error(numero, 'hay un «endwhile» sin su «while».');
      // El cuerpo vuelve a la condición: es lo que hace que sea un bucle y no
      // una secuencia, y sin esta arista `nodos-alcanzables` mentiría.
      conectar(ctx.cabeza);
      pendientes = [{ id: ctx.cabeza }];
      continue;
    }

    throw error(numero, `no entiendo «${linea}» en un diagrama de actividad.`);
  }

  if (acumulando !== null) {
    throw new ErrorSintaxisDiagrama('Hay una acción sin cerrar: falta el «;».');
  }
  if (!cerrado) {
    throw new ErrorSintaxisDiagrama(
      abierto ? 'Falta @enduml al final del diagrama.' : 'El diagrama tiene que ir entre @startuml y @enduml.',
    );
  }
  if (!modelo.nodos.some((x) => x.papel === 'inicial')) {
    throw new ErrorSintaxisDiagrama('El diagrama de actividad no tiene «start».');
  }

  return modelo;
}
