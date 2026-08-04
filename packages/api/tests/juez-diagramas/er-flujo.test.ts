/**
 * Entidad-relación y flujo: la frontera con Mermaid y sus comprobaciones.
 *
 * Dos formas de la API interna de Mermaid justifican por sí solas este fichero:
 * en ER las entidades se identifican como `entity-NOMBRE-N`, y las cardinalidades
 * de `relSpec` vienen CRUZADAS respecto a los nombres —`cardA` es la del extremo
 * de `entityB`—. Leerlas de forma directa produce un modelo que dice justo lo
 * contrario del diagrama, y ningún test de más arriba lo detectaría.
 */
import { describe, it, expect } from 'vitest';
import { normalizarMermaid } from '../../src/services/juez-diagramas/normalizar-mermaid.js';
import { evaluarDiagrama } from '../../src/services/juez-diagramas/evaluar.js';
import type { Asercion } from '../../src/services/juez-diagramas/tipos.js';

const ER = `erDiagram
  CLIENTE ||--o{ RESERVA : realiza
  RESERVA }|--|| SALA : ocupa
  CLIENTE {
    string correo
    int id
  }`;

describe('entidad-relación', () => {
  it('desenvuelve el identificador de entidad que Mermaid inventa', async () => {
    const m = await normalizarMermaid('er', ER);
    expect(m.nodos.map((n) => n.id).sort()).toEqual(['CLIENTE', 'RESERVA', 'SALA']);
    expect(m.aristas.map((a) => `${a.origen}->${a.destino}`))
      .toEqual(['CLIENTE->RESERVA', 'RESERVA->SALA']);
  });

  it('asigna cada cardinalidad a SU extremo, y no al contrario', async () => {
    const m = await normalizarMermaid('er', ER);
    // `CLIENTE ||--o{ RESERVA`: un cliente, muchas reservas.
    expect(m.aristas[0]).toMatchObject({
      origen: 'CLIENTE', destino: 'RESERVA',
      cardinalidadOrigen: '1', cardinalidadDestino: '0..*',
      etiqueta: 'realiza',
    });
    // `RESERVA }|--|| SALA`: una o más reservas, exactamente una sala.
    expect(m.aristas[1]).toMatchObject({
      origen: 'RESERVA', destino: 'SALA',
      cardinalidadOrigen: '1..*', cardinalidadDestino: '1',
    });
  });

  it('lee los atributos de la entidad', async () => {
    const m = await normalizarMermaid('er', ER);
    const cliente = m.nodos.find((n) => n.id === 'CLIENTE');
    expect(cliente?.atributos.map((a) => a.nombre)).toEqual(['correo', 'id']);
    expect(cliente?.clase).toBe('entidad');
  });

  it('las comprobaciones genéricas sirven sobre entidades', async () => {
    const r = await evaluarDiagrama({
      motor: 'mermaid', tipoDiagrama: 'er', codigo: ER,
      aserciones: [
        { tipo: 'existe-nodo', parametros: { nombre: 'RESERVA', clase: 'entidad' } },
        {
          tipo: 'relacion-entre',
          parametros: { origen: 'CLIENTE', destino: 'RESERVA', tipo: 'relacion-er', cardinalidadDestino: '0..*' },
        },
      ],
    });
    expect(r.veredicto, JSON.stringify(r.aserciones)).toBe('aceptado');
  });

  it('detecta el muchos a muchos sin resolver también en ER', async () => {
    const nm = 'erDiagram\n  ALUMNO }o--o{ CURSO : cursa';
    const r = await evaluarDiagrama({
      motor: 'mermaid', tipoDiagrama: 'er', codigo: nm,
      aserciones: [{ tipo: 'sin-muchos-a-muchos' }],
    });
    expect(r.aserciones[0].paso).toBe(false);
  });
});

const FLUJO = `flowchart TD
  A([Inicio]) --> B{Hay sesion?}
  B -- si --> C[Mostrar panel]
  B -- no --> D[Ir a login]
  D --> B
  C --> E([Fin])`;

