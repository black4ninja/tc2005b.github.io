/**
 * Contrato del parser de PlantUML.
 *
 * A diferencia del de Mermaid, este parser no envuelve a un motor: LO SUSTITUYE
 * para el subconjunto que se enseña. No hay una implementación de referencia
 * contra la que contrastar en el servidor, así que estos tests son la única
 * definición ejecutable de qué sintaxis acepta el juez, y por eso hay un caso
 * por cada forma admitida.
 *
 * Los casos de sintaxis inválida importan tanto como los válidos: el parser
 * ignora en silencio lo que sabe que es decoración, y todo lo demás tiene que
 * doler. Un modelo silenciosamente incompleto haría fallar aserciones por algo
 * que el alumno sí escribió.
 */
import { describe, it, expect } from 'vitest';
import { normalizarPlantuml } from '../../src/services/juez-diagramas/normalizar-plantuml.js';
import { parsear } from '../../src/services/juez-diagramas/evaluar.js';
import { ErrorSintaxisDiagrama, type ModeloDiagrama } from '../../src/services/juez-diagramas/tipos.js';

/** Envuelve el cuerpo entre delimitadores para no repetirlos en cada caso. */
function uml(...cuerpo: string[]): string {
  return ['@startuml', ...cuerpo, '@enduml'].join('\n');
}

function nodo(m: ModeloDiagrama, nombre: string) {
  return m.nodos.find((n) => n.nombre === nombre || n.id === nombre);
}

// --- Delimitadores y ruido -------------------------------------------------

describe('delimitadores', () => {
  it('exige @startuml y @enduml', () => {
    expect(() => normalizarPlantuml('casos-de-uso', 'actor Alumno'))
      .toThrow(ErrorSintaxisDiagrama);
    expect(() => normalizarPlantuml('casos-de-uso', '@startuml\nactor Alumno'))
      .toThrow(/enduml/i);
    expect(() => normalizarPlantuml('casos-de-uso', 'actor Alumno\n@enduml'))
      .toThrow(/@startuml/i);
  });

  it('rechaza un segundo @startuml', () => {
    const codigo = '@startuml\nactor A1\n@enduml\n@startuml\nactor B1\n@enduml';
    expect(() => normalizarPlantuml('casos-de-uso', codigo)).toThrow(/un solo diagrama/);
  });

  it('rechaza contenido después de @enduml', () => {
    const codigo = '@startuml\nactor Alumno\n@enduml\nactor Profesor';
    expect(() => normalizarPlantuml('casos-de-uso', codigo)).toThrow(/después de @enduml/);
  });

  it('admite el nombre opcional del diagrama en @startuml', () => {
    const m = normalizarPlantuml('casos-de-uso', '@startuml reservas\nactor Alumno\n@enduml');
    expect(m.nodos).toHaveLength(1);
  });

  it('el modelo declara su tipo y su motor', () => {
    const m = normalizarPlantuml('componentes', uml('component Repositorio'));
    expect(m).toMatchObject({ tipo: 'componentes', motor: 'plantuml' });
    expect(m.mensajes).toEqual([]);
  });
});

describe('comentarios y directivas', () => {
  it('ignora comentarios de línea, de bloque y directivas de presentación', () => {
    const m = normalizarPlantuml('casos-de-uso', uml(
      "' esto es un comentario",
      '!theme plain',
      'left to right direction',
      'top to bottom direction',
      'skinparam actorStyle awesome',
      'title Sistema de reservas',
      'hide footbox',
      'scale 1.5',
      "/' comentario",
      "   de varias líneas '/",
      'actor Alumno',
    ));
    expect(m.nodos.map((n) => n.nombre)).toEqual(['Alumno']);
  });

  it('ignora un bloque de skinparam con llaves sin confundirlo con un paquete', () => {
    const m = normalizarPlantuml('componentes', uml(
      'skinparam component {',
      '  BackgroundColor White',
      '  BorderColor Black',
      '}',
      'component Repositorio',
    ));
    expect(m.nodos).toHaveLength(1);
    expect(m.nodos[0].contenedor).toBeUndefined();
  });

  it('ignora notas de una línea y bloques de nota', () => {
    const m = normalizarPlantuml('componentes', uml(
      'component Repositorio',
      'note right of Repositorio : guarda los datos',
      'note as N1',
      '  texto libre que no es modelo',
      'end note',
      'component Vista',
    ));
    expect(m.nodos.map((n) => n.nombre)).toEqual(['Repositorio', 'Vista']);
  });

  it('avisa cuando un bloque de nota se queda abierto', () => {
    const codigo = uml('component Repositorio', 'note as N1', '  sin cerrar');
    expect(() => normalizarPlantuml('componentes', codigo)).toThrow(/end note/);
  });
});

