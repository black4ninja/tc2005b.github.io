import { describe, it, expect } from 'vitest';
import { repartirEnEquipos } from '../src/controllers/scrum.controller.js';
import { elegirDevueltas } from '../src/services/scrum-cierre.service.js';
import { esDeLaPartida } from '../src/services/scrum.service.js';
import {
  esColumna, esPrioridad, esPuntos, estaEstimada, faltaEpica, necesitaResponsable,
  permiteMover,
  COLUMNAS, COLUMNAS_DEL_SPRINT, ETAPAS_SEMILLA, MAX_EQUIPOS, MAX_INVITADOS,
  MAX_PARTIDAS_VIVAS, POLITICA_POR_DEFECTO,
  POLITICA_SIN_ETAPA,
  PUNTOS_DEMASIADO, PUNTOS_DESCONOCIDO,
} from '../src/constants/scrum.js';

/**
 * Las reglas del módulo "Actividad de Scrum" que se pueden probar sin Parse.
 *
 * Son las que la dinámica hace cumplir a gritos en el aula: el reparto de
 * equipos, qué deja mover cada etapa, qué cuenta como estimado y cómo se cobra
 * la deuda técnica. Todas se ejecutan con la clase esperando y ninguna avisa al
 * fallar: simplemente el ejercicio deja de enseñar lo que tenía que enseñar.
 */

describe('repartirEnEquipos', () => {
  it('reparte en rueda para no dejar un equipo cojo al final', () => {
    // 13 en equipos de 5: por bloques saldría 5-5-3; en rueda, 5-4-4.
    const equipos = repartirEnEquipos([...Array(13).keys()], 5);
    expect(equipos.map((e) => e.length)).toEqual([5, 4, 4]);
  });

  it('no pierde ni duplica a nadie', () => {
    const gente = [...Array(23).keys()];
    const repartidos = repartirEnEquipos(gente, 4).flat();
    expect(repartidos.sort((a, b) => a - b)).toEqual(gente);
  });

  it('redondea al número de equipos más cercano', () => {
    expect(repartirEnEquipos([...Array(12).keys()], 5)).toHaveLength(2);
    expect(repartirEnEquipos([...Array(13).keys()], 5)).toHaveLength(3);
  });

  it('con menos gente que el tamaño pedido hace un solo equipo', () => {
    expect(repartirEnEquipos([1, 2], 5)).toEqual([[1, 2]]);
  });

  it('sin nadie que repartir no inventa equipos vacíos', () => {
    expect(repartirEnEquipos([], 5)).toEqual([]);
  });
});

describe('permiteMover', () => {
  it('en planning solo se entra del backlog a planned', () => {
    expect(permiteMover('backlog-a-planned', 'backlog', 'planned')).toBe(true);
    // Ni sacar del sprint, ni avanzar dentro de él: el sprint no se toca.
    expect(permiteMover('backlog-a-planned', 'planned', 'doing')).toBe(false);
    expect(permiteMover('backlog-a-planned', 'planned', 'backlog')).toBe(false);
    expect(permiteMover('backlog-a-planned', 'backlog', 'doing')).toBe(false);
  });

  it('en grooming solo se ordena el backlog', () => {
    expect(permiteMover('dentro-backlog', 'backlog', 'backlog')).toBe(true);
    expect(permiteMover('dentro-backlog', 'backlog', 'planned')).toBe(false);
  });

  it('en la daily solo se mueve lo que ya está comprometido', () => {
    expect(permiteMover('dentro-sprint', 'doing', 'review')).toBe(true);
    expect(permiteMover('dentro-sprint', 'backlog', 'planned')).toBe(false);
    expect(permiteMover('dentro-sprint', 'planned', 'backlog')).toBe(false);
  });

  it('en review y retro no se mueve nada', () => {
    expect(permiteMover('ninguno', 'doing', 'done')).toBe(false);
  });

  it('quedarse donde está siempre vale: reordenar no es mover de columna', () => {
    expect(permiteMover('ninguno', 'doing', 'doing')).toBe(true);
  });

  it('en desarrollo el sprint está cerrado: ni entra ni sale nada', () => {
    // Es la regla que la propia pista del desarrollo prometía —«no se toma
    // nada nuevo»— y que la política no cumplía. Salir tampoco: devolver al
    // backlog lo que no dio tiempo sería esquivar el bloqueo del cierre.
    expect(permiteMover('dentro-sprint', 'backlog', 'planned')).toBe(false);
    expect(permiteMover('dentro-sprint', 'planned', 'backlog')).toBe(false);
    expect(permiteMover('dentro-sprint', 'planned', 'doing')).toBe(true);
  });

  it('«todos» sigue existiendo para quien lo configure a mano', () => {
    expect(permiteMover('todos', 'backlog', 'done')).toBe(true);
  });
});

