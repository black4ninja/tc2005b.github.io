import { describe, it, expect } from 'vitest';
import {
  agruparPorColumna, rejillaProyeccion, sumaPuntos, iniciales, rangoFechas,
  permiteMover, puntosTexto, estaEstimada, cuentaRegresiva, historiasDeOtraEpica,
  PUNTOS_DEMASIADO, PUNTOS_DESCONOCIDO,
} from './scrum';
import type { Historia } from './scrum';

function historia(parcial: Partial<Historia>): Historia {
  return {
    id: 'h',
    porQue: '',
    que: 'algo',
    como: '',
    puntos: 0,
    prioridad: 'should',
    columna: 'backlog',
    orden: 0,
    responsable: null,
    epica: null,
    archivada: false,
    ...parcial,
  };
}

describe('rejillaProyeccion', () => {
  it('un equipo ocupa la pantalla entera y con todo el detalle', () => {
    expect(rejillaProyeccion(1)).toEqual({ cols: 1, filas: 1, escala: 'full' });
  });

  it('dos y tres van en una fila', () => {
    expect(rejillaProyeccion(2)).toEqual({ cols: 2, filas: 1, escala: 'md' });
    expect(rejillaProyeccion(3)).toEqual({ cols: 3, filas: 1, escala: 'md' });
  });

  it('a partir de cuatro se parte en filas en vez de seguir estrechando', () => {
    // Es la razón de ser de la función: cuatro columnas de 400 px dejan
    // tarjetas que no se leen desde el fondo del aula.
    expect(rejillaProyeccion(4)).toEqual({ cols: 2, filas: 2, escala: 'md' });
    expect(rejillaProyeccion(5)).toEqual({ cols: 3, filas: 2, escala: 'md' });
    expect(rejillaProyeccion(6)).toEqual({ cols: 3, filas: 2, escala: 'md' });
  });

  it('de siete a nueve baja también el detalle de la tarjeta', () => {
    expect(rejillaProyeccion(7)).toEqual({ cols: 3, filas: 3, escala: 'sm' });
    expect(rejillaProyeccion(9)).toEqual({ cols: 3, filas: 3, escala: 'sm' });
  });

  it('sin equipos no revienta', () => {
    expect(rejillaProyeccion(0)).toEqual({ cols: 1, filas: 1, escala: 'full' });
  });
});

describe('agruparPorColumna', () => {
  it('deja las cinco columnas aunque estén vacías', () => {
    const grupos = agruparPorColumna([]);
    expect(Object.keys(grupos)).toEqual(['backlog', 'planned', 'doing', 'review', 'done']);
    expect(grupos.doing).toEqual([]);
  });

  it('conserva el orden en el que vienen', () => {
    const grupos = agruparPorColumna([
      historia({ id: 'a', columna: 'doing' }),
      historia({ id: 'b', columna: 'doing' }),
    ]);
    expect(grupos.doing.map((h) => h.id)).toEqual(['a', 'b']);
  });

  it('una columna desconocida cae en el backlog en vez de perderse', () => {
    const rara = historia({ id: 'x', columna: 'blocked' as never });
    expect(agruparPorColumna([rara]).backlog.map((h) => h.id)).toEqual(['x']);
  });
});

describe('sumaPuntos', () => {
  it('suma la estimación de la columna', () => {
    expect(sumaPuntos([historia({ puntos: 3 }), historia({ puntos: 5 })])).toBe(8);
  });

  it('lo no estimado no suma', () => {
    expect(sumaPuntos([historia({ puntos: 0 }), historia({ puntos: 2 })])).toBe(2);
  });
});

describe('iniciales', () => {
  it('toma las dos primeras palabras', () => {
    expect(iniciales('Ana Karen Salinas')).toBe('AK');
  });

  it('aguanta un nombre de una sola palabra', () => {
    expect(iniciales('Renata')).toBe('R');
  });

  it('no se atraganta con espacios de sobra', () => {
    expect(iniciales('  Diego   Montoya ')).toBe('DM');
  });
});