// --- Declaraciones ---------------------------------------------------------

describe('actores', () => {
  it('acepta la forma desnuda', () => {
    const m = normalizarPlantuml('casos-de-uso', uml('actor Alumno'));
    expect(m.nodos[0]).toMatchObject({ id: 'Alumno', nombre: 'Alumno', clase: 'actor' });
  });

  it('acepta nombre entrecomillado con alias', () => {
    const m = normalizarPlantuml('casos-de-uso', uml('actor "Alumno inscrito" as A'));
    expect(m.nodos[0]).toMatchObject({ id: 'A', nombre: 'Alumno inscrito', clase: 'actor' });
  });

  it('acepta el orden inverso: alias primero y nombre visible entrecomillado', () => {
    const m = normalizarPlantuml('casos-de-uso', uml('actor A as "Alumno inscrito"'));
    expect(m.nodos[0]).toMatchObject({ id: 'A', nombre: 'Alumno inscrito', clase: 'actor' });
  });

  it('acepta la forma abreviada con dos puntos', () => {
    const m = normalizarPlantuml('casos-de-uso', uml(':Alumno:'));
    expect(m.nodos[0]).toMatchObject({ nombre: 'Alumno', clase: 'actor' });
  });
});

describe('casos de uso', () => {
  it('acepta la palabra clave, los paréntesis y el alias', () => {
    const m = normalizarPlantuml('casos-de-uso', uml(
      'usecase Reservar',
      '(Reservar sala)',
      '(Cancelar) as C',
      'usecase "Consultar horario" as UC1',
    ));
    expect(m.nodos.map((n) => `${n.id}|${n.nombre}|${n.clase}`)).toEqual([
      'Reservar|Reservar|caso-de-uso',
      'Reservar sala|Reservar sala|caso-de-uso',
      'C|Cancelar|caso-de-uso',
      'UC1|Consultar horario|caso-de-uso',
    ]);
  });

  it('el alias y el nombre visible apuntan al mismo nodo', () => {
    const m = normalizarPlantuml('casos-de-uso', uml(
      'usecase "Reservar sala" as UC1',
      'actor Alumno',
      'Alumno --> UC1',
      'Alumno --> (Reservar sala)',
    ));
    expect(m.nodos).toHaveLength(2);
    expect(m.aristas.every((a) => a.destino === 'UC1')).toBe(true);
  });
});

describe('componentes', () => {
  it('acepta la palabra clave, los corchetes y el alias', () => {
    const m = normalizarPlantuml('componentes', uml(
      'component Repositorio',
      '[Vista]',
      '[Controlador] as C',
      'component "Repo HTTP" as RH',
      'interface Almacen',
    ));
    expect(m.nodos.map((n) => `${n.id}|${n.nombre}|${n.clase}`)).toEqual([
      'Repositorio|Repositorio|componente',
      'Vista|Vista|componente',
      'C|Controlador|componente',
      'RH|Repo HTTP|componente',
      'Almacen|Almacen|interfaz',
    ]);
  });

  it('conserva los estereotipos como anotaciones y descarta el color', () => {
    const m = normalizarPlantuml('componentes', uml('component Repositorio <<servicio>> #LightBlue'));
    expect(m.nodos[0]).toMatchObject({ nombre: 'Repositorio', anotaciones: ['servicio'] });
  });
});

// --- Contenedores ----------------------------------------------------------

