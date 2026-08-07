/**
 * El catálogo de aserciones sobre diagramas de PlantUML, de punta a punta.
 *
 * `plantuml.test.ts` fija qué SINTAXIS entiende el parser; aquí se comprueba lo
 * siguiente: que las comprobaciones del catálogo juzguen esos modelos igual de
 * bien que los de Mermaid. La distinción importa porque casos de uso,
 * componentes y paquetes solo se escriben en PlantUML, así que sin este fichero
 * tres de los ocho tipos de diagrama tenían el parser probado y el catálogo sin
 * probar: cualquier aserción podría haber devuelto siempre `true` sobre ellos
 * sin que ningún test se enterara.
 *
 * Como en el resto del catálogo, cada comprobación lleva su caso negativo, que
 * es el que demuestra que discrimina.
 */
import { describe, it, expect } from 'vitest';
import { evaluarDiagrama } from '../../src/services/juez-diagramas/evaluar.js';
import type { Asercion, TipoDiagrama } from '../../src/services/juez-diagramas/tipos.js';

/** Envuelve el cuerpo entre delimitadores para no repetirlos en cada caso. */
function uml(...cuerpo: string[]): string {
  return ['@startuml', ...cuerpo, '@enduml'].join('\n');
}

/** Atajo: evalúa un diagrama de PlantUML contra una sola aserción. */
async function juzgar(tipoDiagrama: TipoDiagrama, codigo: string, asercion: Asercion) {
  const r = await evaluarDiagrama({
    motor: 'plantuml', tipoDiagrama, codigo, aserciones: [asercion],
  });
  return { paso: r.aserciones[0]?.paso ?? false, detalle: r.aserciones[0]?.detalle ?? '' };
}

// --- Casos de uso ----------------------------------------------------------

/**
 * El cuerpo se guarda como líneas sueltas, no como texto ya envuelto, para poder
 * construir variantes añadiendo una línea antes del `@enduml`: el parser rechaza
 * cualquier contenido después del cierre.
 */
const CUERPO_CASOS_DE_USO = [
  'left to right direction',
  'actor "Alumno inscrito" as alumno',
  'actor Profesor',
  'rectangle "Sistema de reservas" {',
  '  usecase "Reservar sala" as UC1',
  '  usecase "Cancelar reserva" as UC2',
  '  usecase "Notificar por correo" as UC3',
  '}',
  'alumno -- UC1',
  'alumno -- UC2',
  'Profesor -- UC1',
  'UC1 .> UC3 : <<include>>',
];

const CASOS_DE_USO = uml(...CUERPO_CASOS_DE_USO);

