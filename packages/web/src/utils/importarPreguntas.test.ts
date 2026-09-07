import { describe, it, expect } from 'vitest';
import { trocearBitacora, normalizarEnunciado, type CompetenciaConocida } from './importarPreguntas';

/** Las dos de TC2007B, con la clave delante como están en la BD. */
const COMPETENCIAS: CompetenciaConocida[] = [
  { id: 'esc', nombre: 'SICT0203. Desarrollo de escenarios' },
  { id: 'dis', nombre: 'STC0203. Diseño de componentes de software' },
];

const trocear = (texto: string, banco: string[] = []) =>
  trocearBitacora(texto, COMPETENCIAS, new Set(banco.map(normalizarEnunciado)));

describe('normalizarEnunciado', () => {
  it('iguala lo que solo se diferencia en acentos, mayúsculas y espacios', () => {
    expect(normalizarEnunciado('¿Cómo   defines el ÉXITO de un proyecto?'))
      .toBe(normalizarEnunciado('Como defines el exito de un proyecto'));
  });
});

describe('el encabezado', () => {
  it('se queda con la competencia y tira el nombre del alumno', () => {
    const { filas } = trocear([
      'Daniel Aguilar Desarrollo de escenarios (SICT0203)',
      'La empresa ha sido demandada. ¿Cómo manejarías la situación?',
    ].join('\n'));

    expect(filas).toHaveLength(1);
    expect(filas[0].competenciaId).toBe('esc');
    expect(filas[0].texto).toBe('La empresa ha sido demandada. ¿Cómo manejarías la situación?');
    // Lo importante: el alumno no viaja al banco.
    expect(filas[0].texto).not.toContain('Daniel');
    expect(filas[0].competenciaEnArchivo).not.toContain('daniel');
  });

  it('acepta las tres formas de separar el nombre de la competencia', () => {
    const { filas } = trocear([
      'Enrique Ramírez - Desarrollo de escenarios (SICT0203)', '¿Y uno?', '',
      'Santiago Palacios Desarrollo de escenarios', '¿Y dos?', '',
      'Sebastian Osorio -  Diseño de componentes', '¿Y tres?',
    ].join('\n'));

    expect(filas.map((f) => f.competenciaId)).toEqual(['esc', 'esc', 'dis']);
  });

  it('tolera las erratas del cuaderno', () => {
    const { filas } = trocear([
      'Enrique Ramírez - Desarollo de escenarios (SICT0203)', '¿Falta una erre?', '',
      'Ángel David - Desarrollo de escenario (SICT203)', '¿Falta una ese?', '',
      'iñaki - diseño de componentes', '¿Todo en minúsculas?', '',
      'Juan José Goyeneche - Diseño de Componentes', '¿Con mayúscula suelta?',
    ].join('\n'));

    expect(filas.map((f) => f.competenciaId)).toEqual(['esc', 'esc', 'dis', 'dis']);
  });

  it('empareja aunque el archivo escriba el nombre corto', () => {
    // La BD dice «Diseño de componentes de software»; el cuaderno, solo
    // «Diseño de componentes».
    const { filas } = trocear('Luis Bartolo - Diseño de componentes\n¿Cómo lo harías?');
    expect(filas[0].competenciaId).toBe('dis');
  });

  it('manda el nombre cuando la clave lo contradice, pero lo señala', () => {
    const { filas } = trocear([
      'Daniel Aguilar Desarrollo de escenarios (STC0203)',
      '¿Cómo atraer alumnos sin presupuesto?',
    ].join('\n'));

    expect(filas[0].competenciaId).toBe('esc');
    expect(filas[0].conflictoDeClave).toBe(true);
  });

  it('no da por conflicto una clave que el banco no conoce', () => {
    const { filas } = trocear('Alguien - Desarrollo de escenarios (XX9999)\n¿Pregunta?');
    expect(filas[0].competenciaId).toBe('esc');
    expect(filas[0].conflictoDeClave).toBe(false);
  });

  it('NO abre entrada con un renglón de la pregunta que nombre la competencia', () => {
    // Sin esto la pregunta se partiría en dos a mitad de frase.
    const { filas } = trocear([
      'Kate Rodriguez - Diseño de componentes',
      '¿Qué factores tendrías en cuenta al abordar el diseño de componentes?',
      'Explica también cómo probarías ese diseño de componentes',
    ].join('\n'));

    expect(filas).toHaveLength(1);
    expect(filas[0].texto).toContain('¿Qué factores');
  });

  it('salta las líneas de fecha que separan jornadas', () => {
    const { filas, huerfanas } = trocear([
      'Martes 23 de septiembre', '',
      'Diego Lira - Diseño de componentes', '¿Una?', '',
      '29 de septiembre', '',
      'Axel Camacho - Diseño de componentes', '¿Otra?',
    ].join('\n'));

    expect(filas).toHaveLength(2);
    expect(huerfanas).toBe(0);
  });
});

