import { describe, expect, it } from 'vitest';
import { evaluarDiagrama } from '../../src/services/juez-diagramas/index.js';
import { normalizarPlantuml } from '../../src/services/juez-diagramas/normalizar-plantuml.js';
import type { Asercion } from '../../src/services/juez-diagramas/index.js';

/**
 * Objetos y despliegue: los dos tipos UML estructurales que faltaban.
 *
 * Lo que más se comprueba aquí es la verificación CRUZADA, que es donde estos
 * dos aportan algo que ningún otro tipo puede: un objeto que no es instancia de
 * ninguna clase declarada, y un artefacto desplegado que nadie diseñó.
 */

const OBJETOS = `@startuml
object "ana : Cliente" as ana {
  nombre = "Ana Ruiz"
  correo = "ana@ejemplo.mx"
}
object "p1024 : Pedido" as p1024 {
  folio = "P-1024"
}
ana --> p1024 : realiza
@enduml`;

const CLASES_CONTEXTO = `@startuml
class Cliente {
  +nombre : String
}
class Pedido {
  +folio : String
}
Cliente "1" --> "*" Pedido
@enduml`;

const DESPLIEGUE = `@startuml
node "Servidor de aplicaciones" as srv {
  artifact "servicio-pedidos.jar" as jar
}
node "Equipo del cliente" as pc {
  artifact "Aplicacion movil" as app
}
app --> jar : HTTPS
@enduml`;

async function evaluar(
  tipoDiagrama: 'objeto' | 'despliegue',
  codigo: string,
  aserciones: Asercion[],
  contexto?: { nombre: string; tipo: 'clases' | 'componentes'; codigo: string },
) {
  return evaluarDiagrama({
    motor: 'plantuml',
    tipoDiagrama,
    codigo,
    aserciones,
    contexto: contexto
      ? [{ nombre: contexto.nombre, tipo: contexto.tipo, motor: 'plantuml', codigo: contexto.codigo }]
      : undefined,
  });
}

describe('diagrama de objetos', () => {
  it('lee las ranuras con su valor', () => {
    const m = normalizarPlantuml('objeto', OBJETOS);
    const ana = m.nodos.find((n) => n.id === 'ana')!;
    expect(ana.clase).toBe('objeto');
    expect(ana.atributos).toEqual([
      { nombre: 'nombre', valor: 'Ana Ruiz' },
      { nombre: 'correo', valor: 'ana@ejemplo.mx' },
    ]);
  });

  it('comprueba el valor de una ranura', async () => {
    const bien = await evaluar('objeto', OBJETOS, [
      { tipo: 'objeto-tiene-valor', parametros: { objeto: 'ana : Cliente', ranura: 'nombre', valor: 'Ana Ruiz' } },
    ]);
    expect(bien.veredicto).toBe('aceptado');

    const mal = await evaluar('objeto', OBJETOS, [
      { tipo: 'objeto-tiene-valor', parametros: { objeto: 'ana : Cliente', ranura: 'nombre', valor: 'Otra' } },
    ]);
    expect(mal.veredicto).toBe('aserciones_fallidas');
    expect(mal.aserciones[0].detalle).toMatch(/vale «Ana Ruiz»/);
  });

  it('exige un valor: una ranura vacía no modela una instancia concreta', async () => {
    const r = await evaluar(
      'objeto',
      '@startuml\nobject "ana : Cliente" as ana {\n  nombre\n}\n@enduml',
      [{ tipo: 'objeto-tiene-valor', parametros: { objeto: 'ana', ranura: 'nombre', valor: 'Ana' } }],
    );
    expect(r.aserciones[0].detalle).toMatch(/no tiene ningún valor/);
  });

  it('acepta el enlace escrito en cualquier sentido', async () => {
    // Un enlace es la instancia de una asociación y no tiene dirección
    // semántica: exigir un sentido suspendería un diagrama correcto.
    for (const params of [
      { origen: 'ana : Cliente', destino: 'p1024 : Pedido' },
      { origen: 'p1024 : Pedido', destino: 'ana : Cliente' },
    ]) {
      const r = await evaluar('objeto', OBJETOS, [{ tipo: 'enlace-entre-objetos', parametros: params }]);
      expect(r.veredicto, JSON.stringify(params)).toBe('aceptado');
    }
  });

  it('cruza cada objeto contra el diagrama de clases', async () => {
    const bien = await evaluar(
      'objeto',
      OBJETOS,
      [{ tipo: 'objeto-es-instancia-de', parametros: { contexto: 'clases' } }],
      { nombre: 'clases', tipo: 'clases', codigo: CLASES_CONTEXTO },
    );
    expect(bien.veredicto).toBe('aceptado');
  });

  it('detecta el objeto que no es instancia de ninguna clase declarada', async () => {
    const mal = await evaluar(
      'objeto',
      `@startuml
object "x : Inventado" as x
@enduml`,
      [{ tipo: 'objeto-es-instancia-de', parametros: { contexto: 'clases' } }],
      { nombre: 'clases', tipo: 'clases', codigo: CLASES_CONTEXTO },
    );
    expect(mal.veredicto).toBe('aserciones_fallidas');
    expect(mal.aserciones[0].detalle).toMatch(/x : Inventado/);
  });
});

