/**
 * Catálogo de aserciones: por cada comprobación, un diagrama que la cumple y al
 * menos uno que no.
 *
 * Un catálogo probado solo con diagramas correctos no prueba nada: la aserción
 * que siempre devuelve `true` los pasaría todos. Por eso cada bloque lleva su
 * caso negativo, que es el que demuestra que la comprobación discrimina.
 */
import { describe, it, expect } from 'vitest';
import './calentar.js';
import { evaluarDiagrama } from '../../src/services/juez-diagramas/evaluar.js';
import type { Asercion, TipoDiagrama } from '../../src/services/juez-diagramas/tipos.js';

const CLASES = `classDiagram
  class Pedido {
    +String folio
    +total() Double
  }
  class Linea {
    +Int cantidad
    +importe() Double
  }
  Pedido "1" *-- "0..*" Linea : contiene`;

const CONTEXTO_CLASES = [{
  nombre: 'clases',
  tipo: 'clases' as const,
  motor: 'mermaid' as const,
  codigo: `classDiagram
  class ViewModel {
    +cargar() void
  }
  class Repositorio {
    +obtenerPedidos() List~Pedido~
  }`,
}];

/** Atajo: evalúa un diagrama contra una sola aserción. */
async function juzgar(
  codigo: string,
  asercion: Asercion,
  tipoDiagrama: TipoDiagrama = 'clases',
  contexto?: typeof CONTEXTO_CLASES,
) {
  const r = await evaluarDiagrama({
    motor: 'mermaid', tipoDiagrama, codigo, aserciones: [asercion], contexto,
  });
  return { paso: r.aserciones[0]?.paso ?? false, detalle: r.aserciones[0]?.detalle ?? '', informe: r };
}

