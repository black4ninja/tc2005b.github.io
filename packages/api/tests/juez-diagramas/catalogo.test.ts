/**
 * Catálogo de aserciones: por cada comprobación, un diagrama que la cumple y al
 * menos uno que no.
 *
 * Un catálogo probado solo con diagramas correctos no prueba nada: la aserción
 * que siempre devuelve `true` los pasaría todos. Por eso cada bloque lleva su
 * caso negativo, que es el que demuestra que la comprobación discrimina.
 */
import { describe, it, expect } from 'vitest';
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

  it('una aserción oculta que falla no revela el porqué, pero sí qué se revisó', async () => {
    const r = await evaluarDiagrama({
      motor: 'mermaid', tipoDiagrama: 'clases', codigo: 'classDiagram\n  class Cosa',
      aserciones: [{ tipo: 'sin-nombres-vagos', oculta: true }],
    });
    expect(r.aserciones[0].paso).toBe(false);
    expect(r.aserciones[0].detalle).toBeUndefined();
    expect(r.aserciones[0].comprobacion).toContain('nombres');
  });

  it('el veredicto es aceptado solo si pasan todas', async () => {
    const r = await evaluarDiagrama({
      motor: 'mermaid', tipoDiagrama: 'clases', codigo: CLASES,
      aserciones: [{ tipo: 'clases-con-contenido' }, { tipo: 'sin-nombres-vagos' }],
    });
    expect(r.veredicto).toBe('aceptado');
    expect(r.aserionesPasadas).toBe(2);
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