describe('casos de uso', () => {
  it('encuentra el actor y el caso de uso por su nombre visible, no por su alias', async () => {
    // El autor de la aserción escribe lo que ve en el dibujo («Reservar sala»),
    // mientras que el diagrama guarda el alias («UC1»). Si la búsqueda no
    // resolviera ambos, toda aserción sobre un diagrama con alias fallaría.
    const actor = await juzgar('casos-de-uso', CASOS_DE_USO, {
      tipo: 'existe-nodo', parametros: { nombre: 'Alumno inscrito', clase: 'actor' },
    });
    expect(actor.paso, actor.detalle).toBe(true);

    const caso = await juzgar('casos-de-uso', CASOS_DE_USO, {
      tipo: 'existe-nodo', parametros: { nombre: 'Reservar sala', clase: 'caso-de-uso' },
    });
    expect(caso.paso, caso.detalle).toBe(true);
  });

  it('distingue un actor de un caso de uso aunque el nombre exista', async () => {
    // Quien pide algo queda FUERA del sistema y lo pedido dentro. Dibujar al
    // actor como óvalo es el error de notación que esta comprobación ataca, y sin
    // el caso negativo bastaba con que el nombre apareciera en alguna parte.
    const r = await juzgar('casos-de-uso', CASOS_DE_USO, {
      tipo: 'existe-nodo', parametros: { nombre: 'Alumno inscrito', clase: 'caso-de-uso' },
    });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('actor');
  });

  it('comprueba la participación del actor y la inclusión entre casos de uso', async () => {
    const participa = await juzgar('casos-de-uso', CASOS_DE_USO, {
      tipo: 'relacion-entre',
      parametros: { origen: 'Alumno inscrito', destino: 'Reservar sala', tipo: 'participa' },
    });
    expect(participa.paso, participa.detalle).toBe(true);

    const incluye = await juzgar('casos-de-uso', CASOS_DE_USO, {
      tipo: 'relacion-entre',
      parametros: { origen: 'Reservar sala', destino: 'Notificar por correo', tipo: 'incluye' },
    });
    expect(incluye.paso, incluye.detalle).toBe(true);
  });

  it('no confunde incluir con extender, que son cosas distintas', async () => {
    // `<<include>>` es obligatorio y `<<extend>>` opcional: intercambiarlos
    // cambia lo que el sistema promete hacer, así que la aserción tiene que
    // separar ambos casos y no limitarse a ver que hay una flecha.
    const r = await juzgar('casos-de-uso', CASOS_DE_USO, {
      tipo: 'relacion-entre',
      parametros: { origen: 'Reservar sala', destino: 'Notificar por correo', tipo: 'extiende' },
    });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('incluye');
  });

  it('avisa cuando la participación está dibujada en el sentido contrario', async () => {
    const r = await juzgar('casos-de-uso', CASOS_DE_USO, {
      tipo: 'relacion-entre',
      parametros: { origen: 'Reservar sala', destino: 'Alumno inscrito', tipo: 'participa' },
    });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('sentido contrario');
  });

  it('acepta el caso de uso que llega por inclusión y no directamente de un actor', async () => {
    // «Notificar por correo» no lo pide ningún actor: lo incluye «Reservar
    // sala». Exigir un actor directo suspendería el uso canónico de
    // `<<include>>`, que es justo lo que se enseña.
    const r = await juzgar('casos-de-uso', CASOS_DE_USO, { tipo: 'sin-casos-uso-sin-actor' });
    expect(r.paso, r.detalle).toBe(true);
  });

  it('detecta el caso de uso que no solicita nadie', async () => {
    const conHuerfano = uml(...CUERPO_CASOS_DE_USO, 'usecase "Auditar accesos" as UC4');
    const r = await juzgar('casos-de-uso', conHuerfano, { tipo: 'sin-casos-uso-sin-actor' });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('Auditar accesos');
  });

  it('detecta al actor dibujado que no participa en nada', async () => {
    // Un actor suelto no aporta información: o falta la relación que lo une a lo
    // que quiere del sistema, o sobra el monigote.
    expect((await juzgar('casos-de-uso', CASOS_DE_USO, { tipo: 'sin-actores-ociosos' })).paso).toBe(true);

    const conOcioso = uml(...CUERPO_CASOS_DE_USO, 'actor Bibliotecario');
    const r = await juzgar('casos-de-uso', conOcioso, { tipo: 'sin-actores-ociosos' });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('Bibliotecario');
  });
});

// --- Componentes -----------------------------------------------------------

const CUERPO_COMPONENTES = [
  'package "Presentacion" {',
  '  component Vista',
  '}',
  'package "Infraestructura" {',
  '  component "Repositorio HTTP" as RH',
  '  interface Almacen',
  '}',
  'component Bitacora',
  'Vista --> RH : consulta',
  'RH ..> Almacen',
];

const COMPONENTES = uml(...CUERPO_COMPONENTES);

