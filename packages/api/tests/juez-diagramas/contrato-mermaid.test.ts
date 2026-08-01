/**
 * TEST-ALAMBRE de la frontera con Mermaid.
 *
 * El `db` interno de Mermaid no es API pública contractual: entrega enteros sin
 * nombre para el tipo de mensaje y para el tipo de relación, y podría cambiarlos
 * en cualquier versión menor. Este fichero repite el experimento con el que se
 * construyó la tabla de `codigos-mermaid.ts` y falla si el contrato se mueve.
 *
 * Si esto se pone rojo tras actualizar Mermaid, lo que hay que revisar es
 * `codigos-mermaid.ts`, y NADA del catálogo de aserciones: esa es exactamente la
 * propiedad que la frontera compra.
 */
import { describe, it, expect } from 'vitest';
import { normalizarMermaid } from '../../src/services/juez-diagramas/normalizar-mermaid.js';
import { ErrorSintaxisDiagrama } from '../../src/services/juez-diagramas/tipos.js';

describe('secuencia: cada forma de flecha conserva su semántica UML', () => {
  const casos: Array<[string, string]> = [
    ['->>', 'sincrono'],
    ['-->>', 'retorno'],
    ['-)', 'asincrono'],
    ['--)', 'asincrono'],
    ['-x', 'destruccion'],
  ];

  for (const [flecha, esperado] of casos) {
    it(`${flecha} es ${esperado}`, async () => {
      const m = await normalizarMermaid('secuencia', `sequenceDiagram\n  A${flecha}B: mensaje`);
      expect(m.mensajes).toHaveLength(1);
      expect(m.mensajes[0].tipo).toBe(esperado);
      expect(m.mensajes[0].de).toBe('A');
      expect(m.mensajes[0].a).toBe('B');
    });
  }

  it('activate y deactivate se distinguen de los mensajes', async () => {
    const m = await normalizarMermaid(
      'secuencia',
      'sequenceDiagram\n  A->>B: ir\n  activate B\n  deactivate B',
    );
    expect(m.mensajes.map((x) => x.tipo)).toEqual(['sincrono', 'activacion', 'desactivacion']);
  });

  it('el alias del participante llega como nombre visible', async () => {
    const m = await normalizarMermaid(
      'secuencia',
      'sequenceDiagram\n  participant VM as ViewModel\n  VM->>R: cargar()',
    );
    const vm = m.nodos.find((n) => n.id === 'VM');
    expect(vm?.nombre).toBe('ViewModel');
  });
});

describe('clases: la dirección de cada relación queda normalizada por significado', () => {
  it('la herencia va del hijo al padre, aunque Mermaid marque el extremo del padre', async () => {
    const m = await normalizarMermaid('clases', 'classDiagram\n  Pedido <|-- PedidoExpress');
    expect(m.aristas).toHaveLength(1);
    expect(m.aristas[0]).toMatchObject({
      origen: 'PedidoExpress', destino: 'Pedido', tipo: 'herencia',
    });
  });

  it('la implementación se distingue de la herencia por la línea discontinua', async () => {
    const m = await normalizarMermaid('clases', 'classDiagram\n  RepoHttp ..|> Repositorio');
    expect(m.aristas[0]).toMatchObject({
      origen: 'RepoHttp', destino: 'Repositorio', tipo: 'implementacion',
    });
  });

  it('en composición el origen es el todo, y las cardinalidades no se cruzan', async () => {
    const m = await normalizarMermaid(
      'clases',
      'classDiagram\n  Pedido "1" *-- "0..*" Linea : contiene',
    );
    expect(m.aristas[0]).toMatchObject({
      origen: 'Pedido', destino: 'Linea', tipo: 'composicion',
      cardinalidadOrigen: '1', cardinalidadDestino: '0..*', etiqueta: 'contiene',
    });
  });

  it('la agregación no se confunde con la composición', async () => {
    const m = await normalizarMermaid('clases', 'classDiagram\n  Equipo o-- Persona');
    expect(m.aristas[0].tipo).toBe('agregacion');
  });

  it('la dependencia apunta a aquello de lo que se depende', async () => {
    const m = await normalizarMermaid('clases', 'classDiagram\n  Vista ..> Formateador');
    expect(m.aristas[0]).toMatchObject({
      origen: 'Vista', destino: 'Formateador', tipo: 'dependencia',
    });
  });

  it('separa el tipo del nombre en atributos y lee visibilidad y retorno', async () => {
    const m = await normalizarMermaid(
      'clases',
      'classDiagram\n  class Item {\n    -String id\n    +total() Double\n  }',
    );
    const item = m.nodos[0];
    expect(item.atributos[0]).toMatchObject({ nombre: 'id', tipo: 'String', visibilidad: '-' });
    expect(item.operaciones[0]).toMatchObject({ nombre: 'total', tipo: 'Double', visibilidad: '+' });
  });

  it('traduce los genéricos de la sintaxis de Mermaid a la de UML', async () => {
    const m = await normalizarMermaid(
      'clases',
      'classDiagram\n  class Repo {\n    +obtener() List~Item~\n  }',
    );
    expect(m.nodos[0].operaciones[0].tipo).toBe('List<Item>');
  });

  it('una clase anotada como interfaz se clasifica como interfaz', async () => {
    const m = await normalizarMermaid(
      'clases',
      'classDiagram\n  class Repo {\n    <<interface>>\n    +obtener() Item\n  }',
    );
    expect(m.nodos[0].clase).toBe('interfaz');
  });
});

describe('estados: los ids que Mermaid inventa para [*] se traducen a pseudoestados', () => {
  it('marca inicial y final, y conserva la etiqueta de la transición', async () => {
    const m = await normalizarMermaid(
      'estados',
      'stateDiagram-v2\n  [*] --> Cargando\n  Cargando --> Listo: exito\n  Listo --> [*]',
    );
    const papeles = m.nodos.map((n) => `${n.clase}:${n.papel ?? '-'}`);
    expect(papeles).toContain('pseudoestado:inicial');
    expect(papeles).toContain('pseudoestado:final');
    expect(m.nodos.filter((n) => n.clase === 'estado').map((n) => n.nombre).sort())
      .toEqual(['Cargando', 'Listo']);
    expect(m.aristas.find((a) => a.destino === 'Listo')?.etiqueta).toBe('exito');
  });
});

describe('sintaxis inválida', () => {
  it('se reporta como error de sintaxis con la línea, no como excepción cruda', async () => {
    await expect(normalizarMermaid('secuencia', 'sequenceDiagram\n  A ->>>>> B: mal'))
      .rejects.toThrow(ErrorSintaxisDiagrama);
  });
});
