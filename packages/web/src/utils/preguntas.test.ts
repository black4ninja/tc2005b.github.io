import { describe, it, expect } from 'vitest';
import {
  ajustarUso, aplicarAsignaciones, faseProyeccion, formatearDuracion, quitarAsignaciones,
  repartirPreguntas, resumenPregunta,
} from './preguntas';
import type { AlumnoConPregunta, Pregunta, PreguntaAsignacion } from '../types/preguntas';

describe('formatearDuracion', () => {
  it('escribe minutos y segundos a dos cifras', () => {
    expect(formatearDuracion(95)).toBe('1:35');
    expect(formatearDuracion(60)).toBe('1:00');
    expect(formatearDuracion(9)).toBe('0:09');
    expect(formatearDuracion(0)).toBe('0:00');
  });

  it('no pinta tiempos negativos', () => {
    expect(formatearDuracion(-5)).toBe('0:00');
  });
});

describe('resumenPregunta', () => {
  it('deja el texto corto tal cual', () => {
    expect(resumenPregunta('¿Qué harías?')).toBe('¿Qué harías?');
  });

  it('quita las marcas de Markdown, que en una tabla se leerían crudas', () => {
    expect(resumenPregunta('## Caso\n\nDescribe un **conflicto** con `git`'))
      .toBe('Caso Describe un conflicto con git');
    expect(resumenPregunta('- Primero\n- Después')).toBe('Primero Después');
    expect(resumenPregunta('Mira [la guía](https://x.mx/guia)')).toBe('Mira la guía');
  });

  it('corta por palabra entera y marca que sigue', () => {
    const largo = 'palabra '.repeat(30).trim();
    const corto = resumenPregunta(largo, 40);
    expect(corto.endsWith('…')).toBe(true);
    expect(corto.length).toBeLessThanOrEqual(41);
    expect(corto).not.toMatch(/pala…$/);
  });

  it('con una sola palabra larguísima corta donde toca en vez de devolverla entera', () => {
    const corto = resumenPregunta('x'.repeat(200), 30);
    expect(corto).toBe(`${'x'.repeat(30)}…`);
  });
});


describe('repartirPreguntas', () => {
  // Siempre la primera de la bolsa: hace el reparto determinista y deja ver el
  // orden en que se agota cada vuelta.
  const primera = () => 0;

  it('agota el banco antes de repetir', () => {
    const salida = repartirPreguntas(['a1', 'a2', 'a3', 'a4'], ['p1', 'p2'], primera);
    expect(salida.map((s) => s.preguntaId)).toEqual(['p1', 'p2', 'p1', 'p2']);
  });

  it('le toca a todos los alumnos, una sola vez', () => {
    const salida = repartirPreguntas(['a1', 'a2', 'a3'], ['p1', 'p2', 'p3', 'p4'], primera);
    expect(salida.map((s) => s.alumnoId)).toEqual(['a1', 'a2', 'a3']);
    expect(new Set(salida.map((s) => s.preguntaId)).size).toBe(3);
  });

  it('sin alumnos o sin preguntas no reparte nada', () => {
    expect(repartirPreguntas([], ['p1'])).toEqual([]);
    expect(repartirPreguntas(['a1'], [])).toEqual([]);
  });

  it('aguanta un generador que se sale del rango', () => {
    // Con `() => 1` el índice caería fuera de la bolsa y `splice` no devolvería
    // nada: el alumno se quedaría con `undefined` como pregunta.
    const salida = repartirPreguntas(['a1', 'a2'], ['p1', 'p2'], () => 1);
    expect(salida).toHaveLength(2);
    for (const s of salida) expect(s.preguntaId).toBeDefined();
  });
});


// ── Actualización optimista del roster ───────────────────────────────────
// Estas tres son lo que sustituyó a recargar la tabla entera en cada clic, así
// que un error aquí se ve como una fila que no cambia o que se duplica.

function asig(over: Partial<PreguntaAsignacion> & { id: string; alumnoId: string; hueco: string }): PreguntaAsignacion {
  return {
    intento: 1, pregunta: null, nota: '', usada: false, createdAt: '2026-01-01T00:00:00.000Z', ...over,
  };
}

function alumno(id: string, asignaciones: PreguntaAsignacion[]): AlumnoConPregunta {
  return { id, name: id, matricula: id, email: '', asignaciones, totalAsignaciones: asignaciones.length };
}

describe('aplicarAsignaciones', () => {
  it('desaloja lo que hubiera en el MISMO hueco y respeta los demás', () => {
    const previo = [alumno('a1', [
      asig({ id: 'x', alumnoId: 'a1', hueco: 'c1::1' }),
      asig({ id: 'y', alumnoId: 'a1', hueco: 'c1::2', intento: 2 }),
    ])];
    const [resultado] = aplicarAsignaciones(previo, [asig({ id: 'z', alumnoId: 'a1', hueco: 'c1::1' })]);
    expect(resultado.asignaciones.map((a) => a.id).sort()).toEqual(['y', 'z']);
  });

  it('el segundo intento NO pisa al primero', () => {
    const previo = [alumno('a1', [asig({ id: 'x', alumnoId: 'a1', hueco: 'c1::1' })])];
    const [resultado] = aplicarAsignaciones(previo, [
      asig({ id: 'z', alumnoId: 'a1', hueco: 'c1::2', intento: 2 }),
    ]);
    expect(resultado.asignaciones).toHaveLength(2);
  });

  it('no toca a los alumnos que no aparecen', () => {
    const previo = [alumno('a1', []), alumno('a2', [asig({ id: 'x', alumnoId: 'a2', hueco: 'c1::1' })])];
    const resultado = aplicarAsignaciones(previo, [asig({ id: 'z', alumnoId: 'a1', hueco: 'c1::1' })]);
    expect(resultado[1]).toBe(previo[1]);
  });

  it('sin nada que aplicar devuelve el mismo arreglo', () => {
    const previo = [alumno('a1', [])];
    expect(aplicarAsignaciones(previo, [])).toBe(previo);
  });
});