const juzgarFlujo = (codigo: string, asercion: Asercion) =>
  evaluarDiagrama({ motor: 'mermaid', tipoDiagrama: 'flujo', codigo, aserciones: [asercion] });

describe('flujo', () => {
  it('traduce la forma del nodo a su papel', async () => {
    const m = await normalizarMermaid('flujo', FLUJO);
    const porNombre = Object.fromEntries(m.nodos.map((n) => [n.nombre, n.forma]));
    expect(porNombre['Inicio']).toBe('inicio-fin');
    expect(porNombre['Hay sesion?']).toBe('decision');
    expect(porNombre['Mostrar panel']).toBe('proceso');
  });

  it('comprueba que una bifurcación esté dibujada como rombo', async () => {
    const bien = await juzgarFlujo(FLUJO, {
      tipo: 'nodo-con-forma', parametros: { nombre: 'Hay sesion?', forma: 'decision' },
    });
    expect(bien.aserciones[0].paso).toBe(true);

    const comoPaso = 'flowchart TD\n  A([Inicio]) --> B[Hay sesion?]\n  B --> C([Fin])';
    const mal = await juzgarFlujo(comoPaso, {
      tipo: 'nodo-con-forma', parametros: { nombre: 'Hay sesion?', forma: 'decision' },
    });
    expect(mal.aserciones[0].paso).toBe(false);
    expect(mal.aserciones[0].detalle).toContain('decoración');
  });

  it('comprueba el paso por una rama concreta', async () => {
    const bien = await juzgarFlujo(FLUJO, {
      tipo: 'paso-de-flujo', parametros: { desde: 'Hay sesion?', hasta: 'Mostrar panel', etiqueta: 'si' },
    });
    expect(bien.aserciones[0].paso).toBe(true);

    const mal = await juzgarFlujo(FLUJO, {
      tipo: 'paso-de-flujo', parametros: { desde: 'Hay sesion?', hasta: 'Mostrar panel', etiqueta: 'no' },
    });
    expect(mal.aserciones[0].paso).toBe(false);
  });

  it('acepta un flujo bien formado y detecta el nodo inalcanzable', async () => {
    expect((await juzgarFlujo(FLUJO, { tipo: 'nodos-alcanzables' })).aserciones[0].paso).toBe(true);

    const suelto = `${FLUJO}\n  Z[Paso olvidado] --> E`;
    const r = await juzgarFlujo(suelto, { tipo: 'nodos-alcanzables' });
    expect(r.aserciones[0].paso).toBe(false);
    expect(r.aserciones[0].detalle).toContain('Paso olvidado');
  });

  it('detecta el camino que no puede terminar', async () => {
    expect((await juzgarFlujo(FLUJO, { tipo: 'flujo-termina' })).aserciones[0].paso).toBe(true);

    const atrapado = `flowchart TD
  A([Inicio]) --> B[Uno]
  B --> C[Dos]
  C --> B
  A --> F([Fin])`;
    const r = await juzgarFlujo(atrapado, { tipo: 'flujo-termina' });
    expect(r.aserciones[0].paso).toBe(false);
  });

  it('exige que una decisión decida algo y que sus ramas vayan rotuladas', async () => {
    expect((await juzgarFlujo(FLUJO, { tipo: 'decisiones-con-salidas' })).aserciones[0].paso).toBe(true);

    const unaSalida = 'flowchart TD\n  A([Inicio]) --> B{Sigue?}\n  B -- si --> C([Fin])';
    const r1 = await juzgarFlujo(unaSalida, { tipo: 'decisiones-con-salidas' });
    expect(r1.aserciones[0].paso).toBe(false);
    expect(r1.aserciones[0].detalle).toContain('al menos 2');

    const sinRotular = 'flowchart TD\n  A([Inicio]) --> B{Sigue?}\n  B --> C([Fin])\n  B --> D([Alto])';
    const r2 = await juzgarFlujo(sinRotular, { tipo: 'decisiones-con-salidas' });
    expect(r2.aserciones[0].paso).toBe(false);
    expect(r2.aserciones[0].detalle).toContain('sin rotular');
  });
});