describe('puntosTexto', () => {
  it('«?» y «∞» no se enseñan como cifras', () => {
    expect(puntosTexto(PUNTOS_DESCONOCIDO)).toBe('?');
    expect(puntosTexto(PUNTOS_DEMASIADO)).toBe('∞');
    expect(puntosTexto(3)).toBe('3');
  });

  it('ninguna de las dos cuenta como estimación', () => {
    expect(estaEstimada(PUNTOS_DESCONOCIDO)).toBe(false);
    expect(estaEstimada(PUNTOS_DEMASIADO)).toBe(false);
    expect(estaEstimada(5)).toBe(true);
  });
});

describe('permiteMover', () => {
  it('espeja la regla del servidor: en planning solo backlog → planned', () => {
    expect(permiteMover('backlog-a-planned', 'backlog', 'planned')).toBe(true);
    expect(permiteMover('backlog-a-planned', 'planned', 'doing')).toBe(false);
  });

  it('quedarse en la misma columna siempre vale', () => {
    expect(permiteMover('ninguno', 'doing', 'doing')).toBe(true);
  });
});

describe('cuentaRegresiva', () => {
  const arranque = '2026-09-08T12:00:00.000Z';
  const t = (segundos: number) => new Date(arranque).getTime() + segundos * 1000;

  it('cuenta hacia atrás en mm:ss', () => {
    expect(cuentaRegresiva(arranque, 180, t(30))?.texto).toBe('2:30');
  });

  it('pasado el tiempo sigue contando en negativo, no se queda en cero', () => {
    // Cuánto se pasaron es justo el dato del que habla la retrospectiva.
    const fuera = cuentaRegresiva(arranque, 60, t(75));
    expect(fuera?.agotado).toBe(true);
    expect(fuera?.texto).toBe('-0:15');
  });

  it('sin duración no hay reloj', () => {
    expect(cuentaRegresiva(arranque, null, t(10))).toBeNull();
    expect(cuentaRegresiva(null, 60, t(10))).toBeNull();
  });
});

describe('historiasDeOtraEpica', () => {
  const equipo = (epicaActual: string | null, historias: Historia[]) => ({
    id: 'e', nombre: '', color: '', objetivo: '', orden: 0, po: null,
    epicaActual, bloqueoPendiente: 0, miembros: [], historias,
    epicas: [], retro: [], compromisos: [], marcador: null, archivadas: 0,
  });

  it('señala lo que está en el sprint y no es de la épica en curso', () => {
    const fuera = historiasDeOtraEpica(equipo('A', [
      historia({ id: '1', columna: 'doing', epica: 'B' }),
      historia({ id: '2', columna: 'doing', epica: 'A' }),
    ]));
    expect(fuera.map((h) => h.id)).toEqual(['1']);
  });

  it('el backlog puede tener de todo: ahí no hay compromiso', () => {
    const fuera = historiasDeOtraEpica(equipo('A', [
      historia({ id: '1', columna: 'backlog', epica: 'B' }),
    ]));
    expect(fuera).toEqual([]);
  });

  it('sin épica elegida no hay nada que romper', () => {
    const fuera = historiasDeOtraEpica(equipo(null, [
      historia({ id: '1', columna: 'doing', epica: 'B' }),
    ]));
    expect(fuera).toEqual([]);
  });
});

describe('rangoFechas', () => {
  it('sin fechas no dice nada', () => {
    expect(rangoFechas(null, null)).toBe('');
  });

  it('con las dos las une con un guion', () => {
    const texto = rangoFechas('2026-09-08T12:00:00.000Z', '2026-09-19T12:00:00.000Z');
    expect(texto).toContain('–');
  });

  it('con una sola dice cuál es', () => {
    expect(rangoFechas('2026-09-08T12:00:00.000Z', null)).toMatch(/^desde el /);
    expect(rangoFechas(null, '2026-09-19T12:00:00.000Z')).toMatch(/^hasta el /);
  });
});
