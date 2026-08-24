/**
 * El Hub: aplanar el calendario a una lista de materiales.
 *
 * Dos reglas cargan con todo el peso y por eso están aquí:
 *
 * 1. Solo es material lo que se puede ABRIR. Una lista para reencontrar cosas
 *    donde la mitad de las filas no llevan a ningún sitio no sirve de nada.
 * 2. El orden es el del calendario. Es lo que permite decir «esto fue por la
 *    semana 3» sin tener fechas por actividad.
 */
import { describe, it, expect } from 'vitest';
import {
  esMaterial,
  materialesDelCalendario,
  tiposPresentes,
  tiposEnCalendario,
  filtrarMateriales,
  fechaDelDia,
  formatFechaCorta,
} from './materialesDelCalendario';
import type { Calendario } from '../types/calendario';

const CALENDARIO: Calendario = {
  semanas: [
    {
      id: 's1',
      numero: 1,
      fechaInicio: '2026-08-10',
      fechaFin: '2026-08-13',
      tipo: 'normal',
      dias: {
        lunes: {
          actividades: [
            { id: 'a1', tipo: 'trabajo', titulo: 'Haz un juego' },
            { id: 'a2', tipo: 'lab', titulo: 'Lab 0 — Unity', enlace: '/labs/lab0' },
          ],
        },
        martes: {
          previo: [{ id: 'a3', tipo: 'trabajo', titulo: 'Instalar Unity', enlace: 'https://unity.com' }],
          actividades: [
            { id: 'a4', tipo: 'presentacion', titulo: 'Cámara', archivoNombre: 'camara.pdf' },
          ],
        },
      },
    },
    {
      id: 's2',
      numero: 2,
      fechaInicio: '2026-08-17',
      fechaFin: '2026-08-21',
      tipo: 'especial',
      titulo: 'Semana santa',
      mensaje: 'Sin clases',
    },
    {
      id: 's3',
      numero: 3,
      fechaInicio: '2026-08-24',
      fechaFin: '2026-08-28',
      tipo: 'normal',
      dias: {
        jueves: {
          actividades: [
            {
              id: 'a5',
              tipo: 'lectura',
              titulo: 'Agentes',
              enlacesExtra: [{ texto: 'Paper original', url: 'https://x.test' }],
            },
          ],
        },
      },
    },
  ],
} as unknown as Calendario;

describe('esMaterial', () => {
  it('lo es si tiene enlace, adjunto o enlaces extra', () => {
    expect(esMaterial({ tipo: 'lab', enlace: '/labs/1' })).toBe(true);
    expect(esMaterial({ tipo: 'presentacion', archivoNombre: 'x.pdf' })).toBe(true);
    expect(esMaterial({ tipo: 'lectura', enlacesExtra: [{ texto: 'a', url: 'b' }] })).toBe(true);
  });

  it('NO lo es si no hay nada que abrir', () => {
    expect(esMaterial({ tipo: 'trabajo', titulo: 'Haz un juego' })).toBe(false);
    expect(esMaterial({ tipo: 'break', titulo: 'Receso' })).toBe(false);
    // Lista de enlaces vacía: sigue sin haber nada que abrir.
    expect(esMaterial({ tipo: 'lectura', enlacesExtra: [] })).toBe(false);
  });
});

describe('materialesDelCalendario', () => {
  it('deja fuera lo que no se puede abrir', () => {
    const materiales = materialesDelCalendario(CALENDARIO);
    expect(materiales.map((m) => m.id)).toEqual(['a2', 'a3', 'a4', 'a5']);
    // «Haz un juego» no tiene enlace: no es material.
    expect(materiales.find((m) => m.id === 'a1')).toBeUndefined();
  });

  it('respeta el orden del calendario: semana, día, y el previo antes del día', () => {
    const materiales = materialesDelCalendario(CALENDARIO);
    expect(materiales.map((m) => m.titulo)).toEqual([
      'Lab 0 — Unity',   // semana 1, lunes
      'Instalar Unity',  // semana 1, martes, PREVIO
      'Cámara',          // semana 1, martes
      'Agentes',         // semana 3, jueves
    ]);
  });

  it('marca el material de preparación', () => {
    const previo = materialesDelCalendario(CALENDARIO).find((m) => m.id === 'a3');
    expect(previo?.previo).toBe(true);
  });

  it('lleva la semana y el día de cada material', () => {
    const lab = materialesDelCalendario(CALENDARIO).find((m) => m.id === 'a2');
    expect(lab?.semana).toBe(1);
    expect(lab?.dia).toBe('lunes');
  });

  it('salta las semanas especiales, que no tienen actividades', () => {
    // La semana 2 es un receso: no debe aportar filas ni romper el recorrido.
    expect(materialesDelCalendario(CALENDARIO).some((m) => m.semana === 2)).toBe(false);
  });

  it('no revienta sin calendario', () => {
    expect(materialesDelCalendario(null)).toEqual([]);
    expect(materialesDelCalendario(undefined)).toEqual([]);
    expect(materialesDelCalendario({ semanas: [] } as unknown as Calendario)).toEqual([]);
  });

  it('usa el tipo como título cuando la actividad no tiene uno', () => {
    const cal = {
      semanas: [{
        id: 's', numero: 1, fechaInicio: '', fechaFin: '', tipo: 'normal',
        dias: { lunes: { actividades: [{ id: 'x', tipo: 'lab', enlace: '/l' }] } },
      }],
    } as unknown as Calendario;
    expect(materialesDelCalendario(cal)[0].titulo).toBe('Laboratorio');
  });
});

