/**
 * Comparación y crítica de NOMBRES.
 *
 * El alumno escribe `ViewModel`, `viewmodel` o `View Model` y en los tres casos
 * quiere decir lo mismo. Comparar con `===` convertiría el juez en un corrector
 * ortográfico, que es exactamente lo que no queremos: la aserción debe fallar
 * cuando el MODELO está mal, no cuando la mayúscula está mal.
 */
import type { ModeloDiagrama, Nodo } from './tipos.js';

/** Minúsculas, sin acentos y sin separadores: `View_Model` ≡ `viewmodel`. */
export function clave(nombre: string): string {
  return nombre
    .normalize('NFD')
    // Marcas diacríticas combinantes, escritas por punto de código para que el
    // rango sea legible y no dependa de cómo se guarde este fichero.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function mismoNombre(a: string, b: string): boolean {
  return clave(a) === clave(b);
}

/**
 * Busca un nodo por id o por etiqueta visible. Las dos, porque el autor de la
 * aserción escribe lo que ve (`ViewModel`) y Mermaid a veces guarda el alias
 * (`VM`) como id.
 */
export function buscarNodo(modelo: ModeloDiagrama, nombre: string): Nodo | undefined {
  return modelo.nodos.find((n) => mismoNombre(n.id, nombre) || mismoNombre(n.nombre, nombre));
}

/** Todos los nodos que casan con el nombre (para detectar duplicados). */
export function buscarNodos(modelo: ModeloDiagrama, nombre: string): Nodo[] {
  return modelo.nodos.filter((n) => mismoNombre(n.id, nombre) || mismoNombre(n.nombre, nombre));
}

/**
 * Nombres que no nombran nada. No es una lista de palabras prohibidas por
 * gusto: son las que aparecen cuando el alumno todavía no ha decidido qué
 * modela, y por eso son señal de un problema de diseño, no de estilo.
 */
const VAGOS = new Set([
  'cosa', 'cosas', 'objeto', 'objetos', 'dato', 'datos', 'info', 'informacion',
  'manager', 'gestor', 'handler', 'helper', 'util', 'utils', 'utilidades',
  'controlador', 'controller', 'sistema', 'aplicacion', 'app', 'modulo',
  'clase', 'elemento', 'entidad', 'item1', 'a', 'b', 'c', 'x', 'y', 'z',
  'foo', 'bar', 'test', 'prueba', 'temp', 'tmp', 'aux',
]);

export function esNombreVago(nombre: string, extra: string[] = []): boolean {
  const k = clave(nombre);
  if (!k) return true;
  if (VAGOS.has(k)) return true;
  if (extra.some((e) => clave(e) === k)) return true;
  // `Clase1`, `Obj2`: una letra o palabra corta seguida solo de dígitos.
  if (/^[a-z]{1,3}\d+$/.test(k)) return true;
  return false;
}

/**
 * ¿El nombre de una línea de vida identifica una INSTANCIA y no un tipo?
 *
 * Es el error nº 1 documentado en diagramas de secuencia de alumnos, y la
 * especificación de UML lo prohíbe de forma explícita: una línea de vida no
 * puede representar un tipo. Aquí solo se puede aplicar el criterio observable:
 * un nombre de una letra, vacío o vago no identifica nada.
 */
export function nombreDeLineaDeVidaValido(nombre: string, minLongitud = 2): boolean {
  const limpio = nombre.trim();
  if (limpio.length < minLongitud) return false;
  // `A`, `B1`, `Obj2`… no nombran a nadie.
  if (/^[A-Za-z]\d*$/.test(limpio)) return false;
  return !esNombreVago(limpio);
}