describe('clases', () => {
  it('reconoce atributos y operaciones con su tipo', async () => {
    const attr = await juzgar(CLASES, {
      tipo: 'clase-tiene-atributo',
      parametros: { clase: 'Pedido', atributo: 'folio', tipo: 'String' },
    });
    expect(attr.paso).toBe(true);

    const op = await juzgar(CLASES, {
      tipo: 'clase-tiene-operacion',
      parametros: { clase: 'Pedido', operacion: 'total', retorno: 'Double' },
    });
    expect(op.paso).toBe(true);
  });

  it('falla si el atributo no existe, y dice cuáles hay', async () => {
    const r = await juzgar(CLASES, {
      tipo: 'clase-tiene-atributo', parametros: { clase: 'Pedido', atributo: 'fecha' },
    });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('folio');
  });

  it('falla si el tipo del atributo no es el pedido', async () => {
    const r = await juzgar(CLASES, {
      tipo: 'clase-tiene-atributo', parametros: { clase: 'Pedido', atributo: 'folio', tipo: 'Int' },
    });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('String');
  });

  it('comprueba la relación con su tipo y su cardinalidad', async () => {
    const r = await juzgar(CLASES, {
      tipo: 'relacion-entre',
      parametros: { origen: 'Pedido', destino: 'Linea', tipo: 'composicion', cardinalidadDestino: '0..*' },
    });
    expect(r.paso).toBe(true);
  });

  it('avisa cuando la relación existe pero en el sentido contrario', async () => {
    const r = await juzgar(CLASES, {
      tipo: 'relacion-entre', parametros: { origen: 'Linea', destino: 'Pedido', tipo: 'composicion' },
    });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('sentido contrario');
  });

  it('avisa cuando la relación es de otro tipo del pedido', async () => {
    const r = await juzgar(CLASES, {
      tipo: 'relacion-entre', parametros: { origen: 'Pedido', destino: 'Linea', tipo: 'agregacion' },
    });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('composicion');
  });

  it('el parámetro que falta se reporta como defecto de autoría', async () => {
    const r = await juzgar(CLASES, {
      tipo: 'relacion-entre', parametros: { origen: 'Pedido', destino: 'Linea' },
    });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('necesita el parámetro');
  });

  it('distingue composición de agregación', async () => {
    const asercion: Asercion = {
      tipo: 'relacion-es-composicion-no-agregacion',
      parametros: { todo: 'Pedido', parte: 'Linea' },
    };
    expect((await juzgar(CLASES, asercion)).paso).toBe(true);

    const r = await juzgar(CLASES.replace('*--', 'o--'), asercion);
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('sobrevive');
  });

  it('conteo-nodos sin ningún límite se rechaza en vez de aprobar sin mirar', async () => {
    // Era la única comprobación del catálogo capaz de pasar VACÍA: las demás
    // exigen sus parámetros con `texto()`, que lanza. Y sobrevivía a la
    // verificación de autoría, porque pasaba igual en las referencias y en la
    // trampa, así que el ejercicio se publicaba con una comprobación de adorno.
    const sinLimites = await juzgar(CLASES, { tipo: 'conteo-nodos', parametros: { clase: 'clase' } });
    expect(sinLimites.paso).toBe(false);
    expect(sinLimites.detalle).toContain('límite');

    // Un «min» que llega como cadena —lo que devuelve un <input> sin convertir—
    // se trata como ausente, así que acaba en el mismo sitio y no comprueba otra
    // cosa en silencio.
    // Y el diagnóstico distingue las dos causas: «falta un límite» y «lo
    // escribiste, pero como texto» mandan a buscar el error a sitios distintos.
    const minTexto = await juzgar(CLASES, { tipo: 'conteo-nodos', parametros: { min: '5' } });
    expect(minTexto.paso).toBe(false);
    expect(minTexto.detalle).toContain('como texto');
    expect(minTexto.detalle).not.toBe(sinLimites.detalle);

    const conLimite = await juzgar(CLASES, { tipo: 'conteo-nodos', parametros: { clase: 'clase', min: 2 } });
    expect(conLimite.paso, conLimite.detalle).toBe(true);
  });

  it('conteo-nodos distingue «no escribiste límite» de «lo escribiste como texto»', async () => {
    // Los dos casos fallan, que es lo correcto, pero mandan a buscar el error a
    // sitios distintos: en uno falta el parámetro y en el otro está escrito sin
    // convertir a número, que es lo que entrega un `<input type="number">`. Un
    // único mensaje mandaba al autor a revisar lo que ya había puesto.
    const ausente = await juzgar(CLASES, { tipo: 'conteo-nodos' });
    const cadena = await juzgar(CLASES, { tipo: 'conteo-nodos', parametros: { min: '5' } });
    expect(ausente.paso).toBe(false);
    expect(cadena.paso).toBe(false);
    expect(ausente.detalle).toContain('necesita al menos un límite');
    expect(cadena.detalle).toContain('como texto');
    expect(cadena.detalle).not.toBe(ausente.detalle);
  });

  it('conteo-nodos discrimina por cada extremo del rango y por clase', async () => {
    // Con el límite puesto queda por comprobar lo que la comprobación mide de
    // verdad: los dos casos negativos, uno por extremo. Probarla solo con el
    // rango holgado la habría dado por buena aunque no contara nada.
    const exacto = await juzgar(CLASES, { tipo: 'conteo-nodos', parametros: { min: 2, max: 2 } });
    expect(exacto.paso, exacto.detalle).toBe(true);

    const pocos = await juzgar(CLASES, { tipo: 'conteo-nodos', parametros: { min: 3 } });
    expect(pocos.paso).toBe(false);
    expect(pocos.detalle).toContain('al menos 3');

    const demasiados = await juzgar(CLASES, { tipo: 'conteo-nodos', parametros: { max: 1 } });
    expect(demasiados.paso).toBe(false);
    expect(demasiados.detalle).toContain('como mucho 1');

    // El filtro por clase cuenta SOLO esa clase: el diagrama tiene dos cajas y
    // ninguna interfaz, así que exigir una interfaz falla pese a sobrar nodos.
    const porClase = await juzgar(CLASES, { tipo: 'conteo-nodos', parametros: { clase: 'interfaz', min: 1 } });
    expect(porClase.paso).toBe(false);
    expect(porClase.detalle).toContain('Hay 0');
  });

  it('detecta la relación dibujada dos veces', async () => {
    // Repetir la misma relación no añade información y suele delatar que el
    // alumno redibujó en vez de corregir.
    const repetida = `${CLASES}\n  Pedido *-- Linea : contiene`;
    const r = await juzgar(repetida, { tipo: 'sin-relaciones-duplicadas' });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('Pedido');

    expect((await juzgar(CLASES, { tipo: 'sin-relaciones-duplicadas' })).paso).toBe(true);
  });

  it('dos relaciones con rótulos distintos no son una relación repetida', async () => {
    // La etiqueta entra en la firma a propósito: dos flechas entre las mismas
    // cajas rotuladas distinto son dos relaciones distintas, y marcarlas como
    // duplicadas suspendería el patrón más común de varias notaciones.
    const dosRotulos = `${CLASES}\n  Pedido *-- Linea : agrupa`;
    const r = await juzgar(dosRotulos, { tipo: 'sin-relaciones-duplicadas' });
    expect(r.paso, r.detalle).toBe(true);
  });

  it('detecta cajas sin contenido', async () => {
    expect((await juzgar(CLASES, { tipo: 'clases-con-contenido' })).paso).toBe(true);
    expect((await juzgar(`${CLASES}\n  class Cliente`, { tipo: 'clases-con-contenido' })).paso).toBe(false);
  });

  it('detecta muchos a muchos sin resolver', async () => {
    const nm = 'classDiagram\n  Alumno "0..*" -- "0..*" Curso';
    expect((await juzgar(nm, { tipo: 'sin-muchos-a-muchos' })).paso).toBe(false);
    expect((await juzgar(CLASES, { tipo: 'sin-muchos-a-muchos' })).paso).toBe(true);
  });

  it('detecta nombres vagos', async () => {
    const vago = 'classDiagram\n  class Manager {\n    +hacer() void\n  }';
    expect((await juzgar(vago, { tipo: 'sin-nombres-vagos' })).paso).toBe(false);
    expect((await juzgar(CLASES, { tipo: 'sin-nombres-vagos' })).paso).toBe(true);
  });

  it('detecta dependencias circulares', async () => {
    const ciclo = 'classDiagram\n  A ..> B\n  B ..> C\n  C ..> A';
    expect((await juzgar(ciclo, { tipo: 'sin-ciclos' })).paso).toBe(false);
    expect((await juzgar(CLASES, { tipo: 'sin-ciclos' })).paso).toBe(true);
  });
});