describe('tiposPresentes', () => {
  it('solo devuelve los tipos que existen, para no ofrecer filtros vacíos', () => {
    const tipos = tiposPresentes(materialesDelCalendario(CALENDARIO));
    expect(tipos).toEqual(['lab', 'lectura', 'trabajo', 'presentacion']);
    expect(tipos).not.toContain('evaluacion');
  });

  it('conserva un tipo que no esté en el catálogo', () => {
    const tipos = tiposPresentes([{ tipo: 'inventado' } as any]);
    expect(tipos).toEqual(['inventado']);
  });
});

describe('filtrarMateriales', () => {
  const materiales = materialesDelCalendario(CALENDARIO);

  it('sin filtros los devuelve todos', () => {
    expect(filtrarMateriales(materiales, '', new Set())).toHaveLength(4);
    expect(filtrarMateriales(materiales, '   ', new Set())).toHaveLength(4);
  });

  it('filtra por tipo', () => {
    const soloLabs = filtrarMateriales(materiales, '', new Set(['lab']));
    expect(soloLabs.map((m) => m.titulo)).toEqual(['Lab 0 — Unity']);
  });

  it('admite varios tipos a la vez', () => {
    const dos = filtrarMateriales(materiales, '', new Set(['lab', 'lectura']));
    expect(dos).toHaveLength(2);
  });

  it('busca sin distinguir mayúsculas ni acentos del texto tecleado', () => {
    expect(filtrarMateriales(materiales, 'UNITY', new Set())).toHaveLength(2);
  });

  it('busca también en los enlaces extra', () => {
    // El título es «Agentes»; lo que se recuerda es «paper».
    const r = filtrarMateriales(materiales, 'paper', new Set());
    expect(r.map((m) => m.titulo)).toEqual(['Agentes']);
  });

  it('combina texto y tipo', () => {
    expect(filtrarMateriales(materiales, 'unity', new Set(['lab']))).toHaveLength(1);
    expect(filtrarMateriales(materiales, 'unity', new Set(['lectura']))).toHaveLength(0);
  });
});

describe('fechaDelDia', () => {
  it('deduce el día exacto desde el inicio de la semana', () => {
    // Semana que arranca el lunes 10-ago-2026.
    expect(fechaDelDia('2026-08-10', 'lunes')).toBe('2026-08-10');
    expect(fechaDelDia('2026-08-10', 'martes')).toBe('2026-08-11');
    expect(fechaDelDia('2026-08-10', 'viernes')).toBe('2026-08-14');
  });

  it('no asume que la semana empieza en lunes', () => {
    // Semana que arranca el miércoles 12: el jueves es el 13, y el lunes cae
    // en el siguiente ciclo (18), no antes del inicio.
    expect(fechaDelDia('2026-08-12', 'jueves')).toBe('2026-08-13');
    expect(fechaDelDia('2026-08-12', 'lunes')).toBe('2026-08-17');
  });

  it('no se corre un día por la zona horaria', () => {
    // La trampa: `new Date('2026-08-10')` es medianoche UTC, que en México
    // (UTC-6) es el 9 a las 18:00. Todo el cálculo va en UTC.
    expect(fechaDelDia('2026-08-10', 'lunes')).toBe('2026-08-10');
    expect(fechaDelDia('2026-01-01', 'jueves')).toBe('2026-01-01');
  });

  it('devuelve vacío cuando no hay con qué calcular', () => {
    expect(fechaDelDia(undefined, 'lunes')).toBe('');
    expect(fechaDelDia('', 'lunes')).toBe('');
    expect(fechaDelDia('no es fecha', 'lunes')).toBe('');
    expect(fechaDelDia('2026-08-10', 'sabado')).toBe('');
  });
});

