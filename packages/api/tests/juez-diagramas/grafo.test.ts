import { describe, expect, it } from 'vitest';
import { evaluarDiagrama, normalizarGrafo } from '../../src/services/juez-diagramas/index.js';
import type { Asercion, ModeloDiagrama, TipoDiagrama } from '../../src/services/juez-diagramas/index.js';

/**
 * Familias «red», «versionado» y «estrategia»: ocho tipos que se reducen a un
 * grafo.
 *
 * Lo que se comprueba, más que cada tipo por separado, es que la reducción
 * FUNCIONE — que los ocho hereden las aserciones que ya existían—, porque es lo
 * que hace baratas a las tres familias.
 */

const nombres = (m: ModeloDiagrama) => m.nodos.map((n) => n.nombre).sort();
const dentroDe = (m: ModeloDiagrama, hijo: string) =>
  m.nodos.find((n) => n.id === m.nodos.find((x) => x.nombre === hijo)?.contenedor)?.nombre;

async function evaluar(tipo: TipoDiagrama, codigo: string, aserciones: Asercion[]) {
  return evaluarDiagrama({ motor: 'mermaid', tipoDiagrama: tipo, codigo, aserciones });
}

describe('familia «red»', () => {
  it('C4: separa personas de sistemas y respeta las fronteras', async () => {
    const m = await normalizarGrafo(
      'c4',
      `C4Context
    Person(cli, "Cliente")
    System_Boundary(b1, "Tienda") {
      System(web, "Web")
    }
    Rel(cli, web, "usa")`,
    );
    expect(m.nodos.find((n) => n.nombre === 'Cliente')!.clase).toBe('actor');
    expect(m.nodos.find((n) => n.nombre === 'Tienda')!.clase).toBe('paquete');
    expect(dentroDe(m, 'Web')).toBe('Tienda');
    expect(m.aristas[0].etiqueta).toBe('usa');
  });

  it('arquitectura en la nube: el servicio cuelga de su grupo', async () => {
    const m = await normalizarGrafo(
      'arquitectura-nube',
      `architecture-beta
    group nube(cloud)[Nube]
    service api(server)[API] in nube
    service bd(database)[BD] in nube
    api:R -- L:bd`,
    );
    expect(dentroDe(m, 'API')).toBe('Nube');
    expect(m.aristas).toHaveLength(1);
  });

  it('bloques: cajas y conexiones', async () => {
    const m = await normalizarGrafo('bloques', 'block-beta\n columns 2\n A["Uno"] B["Dos"]\n A --> B');
    expect(nombres(m)).toEqual(['Dos', 'Uno']);
    expect(m.aristas).toHaveLength(1);
  });

  it('paquete de red: campos con su rango de bits y sin conexiones', async () => {
    const m = await normalizarGrafo('paquete-red', 'packet-beta\n 0-15: "Origen"\n 16-31: "Destino"');
    expect(nombres(m)).toEqual(['Destino', 'Origen']);
    // Una tira de campos no tiene conexiones; inventarlas sería mentir.
    expect(m.aristas).toEqual([]);
    expect(m.nodos[0].atributos.find((a) => a.nombre === 'bits')?.valor).toBe('16');
  });
});

describe('familia «versionado»', () => {
  const GIT = `gitGraph
    commit id: "uno"
    branch dev
    commit id: "dos"
    checkout main
    merge dev`;

  it('cuelga cada commit de su rama y encadena la historia', async () => {
    const m = await normalizarGrafo('git', GIT);
    expect(dentroDe(m, 'dos')).toBe('dev');
    // La arista va del padre al hijo: es el sentido en que avanza la historia.
    const uno = m.nodos.find((n) => n.nombre === 'uno')!;
    expect(m.aristas.some((a) => a.origen === uno.id)).toBe(true);
  });

  it('anota la fusión, que es lo que distingue una historia con ramas', async () => {
    const m = await normalizarGrafo('git', GIT);
    expect(m.nodos.some((n) => n.anotaciones.includes('fusion'))).toBe(true);
  });
});

