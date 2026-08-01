/**
 * Aserción → frase en español. Es lo que el alumno lee como «Comprobación».
 *
 * Que el catálogo se describa solo tiene dos consecuencias que valen el fichero:
 * el autor no puede olvidarse de redactar el rótulo, y el rótulo nunca se
 * desincroniza de lo que la comprobación hace de verdad. En el juez de
 * programación el nombre del caso se escribía a mano y podía mentir; aquí no.
 *
 * Registro formal y neutro, sin segunda persona ni coloquialismos, igual que el
 * resto del material del curso.
 */
import type { Asercion } from './tipos.js';

function p(a: Asercion, clave: string): string {
  const v = a.parametros?.[clave];
  return typeof v === 'string' ? v.trim() : '';
}

function n(a: Asercion, clave: string): number | undefined {
  const v = a.parametros?.[clave];
  return typeof v === 'number' ? v : undefined;
}

function ls(a: Asercion, clave: string): string[] {
  const v = a.parametros?.[clave];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

const NOMBRE_RELACION: Record<string, string> = {
  asociacion: 'asociación',
  agregacion: 'agregación',
  composicion: 'composición',
  herencia: 'herencia',
  implementacion: 'implementación',
  dependencia: 'dependencia',
  transicion: 'transición',
  flujo: 'flujo',
  incluye: 'inclusión',
  extiende: 'extensión',
  participa: 'participación',
  'relacion-er': 'relación',
};

const NOMBRE_MENSAJE: Record<string, string> = {
  sincrono: 'síncrono',
  asincrono: 'asíncrono',
  retorno: 'de retorno',
  destruccion: 'de destrucción',
};

/** Cardinalidad en palabras: `0..*` → «0 o más». */
function cardinalidadEnPalabras(c: string): string {
  const limpio = c.trim();
  if (limpio === '*' || limpio === '0..*') return '0 o más';
  if (limpio === '1..*') return '1 o más';
  if (limpio === '0..1') return 'opcional';
  if (limpio === '1') return 'exactamente 1';
  return limpio;
}

const PLANTILLAS: Record<string, (a: Asercion) => string> = {
  'existe-nodo': (a) => {
    const clase = p(a, 'clase');
    return clase
      ? `Existe ${clase === 'interfaz' ? 'la interfaz' : `el elemento`} «${p(a, 'nombre')}»`
      : `Existe «${p(a, 'nombre')}»`;
  },
  'conteo-nodos': (a) => {
    const min = n(a, 'min');
    const max = n(a, 'max');
    const que = p(a, 'clase') ? `elementos de tipo ${p(a, 'clase')}` : 'elementos';
    if (min !== undefined && max !== undefined) return `El diagrama tiene entre ${min} y ${max} ${que}`;
    if (min !== undefined) return `El diagrama tiene al menos ${min} ${que}`;
    if (max !== undefined) return `El diagrama tiene como mucho ${max} ${que}`;
    return `El diagrama declara ${que}`;
  },
  'sin-nombres-vagos': () => 'Todos los elementos tienen nombres que indican qué modelan',

  'clase-tiene-atributo': (a) => {
    const tipo = p(a, 'tipo');
    const vis = p(a, 'visibilidad');
    return `«${p(a, 'clase')}» declara el atributo «${p(a, 'atributo')}»`
      + (tipo ? ` de tipo ${tipo}` : '')
      + (vis ? ` con visibilidad ${vis}` : '');
  },
  'clase-tiene-operacion': (a) => {
    const ret = p(a, 'retorno');
    const vis = p(a, 'visibilidad');
    return `«${p(a, 'clase')}» declara la operación «${p(a, 'operacion')}»`
      + (ret ? ` que devuelve ${ret}` : '')
      + (vis ? ` con visibilidad ${vis}` : '');
  },
  'relacion-entre': (a) => {
    const tipo = NOMBRE_RELACION[p(a, 'tipo')] ?? p(a, 'tipo');
    const cd = p(a, 'cardinalidadDestino');
    const co = p(a, 'cardinalidadOrigen');
    let frase = `«${p(a, 'origen')}» se relaciona con «${p(a, 'destino')}» por ${tipo}`;
    if (co) frase += `, ${cardinalidadEnPalabras(co)} en el extremo «${p(a, 'origen')}»`;
    if (cd) frase += `, ${cardinalidadEnPalabras(cd)} en el extremo «${p(a, 'destino')}»`;
    return frase;
  },
  'relacion-es-composicion-no-agregacion': (a) =>
    `«${p(a, 'todo')}» contiene «${p(a, 'parte')}» por composición, porque la parte no existe sin el todo`,
  'clases-con-contenido': () => 'Ninguna clase queda como una caja con solo el nombre',
  'sin-relaciones-duplicadas': () => 'No hay relaciones repetidas entre los mismos elementos',
  'sin-muchos-a-muchos': () => 'No queda ninguna relación de muchos a muchos sin resolver',
  'sin-ciclos': () => 'No hay dependencias circulares',

  'existe-participante': (a) => `Participa «${p(a, 'nombre')}» en la interacción`,
  'mensaje-entre': (a) => {
    const t = p(a, 'tipo');
    const txt = p(a, 'texto');
    return `«${p(a, 'de')}» envía a «${p(a, 'a')}»`
      + (txt ? ` el mensaje «${txt}»` : ' un mensaje')
      + (t ? ` ${NOMBRE_MENSAJE[t] ?? t}` : '');
  },
  'orden-de-mensajes': (a) => `Los mensajes ocurren en este orden: ${ls(a, 'mensajes').join(' → ')}`,
  'lineas-vida-nombradas': () => 'Cada línea de vida nombra una instancia concreta, no un tipo',
  'mensajes-sincronos-con-retorno': () => 'Cada mensaje síncrono tiene su mensaje de retorno',
  'activaciones-balanceadas': () => 'Cada activación que se abre se cierra',

  'existe-estado': (a) => `Existe el estado «${p(a, 'nombre')}»`,
  'tiene-estado-inicial': () => 'La máquina declara su estado inicial',
  'transicion': (a) => {
    const e = p(a, 'etiqueta');
    return `Hay transición de «${p(a, 'desde')}» a «${p(a, 'hasta')}»`
      + (e ? ` disparada por «${e}»` : '');
  },
  'estados-alcanzables': () => 'Todo estado se alcanza desde el inicio',
  'sin-callejones': () => 'Desde cualquier estado se puede llegar al final',
  'transiciones-con-evento': () => 'Toda transición entre estados espera un evento',
  'transiciones-deterministas': () => 'Ningún estado tiene dos salidas con el mismo disparador',

  'mensaje-existe-como-operacion': () =>
    'Cada mensaje corresponde a una operación declarada en el diagrama de clases',
  'disparador-existe-como-operacion': (a) =>
    `Cada disparador corresponde a una operación de «${p(a, 'clasificador')}»`,
  'participante-existe-como-clase': () =>
    'Cada línea de vida corresponde a una clase del diagrama de clases',
};

/**
 * Frase de la aserción. Si el autor escribió un `rotulo` propio, manda el suyo:
 * hay enunciados donde conviene nombrar la comprobación en los términos del
 * problema y no en los del metamodelo.
 */
export function describir(a: Asercion): string {
  if (typeof a.rotulo === 'string' && a.rotulo.trim()) return a.rotulo.trim();
  const plantilla = PLANTILLAS[a.tipo];
  if (!plantilla) return a.tipo;
  try {
    return plantilla(a);
  } catch {
    return a.tipo;
  }
}