describe('formatFechaCorta', () => {
  it('pinta el día capturado, no el anterior', () => {
    expect(formatFechaCorta('2026-08-10')).toContain('10');
  });

  it('devuelve vacío sin fecha', () => {
    expect(formatFechaCorta('')).toBe('');
    expect(formatFechaCorta('vaya')).toBe('');
  });
});

describe('la fecha llega a cada material', () => {
  it('cada material sabe el día exacto en que ocurre', () => {
    const materiales = materialesDelCalendario(CALENDARIO);
    expect(materiales.find((m) => m.id === 'a2')?.fecha).toBe('2026-08-10'); // lunes sem 1
    expect(materiales.find((m) => m.id === 'a4')?.fecha).toBe('2026-08-11'); // martes sem 1
    expect(materiales.find((m) => m.id === 'a5')?.fecha).toBe('2026-08-27'); // jueves sem 3
  });
});

describe('tiposEnCalendario', () => {
  it('devuelve los tipos que el calendario usa, en el orden del catálogo', () => {
    // El fixture tiene trabajo y lab (lunes S1), trabajo en previo y
    // presentacion (martes S1) y lectura (jueves S3).
    expect(tiposEnCalendario(CALENDARIO)).toEqual(['lab', 'lectura', 'trabajo', 'presentacion']);
  });

  it('cuenta el `previo`, no solo las actividades del día', () => {
    const cal = {
      semanas: [
        {
          tipo: 'normal',
          numero: 1,
          dias: { lunes: { previo: [{ tipo: 'lectura' }], actividades: [{ tipo: 'lab' }] } },
        },
      ],
    } as unknown as Calendario;
    expect(tiposEnCalendario(cal)).toEqual(['lab', 'lectura']);
  });

  it('cuenta lo que NO es material: en el calendario un receso es una casilla que se ve', () => {
    const cal = {
      semanas: [
        { tipo: 'normal', numero: 1, dias: { lunes: { actividades: [{ tipo: 'break' }, { tipo: 'asueto' }] } } },
      ],
    } as unknown as Calendario;
    // `tiposPresentes` los descarta porque no hay nada que abrir; aquí sí cuentan.
    expect(tiposEnCalendario(cal)).toEqual(['break', 'asueto']);
    expect(tiposPresentes(materialesDelCalendario(cal))).toEqual([]);
  });

  it('no repite un tipo que aparece muchas veces', () => {
    const cal = {
      semanas: [
        { tipo: 'normal', numero: 1, dias: { lunes: { actividades: [{ tipo: 'lab' }, { tipo: 'lab' }] } } },
        { tipo: 'normal', numero: 2, dias: { martes: { actividades: [{ tipo: 'lab' }] } } },
      ],
    } as unknown as Calendario;
    expect(tiposEnCalendario(cal)).toEqual(['lab']);
  });

  it('ignora las semanas especiales, que no tienen actividades', () => {
    const cal = {
      semanas: [{ tipo: 'especial', numero: 1, titulo: 'Receso', mensaje: 'Sin clases' }],
    } as unknown as Calendario;
    expect(tiposEnCalendario(cal)).toEqual([]);
  });

  it('un tipo que aún no esté en el catálogo se conserva, al final', () => {
    const cal = {
      semanas: [
        { tipo: 'normal', numero: 1, dias: { lunes: { actividades: [{ tipo: 'taller' }, { tipo: 'lab' }] } } },
      ],
    } as unknown as Calendario;
    expect(tiposEnCalendario(cal)).toEqual(['lab', 'taller']);
  });

  it('aguanta un calendario vacío, nulo o con días sin nada', () => {
    expect(tiposEnCalendario(null)).toEqual([]);
    expect(tiposEnCalendario(undefined)).toEqual([]);
    expect(tiposEnCalendario({ semanas: [] } as unknown as Calendario)).toEqual([]);
    const hueco = {
      semanas: [{ tipo: 'normal', numero: 1, dias: { lunes: {}, martes: { actividades: [] } } }],
    } as unknown as Calendario;
    expect(tiposEnCalendario(hueco)).toEqual([]);
  });
});