const SECUENCIA = `sequenceDiagram
  actor U as Usuario
  participant VM as ViewModel
  participant R as Repositorio
  U->>VM: cargar()
  VM->>R: obtenerPedidos()
  R-->>VM: lista
  VM-->>U: pintar()`;

describe('secuencia', () => {
  it('comprueba que la línea de vida exista y sea de la clase esperada', async () => {
    const existe = await juzgar(SECUENCIA, {
      tipo: 'existe-participante', parametros: { nombre: 'Repositorio' },
    }, 'secuencia');
    expect(existe.paso, existe.detalle).toBe(true);

    // Un actor y una línea de vida no son lo mismo: el actor queda fuera del
    // sistema y el participante es un objeto de dentro. Sin el parámetro «clase»
    // discriminando, la comprobación solo miraría que el nombre apareciera.
    const claseEquivocada = await juzgar(SECUENCIA, {
      tipo: 'existe-participante', parametros: { nombre: 'ViewModel', clase: 'actor' },
    }, 'secuencia');
    expect(claseEquivocada.paso).toBe(false);
    expect(claseEquivocada.detalle).toContain('participante');

    // Al fallar enumera las líneas de vida que sí hay, que es lo que permite al
    // alumno ver si lo que falta es el participante o solo su nombre.
    const ausente = await juzgar(SECUENCIA, {
      tipo: 'existe-participante', parametros: { nombre: 'Cache' },
    }, 'secuencia');
    expect(ausente.paso).toBe(false);
    expect(ausente.detalle).toContain('ViewModel');
  });

  it('comprueba un mensaje concreto, su texto y su tipo', async () => {
    const r = await juzgar(SECUENCIA, {
      tipo: 'mensaje-entre',
      parametros: { de: 'ViewModel', a: 'Repositorio', texto: 'obtenerPedidos()', tipo: 'sincrono' },
    }, 'secuencia');
    expect(r.paso).toBe(true);
  });

  it('falla cuando el mensaje se pide de otro tipo del que es', async () => {
    const r = await juzgar(SECUENCIA, {
      tipo: 'mensaje-entre',
      parametros: { de: 'ViewModel', a: 'Repositorio', texto: 'obtenerPedidos()', tipo: 'asincrono' },
    }, 'secuencia');
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('sincrono');
  });

  it('falla cuando el mensaje no existe en ese sentido', async () => {
    const r = await juzgar(SECUENCIA, {
      tipo: 'mensaje-entre', parametros: { de: 'Repositorio', a: 'Usuario' },
    }, 'secuencia');
    expect(r.paso).toBe(false);
  });

  it('comprueba el orden relativo de los mensajes', async () => {
    const bien = await juzgar(SECUENCIA, {
      tipo: 'orden-de-mensajes', parametros: { mensajes: ['cargar', 'obtenerPedidos', 'lista'] },
    }, 'secuencia');
    expect(bien.paso).toBe(true);

    const mal = await juzgar(SECUENCIA, {
      tipo: 'orden-de-mensajes', parametros: { mensajes: ['obtenerPedidos', 'cargar'] },
    }, 'secuencia');
    expect(mal.paso).toBe(false);
  });

  it('rechaza líneas de vida que no identifican a nadie', async () => {
    const malo = 'sequenceDiagram\n  A->>B: x\n  B-->>A: y';
    expect((await juzgar(malo, { tipo: 'lineas-vida-nombradas' }, 'secuencia')).paso).toBe(false);
    expect((await juzgar(SECUENCIA, { tipo: 'lineas-vida-nombradas' }, 'secuencia')).paso).toBe(true);
  });

  it('detecta el mensaje síncrono sin retorno', async () => {
    const sinRetorno = `sequenceDiagram
  participant VM as ViewModel
  participant R as Repositorio
  VM->>R: obtener()`;
    const r = await juzgar(sinRetorno, { tipo: 'mensajes-sincronos-con-retorno' }, 'secuencia');
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('obtener');
    expect((await juzgar(SECUENCIA, { tipo: 'mensajes-sincronos-con-retorno' }, 'secuencia')).paso).toBe(true);
  });

  it('detecta activaciones sin cerrar', async () => {
    const colgada = 'sequenceDiagram\n  A->>B: x\n  activate B';
    expect((await juzgar(colgada, { tipo: 'activaciones-balanceadas' }, 'secuencia')).paso).toBe(false);
  });
});