describe('quitarAsignaciones', () => {
  it('saca por id y deja lo demás intacto', () => {
    const previo = [alumno('a1', [
      asig({ id: 'x', alumnoId: 'a1', hueco: 'c1::1' }),
      asig({ id: 'y', alumnoId: 'a1', hueco: 'c1::2', intento: 2 }),
    ])];
    const [resultado] = quitarAsignaciones(previo, ['x']);
    expect(resultado.asignaciones.map((a) => a.id)).toEqual(['y']);
  });

  it('un id que no está no cambia nada', () => {
    const previo = [alumno('a1', [asig({ id: 'x', alumnoId: 'a1', hueco: 'c1::1' })])];
    expect(quitarAsignaciones(previo, ['nope'])[0]).toBe(previo[0]);
  });
});

describe('ajustarUso', () => {
  const banco = (uso: Pregunta['uso']): Pregunta[] => [{
    id: 'p1', coleccionId: null, competenciaId: null, competencia: null,
    texto: 't', textoHtml: '', notas: '', archivada: false, uso,
  }];

  it('estrena una pregunta sin uso previo', () => {
    const [p] = ajustarUso(banco(null), ['p1'], []);
    expect(p.uso).toEqual({ veces: 1, quienes: [], algunaUsada: false });
  });

  it('suma y resta sobre lo que ya había', () => {
    const conDos = banco({ veces: 2, quienes: ['a · g'], algunaUsada: true });
    expect(ajustarUso(conDos, ['p1'], [])[0].uso?.veces).toBe(3);
    expect(ajustarUso(conDos, [], ['p1'])[0].uso?.veces).toBe(1);
  });

  it('al llegar a cero vuelve a «sin usar» en vez de dejar un contador en 0', () => {
    const conUno = banco({ veces: 1, quienes: [], algunaUsada: false });
    expect(ajustarUso(conUno, [], ['p1'])[0].uso).toBeNull();
  });

  it('nunca baja de cero aunque se resten de más', () => {
    expect(ajustarUso(banco(null), [], ['p1', 'p1'])[0].uso).toBeNull();
  });
});

describe('faseProyeccion', () => {
  const T0 = new Date('2026-08-26T10:00:00.000Z').getTime();
  const base = {
    estado: 'corriendo' as const,
    iniciadoEn: new Date(T0).toISOString(),
    asignacionId: 'a1',
    duracionSegundos: 180,
    graciaSegundos: 5,
  };

  it('sin pregunta elegida no hay nada que enseñar', () => {
    const r = faseProyeccion({ ...base, asignacionId: null }, T0);
    expect(r).toEqual({ fase: 'sin-pregunta', restante: 180, visible: false });
  });

  it('en espera enseña el tiempo entero pero no la pregunta', () => {
    const r = faseProyeccion({ ...base, estado: 'espera', iniciadoEn: null }, T0);
    expect(r).toEqual({ fase: 'espera', restante: 180, visible: false });
  });

  it('detenida a mano oculta la pregunta aunque hubiera arrancado', () => {
    expect(faseProyeccion({ ...base, estado: 'detenido' }, T0 + 10_000).visible).toBe(false);
    expect(faseProyeccion({ ...base, estado: 'detenido' }, T0 + 10_000).fase).toBe('detenida');
  });

  it('corriendo descuenta desde el arranque', () => {
    expect(faseProyeccion(base, T0)).toEqual({ fase: 'corriendo', restante: 180, visible: true });
    expect(faseProyeccion(base, T0 + 30_500).restante).toBe(150);
  });

  it('al llegar a cero la pregunta se queda los segundos de gracia', () => {
    const enCero = faseProyeccion(base, T0 + 180_000);
    expect(enCero).toEqual({ fase: 'gracia', restante: 0, visible: true });
    expect(faseProyeccion(base, T0 + 184_900).visible).toBe(true);
  });

  it('pasada la gracia se retira', () => {
    const r = faseProyeccion(base, T0 + 185_000);
    expect(r).toEqual({ fase: 'finalizada', restante: 0, visible: false });
  });

  it('entrar a mitad calcula lo mismo que quien lleva desde el principio', () => {
    expect(faseProyeccion(base, T0 + 120_000).restante).toBe(60);
  });

  it('un `corriendo` sin hora de arranque se trata como espera, no como reloj a cero', () => {
    expect(faseProyeccion({ ...base, iniciadoEn: null }, T0).fase).toBe('espera');
  });
});
