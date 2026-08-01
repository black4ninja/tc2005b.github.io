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
 */
export function disparadorDeTransicion(etiqueta: string): string {
  return etiqueta.split('[')[0].split('/')[0].trim();
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
    .filter((x) => !excepto.includes(clave(x.origen)))
    .map((x) => `${x.origen} → ${x.destino}`);
  return malas.length
    ? falla(
      `Estas transiciones salen de un estado sin esperar ningún evento: ${enumerar(malas)}. Un nodo que no espera un evento no es un estado.`,
    )
    : ok;
};

/**
 * Dos transiciones del mismo estado con el mismo disparador dejan la máquina no
 * determinista. La especificación de UML considera mal formado el modelo cuando
 * la elección no está resuelta.
 */
const transicionesDeterministas: Evaluador = (_a, { modelo }) => {
  const vistas = new Map<string, number>();
  for (const x of modelo.aristas) {
    const firma = `${x.origen}::${clave(disparadorDeTransicion(x.etiqueta ?? ''))}`;
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
  // cruzadas
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
