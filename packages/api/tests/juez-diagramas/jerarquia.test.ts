import { describe, expect, it } from 'vitest';
import { evaluarDiagrama, normalizarJerarquia } from '../../src/services/juez-diagramas/index.js';
import type { Asercion, TipoDiagrama } from '../../src/services/juez-diagramas/index.js';

/**
 * Familia «jerarquía»: cuatro dibujos distintos que se reducen al mismo árbol.
 *
 * Lo que se comprueba aquí, más que cada tipo por separado, es que la reducción
 * FUNCIONE: si los cuatro caen en el mismo `Nodo`/`Arista`, heredan gratis las
 * aserciones que ya existían, que es lo que hace barata a toda la familia.
 */

const MAPA = `mindmap
  root((Plataforma))
    Catalogo
      Busqueda
      Filtros
    Pedidos
      Carrito`;

async function evaluar(tipo: TipoDiagrama, codigo: string, aserciones: Asercion[]) {
  return evaluarDiagrama({ motor: 'mermaid', tipoDiagrama: tipo, codigo, aserciones });
}

describe('normalización a árbol', () => {
  it('cuelga cada nodo de su padre', async () => {
    const m = await normalizarJerarquia('mapa-mental', MAPA);
    const porNombre = (n: string) => m.nodos.find((x) => x.nombre === n)!;
    expect(porNombre('Plataforma').contenedor).toBeUndefined();
    expect(porNombre('Catalogo').contenedor).toBe(porNombre('Plataforma').id);
    expect(porNombre('Busqueda').contenedor).toBe(porNombre('Catalogo').id);
    expect(m.aristas).toHaveLength(m.nodos.length - 1);
  });

  it('no funde dos ramas que repiten la misma etiqueta', async () => {
    // En un mapa mental es normal repetir una palabra en dos ramas. Con ids por
    // etiqueta, las dos se fundirían en un nodo con dos padres, que ya no es un
    // árbol y haría fallar cualquier conteo.
    const m = await normalizarJerarquia(
      'mapa-mental',
      `mindmap
  root((Sistema))
    Catalogo
      Busqueda
    Pedidos
      Busqueda`,
    );
    expect(m.nodos.filter((n) => n.nombre === 'Busqueda')).toHaveLength(2);
    expect(new Set(m.nodos.map((n) => n.id)).size).toBe(m.nodos.length);
  });

  it('descarta la raíz sintética del mapa de árbol y del árbol de ficheros', async () => {
    // Los dos cuelgan todo de un envoltorio (`""`, `"/"`) que el alumno no
    // escribió; meterlo en el modelo desviaría cualquier conteo en uno.
    const treemap = await normalizarJerarquia('treemap', 'treemap-beta\n"Raiz"\n  "A": 10\n  "B": 20');
    expect(treemap.nodos.map((n) => n.nombre)).toEqual(['Raiz', 'A', 'B']);

    const arbol = await normalizarJerarquia('arbol', 'treeView-beta\n  packages\n    api\n    web');
    expect(arbol.nodos.map((n) => n.nombre)).toEqual(['packages', 'api', 'web']);
  });

  it('conserva el valor del mapa de árbol', async () => {
    const m = await normalizarJerarquia('treemap', 'treemap-beta\n"Raiz"\n  "A": 10');
    expect(m.nodos.find((n) => n.nombre === 'A')!.atributos).toEqual([
      { nombre: 'valor', valor: '10' },
    ]);
  });

  it('lee el diagrama de Ishikawa como causas colgando del efecto', async () => {
    const m = await normalizarJerarquia(
      'ishikawa',
      'ishikawa-beta\nEl pedido llega tarde\n  Proceso\n    Validacion manual',
    );
    expect(m.nodos.map((n) => n.nombre)).toEqual([
      'El pedido llega tarde', 'Proceso', 'Validacion manual',
    ]);
  });

  it('da error de SINTAXIS, no de programación, ante un diagrama mal escrito', async () => {
    const r = await evaluar('mapa-mental', 'mindmap\n  ((sin cerrar', []);
    expect(r.veredicto).toBe('error_sintaxis');
  });
});

describe('hereda las aserciones que ya existían', () => {
  it('acepta existe-nodo y conteo-nodos sin haber escrito nada nuevo', async () => {
    const r = await evaluar('mapa-mental', MAPA, [
      { tipo: 'existe-nodo', parametros: { nombre: 'Catalogo' } },
      { tipo: 'conteo-nodos', parametros: { min: 5 } },
      { tipo: 'nodos-alcanzables' },
    ]);
    expect(r.veredicto).toBe('aceptado');
  });
});

describe('aserciones propias de la familia', () => {
  it('exige que la rama cuelgue del padre correcto', async () => {
    const bien = await evaluar('mapa-mental', MAPA, [
      { tipo: 'nodo-tiene-hijo', parametros: { padre: 'Catalogo', hijo: 'Busqueda' } },
    ]);
    expect(bien.veredicto).toBe('aceptado');

    const mal = await evaluar('mapa-mental', MAPA, [
      { tipo: 'nodo-tiene-hijo', parametros: { padre: 'Pedidos', hijo: 'Busqueda' } },
    ]);
    expect(mal.veredicto).toBe('aserciones_fallidas');
    expect(mal.aserciones[0].detalle).toMatch(/Cuelgan de él/);
  });

  it('suspende la lista disfrazada de jerarquía', async () => {
    // Un nivel de ramas y ninguna subrama: el error dominante al hacer un mapa
    // mental. Sin esta comprobación pasaría cualquier conteo.
    const lista = `mindmap
  root((Plataforma))
    Catalogo
    Pedidos
    Cuentas`;
    const r = await evaluar('mapa-mental', lista, [
      { tipo: 'profundidad-minima', parametros: { niveles: 3 } },
    ]);
    expect(r.veredicto).toBe('aserciones_fallidas');
    expect(r.aserciones[0].detalle).toMatch(/2 nivel\(es\)/);

    const conRamas = await evaluar('mapa-mental', MAPA, [
      { tipo: 'profundidad-minima', parametros: { niveles: 3 } },
    ]);
    expect(conRamas.veredicto).toBe('aceptado');
  });
});