describe('sin etapa abierta', () => {
  it('no deja tocar ninguna de las dos mitades del tablero', () => {
    // La actividad la abre el profesor. Un equipo que se adelanta a escribir
    // historias está trabajando fuera del ciclo, que es lo que esto enseña.
    expect(POLITICA_SIN_ETAPA.backlog).toBe('lectura');
    expect(POLITICA_SIN_ETAPA.sprint).toBe('lectura');
    expect(permiteMover(POLITICA_SIN_ETAPA.movimientos, 'backlog', 'planned')).toBe(false);
    expect(permiteMover(POLITICA_SIN_ETAPA.movimientos, 'doing', 'done')).toBe(false);
  });

  it('no es la política de base, que sí deja hacerlo todo', () => {
    // Son dos cosas distintas y confundirlas abría el tablero entero: la de
    // base es el punto de partida sobre el que cada etapa recorta.
    expect(POLITICA_POR_DEFECTO.backlog).toBe('editable');
    expect(permiteMover(POLITICA_POR_DEFECTO.movimientos, 'backlog', 'done')).toBe(true);
  });

  it('tampoco saca el burndown ni el tablero de retrospectiva', () => {
    expect(POLITICA_SIN_ETAPA.burndown).toBe(false);
    expect(POLITICA_SIN_ETAPA.retro).toBe(false);
  });
});

describe('responsable y backlog', () => {
  it('nada se pone en marcha sin alguien que responda', () => {
    // La otra mitad de la regla: en el backlog no se puede asignar, y a partir
    // de «doing» no se puede avanzar sin haberlo hecho. Entre las dos, repartir
    // deja de ser opcional sin que nadie tenga que recordarlo.
    expect(necesitaResponsable('doing')).toBe(true);
    expect(necesitaResponsable('review')).toBe(true);
    expect(necesitaResponsable('done')).toBe(true);
  });

  it('entrar al sprint todavía no lo pide: comprometerse es del equipo entero', () => {
    expect(necesitaResponsable('planned')).toBe(false);
    expect(necesitaResponsable('backlog')).toBe(false);
  });

  it('el backlog no es una columna del sprint', () => {
    // De aquí sale la regla: repartirse el trabajo pertenece al sprint, y lo
    // que está en el backlog todavía no lo ha comprometido nadie.
    expect(COLUMNAS_DEL_SPRINT).not.toContain('backlog');
    expect(COLUMNAS).toContain('backlog');
  });
});

describe('la daily se mira', () => {
  const daily = ETAPAS_SEMILLA.find((e) => e.nombre === 'Daily')!;

  it('no deja mover ninguna tarjeta', () => {
    // Son treinta segundos para decir en qué va cada uno. Con las tarjetas
    // sueltas se convierte en el rato de poner el tablero al día, que es el
    // trabajo que ya debería estar hecho.
    expect(daily.politica.movimientos).toBe('ninguno');
    expect(permiteMover(daily.politica.movimientos, 'doing', 'review')).toBe(false);
  });

  it('deja el sprint backlog en lectura y el backlog plegado', () => {
    expect(daily.politica.sprint).toBe('lectura');
    expect(daily.politica.backlog).toBe('plegado');
  });

  it('y enseña el burndown, que es contra lo que se habla', () => {
    expect(daily.politica.burndown).toBe(true);
  });
});

describe('estimación', () => {
  it('«?» y «∞» no son estimaciones y no dejan entrar al sprint', () => {
    expect(estaEstimada(PUNTOS_DESCONOCIDO)).toBe(false);
    expect(estaEstimada(PUNTOS_DEMASIADO)).toBe(false);
    expect(estaEstimada(3)).toBe(true);
  });

  it('la escala llega hasta 5: más arriba lo que toca es partir la historia', () => {
    expect(esPuntos(5)).toBe(true);
    expect(esPuntos(8)).toBe(false);
    expect(esPuntos(13)).toBe(false);
    expect(esPuntos(PUNTOS_DEMASIADO)).toBe(true);
    expect(esPuntos('3' as unknown as number)).toBe(false);
  });
});

