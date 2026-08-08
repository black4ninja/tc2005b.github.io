import { describe, expect, it } from 'vitest';
import { normalizarPlantuml } from '../../src/services/juez-diagramas/normalizar-plantuml.js';
import { normalizarMermaid } from '../../src/services/juez-diagramas/normalizar-mermaid.js';
import type { Arista, ModeloDiagrama } from '../../src/services/juez-diagramas/index.js';

/**
 * Clases y entidad-relación en PlantUML.
 *
 * La prueba que más importa es la de PARIDAD: el mismo modelo escrito en los dos
 * motores tiene que producir el mismo `ModeloDiagrama`. Si no, un ejercicio
 * aceptaría una escritura y rechazaría la otra, que es justo lo que este trabajo
 * viene a evitar.
 */

/** Aristas comparables: sin ids internos, ordenadas para no depender del orden. */
function aristas(m: ModeloDiagrama): string[] {
  return m.aristas
    .map((a: Arista) =>
      [a.origen, a.tipo, a.destino, a.cardinalidadOrigen ?? '', a.cardinalidadDestino ?? '']
        .join('|'),
    )
    .sort();
}

function nodo(m: ModeloDiagrama, id: string) {
  return m.nodos.find((x) => x.id === id || x.nombre === id);
}

describe('clases en PlantUML — relaciones', () => {
  const modelo = normalizarPlantuml(
    'clases',
    `@startuml
Pedido "1" *-- "0..*" Linea : contiene
Equipo o-- Persona
PedidoExpress --|> Pedido
Repositorio <|.. PedidoHttp
Servicio ..> Repositorio
Cliente "1" --> "*" Pedido : realiza
@enduml`,
  );

  it('distingue las seis relaciones por su adorno', () => {
    expect(aristas(modelo)).toEqual(
      [
        'Pedido|composicion|Linea|1|0..*',
        'Equipo|agregacion|Persona||',
        'PedidoExpress|herencia|Pedido||',
        'PedidoHttp|implementacion|Repositorio||',
        'Servicio|dependencia|Repositorio||',
        'Cliente|asociacion|Pedido|1|*',
      ].sort(),
    );
  });

  it('normaliza la dirección por SIGNIFICADO, no por cómo se dibujó', () => {
    // `<|--` y `--|>` son la misma herencia leída al revés; las dos tienen que
    // salir como hijo → padre, o cada aserción tendría que saber la convención.
    const a = normalizarPlantuml('clases', '@startuml\nPedido <|-- PedidoExpress\n@enduml');
    const b = normalizarPlantuml('clases', '@startuml\nPedidoExpress --|> Pedido\n@enduml');
    expect(aristas(a)).toEqual(aristas(b));
    expect(aristas(a)).toEqual(['PedidoExpress|herencia|Pedido||']);
  });

  it('pone el rombo del lado del TODO también cuando se escribe a la derecha', () => {
    const a = normalizarPlantuml('clases', '@startuml\nCarrito *-- Linea\n@enduml');
    const b = normalizarPlantuml('clases', '@startuml\nLinea --* Carrito\n@enduml');
    expect(aristas(a)).toEqual(aristas(b));
    expect(aristas(a)).toEqual(['Carrito|composicion|Linea||']);
  });

  it('separa dependencia de asociación por la línea punteada', () => {
    const solida = normalizarPlantuml('clases', '@startuml\nA --> B\n@enduml');
    const punteada = normalizarPlantuml('clases', '@startuml\nA ..> B\n@enduml');
    expect(solida.aristas[0].tipo).toBe('asociacion');
    expect(punteada.aristas[0].tipo).toBe('dependencia');
  });
});

describe('clases en PlantUML — compartimentos', () => {
  const modelo = normalizarPlantuml(
    'clases',
    `@startuml
class Pedido {
  +folio : String
  -total : float
  {static} +contar() : int
  --
  +calcular(iva : float) : Double
}
interface Repositorio {
  +guardar(p : Pedido) : void
}
abstract class Pago {
  +monto : Double
}
enum Estado {
  PENDIENTE
  PAGADO
}
@enduml`,
  );

  it('reparte atributos y operaciones', () => {
    const pedido = nodo(modelo, 'Pedido')!;
    expect(pedido.atributos.map((a) => a.nombre)).toEqual(['folio', 'total']);
    expect(pedido.operaciones.map((o) => o.nombre)).toEqual(['contar', 'calcular']);
  });

  it('conserva tipo, visibilidad y parámetros', () => {
    const pedido = nodo(modelo, 'Pedido')!;
    expect(pedido.atributos[0]).toMatchObject({ nombre: 'folio', tipo: 'String', visibilidad: '+' });
    expect(pedido.atributos[1]).toMatchObject({ nombre: 'total', tipo: 'float', visibilidad: '-' });
    expect(pedido.operaciones[1]).toMatchObject({
      nombre: 'calcular',
      tipo: 'Double',
      parametros: 'iva : float',
    });
  });

  it('descarta los separadores de compartimento en vez de leerlos como miembros', () => {
    expect(nodo(modelo, 'Pedido')!.atributos.map((a) => a.nombre)).not.toContain('--');
  });

  it('lee la interfaz como tal', () => {
    expect(nodo(modelo, 'Repositorio')!.clase).toBe('interfaz');
  });

  it('anota los calificadores en vez de perderlos', () => {
    expect(nodo(modelo, 'Pago')!.anotaciones).toContain('abstract');
    expect(nodo(modelo, 'Estado')!.anotaciones).toContain('enumeration');
    expect(nodo(modelo, 'Estado')!.atributos.map((a) => a.nombre)).toEqual(['PENDIENTE', 'PAGADO']);
  });

  it('avisa si el compartimento se queda sin cerrar', () => {
    expect(() =>
      normalizarPlantuml('clases', '@startuml\nclass Pedido {\n  +folio : String\n@enduml'),
    ).toThrow(/miembros de «Pedido»/);
  });
});

