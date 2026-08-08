import { describe, expect, it } from 'vitest';
import { evaluarDiagrama, normalizarActividad } from '../../src/services/juez-diagramas/index.js';
import { normalizarPlantuml } from '../../src/services/juez-diagramas/normalizar-plantuml.js';
import type { Asercion, TipoDiagrama } from '../../src/services/juez-diagramas/index.js';

/**
 * Actividad y comunicación: los dos tipos del temario que faltaban con juez.
 *
 * De la actividad importan las DOS cosas que un diagrama de flujo no puede
 * expresar —las calles y el paralelismo—, porque son las que justifican que sea
 * un tipo aparte de `flujo`.
 */

const DEVOLUCION = `@startuml
|Cliente|
start
:Solicitar devolucion;
|Atencion|
if (Procede?) then (si)
  |Almacen|
  :Recibir articulo;
  fork
    :Reponer inventario;
  fork again
    :Emitir reembolso;
  end fork
else (no)
  |Atencion|
  :Rechazar solicitud;
endif
stop
@enduml`;

async function evaluar(tipo: TipoDiagrama, codigo: string, aserciones: Asercion[]) {
  return evaluarDiagrama({ motor: 'plantuml', tipoDiagrama: tipo, codigo, aserciones });
}

describe('actividad: recorrido y aristas', () => {
  const m = normalizarActividad(DEVOLUCION);
  const porNombre = (n: string) => m.nodos.find((x) => x.nombre === n);
  const hayArista = (a: string, b: string) =>
    m.aristas.some((r) => r.origen === porNombre(a)?.id && r.destino === porNombre(b)?.id);

  it('encadena las acciones en el orden en que se escriben', () => {
    expect(hayArista('inicio', 'Solicitar devolucion')).toBe(true);
    expect(hayArista('Solicitar devolucion', 'Procede?')).toBe(true);
  });

  it('etiqueta las salidas de la decisión con sus guardas', () => {
    const decision = porNombre('Procede?')!;
    const salidas = m.aristas.filter((r) => r.origen === decision.id);
    expect(salidas.map((r) => r.etiqueta).sort()).toEqual(['no', 'si']);
  });

  it('vuelve a juntar las dos ramas del if en el mismo nodo', () => {
    // Es la propiedad que hace correcto el modelo de «pendientes»: sin ella, la
    // rama del `else` quedaría colgando y `nodos-alcanzables` mentiría.
    const fin = porNombre('fin')!;
    const entradas = m.aristas.filter((r) => r.destino === fin.id);
    expect(entradas.length).toBe(2);
  });

  it('crea el fork y su join, con las dos ramas paralelas entre medias', () => {
    expect(porNombre('bifurcación')!.papel).toBe('fork');
    const union = porNombre('unión')!;
    expect(union.papel).toBe('join');
    expect(hayArista('Reponer inventario', 'unión')).toBe(true);
    expect(hayArista('Emitir reembolso', 'unión')).toBe(true);
  });

  it('asigna cada acción a la calle vigente', () => {
    const calle = (accion: string) =>
      m.nodos.find((x) => x.id === porNombre(accion)?.contenedor)?.nombre;
    expect(calle('Solicitar devolucion')).toBe('Cliente');
    expect(calle('Recibir articulo')).toBe('Almacen');
    expect(calle('Rechazar solicitud')).toBe('Atencion');
  });

  it('cierra el bucle del while sobre su propia condición', () => {
    const bucle = normalizarActividad(
      `@startuml
start
while (Quedan pedidos?) is (si)
  :Procesar pedido;
endwhile
stop
@enduml`,
    );
    const cond = bucle.nodos.find((x) => x.nombre === 'Quedan pedidos?')!;
    const paso = bucle.nodos.find((x) => x.nombre === 'Procesar pedido')!;
    expect(bucle.aristas.some((r) => r.origen === paso.id && r.destino === cond.id)).toBe(true);
  });

  it('rotula la rama implícita del elseif y la salida del while', async () => {
    // `decisiones-con-salidas` exige que TODA salida de una decisión vaya
    // rotulada. Sin respaldo, la rama que PlantUML dibuja sin texto suspendía un
    // diagrama correcto por una arista que el alumno no escribió.
    const conElseif = `@startuml
start
if (A?) then (si)
  :Uno;
elseif (B?) then (si)
  :Dos;
else (no)
  :Tres;
endif
stop
@enduml`;
    const r = await evaluar('actividad', conElseif, [{ tipo: 'decisiones-con-salidas' }]);
    expect(r.veredicto).toBe('aceptado');

    const bucle = `@startuml
start
while (Quedan?) is (si)
  :Procesar;
endwhile (no)
stop
@enduml`;
    const r2 = await evaluar('actividad', bucle, [{ tipo: 'decisiones-con-salidas' }]);
    expect(r2.veredicto).toBe('aceptado');
    const m2 = normalizarActividad(bucle);
    const cond = m2.nodos.find((x) => x.nombre === 'Quedan?')!;
    expect(
      m2.aristas.filter((x) => x.origen === cond.id).map((x) => x.etiqueta).sort(),
    ).toEqual(['no', 'si']);
  });

  it('lee una acción repartida en varias líneas', () => {
    const m2 = normalizarActividad(
      '@startuml\nstart\n:Registrar la\n devolucion completa;\nstop\n@enduml',
    );
    expect(m2.nodos.some((x) => x.nombre === 'Registrar la devolucion completa')).toBe(true);
  });
});