describe('paquetes y contenedores', () => {
  it('mete lo declarado dentro en su contenedor', () => {
    const m = normalizarPlantuml('paquetes', uml(
      'package "Datos" {',
      '  component Repositorio',
      '}',
      'component Vista',
    ));
    expect(nodo(m, 'Datos')).toMatchObject({ clase: 'paquete', contenedor: undefined });
    expect(nodo(m, 'Repositorio')?.contenedor).toBe('Datos');
    expect(nodo(m, 'Vista')?.contenedor).toBeUndefined();
  });

  it('acepta rectangle, folder, node y frame como contenedores', () => {
    const m = normalizarPlantuml('paquetes', uml(
      'rectangle Sistema {',
      '  folder Recursos {',
      '  }',
      '}',
      'node Servidor {',
      '}',
      'frame Marco {',
      '}',
    ));
    expect(m.nodos.map((n) => n.clase)).toEqual(['paquete', 'paquete', 'paquete', 'paquete']);
    expect(nodo(m, 'Recursos')?.contenedor).toBe('Sistema');
  });

  it('anida contenedores en varios niveles', () => {
    const m = normalizarPlantuml('paquetes', uml(
      'package Dominio {',
      '  package Modelo {',
      '    component Pedido',
      '  }',
      '  component Servicio',
      '}',
    ));
    expect(nodo(m, 'Modelo')?.contenedor).toBe('Dominio');
    expect(nodo(m, 'Pedido')?.contenedor).toBe('Modelo');
    expect(nodo(m, 'Servicio')?.contenedor).toBe('Dominio');
  });

  it('usa el alias del paquete como contenedor cuando lo hay', () => {
    const m = normalizarPlantuml('paquetes', uml(
      'package "Capa de datos" as datos {',
      '  component Repositorio',
      '}',
    ));
    expect(nodo(m, 'Capa de datos')?.id).toBe('datos');
    expect(nodo(m, 'Repositorio')?.contenedor).toBe('datos');
  });

  it('un paquete sin llaves también se declara', () => {
    const m = normalizarPlantuml('paquetes', uml('package Datos'));
    expect(m.nodos[0]).toMatchObject({ nombre: 'Datos', clase: 'paquete' });
  });

  it('together agrupa sin aparecer en el modelo ni robar el contenedor', () => {
    const m = normalizarPlantuml('paquetes', uml(
      'package Datos {',
      '  together {',
      '    component Repositorio',
      '  }',
      '}',
    ));
    expect(m.nodos).toHaveLength(2);
    expect(nodo(m, 'Repositorio')?.contenedor).toBe('Datos');
  });

  it('rechaza una llave de cierre sobrante', () => {
    expect(() => normalizarPlantuml('paquetes', uml('package Datos {', '}', '}')))
      .toThrow(/no cierra ningún bloque/);
  });

  it('rechaza un contenedor sin cerrar', () => {
    expect(() => normalizarPlantuml('paquetes', uml('package Datos {', 'component Repositorio')))
      .toThrow(/sin cerrar/);
  });
});

// --- Relaciones ------------------------------------------------------------

