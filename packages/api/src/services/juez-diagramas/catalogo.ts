/**
 * Catálogo cerrado de aserciones.
 *
 * Es cerrado a propósito: el autor de un ejercicio ELIGE una comprobación y la
 * parametriza, nunca escribe código. Así el servidor no ejecuta nada de nadie,
 * el editor puede validar la aserción al guardarla, y cada comprobación puede
 * describirse sola al alumno (ver `describir.ts`).
 *
 * Tres familias:
 *  - **léxicas**: nombres y convenciones;
 *  - **semánticas**: estructura del propio diagrama;
 *  - **cruzadas**: coherencia con los diagramas DADOS por el ejercicio. Estas
 *    últimas son el eje del módulo: los errores dominantes medidos en alumnos no
 *    son de notación local sino de trazabilidad entre diagramas (mensajes a
 *    operaciones inexistentes, disparadores que no son operaciones del
 *    clasificador).
 */
import {
  alcanzablesDesde, aristasDuplicadas, ciclos, coalcanzablesHasta, esMuchos,
} from './grafo.js';
import {
  buscarNodo, buscarNodos, clave, esNombreVago, mismoNombre,
  nombreDeLineaDeVidaValido,
} from './nombres.js';
import type {
  Asercion, ContextoEvaluacion, Evaluador, Mensaje, ModeloDiagrama, Nodo, TipoArista,
} from './tipos.js';

// --- Lectura de parámetros -------------------------------------------------

function param(a: Asercion, clave: string): unknown {
  return a.parametros?.[clave];
}

function texto(a: Asercion, clave: string): string {
  const v = param(a, clave);
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`La aserción "${a.tipo}" necesita el parámetro «${clave}».`);
  }
  return v.trim();
}