const ESTADOS = `stateDiagram-v2
  [*] --> Inactivo
  Inactivo --> Cargando: cargar
  Cargando --> Listo: exito
  Cargando --> Error: falla
  Error --> Cargando: reintentar
  Listo --> [*]`;

describe('estados', () => {
  it('acepta una máquina bien formada', async () => {
    for (const tipo of [
      'tiene-estado-inicial', 'estados-alcanzables', 'sin-callejones',
      'transiciones-con-evento', 'transiciones-deterministas',
    ]) {
      const r = await juzgar(ESTADOS, { tipo }, 'estados');
      expect(r.paso, `${tipo}: ${r.detalle}`).toBe(true);
    }
  });

  it('comprueba que el estado exista, y que sea un estado y no un pseudoestado', async () => {
    expect((await juzgar(ESTADOS, {
      tipo: 'existe-estado', parametros: { nombre: 'Cargando' },
    }, 'estados')).paso).toBe(true);

    const ausente = await juzgar(ESTADOS, {
      tipo: 'existe-estado', parametros: { nombre: 'Pausado' },
    }, 'estados');
    expect(ausente.paso).toBe(false);
    expect(ausente.detalle).toContain('Inactivo');

    // «inicio» y «fin» son los pseudoestados que Mermaid crea para «[*]». Un
    // pseudoestado es de paso y no espera nada, así que aceptarlo como estado
    // dejaría pasar una máquina a la que le falta el estado pedido.
    const pseudo = await juzgar(ESTADOS, {
      tipo: 'existe-estado', parametros: { nombre: 'inicio' },
    }, 'estados');
    expect(pseudo.paso).toBe(false);
    expect(pseudo.detalle).toContain('pseudoestado');
  });

  it('comprueba la transición y, si se pide, su disparador', async () => {
    const conDisparador = await juzgar(ESTADOS, {
      tipo: 'transicion', parametros: { desde: 'Inactivo', hasta: 'Cargando', etiqueta: 'cargar' },
    }, 'estados');
    expect(conDisparador.paso, conDisparador.detalle).toBe(true);

    // Sin disparador esperado basta con que la transición exista: el autor puede
    // querer exigir el camino sin atarse a cómo se rotuló.
    const soloElCamino = await juzgar(ESTADOS, {
      tipo: 'transicion', parametros: { desde: 'Cargando', hasta: 'Error' },
    }, 'estados');
    expect(soloElCamino.paso, soloElCamino.detalle).toBe(true);

    const otroDisparador = await juzgar(ESTADOS, {
      tipo: 'transicion', parametros: { desde: 'Inactivo', hasta: 'Cargando', etiqueta: 'refrescar' },
    }, 'estados');
    expect(otroDisparador.paso).toBe(false);
    expect(otroDisparador.detalle).toContain('cargar');

    const inexistente = await juzgar(ESTADOS, {
      tipo: 'transicion', parametros: { desde: 'Listo', hasta: 'Inactivo' },
    }, 'estados');
    expect(inexistente.paso).toBe(false);
    expect(inexistente.detalle).toContain('No hay transición');
  });

  it('el disparador se compara sin su guarda ni su acción', async () => {
    // «cargar» y «cargar [hay red] / traer()» nombran el mismo evento. Exigir la
    // etiqueta completa mediría cómo se escribió la transición en vez de qué
    // dispara, que es justo el veredicto que este juez evita.
    const conGuarda = `stateDiagram-v2
  [*] --> Inactivo
  Inactivo --> Cargando: cargar [hay red] / traer()
  Cargando --> [*]`;
    const r = await juzgar(conGuarda, {
      tipo: 'transicion', parametros: { desde: 'Inactivo', hasta: 'Cargando', etiqueta: 'cargar' },
    }, 'estados');
    expect(r.paso, r.detalle).toBe(true);
  });

  it('detecta estados inalcanzables', async () => {
    const r = await juzgar(`${ESTADOS}\n  Olvidado --> Listo: nunca`, { tipo: 'estados-alcanzables' }, 'estados');
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('Olvidado');
  });

  it('detecta el callejón sin salida', async () => {
    const trampa = `stateDiagram-v2
  [*] --> A
  A --> B: ir
  B --> C: seguir
  C --> B: volver
  A --> [*]`;
    const r = await juzgar(trampa, { tipo: 'sin-callejones' }, 'estados');
    expect(r.paso).toBe(false);
    expect(r.detalle).toMatch(/B|C/);
  });

  it('detecta la transición sin evento, que delata una actividad disfrazada de estado', async () => {
    const sinEvento = 'stateDiagram-v2\n  [*] --> A\n  A --> B\n  B --> [*]';
    const r = await juzgar(sinEvento, { tipo: 'transiciones-con-evento' }, 'estados');
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('no espera');
  });

  it('dos salidas con el mismo disparador y guardas excluyentes SÍ deciden', async () => {
    // Es la forma canónica de modelar una elección en UML. Comparando solo por
    // el disparador se declaraba ambigua y se suspendía al alumno que la escribe
    // bien.
    const conGuardas = `stateDiagram-v2
  [*] --> Espera
  Espera --> Aceptado : validar [saldo > 0]
  Espera --> Rechazado : validar [saldo <= 0]
  Aceptado --> [*]
  Rechazado --> [*]`;
    const r = await juzgar(conGuardas, { tipo: 'transiciones-deterministas' }, 'estados');
    expect(r.paso, r.detalle).toBe(true);
  });

  // Estas dos parejas se declaraban AMBIGUAS y suspendían un diagrama correcto.
  // La guarda se comparaba con `clave()`, que borra todo lo que no sea letra o
  // dígito: `[activo]` y `[!activo]` daban la misma clave, y `[x > 0]` y
  // `[x >= 0]` también. El caso de arriba no lo destapaba porque el `<` de `<=`
  // llegaba escapado como `&lt;` y dejaba las letras «lt» detrás, así que las dos
  // claves salían distintas por accidente del sanitizador del DOM.
  it.each([
    ['la negación', '[activo]', '[!activo]'],
    ['operadores sobre el mismo operando', '[x > 0]', '[x >= 0]'],
  ])('distingue guardas excluyentes por %s', async (_caso, guardaA, guardaB) => {
    const d = `stateDiagram-v2
  [*] --> Espera
  Espera --> A : ir ${guardaA}
  Espera --> B : ir ${guardaB}
  A --> [*]
  B --> [*]`;
    const r = await juzgar(d, { tipo: 'transiciones-deterministas' }, 'estados');
    expect(r.paso, r.detalle).toBe(true);
  });

  it('la misma guarda escrita con otros espacios sigue siendo ambigua', async () => {
    // El contrapunto: si comparar guardas se volviera tan laxo que nunca
    // coincidieran, la comprobación dejaría de comprobar nada.
    const d = `stateDiagram-v2
  [*] --> Espera
  Espera --> A : ir [activo]
  Espera --> B : ir [ activo ]
  A --> [*]
  B --> [*]`;
    const r = await juzgar(d, { tipo: 'transiciones-deterministas' }, 'estados');
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('Espera');
  });

  it('detecta el no determinismo por disparador repetido', async () => {
    const ambiguo = `stateDiagram-v2
  [*] --> A
  A --> B: pulsar
  A --> C: pulsar
  B --> [*]
  C --> [*]`;
    expect((await juzgar(ambiguo, { tipo: 'transiciones-deterministas' }, 'estados')).paso).toBe(false);
  });

  it('exige el estado inicial', async () => {
    const sinInicio = 'stateDiagram-v2\n  A --> B: ir';
    expect((await juzgar(sinInicio, { tipo: 'tiene-estado-inicial' }, 'estados')).paso).toBe(false);
  });
});

