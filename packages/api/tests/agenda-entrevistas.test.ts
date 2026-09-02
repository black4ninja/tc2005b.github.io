import { describe, it, expect } from 'vitest';
import {
  esDiaHabil, sumarHorasHabiles, puedeAgendar, puedeCancelar, huecosDelDia, numerarIntentos,
} from '../src/services/agenda-entrevistas.service.js';

/**
 * Las fechas van en UTC con la hora de Querétaro despejada a mano (UTC-6 en
 * invierno) para que el test diga lo mismo corra donde corra.
 */
function qro(iso: string): Date {
  return new Date(`${iso}-06:00`);
}

describe('esDiaHabil', () => {
  it('de lunes a viernes sí', () => {
    expect(esDiaHabil(qro('2026-08-26T10:00:00'))).toBe(true); // miércoles
    expect(esDiaHabil(qro('2026-08-28T10:00:00'))).toBe(true); // viernes
  });

  it('sábado y domingo no', () => {
    expect(esDiaHabil(qro('2026-08-29T10:00:00'))).toBe(false);
    expect(esDiaHabil(qro('2026-08-30T10:00:00'))).toBe(false);
  });

  it('mira el día en la zona del curso, no en UTC', () => {
    // Viernes 22:00 en Querétaro es sábado 04:00 UTC: sigue siendo hábil.
    expect(esDiaHabil(qro('2026-08-28T22:00:00'))).toBe(true);
  });
});

describe('sumarHorasHabiles', () => {
  it('entre semana son 24 horas de reloj', () => {
    const salida = sumarHorasHabiles(qro('2026-08-26T10:00:00'), 24);
    expect(salida.toISOString()).toBe(qro('2026-08-27T10:00:00').toISOString());
  });

  it('el fin de semana no cuenta: del viernes salta al lunes', () => {
    const salida = sumarHorasHabiles(qro('2026-08-28T10:00:00'), 24);
    expect(salida.toISOString()).toBe(qro('2026-08-31T10:00:00').toISOString());
  });

  it('empezando en sábado, el reloj no arranca hasta el lunes', () => {
    const salida = sumarHorasHabiles(qro('2026-08-29T10:00:00'), 24);
    expect(salida.toISOString()).toBe(qro('2026-09-01T00:00:00').toISOString());
  });
});

describe('puedeAgendar', () => {
  const ahora = qro('2026-08-26T10:00:00'); // miércoles

  it('rechaza lo que cae antes del límite', () => {
    expect(puedeAgendar(qro('2026-08-27T09:30:00'), ahora)).toBe(false);
  });

  it('acepta justo el límite', () => {
    expect(puedeAgendar(qro('2026-08-27T10:00:00'), ahora)).toBe(true);
  });

  it('el viernes por la tarde no abre el sábado ni el lunes temprano', () => {
    const viernes = qro('2026-08-28T15:00:00');
    expect(puedeAgendar(qro('2026-08-29T16:00:00'), viernes)).toBe(false);
    expect(puedeAgendar(qro('2026-08-31T14:00:00'), viernes)).toBe(false);
    expect(puedeAgendar(qro('2026-08-31T15:00:00'), viernes)).toBe(true);
  });
});

describe('puedeCancelar', () => {
  const cita = qro('2026-08-27T09:00:00');

  it('deja cancelar hasta cinco minutos antes', () => {
    expect(puedeCancelar(cita, qro('2026-08-27T08:54:00'))).toBe(true);
    expect(puedeCancelar(cita, qro('2026-08-27T08:55:00'))).toBe(false);
  });

  it('ya empezada, no', () => {
    expect(puedeCancelar(cita, qro('2026-08-27T09:10:00'))).toBe(false);
  });
});

