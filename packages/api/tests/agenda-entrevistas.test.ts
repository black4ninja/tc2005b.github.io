import { describe, it, expect } from 'vitest';
import {
  esDiaHabil, sumarHorasHabiles, puedeAgendar, puedeCancelar, huecosDelDia, huecoAbierto,
  numerarIntentos, planificarBloques, puedeSerOtroIntento,
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

describe('puedeSerOtroIntento', () => {
  const primera = qro('2026-09-03T10:00:00');

  it('el primero de una competencia no choca con nada', () => {
    expect(puedeSerOtroIntento([], qro('2026-09-01T10:00:00'))).toBe(true);
  });

  it('un día posterior vale', () => {
    expect(puedeSerOtroIntento([primera], qro('2026-09-04T09:00:00'))).toBe(true);
  });

  it('el MISMO día no, aunque sea más tarde', () => {
    // Dos entrevistas de lo mismo con dos horas de diferencia son la misma
    // entrevista repetida: no da tiempo a repasar nada.
    expect(puedeSerOtroIntento([primera], qro('2026-09-03T12:00:00'))).toBe(false);
    expect(puedeSerOtroIntento([primera], qro('2026-09-03T08:00:00'))).toBe(false);
  });

  it('un día ANTERIOR tampoco: el segundo no pasa antes que el primero', () => {
    // Es el fallo que había: el número de intento sale del orden de reserva, así
    // que se podía agendar el «primero» el 3 y el «segundo» el 1.
    expect(puedeSerOtroIntento([primera], qro('2026-09-01T10:00:00'))).toBe(false);
  });

  it('con dos previas tiene que ir después de las DOS', () => {
    const segunda = qro('2026-09-10T10:00:00');
    expect(puedeSerOtroIntento([primera, segunda], qro('2026-09-05T10:00:00'))).toBe(false);
    expect(puedeSerOtroIntento([primera, segunda], qro('2026-09-11T10:00:00'))).toBe(true);
  });

  it('manda el día del curso, no el UTC', () => {
    // 2026-09-04T02:00Z son todavía las 20:00 del día 3 en Querétaro: mismo día
    // que la primera, así que no vale.
    expect(puedeSerOtroIntento([primera], new Date('2026-09-04T02:00:00Z'))).toBe(false);
  });
});

describe('huecoAbierto', () => {
  const nueve = qro('2026-08-27T09:00:00');
  const nueveCinco = qro('2026-08-27T09:05:00');

  it('un hueco de un día abierto y sin cerrar admite reservas', () => {
    expect(huecoAbierto(false, [], nueve)).toBe(true);
  });

  it('el hueco cerrado a mano no las admite', () => {
    expect(huecoAbierto(false, [nueve.toISOString()], nueve)).toBe(false);
  });

  it('cerrar un hueco no toca a los demás', () => {
    expect(huecoAbierto(false, [nueve.toISOString()], nueveCinco)).toBe(true);
  });

  it('con el día cerrado no admite ninguno, esté o no en la lista', () => {
    expect(huecoAbierto(true, [], nueve)).toBe(false);
    expect(huecoAbierto(true, [nueve.toISOString()], nueve)).toBe(false);
  });
});

describe('numerarIntentos', () => {
  it('numera por orden de reserva', () => {
    const n = numerarIntentos([
      { id: 'b', creada: qro('2026-08-20T12:00:00') },
      { id: 'a', creada: qro('2026-08-19T12:00:00') },
    ]);
    expect(n.get('a')).toBe(1);
    expect(n.get('b')).toBe(2);
  });

  it('cambiar la cita de hora NO la renumera', () => {
    // El caso que lo motivó: el profesor mueve a alguien de hueco y le
    // cambiaban el número de intento —y con él la pregunta que le tocaba—.
    // Mover es cambiar de sitio; las oportunidades no se tocan.
    const reservas = [
      { id: 'primera', creada: qro('2026-08-19T12:00:00') },
      { id: 'segunda', creada: qro('2026-08-20T12:00:00') },
    ];
    const antes = numerarIntentos(reservas);
    // La hora ya no entra en la cuenta: da igual dónde acabe cada una.
    const despues = numerarIntentos([...reservas].reverse());
    expect(antes.get('primera')).toBe(1);
    expect(despues.get('primera')).toBe(1);
    expect(despues.get('segunda')).toBe(2);
  });

  it('cancelar la primera asciende a la que queda', () => {
    const n = numerarIntentos([{ id: 'b', creada: qro('2026-08-20T12:00:00') }]);
    expect(n.get('b')).toBe(1);
  });

  it('con la misma marca desempata el id, para que el número no baile', () => {
    const misma = qro('2026-08-19T12:00:00');
    const n = numerarIntentos([{ id: 'z', creada: misma }, { id: 'a', creada: misma }]);
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

describe('planificarBloques', () => {
  const bloque = (desde: string, hasta: string) => ({ inicio: qro(desde), fin: qro(hasta) });

  it('lo que no choca con nada, entra', () => {
    const plan = planificarBloques(
      [bloque('2026-09-07T09:00:00', '2026-09-07T11:00:00')],
      [],
    );
    expect(plan.map((p) => p.estado)).toEqual(['nuevo']);
  });

  it('el mismo bloque otra vez es un duplicado, no un solape', () => {
    // Se distinguen porque no se explican igual: «esto ya lo tienes» no deja
    // nada que decidir; «se pisa con aquello» a lo mejor sí.
    const ya = [bloque('2026-09-07T09:00:00', '2026-09-07T11:00:00')];
    const plan = planificarBloques([bloque('2026-09-07T09:00:00', '2026-09-07T11:00:00')], ya);
    expect(plan[0].estado).toBe('duplicado');
    expect(plan[0].choca).toEqual(ya[0]);
  });

  it('un horario que se mete dentro de otro abierto se salta', () => {
    // Es el caso que partía las mismas horas dos veces: el hueco de las 10:00
    // existía por duplicado y dos alumnos lo veían libre.
    const ya = [bloque('2026-09-09T15:30:00', '2026-09-09T17:00:00')];
    const plan = planificarBloques([bloque('2026-09-09T16:00:00', '2026-09-09T18:00:00')], ya);
    expect(plan[0].estado).toBe('solapa');
  });

  it('tocarse por el extremo no es pisarse', () => {
    const ya = [bloque('2026-09-07T09:00:00', '2026-09-07T11:00:00')];
    const plan = planificarBloques([bloque('2026-09-07T11:00:00', '2026-09-07T13:00:00')], ya);
    expect(plan[0].estado).toBe('nuevo');
  });

  it('dos bloques del MISMO lote tampoco pueden pisarse entre ellos', () => {
    // Nadie los ha creado todavía, así que compararlos solo contra lo existente
    // los dejaba pasar a los dos.
    const plan = planificarBloques([
      bloque('2026-09-07T09:00:00', '2026-09-07T11:00:00'),
      bloque('2026-09-07T10:00:00', '2026-09-07T12:00:00'),
    ], []);
    expect(plan.map((p) => p.estado)).toEqual(['nuevo', 'solapa']);
  });

  it('días distintos a la misma hora no se estorban', () => {
    const plan = planificarBloques([
      bloque('2026-09-07T09:00:00', '2026-09-07T11:00:00'),
      bloque('2026-09-08T09:00:00', '2026-09-08T11:00:00'),
      bloque('2026-09-09T09:00:00', '2026-09-09T11:00:00'),
    ], []);
    expect(plan.every((p) => p.estado === 'nuevo')).toBe(true);
  });
});