describe('la pregunta y lo que no lo es', () => {
  it('aparta las notas sobre la respuesta en vez de importarlas', () => {
    const { filas } = trocear([
      'Daniel Contreras - Desarrollo de escenarios (SICT0203)',
      '¿Cómo construirías un cuarto en espacio de 6m2?',
      '',
      'Faltan requerimientos esenciales, no hay organización en las ideas.',
    ].join('\n'));

    expect(filas).toHaveLength(1);
    expect(filas[0].texto).toBe('¿Cómo construirías un cuarto en espacio de 6m2?');
    expect(filas[0].notasApartadas).toEqual([
      'Faltan requerimientos esenciales, no hay organización en las ideas.',
    ]);
  });

  it('une los párrafos de una pregunta que sigue hasta la interrogación', () => {
    const { filas } = trocear([
      'Daniel Aguilar Desarrollo de escenarios (STC0203)',
      'Una escuela primaria perdió 40% de sus alumnos. No tienen dinero.',
      '¿Cómo atraer alumnos sin presupuesto para infraestructura?',
    ].join('\n'));

    expect(filas[0].texto).toBe(
      'Una escuela primaria perdió 40% de sus alumnos. No tienen dinero.'
      + ' ¿Cómo atraer alumnos sin presupuesto para infraestructura?',
    );
    expect(filas[0].notasApartadas).toEqual([]);
  });

  it('sin interrogación se queda solo con el primer párrafo', () => {
    // «Vende el producto» es una consigna válida; lo de debajo, no.
    const { filas } = trocear([
      'Mauricio Olguín - Desarrollo de escenarios (SICT0203)',
      'Vende el producto',
      'No supo a quién le vendía ni preguntó por el cliente.',
    ].join('\n'));

    expect(filas[0].texto).toBe('Vende el producto');
    expect(filas[0].notasApartadas).toEqual(['No supo a quién le vendía ni preguntó por el cliente.']);
  });

  it('descarta un encabezado que se quedó sin pregunta debajo', () => {
    const { filas } = trocear([
      'Alguien - Diseño de componentes', '',
      'Otro - Diseño de componentes', '¿Esta sí?',
    ].join('\n'));

    expect(filas).toHaveLength(1);
    expect(filas[0].texto).toBe('¿Esta sí?');
  });
});

describe('no duplicar', () => {
  it('marca lo que el banco ya tiene, aunque cambien acentos y espacios', () => {
    const { filas } = trocear(
      'Ana - Desarrollo de escenarios\n¿Cómo   defines el ÉXITO de un proyecto?',
      ['Como defines el exito de un proyecto'],
    );

    expect(filas[0].estado).toBe('en-banco');
  });

  it('deja pasar la primera y marca las siguientes como repetidas', () => {
    const { filas } = trocear([
      'Mauricio Olguín - Desarrollo de escenarios', 'Vende el producto', '',
      'Daniel Queijeiro - Desarrollo de escenarios', 'Vende el producto', '',
      'Otro Más - Desarrollo de escenarios', 'Vende el producto',
    ].join('\n'));

    expect(filas.map((f) => f.estado)).toEqual(['nueva', 'repetida', 'repetida']);
  });

  it('lo que está en el banco no cuenta como primera aparición', () => {
    // Las dos deben quedar fuera: ninguna es «la que entra».
    const { filas } = trocear([
      'Uno - Desarrollo de escenarios', '¿Cuántas pelotas de golf caben en un autobús?', '',
      'Dos - Desarrollo de escenarios', '¿Cuántas pelotas de golf caben en un autobús?',
    ].join('\n'), ['¿Cuántas pelotas de golf caben en un autobús?']);

    expect(filas.map((f) => f.estado)).toEqual(['en-banco', 'en-banco']);
  });

  it('NO fusiona las parecidas: dos versiones son dos preguntas', () => {
    const { filas } = trocear([
      'Iñaki - Desarrollo de escenarios',
      'Somos inversionistas buscando una solución para una ferretería. ¿Cuál sería tu propuesta y cómo medirías el éxito?',
      '',
      'Diego - Desarrollo de escenarios',
      'Somos inversionistas buscando una solución para una ferretería. ¿Cuál sería tu propuesta y cuál la forma de trabajo?',
    ].join('\n'));

    expect(filas.map((f) => f.estado)).toEqual(['nueva', 'nueva']);
  });
});

describe('el archivo entero', () => {
  it('cuenta las líneas que no cayeron en ninguna entrada', () => {
    const { filas, huerfanas } = trocear([
      'Una nota suelta al principio del cuaderno',
      'y otra más',
      '',
      'Ana - Desarrollo de escenarios',
      '¿La primera pregunta?',
    ].join('\n'));

    expect(filas).toHaveLength(1);
    expect(huerfanas).toBe(2);
  });

  it('con un archivo vacío no revienta ni inventa filas', () => {
    expect(trocear('').filas).toEqual([]);
    expect(trocear('\n\n   \n').filas).toEqual([]);
  });
});