describe('componentes', () => {
  it('distingue una interfaz de un componente', async () => {
    const interfaz = await juzgar('componentes', COMPONENTES, {
      tipo: 'existe-nodo', parametros: { nombre: 'Almacen', clase: 'interfaz' },
    });
    expect(interfaz.paso, interfaz.detalle).toBe(true);

    const r = await juzgar('componentes', COMPONENTES, {
      tipo: 'existe-nodo', parametros: { nombre: 'Almacen', clase: 'componente' },
    });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('interfaz');
  });

  it('comprueba la dependencia entre componentes y su tipo', async () => {
    const bien = await juzgar('componentes', COMPONENTES, {
      tipo: 'relacion-entre',
      parametros: { origen: 'Vista', destino: 'Repositorio HTTP', tipo: 'dependencia' },
    });
    expect(bien.paso, bien.detalle).toBe(true);

    // Una dependencia y una asociación dicen cosas distintas del acoplamiento
    // entre los dos componentes, así que el tipo tiene que discriminar.
    const mal = await juzgar('componentes', COMPONENTES, {
      tipo: 'relacion-entre',
      parametros: { origen: 'Vista', destino: 'Repositorio HTTP', tipo: 'asociacion' },
    });
    expect(mal.paso).toBe(false);
    expect(mal.detalle).toContain('dependencia');
  });

  it('comprueba en qué paquete vive cada componente', async () => {
    const bien = await juzgar('componentes', COMPONENTES, {
      tipo: 'contenido-en-paquete',
      parametros: { elemento: 'Repositorio HTTP', paquete: 'Infraestructura' },
    });
    expect(bien.paso, bien.detalle).toBe(true);

    // La caja que envuelve no es un adorno: dice a qué módulo pertenece cada
    // cosa, y colocar la vista en infraestructura es un error de arquitectura,
    // no de dibujo.
    const otroPaquete = await juzgar('componentes', COMPONENTES, {
      tipo: 'contenido-en-paquete', parametros: { elemento: 'Vista', paquete: 'Infraestructura' },
    });
    expect(otroPaquete.paso).toBe(false);
    expect(otroPaquete.detalle).toContain('Presentacion');
  });

  it('distingue el componente mal colocado del que quedó suelto', async () => {
    // Son dos defectos distintos y el alumno necesita saber cuál cometió: uno se
    // arregla moviendo la caja y el otro dibujando el paquete que falta.
    const suelto = await juzgar('componentes', COMPONENTES, {
      tipo: 'contenido-en-paquete', parametros: { elemento: 'Bitacora', paquete: 'Infraestructura' },
    });
    expect(suelto.paso).toBe(false);
    expect(suelto.detalle).toContain('suelto');

    const inexistente = await juzgar('componentes', COMPONENTES, {
      tipo: 'contenido-en-paquete', parametros: { elemento: 'Cache', paquete: 'Infraestructura' },
    });
    expect(inexistente.paso).toBe(false);
    expect(inexistente.detalle).toContain('No encontré');
  });

  it('detecta la dependencia circular entre componentes', async () => {
    expect((await juzgar('componentes', COMPONENTES, { tipo: 'sin-ciclos' })).paso).toBe(true);

    const ciclo = uml(
      '[Vista] --> [Controlador]',
      '[Controlador] --> [Repositorio]',
      '[Repositorio] --> [Vista]',
    );
    const r = await juzgar('componentes', ciclo, { tipo: 'sin-ciclos' });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('Vista');
  });
});

// --- Paquetes --------------------------------------------------------------

const PAQUETES = uml(
  'package Dominio {',
  '  package Modelo {',
  '    component Pedido',
  '  }',
  '  component Servicio',
  '}',
  'package Datos {',
  '  component Repositorio',
  '}',
  'Servicio --> Repositorio',
);