describe('elegirDevueltas', () => {
  /** Azar fijo: devuelve siempre 0, así la baraja queda invertida y es estable. */
  const sinAzar = () => 0;

  it('devuelve historias hasta cubrir el bloqueo, aunque se pase', () => {
    // 7 de bloqueo con tarjetas de 5 y 3: se van las dos, 8 puntos. Buscar la
    // combinación exacta convertiría el castigo en un rompecabezas resoluble.
    const elegidas = elegirDevueltas([{ puntos: 5 }, { puntos: 3 }], 7, sinAzar);
    expect(elegidas.reduce((t, e) => t + e.puntos, 0)).toBeGreaterThanOrEqual(7);
    expect(elegidas).toHaveLength(2);
  });

  it('para en cuanto cubre el bloqueo', () => {
    const elegidas = elegirDevueltas([{ puntos: 5 }, { puntos: 3 }, { puntos: 2 }], 3, sinAzar);
    expect(elegidas).toHaveLength(1);
  });

  it('sin bloqueo no devuelve nada', () => {
    expect(elegirDevueltas([{ puntos: 5 }], 0, sinAzar)).toEqual([]);
  });

  it('si el bloqueo supera lo planeado se lleva todo', () => {
    // «Solo podrán seguir trabajando en lo que dejaron del sprint anterior.»
    const elegidas = elegirDevueltas([{ puntos: 2 }, { puntos: 1 }], 20, sinAzar);
    expect(elegidas).toHaveLength(2);
  });

  it('sin candidatas no revienta', () => {
    expect(elegirDevueltas([], 9, sinAzar)).toEqual([]);
  });
});

describe('columnas del tablero', () => {
  it('el sprint backlog son las cuatro de después del backlog', () => {
    expect(COLUMNAS_DEL_SPRINT).toEqual(['planned', 'doing', 'review', 'done']);
    expect(COLUMNAS[0]).toBe('backlog');
  });

  it('reconoce las columnas válidas y rechaza el resto', () => {
    expect(esColumna('doing')).toBe(true);
    expect(esColumna('blocked')).toBe(false);
  });
});

describe('prioridad y tope de equipos', () => {
  it('acepta las cuatro prioridades MoSCoW y nada más', () => {
    expect(esPrioridad('must')).toBe(true);
    expect(esPrioridad("won't")).toBe(false);
  });

  it('son nueve equipos: lo que cabe legible en una rejilla de 3 × 3', () => {
    expect(MAX_EQUIPOS).toBe(9);
  });
});

describe('quién es de una partida de práctica', () => {
  it('manda cualquiera de dentro, no solo quien la abrió', () => {
    // La partida simula el equipo de la clase, y en un equipo el turno de
    // conducir el ciclo rota. Si mandara solo el dueño, un invitado no podría
    // ni pasar de etapa cuando le toca.
    expect(esDeLaPartida('ana', ['ana', 'beto'], 'beto')).toBe(true);
    expect(esDeLaPartida('ana', ['ana', 'beto'], 'ana')).toBe(true);
  });

  it('quien la abrió sigue dentro aunque no figure en el equipo', () => {
    expect(esDeLaPartida('ana', [], 'ana')).toBe(true);
  });

  it('deja fuera a quien no está invitado', () => {
    expect(esDeLaPartida('ana', ['ana', 'beto'], 'carla')).toBe(false);
  });

  it('una dinámica de clase no tiene dueño, y eso no mete a nadie', () => {
    // El caso que importa: `getPropietarioId()` devuelve null en las del
    // profesor. Sin este corte, un alumno sin sesión resuelta pasaría el filtro.
    expect(esDeLaPartida(null, [], '')).toBe(false);
    expect(esDeLaPartida(null, ['ana'], 'beto')).toBe(false);
  });
});

describe('topes de las partidas de práctica', () => {
  it('cinco partidas vivas por alumno: la base es la de producción', () => {
    expect(MAX_PARTIDAS_VIVAS).toBe(5);
  });

  it('caben menos personas que en la clase entera', () => {
    expect(MAX_INVITADOS).toBeLessThan(MAX_EQUIPOS * 6);
  });
});

describe('una historia pertenece a una épica', () => {
  it('sin ninguna épica definida no hay historia que escribir', () => {
    // El backlog sin épicas es una lista de tareas sueltas: no dice a qué se
    // está apuntando el equipo, que es justo lo contrario de lo que se enseña.
    expect(faltaEpica(0, null)).toBe('ninguna');
    expect(faltaEpica(0, 'aBcD1234')).toBe('ninguna');
  });

  it('habiéndolas, hay que decir a cuál pertenece', () => {
    expect(faltaEpica(2, null)).toBe('sin-elegir');
    expect(faltaEpica(2, '')).toBe('sin-elegir');
    expect(faltaEpica(2, undefined)).toBe('sin-elegir');
  });

  it('con épica elegida se puede escribir', () => {
    expect(faltaEpica(1, 'aBcD1234')).toBeNull();
  });
});