describe('relaciones', () => {
  it('la flecha con punta es una dependencia, con cualquier número de guiones', () => {
    for (const flecha of ['->', '-->', '---->', '..>', '.>', '-[#red]->', '-down->']) {
      const m = normalizarPlantuml('componentes', uml(`[Vista] ${flecha} [Repositorio]`));
      expect(m.aristas, flecha).toHaveLength(1);
      expect(m.aristas[0], flecha).toMatchObject({
        origen: 'Vista', destino: 'Repositorio', tipo: 'dependencia',
      });
    }
  });

  it('la línea sin punta es participación en casos de uso', () => {
    const m = normalizarPlantuml('casos-de-uso', uml('actor Alumno', '(Reservar)', 'Alumno -- (Reservar)'));
    expect(m.aristas[0]).toMatchObject({
      origen: 'Alumno', destino: 'Reservar', tipo: 'participa',
    });
  });

  it('la línea sin punta es asociación en componentes y en paquetes', () => {
    expect(normalizarPlantuml('componentes', uml('[A1] -- [B1]')).aristas[0].tipo)
      .toBe('asociacion');
    expect(normalizarPlantuml('paquetes', uml('package P1', 'package P2', 'P1 .. P2')).aristas[0].tipo)
      .toBe('asociacion');
  });

  it('la flecha invertida se normaliza al mismo sentido que la directa', () => {
    const directa = normalizarPlantuml('componentes', uml('[Vista] --> [Repositorio]'));
    const inversa = normalizarPlantuml('componentes', uml('[Repositorio] <-- [Vista]'));
    expect(inversa.aristas[0]).toMatchObject(directa.aristas[0]);
    expect(normalizarPlantuml('componentes', uml('[Repositorio] <.. [Vista]')).aristas[0])
      .toMatchObject({ origen: 'Vista', destino: 'Repositorio', tipo: 'dependencia' });
  });

  it('lee la etiqueta de la relación', () => {
    const m = normalizarPlantuml('componentes', uml('[Vista] --> [Repositorio] : consulta'));
    expect(m.aristas[0].etiqueta).toBe('consulta');
  });

  it('lee las cardinalidades y las cruza con la flecha invertida', () => {
    const directa = normalizarPlantuml('paquetes', uml('P1 "1" --> "0..*" P2'));
    expect(directa.aristas[0]).toMatchObject({
      origen: 'P1', destino: 'P2', cardinalidadOrigen: '1', cardinalidadDestino: '0..*',
    });
    const inversa = normalizarPlantuml('paquetes', uml('P2 "0..*" <-- "1" P1'));
    expect(inversa.aristas[0]).toMatchObject({
      origen: 'P1', destino: 'P2', cardinalidadOrigen: '1', cardinalidadDestino: '0..*',
    });
  });

  it('<<include>> y <<extend>> son sus propios tipos, y no quedan como etiqueta', () => {
    const m = normalizarPlantuml('casos-de-uso', uml(
      '(Reservar) .> (Pagar) : <<include>>',
      '(Reservar) .> (Notificar) : <<extend>>',
      '(Reservar) .> (Auditar) : <<extends>>',
    ));
    expect(m.aristas.map((a) => a.tipo)).toEqual(['incluye', 'extiende', 'extiende']);
    expect(m.aristas.every((a) => a.etiqueta === undefined)).toBe(true);
  });

  it('conserva el resto de la etiqueta cuando acompaña al estereotipo', () => {
    const m = normalizarPlantuml('casos-de-uso', uml('(Reservar) .> (Pagar) : <<include>> siempre'));
    expect(m.aristas[0]).toMatchObject({ tipo: 'incluye', etiqueta: 'siempre' });
  });

  it('acepta relaciones sin espacios alrededor de la flecha', () => {
    const m = normalizarPlantuml('componentes', uml('[Vista]-->[Repositorio]'));
    expect(m.aristas[0]).toMatchObject({ origen: 'Vista', destino: 'Repositorio' });
  });
});

describe('elementos no declarados', () => {
  it('se crean con la clase que corresponde al tipo de diagrama', () => {
    const casos = normalizarPlantuml('casos-de-uso', uml('Alumno --> Reservar'));
    expect(casos.nodos.map((n) => n.clase)).toEqual(['caso-de-uso', 'caso-de-uso']);

    const comps = normalizarPlantuml('componentes', uml('Vista --> Repositorio'));
    expect(comps.nodos.map((n) => n.clase)).toEqual(['componente', 'componente']);

    const paqs = normalizarPlantuml('paquetes', uml('Dominio --> Datos'));
    expect(paqs.nodos.map((n) => n.clase)).toEqual(['paquete', 'paquete']);
  });

  it('la forma del token manda sobre el tipo de diagrama', () => {
    const m = normalizarPlantuml('casos-de-uso', uml(':Alumno: --> (Reservar)', '[Agenda] --> (Reservar)'));
    expect(nodo(m, 'Alumno')?.clase).toBe('actor');
    expect(nodo(m, 'Reservar')?.clase).toBe('caso-de-uso');
    expect(nodo(m, 'Agenda')?.clase).toBe('componente');
    expect(m.nodos).toHaveLength(3);
  });

  it('una declaración posterior completa el nodo creado por la relación', () => {
    const m = normalizarPlantuml('casos-de-uso', uml(
      'Alumno --> UC1',
      'actor Alumno',
      'usecase "Reservar sala" as UC1',
    ));
    expect(m.nodos).toHaveLength(2);
    expect(nodo(m, 'Alumno')?.clase).toBe('actor');
    expect(nodo(m, 'UC1')).toMatchObject({ nombre: 'Reservar sala', clase: 'caso-de-uso' });
  });

  it('lo referenciado dentro de un paquete queda dentro del paquete', () => {
    const m = normalizarPlantuml('paquetes', uml(
      'package Datos {',
      '  Repositorio --> Cache',
      '}',
    ));
    expect(nodo(m, 'Repositorio')?.contenedor).toBe('Datos');
    expect(nodo(m, 'Cache')?.contenedor).toBe('Datos');
  });
});