describe('cruzadas: coherencia con el diagrama de clases dado', () => {
  it('acepta los mensajes que sí son operaciones declaradas', async () => {
    const sec = `sequenceDiagram
  participant VM as ViewModel
  participant R as Repositorio
  VM->>R: obtenerPedidos()
  R-->>VM: lista`;
    const r = await juzgar(sec, {
      tipo: 'mensaje-existe-como-operacion', parametros: { contexto: 'clases' },
    }, 'secuencia', CONTEXTO_CLASES);
    expect(r.paso, r.detalle).toBe(true);
  });

  it('detecta el mensaje dirigido a una operación que no existe', async () => {
    const sec = `sequenceDiagram
  participant VM as ViewModel
  participant R as Repositorio
  VM->>R: borrarTodo()`;
    const r = await juzgar(sec, {
      tipo: 'mensaje-existe-como-operacion', parametros: { contexto: 'clases' },
    }, 'secuencia', CONTEXTO_CLASES);
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('borrarTodo');
    expect(r.detalle).toContain('obtenerPedidos');
  });

  it('detecta la línea de vida que no corresponde a ninguna clase', async () => {
    const sec = `sequenceDiagram
  participant VM as ViewModel
  participant Cache as Cache
  VM->>Cache: leer()`;
    const r = await juzgar(sec, {
      tipo: 'participante-existe-como-clase', parametros: { contexto: 'clases' },
    }, 'secuencia', CONTEXTO_CLASES);
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('Cache');
  });

  it('detecta el disparador que no es una operación del clasificador', async () => {
    const maquina = `stateDiagram-v2
  [*] --> Quieto
  Quieto --> Activo: cargar
  Activo --> Quieto: inventado
  Activo --> [*]`;
    const r = await juzgar(maquina, {
      tipo: 'disparador-existe-como-operacion',
      parametros: { contexto: 'clases', clasificador: 'ViewModel' },
    }, 'estados', CONTEXTO_CLASES);
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('inventado');
  });

  it('referenciar un contexto inexistente es un defecto de autoría explícito', async () => {
    const r = await juzgar(SECUENCIA, {
      tipo: 'mensaje-existe-como-operacion', parametros: { contexto: 'no-existe' },
    }, 'secuencia', CONTEXTO_CLASES);
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('no-existe');
  });
});