describe('familia «estrategia»', () => {
  it('requisitos: la trazabilidad va en la etiqueta', async () => {
    const m = await normalizarGrafo(
      'requisitos',
      `requirementDiagram
    requirement disponibilidad {
      id: "RF-01"
      text: "Responde rapido"
      risk: medium
      verifymethod: test
    }
    element servicio {
      type: "componente"
    }
    servicio - satisfies -> disponibilidad`,
    );
    // Distingue «satisface» de «verifica» o «deriva», que es de lo que trata
    // esta vista.
    expect(m.aristas[0].etiqueta).toBe('satisfies');
    expect(m.nodos.find((n) => n.nombre === 'disponibilidad')!.atributos.map((a) => a.nombre))
      .toContain('id');
  });

  it('wardley: la posición es el contenido del mapa', async () => {
    const m = await normalizarGrafo(
      'wardley',
      'wardley-beta\n title T\n component Cliente [0.9, 0.6]\n component BD [0.4, 0.8]\n Cliente -> BD',
    );
    const cliente = m.nodos.find((n) => n.nombre === 'Cliente')!;
    // Sin evolución y visibilidad, un mapa de Wardley no dice nada.
    expect(cliente.atributos.map((a) => a.nombre).sort()).toEqual(['evolucion', 'visibilidad']);
    expect(m.aristas).toHaveLength(1);
  });

  it('cynefin: los asuntos cuelgan de su dominio', async () => {
    const m = await normalizarGrafo(
      'cynefin',
      'cynefin-beta\n title T\n clear\n  "Alta de campo"\n complex\n  "Rediseno del pago"',
    );
    expect(dentroDe(m, 'Alta de campo')).toBe('clear');
    expect(dentroDe(m, 'Rediseno del pago')).toBe('complex');
  });

  it('cynefin: no funde el mismo asunto clasificado en dos dominios', async () => {
    // Clasificar dos veces es un uso legítimo; con id por etiqueta los dos se
    // fundirían en un nodo con dos contenedores.
    const m = await normalizarGrafo(
      'cynefin',
      'cynefin-beta\n clear\n  "Migracion"\n complicated\n  "Migracion"',
    );
    expect(m.nodos.filter((n) => n.nombre === 'Migracion')).toHaveLength(2);
    expect(new Set(m.nodos.map((n) => n.id)).size).toBe(m.nodos.length);
  });
});

describe('hereda las aserciones que ya existían', () => {
  it('acepta existe-nodo, relacion-entre y contenido-en-paquete sin escribir nada', async () => {
    const r = await evaluar(
      'arquitectura-nube',
      `architecture-beta
    group nube(cloud)[Nube]
    service api(server)[API] in nube
    service bd(database)[BD] in nube
    api:R -- L:bd`,
      [
        { tipo: 'existe-nodo', parametros: { nombre: 'API' } },
        { tipo: 'relacion-entre', parametros: { origen: 'API', destino: 'BD', tipo: 'asociacion' } },
        { tipo: 'contenido-en-paquete', parametros: { elemento: 'API', paquete: 'Nube' } },
        { tipo: 'conteo-nodos', parametros: { min: 3 } },
      ],
    );
    expect(r.veredicto).toBe('aceptado');
  });
});

describe('robustez', () => {
  it('da error de SINTAXIS, no de programación, ante un diagrama mal escrito', async () => {
    const r = await evaluar('c4', 'C4Context\n Person(sin cerrar', []);
    expect(r.veredicto).toBe('error_sintaxis');
  });

  it('descarta una arista hacia un elemento que no se declaró', async () => {
    // C4 dibuja igual un `Rel(...)` con un alias inexistente; dejar la arista
    // rompería los recorridos del catálogo.
    const m = await normalizarGrafo('c4', 'C4Context\n Person(cli, "Cliente")\n Rel(cli, fantasma, "usa")');
    expect(m.aristas).toEqual([]);
  });
});