// --- Un diagrama completo --------------------------------------------------

describe('diagrama completo de casos de uso', () => {
  const codigo = uml(
    'left to right direction',
    "' actores del sistema",
    'actor "Alumno inscrito" as alumno',
    'actor Profesor',
    'rectangle "Sistema de reservas" {',
    '  usecase "Reservar sala" as UC1',
    '  usecase "Cancelar reserva" as UC2',
    '  (Notificar por correo) as UC3',
    '}',
    'alumno -- UC1',
    'alumno -- UC2',
    'Profesor -- UC1',
    'UC1 .> UC3 : <<include>>',
    'UC2 ..> UC3 : <<extend>>',
  );

  it('reconstruye actores, casos de uso, contenedor y relaciones', () => {
    const m = normalizarPlantuml('casos-de-uso', codigo);
    expect(m.nodos.filter((n) => n.clase === 'actor').map((n) => n.nombre))
      .toEqual(['Alumno inscrito', 'Profesor']);
    expect(m.nodos.filter((n) => n.clase === 'caso-de-uso').map((n) => n.id))
      .toEqual(['UC1', 'UC2', 'UC3']);
    expect(nodo(m, 'UC1')?.contenedor).toBe('Sistema de reservas');
    expect(m.aristas.map((a) => `${a.origen}-${a.tipo}->${a.destino}`)).toEqual([
      'alumno-participa->UC1',
      'alumno-participa->UC2',
      'Profesor-participa->UC1',
      'UC1-incluye->UC3',
      'UC2-extiende->UC3',
    ]);
  });

  it('llega igual a través de parsear(), que es la puerta del juez', async () => {
    const m = await parsear('plantuml', 'casos-de-uso', codigo);
    expect(m.motor).toBe('plantuml');
    expect(m.nodos).toHaveLength(6);
  });
});

// --- Sintaxis inválida -----------------------------------------------------

describe('sintaxis inválida', () => {
  const casos: Array<[string, string[]]> = [
    ['relación sin destino', ['[Vista] -->']],
    ['relación sin origen', ['--> [Repositorio]']],
    ['tres extremos encadenados', ['[A1] --> [B1] --> [C1]']],
    ['palabra clave sin nombre', ['actor']],
    ['declaración de varias palabras sin comillas', ['usecase Reservar la sala']],
    ['alias sin destino', ['actor Alumno as']],
    ['línea que no es nada conocido', ['esto no es plantuml valido']],
    ['paréntesis sin cerrar', ['(Reservar sala']],
  ];

  for (const [nombre, cuerpo] of casos) {
    it(`${nombre} es error de sintaxis, y dice la línea`, () => {
      let capturado: unknown;
      try {
        normalizarPlantuml('casos-de-uso', uml(...cuerpo));
      } catch (e) {
        capturado = e;
      }
      expect(capturado).toBeInstanceOf(ErrorSintaxisDiagrama);
      expect((capturado as Error).message).toMatch(/^Línea 2:/);
    });
  }

  it('una relación mal formada se identifica como tal', () => {
    expect(() => normalizarPlantuml('componentes', uml('[Vista] --> ')))
      .toThrow(/parece una relación/);
  });

  it('el tipo de diagrama no soportado no se disfraza de error de sintaxis', () => {
    // Es un fallo de programación del juez, no del alumno: si saliera como
    // error de sintaxis, el veredicto culparía a quien no tiene la culpa.
    let capturado: unknown;
    try {
      normalizarPlantuml('clases', uml('actor Alumno'));
    } catch (e) {
      capturado = e;
    }
    expect(capturado).toBeInstanceOf(Error);
    expect(capturado).not.toBeInstanceOf(ErrorSintaxisDiagrama);
  });
});