describe('informe global', () => {
  it('el error de sintaxis corta la evaluación y no juzga aserciones', async () => {
    const r = await evaluarDiagrama({
      motor: 'mermaid', tipoDiagrama: 'secuencia', codigo: 'sequenceDiagram\n  A ->>>>> B: mal',
      aserciones: [{ tipo: 'lineas-vida-nombradas' }],
    });
    expect(r.veredicto).toBe('error_sintaxis');
    expect(r.errorSintaxis).toMatch(/line/i);
    expect(r.aserciones).toHaveLength(0);
  });

  it('una aserción oculta que falla no revela NADA de lo que exige', async () => {
    // Ni el detalle ni el rótulo. `describir()` redacta los parámetros en
    // prosa, así que enseñar el rótulo entregaba la solución igual de bien: con
    // un envío vacío se enumeraba el ejercicio entero.
    const r = await evaluarDiagrama({
      motor: 'mermaid', tipoDiagrama: 'clases', codigo: 'classDiagram\n  class Vacio',
      aserciones: [{
        tipo: 'clase-tiene-atributo', oculta: true,
        parametros: { clase: 'Pedido', atributo: 'folio', tipo: 'String', visibilidad: '+' },
      }],
    });
    expect(r.aserciones[0].paso).toBe(false);
    expect(r.aserciones[0].detalle).toBeUndefined();
    expect(r.aserciones[0].comprobacion).toBe('Comprobación oculta');
    // Ningún parámetro del ejercicio puede aparecer en la respuesta.
    const respuesta = JSON.stringify(r);
    for (const filtrado of ['Pedido', 'folio', 'String']) {
      expect(respuesta).not.toContain(filtrado);
    }
  });

  it('las visibles sí dicen qué se revisó', async () => {
    const r = await evaluarDiagrama({
      motor: 'mermaid', tipoDiagrama: 'clases', codigo: 'classDiagram\n  class Cosa',
      aserciones: [{ tipo: 'sin-nombres-vagos' }],
    });
    expect(r.aserciones[0].comprobacion).toContain('nombres');
  });

  it('el veredicto es aceptado solo si pasan todas', async () => {
    const r = await evaluarDiagrama({
      motor: 'mermaid', tipoDiagrama: 'clases', codigo: CLASES,
      aserciones: [{ tipo: 'clases-con-contenido' }, { tipo: 'sin-nombres-vagos' }],
    });
    expect(r.veredicto).toBe('aceptado');
    expect(r.asercionesPasadas).toBe(2);
  });

  it('una comprobación desconocida falla en vez de darse por buena', async () => {
    const r = await evaluarDiagrama({
      motor: 'mermaid', tipoDiagrama: 'clases', codigo: CLASES,
      aserciones: [{ tipo: 'no-existe-esta' }],
    });
    expect(r.veredicto).toBe('aserciones_fallidas');
    expect(r.aserciones[0].detalle).toContain('no conoce');
  });

  it('un diagrama de contexto inválido estalla como defecto del ejercicio, no del alumno', async () => {
    await expect(evaluarDiagrama({
      motor: 'mermaid', tipoDiagrama: 'secuencia', codigo: SECUENCIA,
      aserciones: [{ tipo: 'lineas-vida-nombradas' }],
      contexto: [{ nombre: 'roto', tipo: 'clases', motor: 'mermaid', codigo: 'classDiagram\n  A <<<<-- B' }],
    })).rejects.toThrow(/contexto «roto»/);
  });
});

describe('descripción automática de la comprobación', () => {
  it('traduce la aserción a una frase legible en español', async () => {
    const r = await evaluarDiagrama({
      motor: 'mermaid', tipoDiagrama: 'clases', codigo: CLASES,
      aserciones: [{
        tipo: 'relacion-entre',
        parametros: { origen: 'Pedido', destino: 'Linea', tipo: 'composicion', cardinalidadDestino: '0..*' },
      }],
    });
    expect(r.aserciones[0].comprobacion)
      .toBe('«Pedido» se relaciona con «Linea» por composición, 0 o más en el extremo «Linea»');
  });

  it('el rótulo del autor manda sobre la descripción automática', async () => {
    const r = await evaluarDiagrama({
      motor: 'mermaid', tipoDiagrama: 'clases', codigo: CLASES,
      aserciones: [{ tipo: 'clases-con-contenido', rotulo: 'Cada concepto declara qué guarda' }],
    });
    expect(r.aserciones[0].comprobacion).toBe('Cada concepto declara qué guarda');
  });
});