describe('huecosDelDia', () => {
  it('parte el día en bloques del tamaño de la entrevista', () => {
    const huecos = huecosDelDia(qro('2026-08-27T09:00:00'), qro('2026-08-27T09:20:00'), 300);
    expect(huecos.map((h) => h.toISOString())).toEqual([
      qro('2026-08-27T09:00:00').toISOString(),
      qro('2026-08-27T09:05:00').toISOString(),
      qro('2026-08-27T09:10:00').toISOString(),
      qro('2026-08-27T09:15:00').toISOString(),
    ]);
  });

  it('no deja un hueco a medias al final', () => {
    const huecos = huecosDelDia(qro('2026-08-27T09:00:00'), qro('2026-08-27T09:12:00'), 300);
    expect(huecos).toHaveLength(2);
  });

  it('un rango vacío o al revés no da huecos', () => {
    expect(huecosDelDia(qro('2026-08-27T09:00:00'), qro('2026-08-27T09:00:00'), 300)).toEqual([]);
    expect(huecosDelDia(qro('2026-08-27T10:00:00'), qro('2026-08-27T09:00:00'), 300)).toEqual([]);
  });
});

describe('numerarIntentos', () => {
  it('numera por hora, no por orden de creación', () => {
    const n = numerarIntentos([
      { id: 'b', inicio: qro('2026-09-02T09:00:00') },
      { id: 'a', inicio: qro('2026-08-27T09:00:00') },
    ]);
    expect(n.get('a')).toBe(1);
    expect(n.get('b')).toBe(2);
  });

  it('cancelar la primera asciende a la que queda', () => {
    const n = numerarIntentos([{ id: 'b', inicio: qro('2026-09-02T09:00:00') }]);
    expect(n.get('b')).toBe(1);
  });

  it('con la misma hora desempata el id, para que el número no baile', () => {
    const misma = qro('2026-08-27T09:00:00');
    const n = numerarIntentos([{ id: 'z', inicio: misma }, { id: 'a', inicio: misma }]);
    expect(n.get('a')).toBe(1);
    expect(n.get('z')).toBe(2);
  });
});

describe('el umbral se mueve al minuto y nunca hacia atrás', () => {
  /**
   * La regla cierra huecos, y cerrarlos es lo que el alumno ve. El paso con el
   * que se cuenta se ancla en `desde`, así que su tamaño es también el grano del
   * resultado: con media hora, el umbral saltaba de 30 en 30 y RETROCEDÍA 29 al
   * cruzar la noche del viernes —un hueco cerrado volvía a abrirse—.
   */
  it('avanzar un minuto mueve el umbral un minuto', () => {
    const martes = new Date('2026-09-08T16:00:00Z');
    const antes = sumarHorasHabiles(martes).getTime();
    const despues = sumarHorasHabiles(new Date(martes.getTime() + 60_000)).getTime();
    expect((despues - antes) / 60_000).toBe(1);
  });

  /** Cuántas veces el umbral da un paso atrás en un barrido. */
  function retrocesos(desdeISO: string, minutos: number, paso = 1): number {
    let previo = -Infinity;
    let cuantos = 0;
    const inicio = new Date(desdeISO).getTime();
    for (let i = 0; i < minutos; i += paso) {
      const umbral = sumarHorasHabiles(new Date(inicio + i * 60_000)).getTime();
      if (umbral < previo) cuantos += 1;
      previo = umbral;
    }
    return cuantos;
  }

  it('no retrocede al cruzar la noche del viernes, que es donde fallaba', () => {
    // Tres horas a caballo de la medianoche del viernes, minuto a minuto: es
    // ahí donde cambiaba qué pasos caían en fin de semana y el umbral daba
    // marcha atrás.
    expect(retrocesos('2026-09-04T04:30:00Z', 180)).toBe(0);
  });

  it('tampoco al volver el lunes', () => {
    expect(retrocesos('2026-09-07T04:30:00Z', 180)).toBe(0);
  });

  it('ni en el resto de la semana', () => {
    // A paso más grueso: el barrido fino ya cubre las dos fronteras, y aquí lo
    // que se comprueba es que no aparezca otra en medio.
    expect(retrocesos('2026-09-03T06:00:00Z', 60 * 24 * 7, 15)).toBe(0);
  });
});