describe('actividad: errores de sintaxis con su línea', () => {
  it.each([
    ['@startuml\nstart\nendif\nstop\n@enduml', /«endif» sin su «if»/],
    ['@startuml\nstart\nfork again\n@enduml', /«fork again» sin su «fork»/],
    ['@startuml\nstart\nif (x) then (si)\nstop\n@enduml', /falta cerrar el «if»/],
    ['@startuml\n:Sin start;\n@enduml', /no tiene «start»/],
    ['@startuml\nstart\n:Sin cerrar\n@enduml', /falta el «;»/],
  ])('avisa: %#', async (codigo, patron) => {
    const r = await evaluar('actividad', codigo, []);
    expect(r.veredicto).toBe('error_sintaxis');
    expect(r.errorSintaxis).toMatch(patron);
  });
});

describe('actividad: aserciones propias', () => {
  it('comprueba quién hace cada acción', async () => {
    const bien = await evaluar('actividad', DEVOLUCION, [
      { tipo: 'accion-en-calle', parametros: { accion: 'Recibir articulo', calle: 'Almacen' } },
    ]);
    expect(bien.veredicto).toBe('aceptado');

    const mal = await evaluar('actividad', DEVOLUCION, [
      { tipo: 'accion-en-calle', parametros: { accion: 'Recibir articulo', calle: 'Cliente' } },
    ]);
    expect(mal.aserciones[0].detalle).toMatch(/se esperaba en «Cliente»/);
  });

  it('exige que cada bifurcación se vuelva a unir', async () => {
    const bien = await evaluar('actividad', DEVOLUCION, [{ tipo: 'fork-tiene-join' }]);
    expect(bien.veredicto).toBe('aceptado');

    const sinFork = await evaluar(
      'actividad',
      '@startuml\nstart\n:Paso;\nstop\n@enduml',
      [{ tipo: 'fork-tiene-join' }],
    );
    expect(sinFork.aserciones[0].detalle).toMatch(/ninguna bifurcación/);
  });

  it('hereda las aserciones de flujo sin escribir nada', async () => {
    const r = await evaluar('actividad', DEVOLUCION, [
      { tipo: 'nodos-alcanzables' },
      { tipo: 'decisiones-con-salidas' },
      { tipo: 'existe-nodo', parametros: { nombre: 'Emitir reembolso' } },
    ]);
    expect(r.veredicto).toBe('aceptado');
  });
});

describe('comunicación', () => {
  const CODIGO = `@startuml
object Cliente
object Tienda
object Almacen
Cliente -> Tienda : 1: solicitarPedido()
Tienda -> Almacen : 1.2: reservarExistencias()
Tienda -> Almacen : 1.10: confirmar()
Almacen -> Tienda : 1.9: consultarStock()
@enduml`;

  it('ordena los mensajes por su NUMERACIÓN, no por el orden de las líneas', () => {
    // En esta vista la secuencia la fija el número; ordenar por el texto haría
    // que mover una línea cambiara el significado del diagrama.
    const m = normalizarPlantuml('comunicacion', CODIGO);
    expect(m.mensajes.map((x) => x.texto)).toEqual([
      'solicitarPedido()',
      'reservarExistencias()',
      'consultarStock()',
      'confirmar()',
    ]);
  });

  it('conserva además los enlaces como aristas', () => {
    // La estructura es lo que esta vista destaca frente a la de secuencia: los
    // mensajes se derivan encima, no en lugar de ella.
    const m = normalizarPlantuml('comunicacion', CODIGO);
    expect(m.aristas.length).toBe(4);
  });

  it('acepta las aserciones de interacción que ya existían', async () => {
    const r = await evaluar('comunicacion', CODIGO, [
      { tipo: 'mensaje-entre', parametros: { de: 'Cliente', a: 'Tienda', texto: 'solicitarPedido' } },
    ]);
    expect(r.veredicto).toBe('aceptado');
  });
});