function textoOpcional(a: Asercion, clave: string): string | undefined {
  const v = param(a, clave);
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function lista(a: Asercion, clave: string): string[] {
  const v = param(a, clave);
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string').map((x) => x.trim());
}

function numeroOpcional(a: Asercion, clave: string): number | undefined {
  const v = param(a, clave);
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

const ok = { paso: true };
const falla = (detalle: string) => ({ paso: false, detalle });

/** Enumera nombres para los mensajes de detalle, acotando la lista. */
function enumerar(xs: string[], tope = 6): string {
  if (!xs.length) return 'ninguno';
  const visibles = xs.slice(0, tope);
  const resto = xs.length - visibles.length;
  return visibles.map((x) => `«${x}»`).join(', ') + (resto > 0 ? ` y ${resto} más` : '');
}

/** Nombre del mensaje sin su lista de argumentos: `obtener(id)` → `obtener`. */
export function nombreDeMensaje(textoMensaje: string): string {
  return textoMensaje.split('(')[0].trim();
}

/**
 * Disparador de una transición: lo que va ANTES de la guarda y de la acción.
 * `pulsar [hay red] / cargar()` → `pulsar`.
 *
 * La lista de argumentos se descarta, igual que en los mensajes de secuencia:
 * un disparador es un evento de llamada, y `cargar()` y `cargar` nombran la
 * misma operación. Compararlos como cadenas distintas haría fallar a un alumno
 * por escribir dos paréntesis, que es exactamente el tipo de veredicto que mide
 * la notación en vez del modelo.
 */
export function disparadorDeTransicion(etiqueta: string): string {
  return nombreDeMensaje(etiqueta.split('[')[0].split('/')[0]);
}

function contextoDe(ctx: ContextoEvaluacion, nombre: string): ModeloDiagrama {
  const m = ctx.contexto.get(nombre);
  if (!m) {
    throw new Error(
      `La aserción referencia el diagrama de contexto «${nombre}», que el ejercicio no define.`,
    );
  }
  return m;
}

// --- Comunes ---------------------------------------------------------------

const existeNodo: Evaluador = (a, { modelo }) => {
  const nombre = texto(a, 'nombre');
  const nodo = buscarNodo(modelo, nombre);
  if (!nodo) {
    return falla(`No encontré «${nombre}». Hay: ${enumerar(modelo.nodos.map((n) => n.nombre))}.`);
  }
  const claseEsperada = textoOpcional(a, 'clase');
  if (claseEsperada && nodo.clase !== claseEsperada) {
    return falla(`«${nombre}» existe, pero como ${nodo.clase} y se esperaba ${claseEsperada}.`);
  }
  return ok;
};

const conteoNodos: Evaluador = (a, { modelo }) => {
  const claseFiltro = textoOpcional(a, 'clase');
  const cuantos = modelo.nodos.filter((n) => !claseFiltro || n.clase === claseFiltro).length;
  const min = numeroOpcional(a, 'min');
  const max = numeroOpcional(a, 'max');
  // Sin ningún límite, esta comprobación aprobaba cualquier diagrama sin mirar
  // nada, y era la ÚNICA del catálogo capaz de pasar vacía: las demás exigen sus
  // parámetros con `texto()`, que lanza. Además sobrevivía a la verificación de
  // autoría, porque pasaba igual en las referencias y en la trampa.
  //
  // Un `min` que llegue como cadena —lo que devuelve un `<input>` sin convertir—
  // se trata como parámetro ausente, así que también acabaría aquí en lugar de
  // comprobar en silencio otra cosa.
  if (min === undefined && max === undefined) {
    // Se distinguen las dos causas. Decirle al autor que «falta un límite»
    // cuando sí lo escribió —pero como cadena, que es lo que entrega un
    // `<input type="number">` sin convertir— manda a buscar el error donde no
    // está.
    const escritos = ['min', 'max'].filter((k) => param(a, k) !== undefined);
    throw new Error(
      escritos.length
        ? `La aserción "conteo-nodos" recibió ${escritos.map((k) => `«${k}»`).join(' y ')} como texto; debe ser un número.`
        : 'La aserción "conteo-nodos" necesita al menos un límite numérico, «min» o «max».',
    );
  }
  if (min !== undefined && cuantos < min) {
    return falla(`Hay ${cuantos} y se esperaban al menos ${min}.`);
  }
  if (max !== undefined && cuantos > max) {
    return falla(`Hay ${cuantos} y se esperaban como mucho ${max}.`);
  }
  return ok;
};

const sinNombresVagos: Evaluador = (a, { modelo }) => {
  const extra = lista(a, 'extra');
  const malos = modelo.nodos
    .filter((n) => n.clase !== 'pseudoestado' && esNombreVago(n.nombre, extra))
    .map((n) => n.nombre);
  return malos.length
    ? falla(`Estos nombres no dicen qué modelan: ${enumerar(malos)}.`)
    : ok;
};

// --- Clases ----------------------------------------------------------------

function nodoRequerido(modelo: ModeloDiagrama, nombre: string): Nodo | { error: string } {
  const n = buscarNodo(modelo, nombre);
  if (!n) return { error: `No encontré «${nombre}» en el diagrama.` };
  return n;
}

const claseTieneAtributo: Evaluador = (a, { modelo }) => {
  const nombreClase = texto(a, 'clase');
  const nodo = nodoRequerido(modelo, nombreClase);
  if ('error' in nodo) return falla(nodo.error);

  const buscado = texto(a, 'atributo');
  const encontrado = nodo.atributos.find((m) => mismoNombre(m.nombre, buscado));
  if (!encontrado) {
    return falla(
      `«${nombreClase}» no declara «${buscado}». Declara: ${enumerar(nodo.atributos.map((m) => m.nombre))}.`,
    );
  }
  const tipoEsperado = textoOpcional(a, 'tipo');
  if (tipoEsperado && !mismoNombre(encontrado.tipo ?? '', tipoEsperado)) {
    return falla(`«${buscado}» es de tipo ${encontrado.tipo ?? 'sin declarar'} y se esperaba ${tipoEsperado}.`);
  }
  const visEsperada = textoOpcional(a, 'visibilidad');
  if (visEsperada && encontrado.visibilidad !== visEsperada) {
    return falla(`«${buscado}» tiene visibilidad ${encontrado.visibilidad ?? 'sin declarar'} y se esperaba ${visEsperada}.`);
  }
  return ok;
};

const claseTieneOperacion: Evaluador = (a, { modelo }) => {
  const nombreClase = texto(a, 'clase');
  const nodo = nodoRequerido(modelo, nombreClase);
  if ('error' in nodo) return falla(nodo.error);

  const buscada = texto(a, 'operacion');
  const encontrada = nodo.operaciones.find((m) => mismoNombre(m.nombre, buscada));
  if (!encontrada) {
    return falla(
      `«${nombreClase}» no declara la operación «${buscada}». Declara: ${enumerar(nodo.operaciones.map((m) => m.nombre))}.`,
    );
  }
  const retorno = textoOpcional(a, 'retorno');
  if (retorno && !mismoNombre(encontrada.tipo ?? '', retorno)) {
    return falla(`«${buscada}» devuelve ${encontrada.tipo ?? 'nada declarado'} y se esperaba ${retorno}.`);
  }
  const visEsperada = textoOpcional(a, 'visibilidad');
  if (visEsperada && encontrada.visibilidad !== visEsperada) {
    return falla(`«${buscada}» tiene visibilidad ${encontrada.visibilidad ?? 'sin declarar'} y se esperaba ${visEsperada}.`);
  }
  return ok;
};

const relacionEntre: Evaluador = (a, { modelo }) => {
  const origen = texto(a, 'origen');
  const destino = texto(a, 'destino');
  const tipo = texto(a, 'tipo') as TipoArista;

  const candidatas = modelo.aristas.filter(
    (x) => coincideNodo(modelo, x.origen, origen) && coincideNodo(modelo, x.destino, destino),
  );
  if (!candidatas.length) {
    const alReves = modelo.aristas.some(
      (x) => coincideNodo(modelo, x.origen, destino) && coincideNodo(modelo, x.destino, origen),
    );
    return falla(
      alReves
        ? `Existe una relación entre «${origen}» y «${destino}», pero en el sentido contrario.`
        : `No hay ninguna relación de «${origen}» a «${destino}».`,
    );
  }
  const delTipo = candidatas.filter((x) => x.tipo === tipo);
  if (!delTipo.length) {
    return falla(
      `La relación existe pero es de tipo ${enumerar(candidatas.map((x) => x.tipo))} y se esperaba ${tipo}.`,
    );
  }
  const cardDestino = textoOpcional(a, 'cardinalidadDestino');
  if (cardDestino && !delTipo.some((x) => x.cardinalidadDestino === cardDestino)) {
    return falla(
      `La cardinalidad del extremo «${destino}» es ${enumerar(delTipo.map((x) => x.cardinalidadDestino ?? 'sin declarar'))} y se esperaba «${cardDestino}».`,
    );
  }
  const cardOrigen = textoOpcional(a, 'cardinalidadOrigen');
  if (cardOrigen && !delTipo.some((x) => x.cardinalidadOrigen === cardOrigen)) {
    return falla(
      `La cardinalidad del extremo «${origen}» es ${enumerar(delTipo.map((x) => x.cardinalidadOrigen ?? 'sin declarar'))} y se esperaba «${cardOrigen}».`,
    );
  }
  return ok;
};

/** Nombre visible de un nodo por su id; cae al id si no se encuentra. */
function nombreDe(modelo: ModeloDiagrama, id: string): string {
  return modelo.nodos.find((n) => n.id === id)?.nombre ?? id;
}

function coincideNodo(modelo: ModeloDiagrama, id: string, nombre: string): boolean {
  if (mismoNombre(id, nombre)) return true;
  const nodo = modelo.nodos.find((n) => n.id === id);
  return !!nodo && mismoNombre(nodo.nombre, nombre);
}

/**
 * El error nº 1 de la enseñanza de UML: usar agregación donde el ciclo de vida
 * de la parte depende del todo. El criterio operativo publicado es "si la parte
 * sobrevive al todo, es agregación"; aquí el autor ya decidió que no sobrevive,
 * y la aserción comprueba que el alumno lo representó como composición.
 */
const composicionNoAgregacion: Evaluador = (a, { modelo }) => {
  const todo = texto(a, 'todo');
  const parte = texto(a, 'parte');
  const arista = modelo.aristas.find(
    (x) => coincideNodo(modelo, x.origen, todo) && coincideNodo(modelo, x.destino, parte)
      && (x.tipo === 'composicion' || x.tipo === 'agregacion'),
  );
  if (!arista) {
    return falla(`No hay relación de todo-parte entre «${todo}» y «${parte}».`);
  }
  if (arista.tipo === 'agregacion') {
    return falla(
      `«${parte}» está unida a «${todo}» por agregación (rombo hueco), que significa que la parte sobrevive al todo. Aquí la parte no existe sin el todo: corresponde composición (rombo relleno).`,
    );
  }
  return ok;
};

const clasesConContenido: Evaluador = (a, { modelo }) => {
  const excepciones = lista(a, 'excepciones').map(clave);
  const vacias = modelo.nodos
    .filter((n) => n.clase === 'clase' || n.clase === 'entidad')
    .filter((n) => !excepciones.includes(clave(n.nombre)) && !excepciones.includes(clave(n.id)))
    .filter((n) => !n.atributos.length && !n.operaciones.length)
    .map((n) => n.nombre);
  return vacias.length
    ? falla(`Estas cajas no declaran ni atributos ni operaciones: ${enumerar(vacias)}.`)
    : ok;
};

const sinRelacionesDuplicadas: Evaluador = (_a, { modelo }) => {
  const repetidas = aristasDuplicadas(modelo);
  return repetidas.length
    ? falla(`Hay relaciones repetidas: ${enumerar(repetidas.map((x) => `${x.origen}–${x.destino}`))}.`)
    : ok;
};

const sinMuchosAMuchos: Evaluador = (_a, { modelo }) => {
  const malas = modelo.aristas.filter(
    (x) => esMuchos(x.cardinalidadOrigen) && esMuchos(x.cardinalidadDestino),
  );
  return malas.length
    ? falla(
      `Hay relaciones de muchos a muchos sin resolver: ${enumerar(malas.map((x) => `${x.origen}–${x.destino}`))}. Una relación N:M necesita una clase intermedia que la represente.`,
    )
    : ok;
};

const sinCiclos: Evaluador = (a, { modelo }) => {
  const tipos = lista(a, 'tipos') as TipoArista[];
  const encontrados = ciclos(modelo, tipos.length ? tipos : undefined);
  return encontrados.length
    ? falla(`Hay dependencias circulares: ${enumerar(encontrados.map((c) => c.join(' → ')))}.`)
    : ok;
};

// --- Secuencia -------------------------------------------------------------

const existeParticipante: Evaluador = (a, ctx) => existeNodo(a, ctx);

function mensajesReales(modelo: ModeloDiagrama): Mensaje[] {
  return modelo.mensajes.filter((m) => m.tipo !== 'activacion' && m.tipo !== 'desactivacion');
}

const mensajeEntre: Evaluador = (a, { modelo }) => {
  const de = texto(a, 'de');
  const hacia = texto(a, 'a');
  const textoEsperado = textoOpcional(a, 'texto');
  const tipoEsperado = textoOpcional(a, 'tipo');

  const candidatos = mensajesReales(modelo).filter(
    (m) => coincideNodo(modelo, m.de, de) && m.a !== undefined && coincideNodo(modelo, m.a, hacia),
  );
  if (!candidatos.length) {
    return falla(`No hay ningún mensaje de «${de}» a «${hacia}».`);
  }
  const porTexto = textoEsperado
    ? candidatos.filter((m) => mismoNombre(nombreDeMensaje(m.texto), nombreDeMensaje(textoEsperado)))
    : candidatos;
  if (!porTexto.length) {
    return falla(
      `Hay mensajes de «${de}» a «${hacia}», pero ninguno es «${textoEsperado}». Encontré: ${enumerar(candidatos.map((m) => m.texto))}.`,
    );
  }
  if (tipoEsperado && !porTexto.some((m) => m.tipo === tipoEsperado)) {
    return falla(
      `El mensaje existe pero es ${enumerar(porTexto.map((m) => m.tipo))} y se esperaba ${tipoEsperado}.`,
    );
  }
  return ok;
};

const ordenDeMensajes: Evaluador = (a, { modelo }) => {
  const esperados = lista(a, 'mensajes');
  if (!esperados.length) throw new Error('La aserción "orden-de-mensajes" necesita la lista «mensajes».');
  const reales = mensajesReales(modelo).map((m) => nombreDeMensaje(m.texto));

  let cursor = 0;
  for (const esperado of esperados) {
    const encontrado = reales.findIndex(
      (r, i) => i >= cursor && mismoNombre(r, nombreDeMensaje(esperado)),
    );
    if (encontrado < 0) {
      return falla(
        `«${esperado}» no aparece después de los anteriores. El orden encontrado es: ${enumerar(reales, 10)}.`,
      );
    }
    cursor = encontrado + 1;
  }
  return ok;
};

/**
 * Líneas de vida que nombran instancias, no tipos. Es el error más frecuente
 * medido en diagramas de secuencia de alumnos, y la especificación de UML lo
 * prohíbe explícitamente.
 */
const lineasVidaNombradas: Evaluador = (a, { modelo }) => {
  const minLongitud = numeroOpcional(a, 'minLongitud') ?? 2;
  const malas = modelo.nodos
    .filter((n) => n.clase === 'participante' || n.clase === 'actor')
    .filter((n) => !nombreDeLineaDeVidaValido(n.nombre, minLongitud))
    .map((n) => n.nombre);
  return malas.length
    ? falla(`Estas líneas de vida no identifican a nadie: ${enumerar(malas)}.`)
    : ok;
};

/**
 * Todo mensaje síncrono debe tener su retorno. El alumno dibuja las llamadas y
 * olvida las respuestas, y el diagrama deja de contar la interacción completa.
 * Se busca el retorno DESPUÉS de la llamada y antes de que el mismo par vuelva
 * a llamarse, que es lo que distingue "respondió" de "respondió a otra cosa".
 */
const sincronosConRetorno: Evaluador = (_a, { modelo }) => {
  const reales = mensajesReales(modelo);
  const sinRespuesta: string[] = [];

  reales.forEach((m, i) => {
    if (m.tipo !== 'sincrono' || m.a === undefined) return;
    const siguienteLlamadaIgual = reales.findIndex(
      (x, j) => j > i && x.tipo === 'sincrono' && x.de === m.de && x.a === m.a,
    );
    const tope = siguienteLlamadaIgual < 0 ? reales.length : siguienteLlamadaIgual;
    const tieneRetorno = reales.some(
      (x, j) => j > i && j < tope && x.tipo === 'retorno' && x.de === m.a && x.a === m.de,
    );
    if (!tieneRetorno) sinRespuesta.push(m.texto || `${m.de}→${m.a}`);
  });

  return sinRespuesta.length
    ? falla(`Estos mensajes síncronos no tienen retorno: ${enumerar(sinRespuesta)}.`)
    : ok;
};

const activacionesBalanceadas: Evaluador = (_a, { modelo }) => {
  const abiertas = new Map<string, number>();
  for (const m of modelo.mensajes) {
    if (m.tipo === 'activacion') abiertas.set(m.de, (abiertas.get(m.de) ?? 0) + 1);
    if (m.tipo === 'desactivacion') {
      const n = (abiertas.get(m.de) ?? 0) - 1;
      if (n < 0) return falla(`Se desactiva «${m.de}» sin haberlo activado.`);
      abiertas.set(m.de, n);
    }
  }
  const colgadas = [...abiertas.entries()].filter(([, n]) => n > 0).map(([id]) => id);
  return colgadas.length
    ? falla(`Estas activaciones se abren y no se cierran: ${enumerar(colgadas)}.`)
    : ok;
};

// --- Estados ---------------------------------------------------------------

const existeEstado: Evaluador = (a, ctx) => {
  const nombre = texto(a, 'nombre');
  const nodo = buscarNodo(ctx.modelo, nombre);
  if (!nodo) {
    const estados = ctx.modelo.nodos.filter((n) => n.clase === 'estado').map((n) => n.nombre);
    return falla(`No encontré el estado «${nombre}». Hay: ${enumerar(estados)}.`);
  }
  if (nodo.clase !== 'estado') {
    return falla(`«${nombre}» existe pero es ${nodo.clase}, no un estado.`);
  }
  return ok;
};

const tieneEstadoInicial: Evaluador = (_a, { modelo }) => {
  const inicial = modelo.nodos.find((n) => n.papel === 'inicial');
  if (!inicial) return falla('Falta el pseudoestado inicial: ninguna transición sale de «[*]».');
  const sale = modelo.aristas.some((x) => x.origen === inicial.id);
  return sale ? ok : falla('El pseudoestado inicial no lleva a ningún estado.');
};

const transicion: Evaluador = (a, { modelo }) => {
  const desde = texto(a, 'desde');
  const hasta = texto(a, 'hasta');
  const candidatas = modelo.aristas.filter(
    (x) => coincideNodo(modelo, x.origen, desde) && coincideNodo(modelo, x.destino, hasta),
  );
  if (!candidatas.length) return falla(`No hay transición de «${desde}» a «${hasta}».`);

  const etiquetaEsperada = textoOpcional(a, 'etiqueta');
  if (etiquetaEsperada) {
    const casa = candidatas.some(
      (x) => mismoNombre(disparadorDeTransicion(x.etiqueta ?? ''), disparadorDeTransicion(etiquetaEsperada)),
    );
    if (!casa) {
      return falla(
        `La transición existe pero su disparador es ${enumerar(candidatas.map((x) => x.etiqueta ?? 'sin etiqueta'))} y se esperaba «${etiquetaEsperada}».`,
      );
    }
  }
  return ok;
};

const estadosAlcanzables: Evaluador = (_a, { modelo }) => {
  const inicial = modelo.nodos.find((n) => n.papel === 'inicial');
  if (!inicial) return falla('Sin pseudoestado inicial no se puede saber qué es alcanzable.');
  const vistos = alcanzablesDesde(modelo, [inicial.id]);
  const huerfanos = modelo.nodos
    .filter((n) => n.clase === 'estado' && !vistos.has(n.id))
    .map((n) => n.nombre);
  return huerfanos.length
    ? falla(`No se puede llegar a estos estados desde el inicio: ${enumerar(huerfanos)}.`)
    : ok;
};

/** Estados-trampa: se entra y ya no se puede terminar. */
const sinCallejones: Evaluador = (_a, { modelo }) => {
  const finales = modelo.nodos.filter((n) => n.papel === 'final').map((n) => n.id);
  if (!finales.length) return falla('No hay estado final: toda ejecución quedaría atrapada.');
  const productivos = coalcanzablesHasta(modelo, finales);
  const trampas = modelo.nodos
    .filter((n) => n.clase === 'estado' && !productivos.has(n.id))
    .map((n) => n.nombre);
  return trampas.length
    ? falla(`Desde estos estados ya no se puede terminar: ${enumerar(trampas)}.`)
    : ok;
};

/**
 * Un nodo que no espera un evento no es un estado, es una actividad disfrazada.
 * El criterio operativo procede de la especificación: los pseudoestados son de
 * paso y los estados son vértices estables, así que una transición que sale de
 * un estado sin disparador convierte a ese estado en un mero paso de flujo.
 */
const transicionesConEvento: Evaluador = (a, { modelo }) => {
  const excepto = lista(a, 'excepto').map(clave);
  const pseudo = new Set(modelo.nodos.filter((n) => n.clase === 'pseudoestado').map((n) => n.id));
  const malas = modelo.aristas
    .filter((x) => !pseudo.has(x.origen))
    // La transición HACIA el estado final es de terminación: se dispara cuando
    // el estado acaba su trabajo, y exigirle un evento sería un falso positivo.
    .filter((x) => !pseudo.has(x.destino))
    .filter((x) => !disparadorDeTransicion(x.etiqueta ?? ''))
    // El autor escribe el NOMBRE que ve en el diagrama; el id solo coincide con
    // él cuando no hay alias. Se aceptan los dos, como hace `clases-con-contenido`.
    .filter((x) => {
      const nodo = modelo.nodos.find((n) => n.id === x.origen);
      return !excepto.includes(clave(x.origen)) && !excepto.includes(clave(nodo?.nombre ?? ''));
    })
    // Y el detalle nombra lo que el alumno ve, no identificadores internos.
    .map((x) => `${nombreDe(modelo, x.origen)} → ${nombreDe(modelo, x.destino)}`);
  return malas.length
    ? falla(
      `Estas transiciones salen de un estado sin esperar ningún evento: ${enumerar(malas)}. Un nodo que no espera un evento no es un estado.`,
    )
    : ok;
};

/**
 * Clave de comparación de una GUARDA.
 *
 * NO se usa `clave()` aquí, y esa es toda la gracia: `clave()` borra todo lo que
 * no sea letra o dígito, y en una guarda los operadores son justo lo que la
 * distingue de su contraria. Con ella, `[activo]` y `[!activo]` —o `[x > 0]` y
 * `[x >= 0]`— daban la MISMA clave, así que la pareja canónica de guardas
 * excluyentes se declaraba ambigua y suspendía un diagrama correcto.
 *
 * Se decodifican de paso las tres entidades que puede meter el sanitizador del
 * DOM: no dependemos de que el DOM de turno deje el texto crudo, y `&lt;=` no
 * puede volver a colarse como si fuera otra guarda distinta de `<=`.
 */
function claveDeGuarda(guarda: string): string {
  return guarda
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .normalize('NFD')
    // Por punto de código, como en `nombres.ts`: el rango se lee y no depende de
    // cómo se guarde este fichero.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

/**
 * Dos transiciones del mismo estado con el mismo disparador dejan la máquina no
 * determinista. La especificación de UML considera mal formado el modelo cuando
 * la elección no está resuelta.
 */
const transicionesDeterministas: Evaluador = (_a, { modelo }) => {
  const pseudo = new Set(modelo.nodos.filter((n) => n.clase === 'pseudoestado').map((n) => n.id));
  const vistas = new Map<string, number>();
  for (const x of modelo.aristas) {
    // Un pseudoestado de decisión sale SIEMPRE con guardas y sin disparador: es
    // la forma canónica de modelar una elección, no una ambigüedad.
    if (pseudo.has(x.origen)) continue;
    // La GUARDA entra en la firma. Dos salidas con el mismo disparador y guardas
    // excluyentes —`validar [saldo > 0]` y `validar [saldo <= 0]`— están
    // perfectamente resueltas; compararlas solo por el disparador las declaraba
    // ambiguas y suspendía la manera correcta de escribirlas.
    const guarda = (x.etiqueta ?? '').includes('[')
      ? (x.etiqueta ?? '').slice((x.etiqueta ?? '').indexOf('['))
      : '';
    const firma = `${x.origen}::${clave(disparadorDeTransicion(x.etiqueta ?? ''))}::${claveDeGuarda(guarda)}`;
    vistas.set(firma, (vistas.get(firma) ?? 0) + 1);
  }
  const ambiguas = [...vistas.entries()]
    .filter(([, n]) => n > 1)
    .map(([firma]) => firma.split('::')[0]);
  return ambiguas.length
    ? falla(
      `Estos estados tienen dos salidas con el mismo disparador, así que la máquina no decide: ${enumerar(ambiguas)}.`,
    )
    : ok;
};

// --- Flujo -----------------------------------------------------------------

/** Los nodos de arranque: los terminales sin ninguna arista de entrada. */
function iniciosDeFlujo(modelo: ModeloDiagrama): string[] {
  const conEntrada = new Set(modelo.aristas.map((a) => a.destino));
  const terminales = modelo.nodos.filter((n) => n.forma === 'inicio-fin');
  const inicios = terminales.filter((n) => !conEntrada.has(n.id)).map((n) => n.id);
  // Sin terminales explícitos se toma cualquier nodo sin entradas: hay diagramas
  // legítimos que no dibujan el óvalo de inicio, y exigirlo sería una regla de
  // estilo disfrazada de comprobación de estructura.
  if (inicios.length) return inicios;
  return modelo.nodos.filter((n) => !conEntrada.has(n.id)).map((n) => n.id);
}

const nodoConForma: Evaluador = (a, { modelo }) => {
  const nombre = texto(a, 'nombre');
  const forma = texto(a, 'forma');
  const nodo = buscarNodo(modelo, nombre);
  if (!nodo) return falla(`No encontré «${nombre}» en el diagrama.`);
  if (nodo.forma !== forma) {
    return falla(
      `«${nombre}» está dibujado como ${nodo.forma ?? 'una forma sin identificar'} y debería ser ${forma}. En un diagrama de flujo la forma indica el papel del nodo, no es decoración.`,
    );
  }
  return ok;
};

const pasoDeFlujo: Evaluador = (a, { modelo }) => {
  const desde = texto(a, 'desde');
  const hasta = texto(a, 'hasta');
  const candidatas = modelo.aristas.filter(
    (x) => x.tipo === 'flujo' && coincideNodo(modelo, x.origen, desde) && coincideNodo(modelo, x.destino, hasta),
  );
  if (!candidatas.length) return falla(`No hay ningún paso de «${desde}» a «${hasta}».`);
  const etiqueta = textoOpcional(a, 'etiqueta');
  if (etiqueta && !candidatas.some((x) => mismoNombre(x.etiqueta ?? '', etiqueta))) {
    return falla(
      `El paso existe pero está rotulado ${enumerar(candidatas.map((x) => x.etiqueta ?? 'sin rótulo'))} y se esperaba «${etiqueta}».`,
    );
  }
  return ok;
};

/** Desde cualquier nodo se tiene que poder llegar a un final. */
const flujoTermina: Evaluador = (_a, { modelo }) => {
  const conSalida = new Set(modelo.aristas.map((x) => x.origen));
  const finales = modelo.nodos
    .filter((n) => (n.forma === 'inicio-fin' && !conSalida.has(n.id)) || !conSalida.has(n.id))
    .map((n) => n.id);
  if (!finales.length) return falla('No hay ningún nodo final: todo camino queda en un ciclo.');
  const productivos = coalcanzablesHasta(modelo, finales);
  const atrapados = modelo.nodos.filter((n) => !productivos.has(n.id)).map((n) => n.nombre);
  return atrapados.length
    ? falla(`Desde estos nodos no se puede llegar al final: ${enumerar(atrapados)}.`)
    : ok;
};

const nodosAlcanzables: Evaluador = (_a, { modelo }) => {
  const inicios = iniciosDeFlujo(modelo);
  if (!inicios.length) return falla('Todos los nodos tienen entradas: no se sabe por dónde empieza el flujo.');
  const vistos = alcanzablesDesde(modelo, inicios);
  // Los CONTENEDORES no son pasos del flujo: una calle de responsabilidad
  // agrupa acciones, no se «alcanza». Contarlas dejaba en rojo cualquier
  // diagrama de actividad con calles, que son todos.
  const huerfanos = modelo.nodos
    .filter((n) => n.clase !== 'paquete')
    .filter((n) => !vistos.has(n.id))
    .map((n) => n.nombre);
  return huerfanos.length
    ? falla(`No se puede llegar a estos nodos desde el inicio: ${enumerar(huerfanos)}.`)
    : ok;
};

/**
 * Una decisión con una sola salida no decide nada: o sobra el rombo, o falta la
 * rama que no se dibujó. Además, cada salida debe ir rotulada, porque si no el
 * diagrama no dice cuál se toma en cada caso.
 */
const decisionesConSalidas: Evaluador = (a, { modelo }) => {
  const minimo = numeroOpcional(a, 'min') ?? 2;
  const problemas: string[] = [];
  for (const nodo of modelo.nodos.filter((n) => n.forma === 'decision')) {
    const salidas = modelo.aristas.filter((x) => x.origen === nodo.id);
    if (salidas.length < minimo) {
      problemas.push(`«${nodo.nombre}» tiene ${salidas.length} salida(s) y una decisión necesita al menos ${minimo}`);
      continue;
    }
    const sinRotulo = salidas.filter((x) => !x.etiqueta).length;
    if (sinRotulo) problemas.push(`«${nodo.nombre}» tiene ${sinRotulo} salida(s) sin rotular`);
  }
  return problemas.length ? falla(problemas.join('; ') + '.') : ok;
};

// --- Casos de uso, componentes y paquetes ----------------------------------

/**
 * Un elemento está DENTRO de un contenedor. Es la comprobación propia de los
 * diagramas de paquetes y de componentes: la caja que envuelve no es un adorno,
 * dice a qué módulo pertenece cada cosa.
 */
const contenidoEnPaquete: Evaluador = (a, { modelo }) => {
  const elemento = texto(a, 'elemento');
  const paquete = texto(a, 'paquete');
  const nodo = buscarNodo(modelo, elemento);
  if (!nodo) return falla(`No encontré «${elemento}» en el diagrama.`);
  if (!nodo.contenedor) {
    return falla(`«${elemento}» está suelto: no lo envuelve ningún paquete.`);
  }
  if (!coincideNodo(modelo, nodo.contenedor, paquete)) {
    const dentroDe = modelo.nodos.find((n) => n.id === nodo.contenedor);
    return falla(`«${elemento}» está dentro de «${dentroDe?.nombre ?? nodo.contenedor}» y debería estar en «${paquete}».`);
  }
  return ok;
};

/** Ids de los nodos con al menos una arista, en cualquier sentido. */
function conectados(modelo: ModeloDiagrama): Set<string> {
  const s = new Set<string>();
  for (const a of modelo.aristas) { s.add(a.origen); s.add(a.destino); }
  return s;
}

/**
 * Un caso de uso sin actor no lo pide nadie, y un diagrama de casos de uso
 * describe precisamente quién quiere qué del sistema.
 */
const sinCasosUsoSinActor: Evaluador = (_a, { modelo }) => {
  const actores = new Set(modelo.nodos.filter((n) => n.clase === 'actor').map((n) => n.id));
  const huerfanos = modelo.nodos
    .filter((n) => n.clase === 'caso-de-uso')
    // Vale con que lo alcance un actor directamente o a través de otro caso de
    // uso: un caso incluido por otro sí tiene quien lo pida.
    .filter((n) => !modelo.aristas.some(
      (x) => (x.destino === n.id && (actores.has(x.origen) || esCasoDeUso(modelo, x.origen)))
        || (x.origen === n.id && actores.has(x.destino)),
    ))
    .map((n) => n.nombre);
  return huerfanos.length
    ? falla(`Estos casos de uso no los solicita nadie: ${enumerar(huerfanos)}.`)
    : ok;
};

function esCasoDeUso(modelo: ModeloDiagrama, id: string): boolean {
  return modelo.nodos.some((n) => n.id === id && n.clase === 'caso-de-uso');
}

/** Un actor dibujado y sin conectar a nada no aporta información. */
const sinActoresOciosos: Evaluador = (_a, { modelo }) => {
  const unidos = conectados(modelo);
  const ociosos = modelo.nodos
    .filter((n) => n.clase === 'actor' && !unidos.has(n.id))
    .map((n) => n.nombre);
  return ociosos.length
    ? falla(`Estos actores no participan en ningún caso de uso: ${enumerar(ociosos)}.`)
    : ok;
};

// --- Cruzadas: coherencia con los diagramas dados --------------------------

/**
 * Todo mensaje debe corresponder a una operación de la clase que lo recibe. Es
 * la regla normativa de UML —el nombre del mensaje es el de la operación
 * referida— y ataca el error más frecuente medido en alumnos.
 */
const mensajeExisteComoOperacion: Evaluador = (a, ctx) => {
  const clases = contextoDe(ctx, texto(a, 'contexto'));
  const problemas: string[] = [];

  for (const m of mensajesReales(ctx.modelo)) {
    if (m.tipo !== 'sincrono' && m.tipo !== 'asincrono') continue;
    if (m.a === undefined) continue;

    const destino = ctx.modelo.nodos.find((n) => n.id === m.a);
    // A un actor no se le "llama una operación": queda fuera de la regla.
    if (destino?.clase === 'actor') continue;

    const nombreDestino = destino?.nombre ?? m.a;
    const clase = buscarNodo(clases, nombreDestino);
    if (!clase) {
      problemas.push(`«${m.texto}» va a «${nombreDestino}», que no existe en el diagrama de clases`);
      continue;
    }
    const operacion = nombreDeMensaje(m.texto);
    if (!operacion) continue;
    if (!clase.operaciones.some((op) => mismoNombre(op.nombre, operacion))) {
      problemas.push(
        `«${operacion}» no es una operación de «${clase.nombre}» (declara: ${enumerar(clase.operaciones.map((op) => op.nombre), 4)})`,
      );
    }
  }

  return problemas.length ? falla(problemas.join('; ') + '.') : ok;
};

/**
 * Los disparadores de una máquina de estados se definen según las operaciones y
 * recepciones de su clasificador. Un disparador inventado rompe la trazabilidad
 * entre el comportamiento y la estructura.
 */
const disparadorExisteComoOperacion: Evaluador = (a, ctx) => {
  const clases = contextoDe(ctx, texto(a, 'contexto'));
  const nombreClase = texto(a, 'clasificador');
  const clase = buscarNodo(clases, nombreClase);
  if (!clase) {
    return falla(`El diagrama de contexto no declara la clase «${nombreClase}».`);
  }
  const pseudo = new Set(ctx.modelo.nodos.filter((n) => n.clase === 'pseudoestado').map((n) => n.id));

  const inventados = ctx.modelo.aristas
    .filter((x) => !pseudo.has(x.origen))
    .map((x) => disparadorDeTransicion(x.etiqueta ?? ''))
    .filter(Boolean)
    .filter((d) => !clase.operaciones.some((op) => mismoNombre(op.nombre, d)));

  return inventados.length
    ? falla(
      `Estos disparadores no son operaciones de «${clase.nombre}»: ${enumerar([...new Set(inventados)])}.`,
    )
    : ok;
};

/** Toda línea de vida que no sea un actor debe existir como clase. */
const participanteExisteComoClase: Evaluador = (a, ctx) => {
  const clases = contextoDe(ctx, texto(a, 'contexto'));
  const faltan = ctx.modelo.nodos
    .filter((n) => n.clase === 'participante')
    .filter((n) => !buscarNodo(clases, n.nombre))
    .map((n) => n.nombre);
  return faltan.length
    ? falla(`Estas líneas de vida no corresponden a ninguna clase: ${enumerar(faltan)}.`)
    : ok;
};

// --- Actividad -------------------------------------------------------------

/** Quién hace la acción: lo que distingue una actividad de un flujo cualquiera. */
const accionEnCalle: Evaluador = (a, { modelo }) => {
  const accion = texto(a, 'accion');
  const calleNombre = texto(a, 'calle');
  const nodo = buscarNodo(modelo, accion);
  if (!nodo) {
    const acciones = modelo.nodos.filter((x) => x.forma === 'proceso').map((x) => x.nombre);
    return falla(`No encontré la acción «${accion}». Hay: ${enumerar(acciones)}.`);
  }
  const calle = modelo.nodos.find(
    (x) => x.clase === 'paquete' && clave(x.nombre) === clave(calleNombre),
  );
  if (!calle) {
    const calles = modelo.nodos.filter((x) => x.clase === 'paquete').map((x) => x.nombre);
    return falla(`No hay ninguna calle «${calleNombre}». Hay: ${enumerar(calles)}.`);
  }
  if (!nodo.contenedor) {
    return falla(`«${accion}» no está en ninguna calle: no dice quién la hace.`);
  }
  return nodo.contenedor === calle.id
    ? ok
    : falla(
        `«${accion}» está en «${modelo.nodos.find((x) => x.id === nodo.contenedor)?.nombre ?? nodo.contenedor}» y se esperaba en «${calleNombre}».`,
      );
};

/**
 * Todo fork tiene su join.
 *
 * Un fork sin join deja ramas paralelas que nunca vuelven a juntarse, y eso no
 * es paralelismo: es un diagrama que no dice cuándo termina la actividad. Es el
 * error clásico al usar fork por primera vez.
 */
const forkTieneJoin: Evaluador = (_a, { modelo }) => {
  const forks = modelo.nodos.filter((x) => x.papel === 'fork');
  const joins = modelo.nodos.filter((x) => x.papel === 'join');
  if (!forks.length) return falla('El diagrama no tiene ninguna bifurcación paralela (fork).');
  return forks.length === joins.length
    ? ok
    : falla(
        `Hay ${forks.length} bifurcación(es) y ${joins.length} unión(es): cada «fork» necesita su «end fork».`,
      );
};

// --- Jerarquías ------------------------------------------------------------

const nodoTieneHijo: Evaluador = (a, { modelo }) => {
  const padreNombre = texto(a, 'padre');
  const hijoNombre = texto(a, 'hijo');
  const padre = buscarNodo(modelo, padreNombre);
  if (!padre) {
    return falla(`No encontré «${padreNombre}». Hay: ${enumerar(modelo.nodos.map((n) => n.nombre))}.`);
  }
  const hijos = modelo.nodos.filter((n) => n.contenedor === padre.id);
  return hijos.some((h) => clave(h.nombre) === clave(hijoNombre))
    ? ok
    : falla(
        `«${padreNombre}» no tiene la rama «${hijoNombre}». Cuelgan de él: ${enumerar(hijos.map((h) => h.nombre))}.`,
      );
};

/**
 * Profundidad del árbol, contando la raíz como nivel 1.
 *
 * Existe porque el error dominante al hacer un mapa mental o una descomposición
 * es quedarse en una lista: un nivel de ramas y ninguna subrama. Eso no es una
 * jerarquía, y sin esta comprobación un diagrama así pasaría cualquier conteo.
 */
const profundidadMinima: Evaluador = (a, { modelo }) => {
  const minimo = numeroOpcional(a, 'niveles') ?? 2;
  const hijosDe = new Map<string, string[]>();
  for (const n of modelo.nodos) {
    if (!n.contenedor) continue;
    hijosDe.set(n.contenedor, [...(hijosDe.get(n.contenedor) ?? []), n.id]);
  }
  // Iterativo y con visitados: un modelo con un ciclo —que un árbol no debería
  // tener, pero el juez no puede darlo por hecho— colgaría una recursión.
  const raices = modelo.nodos.filter((n) => !n.contenedor).map((n) => n.id);
  let nivel = 0;
  let frente = raices;
  const visitados = new Set<string>(raices);
  while (frente.length) {
    nivel++;
    const siguiente: string[] = [];
    for (const id of frente) {
      for (const h of hijosDe.get(id) ?? []) {
        if (visitados.has(h)) continue;
        visitados.add(h);
        siguiente.push(h);
      }
    }
    frente = siguiente;
  }
  return nivel >= minimo
    ? ok
    : falla(`El árbol tiene ${nivel} nivel(es) y se esperaban al menos ${minimo}.`);
};

// --- Objetos ---------------------------------------------------------------

/**
 * Clasificador del que un objeto es instancia.
 *
 * UML lo escribe `ana : Cliente`, así que la clase es lo que hay tras los dos
 * puntos. Un objeto anónimo (`: Cliente`) también encaja, y uno sin dos puntos
 * se toma entero: quien escribe `Cliente` a secas está nombrando la clase.
 */
function clasificadorDe(nombre: string): string {
  const corte = nombre.indexOf(':');
  return (corte >= 0 ? nombre.slice(corte + 1) : nombre).trim();
}

const objetoTieneValor: Evaluador = (a, { modelo }) => {
  const nombre = texto(a, 'objeto');
  const ranura = texto(a, 'ranura');
  const nodo = buscarNodo(modelo, nombre);
  if (!nodo) {
    return falla(`No encontré el objeto «${nombre}». Hay: ${enumerar(modelo.nodos.map((n) => n.nombre))}.`);
  }
  const slot = nodo.atributos.find((x) => clave(x.nombre) === clave(ranura));
  if (!slot) {
    return falla(
      `«${nombre}» no tiene la ranura «${ranura}». Tiene: ${enumerar(nodo.atributos.map((x) => x.nombre))}.`,
    );
  }
  const esperado = textoOpcional(a, 'valor');
  if (esperado === undefined) return ok;
  // Un objeto sin valor en la ranura no modela una instancia concreta, que es
  // justo lo que distingue este diagrama del de clases.
  if (slot.valor === undefined) {
    return falla(`«${nombre}.${ranura}» no tiene ningún valor; se esperaba «${esperado}».`);
  }
  return clave(slot.valor) === clave(esperado)
    ? ok
    : falla(`«${nombre}.${ranura}» vale «${slot.valor}» y se esperaba «${esperado}».`);
};

const enlaceEntreObjetos: Evaluador = (a, { modelo }) => {
  const origen = texto(a, 'origen');
  const destino = texto(a, 'destino');
  const a1 = buscarNodo(modelo, origen);
  const b1 = buscarNodo(modelo, destino);
  if (!a1) return falla(`No encontré el objeto «${origen}».`);
  if (!b1) return falla(`No encontré el objeto «${destino}».`);
  // El enlace de un diagrama de objetos no tiene dirección semántica: es la
  // instancia de una asociación, y exigir un sentido concreto suspendería un
  // diagrama correcto escrito al revés.
  const hay = modelo.aristas.some(
    (r) =>
      (r.origen === a1.id && r.destino === b1.id) || (r.origen === b1.id && r.destino === a1.id),
  );
  return hay ? ok : falla(`No hay ningún enlace entre «${origen}» y «${destino}».`);
};

/** Todo objeto tiene que ser instancia de una clase que exista de verdad. */
const objetoEsInstanciaDe: Evaluador = (a, ctx) => {
  const clases = contextoDe(ctx, texto(a, 'contexto'));
  const faltan = ctx.modelo.nodos
    .filter((n) => n.clase === 'objeto')
    .filter((n) => !buscarNodo(clases, clasificadorDe(n.nombre)))
    .map((n) => n.nombre);
  return faltan.length
    ? falla(`Estos objetos no son instancia de ninguna clase declarada: ${enumerar(faltan)}.`)
    : ok;
};

// --- Despliegue ------------------------------------------------------------

const artefactoDesplegadoEn: Evaluador = (a, { modelo }) => {
  const artefacto = texto(a, 'artefacto');
  const nodoNombre = texto(a, 'nodo');
  const art = buscarNodo(modelo, artefacto);
  if (!art) {
    return falla(`No encontré el artefacto «${artefacto}». Hay: ${enumerar(modelo.nodos.map((n) => n.nombre))}.`);
  }
  const destino = buscarNodo(modelo, nodoNombre);
  if (!destino) return falla(`No encontré el nodo «${nodoNombre}».`);
  if (!art.contenedor) {
    return falla(`«${artefacto}» no está dentro de ningún nodo: un artefacto suelto no está desplegado.`);
  }

  // Se sube por la cadena de contenedores, no solo el inmediato: anidar nodos
  // —`cloud "AWS" { node "EC2" { artifact … } }`— es lo normal en esta vista, y
  // exigir contención directa suspendería un diagrama correcto.
  const cadena: string[] = [];
  let actual: string | undefined = art.contenedor;
  const visitados = new Set<string>();
  while (actual && !visitados.has(actual)) {
    visitados.add(actual);
    const contenedor = modelo.nodos.find((n) => n.id === actual);
    cadena.push(contenedor?.nombre ?? actual);
    if (clave(actual) === clave(destino.id) || clave(contenedor?.nombre ?? '') === clave(destino.nombre)) {
      return ok;
    }
    actual = contenedor?.contenedor;
  }
  return falla(
    `«${artefacto}» está en ${enumerar(cadena)} y se esperaba que estuviera en «${nodoNombre}».`,
  );
};

/** Todo artefacto desplegado tiene que corresponder a un componente del diseño. */
const artefactoCorrespondeAComponente: Evaluador = (a, ctx) => {
  const componentes = contextoDe(ctx, texto(a, 'contexto'));
  const faltan = ctx.modelo.nodos
    .filter((n) => n.clase === 'artefacto')
    .filter((n) => !buscarNodo(componentes, n.nombre))
    .map((n) => n.nombre);
  return faltan.length
    ? falla(`Estos artefactos no corresponden a ningún componente del diseño: ${enumerar(faltan)}.`)
    : ok;
};

// --- Registro --------------------------------------------------------------

export const CATALOGO: Record<string, Evaluador> = {
  // comunes
  'existe-nodo': existeNodo,
  'conteo-nodos': conteoNodos,
  'sin-nombres-vagos': sinNombresVagos,
  // clases
  'clase-tiene-atributo': claseTieneAtributo,
  'clase-tiene-operacion': claseTieneOperacion,
  'relacion-entre': relacionEntre,
  'relacion-es-composicion-no-agregacion': composicionNoAgregacion,
  'clases-con-contenido': clasesConContenido,
  'sin-relaciones-duplicadas': sinRelacionesDuplicadas,
  'sin-muchos-a-muchos': sinMuchosAMuchos,
  'sin-ciclos': sinCiclos,
  // secuencia
  'existe-participante': existeParticipante,
  'mensaje-entre': mensajeEntre,
  'orden-de-mensajes': ordenDeMensajes,
  'lineas-vida-nombradas': lineasVidaNombradas,
  'mensajes-sincronos-con-retorno': sincronosConRetorno,
  'activaciones-balanceadas': activacionesBalanceadas,
  // estados
  'existe-estado': existeEstado,
  'tiene-estado-inicial': tieneEstadoInicial,
  'transicion': transicion,
  'estados-alcanzables': estadosAlcanzables,
  'sin-callejones': sinCallejones,
  'transiciones-con-evento': transicionesConEvento,
  'transiciones-deterministas': transicionesDeterministas,
  // flujo
  'nodo-con-forma': nodoConForma,
  'paso-de-flujo': pasoDeFlujo,
  'flujo-termina': flujoTermina,
  'nodos-alcanzables': nodosAlcanzables,
  'decisiones-con-salidas': decisionesConSalidas,
  // casos de uso, componentes y paquetes
  'contenido-en-paquete': contenidoEnPaquete,
  'sin-casos-uso-sin-actor': sinCasosUsoSinActor,
  'sin-actores-ociosos': sinActoresOciosos,
  // actividad
  'accion-en-calle': accionEnCalle,
  'fork-tiene-join': forkTieneJoin,
  // jerarquías
  'nodo-tiene-hijo': nodoTieneHijo,
  'profundidad-minima': profundidadMinima,
  // objetos
  'objeto-tiene-valor': objetoTieneValor,
  'enlace-entre-objetos': enlaceEntreObjetos,
  // despliegue
  'artefacto-desplegado-en': artefactoDesplegadoEn,
  // cruzadas
  'objeto-es-instancia-de': objetoEsInstanciaDe,
  'artefacto-corresponde-a-componente': artefactoCorrespondeAComponente,
  'mensaje-existe-como-operacion': mensajeExisteComoOperacion,
  'disparador-existe-como-operacion': disparadorExisteComoOperacion,
  'participante-existe-como-clase': participanteExisteComoClase,
};

export const TIPOS_ASERCION = Object.keys(CATALOGO);

export function esTipoDeAsercionValido(tipo: unknown): tipo is string {
  return typeof tipo === 'string' && tipo in CATALOGO;
}

/** Duplicados de nombre en el diagrama; lo usa el verificador de autoría. */
export function nodosDuplicados(modelo: ModeloDiagrama): string[] {
  return modelo.nodos
    .filter((n) => buscarNodos(modelo, n.nombre).length > 1)
    .map((n) => n.nombre);
}