describe('paquetes', () => {
  it('la pertenencia se comprueba contra el contenedor DIRECTO', async () => {
    const directo = await juzgar('paquetes', PAQUETES, {
      tipo: 'contenido-en-paquete', parametros: { elemento: 'Pedido', paquete: 'Modelo' },
    });
    expect(directo.paso, directo.detalle).toBe(true);

    // Un paquete anidado también está contenido en el de fuera.
    const anidado = await juzgar('paquetes', PAQUETES, {
      tipo: 'contenido-en-paquete', parametros: { elemento: 'Modelo', paquete: 'Dominio' },
    });
    expect(anidado.paso, anidado.detalle).toBe(true);

    // Pero la pertenencia NO es transitiva: «Pedido» está en «Modelo», que está
    // en «Dominio», y aun así la aserción falla. Es el comportamiento buscado —
    // el autor pregunta por la caja que envuelve, no por el árbol entero—, y
    // conviene dejarlo escrito para que un cambio de criterio se note.
    const transitivo = await juzgar('paquetes', PAQUETES, {
      tipo: 'contenido-en-paquete', parametros: { elemento: 'Pedido', paquete: 'Dominio' },
    });
    expect(transitivo.paso).toBe(false);
    expect(transitivo.detalle).toContain('Modelo');
  });

  it('detecta el ciclo entre paquetes, que es el defecto de capas por excelencia', async () => {
    expect((await juzgar('paquetes', PAQUETES, { tipo: 'sin-ciclos' })).paso).toBe(true);

    const ciclo = uml(
      'package Presentacion',
      'package Dominio',
      'package Datos',
      'Presentacion --> Dominio',
      'Dominio --> Datos',
      'Datos --> Presentacion',
    );
    const r = await juzgar('paquetes', ciclo, { tipo: 'sin-ciclos' });
    expect(r.paso).toBe(false);
    expect(r.detalle).toContain('Presentacion');
  });

  it('el filtro por tipo de relación acota qué ciclos se buscan', async () => {
    // Las flechas del ciclo son dependencias, así que restringir la búsqueda a
    // asociaciones no encuentra ninguno. Documentar el filtro evita leer un
    // «no hay ciclos» como «el diagrama está limpio».
    const ciclo = uml(
      'package Presentacion',
      'package Dominio',
      'Presentacion --> Dominio',
      'Dominio --> Presentacion',
    );
    expect((await juzgar('paquetes', ciclo, { tipo: 'sin-ciclos' })).paso).toBe(false);
    expect((await juzgar('paquetes', ciclo, {
      tipo: 'sin-ciclos', parametros: { tipos: ['asociacion'] },
    })).paso).toBe(true);
  });
});

// --- Informe completo ------------------------------------------------------

describe('informe sobre un diagrama de PlantUML', () => {
  it('varias comprobaciones a la vez dan un veredicto único', async () => {
    const r = await evaluarDiagrama({
      motor: 'plantuml', tipoDiagrama: 'casos-de-uso', codigo: CASOS_DE_USO,
      aserciones: [
        { tipo: 'existe-nodo', parametros: { nombre: 'Reservar sala', clase: 'caso-de-uso' } },
        {
          tipo: 'relacion-entre',
          parametros: { origen: 'Alumno inscrito', destino: 'Reservar sala', tipo: 'participa' },
        },
        { tipo: 'sin-casos-uso-sin-actor' },
        { tipo: 'sin-actores-ociosos' },
      ],
    });
    expect(r.veredicto, JSON.stringify(r.aserciones)).toBe('aceptado');
    expect(r.asercionesPasadas).toBe(4);
  });

  it('el error de sintaxis de PlantUML corta la evaluación igual que el de Mermaid', async () => {
    // El alumno tiene que ver el veredicto de sintaxis, no una lista de
    // aserciones fallidas que le harían buscar el error donde no está.
    const r = await evaluarDiagrama({
      motor: 'plantuml', tipoDiagrama: 'casos-de-uso', codigo: uml('actor Alumno', '[Vista] -->'),
      aserciones: [{ tipo: 'sin-actores-ociosos' }],
    });
    expect(r.veredicto).toBe('error_sintaxis');
    expect(r.errorSintaxis).toMatch(/Línea/);
    expect(r.aserciones).toHaveLength(0);
  });
});