describe('entidad-relación en PlantUML', () => {
  const modelo = normalizarPlantuml(
    'er',
    `@startuml
entity Cliente {
  * id : int
  --
  nombre : varchar
}
entity Pedido {
  * id : int
  --
  fecha : date
}
Cliente ||--o{ Pedido
@enduml`,
  );

  it('traduce la pata de gallo a las cardinalidades normalizadas', () => {
    expect(aristas(modelo)).toEqual(['Cliente|relacion-er|Pedido|1|0..*']);
  });

  it('descarta el asterisco de campo obligatorio del nombre del atributo', () => {
    expect(nodo(modelo, 'Cliente')!.atributos.map((a) => a.nombre)).toEqual(['id', 'nombre']);
    expect(nodo(modelo, 'Cliente')!.atributos[0].tipo).toBe('int');
  });

  it('cubre las cuatro cardinalidades', () => {
    // El pie de gallo se escribe reflejado: «muchos» es `}` a la izquierda y `{`
    // a la derecha, así que `}|` no es un adorno derecho válido.
    const m = normalizarPlantuml(
      'er',
      `@startuml
A |o--|| B
C }o--|{ D
@enduml`,
    );
    expect(aristas(m)).toEqual(
      ['A|relacion-er|B|0..1|1', 'C|relacion-er|D|0..*|1..*'].sort(),
    );
  });

  it('deja mandar a las comillas cuando el autor escribe las dos formas', () => {
    const m = normalizarPlantuml('er', '@startuml\nA "1" ||--o{ "2..5" B\n@enduml');
    expect(aristas(m)).toEqual(['A|relacion-er|B|1|2..5']);
  });
});

describe('paridad entre motores', () => {
  it('produce el mismo modelo de clases desde Mermaid y desde PlantUML', async () => {
    const desdeMermaid = await normalizarMermaid(
      'clases',
      `classDiagram
    class Carrito {
        +String folio
        +total() Double
    }
    class Linea {
        +Int cantidad
    }
    Carrito "1" *-- "0..*" Linea : contiene`,
    );
    const desdePlantuml = normalizarPlantuml(
      'clases',
      `@startuml
class Carrito {
  +folio : String
  +total() : Double
}
class Linea {
  +cantidad : Int
}
Carrito "1" *-- "0..*" Linea : contiene
@enduml`,
    );

    expect(aristas(desdePlantuml)).toEqual(aristas(desdeMermaid));

    for (const id of ['Carrito', 'Linea']) {
      const m = nodo(desdeMermaid, id)!;
      const p = nodo(desdePlantuml, id)!;
      expect(p.clase, id).toBe(m.clase);
      expect(p.atributos.map((a) => a.nombre), id).toEqual(m.atributos.map((a) => a.nombre));
      expect(p.operaciones.map((o) => o.nombre), id).toEqual(m.operaciones.map((o) => o.nombre));
    }
  });

  it('produce el mismo modelo ER desde Mermaid y desde PlantUML', async () => {
    const desdeMermaid = await normalizarMermaid(
      'er',
      `erDiagram
    CLIENTE ||--o{ PEDIDO : realiza
    CLIENTE {
        int id
        string nombre
    }`,
    );
    const desdePlantuml = normalizarPlantuml(
      'er',
      `@startuml
entity CLIENTE {
  id : int
  nombre : string
}
entity PEDIDO
CLIENTE ||--o{ PEDIDO : realiza
@enduml`,
    );

    expect(aristas(desdePlantuml)).toEqual(aristas(desdeMermaid));
    expect(nodo(desdePlantuml, 'CLIENTE')!.atributos.map((a) => a.nombre)).toEqual(
      nodo(desdeMermaid, 'CLIENTE')!.atributos.map((a) => a.nombre),
    );
  });
});

describe('no se rompe lo que ya funcionaba', () => {
  it('deja los casos de uso como estaban', () => {
    const m = normalizarPlantuml(
      'casos-de-uso',
      `@startuml
actor Cliente
rectangle Tienda {
  usecase "Reservar sala" as UC1
}
Cliente --> UC1
@enduml`,
    );
    // Con punta sigue siendo dependencia en este tipo: el cambio de semántica
    // es solo para clases.
    expect(m.aristas[0].tipo).toBe('dependencia');
    expect(nodo(m, 'UC1')!.clase).toBe('caso-de-uso');
  });

  it('deja los paquetes como contenedores, no como compartimentos', () => {
    const m = normalizarPlantuml(
      'paquetes',
      `@startuml
package dominio {
  component Pedido
}
package datos {
}
dominio ..> datos
@enduml`,
    );
    expect(nodo(m, 'Pedido')!.contenedor).toBe('dominio');
  });
});