describe('diagrama de despliegue', () => {
  it('distingue nodos físicos de artefactos y los anida', () => {
    const m = normalizarPlantuml('despliegue', DESPLIEGUE);
    expect(m.nodos.find((n) => n.id === 'srv')!.clase).toBe('nodo-fisico');
    const jar = m.nodos.find((n) => n.id === 'jar')!;
    expect(jar.clase).toBe('artefacto');
    expect(jar.contenedor).toBe('srv');
  });

  it('comprueba dónde está desplegado un artefacto', async () => {
    const bien = await evaluar('despliegue', DESPLIEGUE, [
      { tipo: 'artefacto-desplegado-en', parametros: { artefacto: 'servicio-pedidos.jar', nodo: 'Servidor de aplicaciones' } },
    ]);
    expect(bien.veredicto).toBe('aceptado');

    const mal = await evaluar('despliegue', DESPLIEGUE, [
      { tipo: 'artefacto-desplegado-en', parametros: { artefacto: 'servicio-pedidos.jar', nodo: 'Equipo del cliente' } },
    ]);
    expect(mal.veredicto).toBe('aserciones_fallidas');
  });

  it('un artefacto suelto no está desplegado, aunque tenga flechas', async () => {
    const r = await evaluar(
      'despliegue',
      `@startuml
node "Servidor" as srv
artifact "suelto.jar" as suelto
suelto --> srv
@enduml`,
      [{ tipo: 'artefacto-desplegado-en', parametros: { artefacto: 'suelto.jar', nodo: 'Servidor' } }],
    );
    expect(r.aserciones[0].detalle).toMatch(/no está dentro de ningún nodo/);
  });

  it('cruza los artefactos contra el diagrama de componentes', async () => {
    const componentes = `@startuml
component "servicio-pedidos.jar" as S
component "Aplicacion movil" as A
A --> S
@enduml`;
    const bien = await evaluar(
      'despliegue',
      DESPLIEGUE,
      [{ tipo: 'artefacto-corresponde-a-componente', parametros: { contexto: 'componentes' } }],
      { nombre: 'componentes', tipo: 'componentes', codigo: componentes },
    );
    expect(bien.veredicto).toBe('aceptado');

    const mal = await evaluar(
      'despliegue',
      DESPLIEGUE,
      [{ tipo: 'artefacto-corresponde-a-componente', parametros: { contexto: 'componentes' } }],
      { nombre: 'componentes', tipo: 'componentes', codigo: '@startuml\ncomponent "Otra cosa" as O\n@enduml' },
    );
    expect(mal.veredicto).toBe('aserciones_fallidas');
    expect(mal.aserciones[0].detalle).toMatch(/servicio-pedidos\.jar/);
  });
});

describe('no se rompe lo que ya funcionaba', () => {
  it('deja «node» como contenedor genérico fuera de despliegue', () => {
    const m = normalizarPlantuml(
      'paquetes',
      '@startuml\nnode Servidor {\n  component Pedido\n}\n@enduml',
    );
    expect(m.nodos.find((n) => n.id === 'Servidor')!.clase).toBe('paquete');
  });
});
