import { describe, it, expect } from 'vitest';
import { crearCarril } from './turnos';

/** Una tarea que no termina hasta que se la resuelve desde fuera. */
function diferida<T>() {
  let resolver!: (v: T) => void;
  let rechazar!: (e: unknown) => void;
  const promesa = new Promise<T>((res, rej) => { resolver = res; rechazar = rej; });
  return { promesa, resolver, rechazar };
}

/** Deja correr las microtareas pendientes. */
const respirar = () => new Promise((r) => setTimeout(r, 0));

describe('crearCarril', () => {
  it('no arranca una tarea hasta que termina la anterior', async () => {
    const enTurno = crearCarril();
    const puertas = [diferida<string>(), diferida<string>(), diferida<string>()];
    const arrancadas: number[] = [];
    let simultaneas = 0;
    let maxSimultaneas = 0;

    const pedidas = puertas.map((p, i) =>
      enTurno(async () => {
        arrancadas.push(i);
        simultaneas += 1;
        maxSimultaneas = Math.max(maxSimultaneas, simultaneas);
        try { return await p.promesa; } finally { simultaneas -= 1; }
      }),
    );

    // Las tres se pidieron a la vez; solo la primera ha empezado.
    await respirar();
    expect(arrancadas).toEqual([0]);

    puertas[0].resolver('a');
    await respirar();
    expect(arrancadas).toEqual([0, 1]);

    puertas[1].resolver('b');
    await respirar();
    expect(arrancadas).toEqual([0, 1, 2]);

    puertas[2].resolver('c');
    expect(await Promise.all(pedidas)).toEqual(['a', 'b', 'c']);
    expect(maxSimultaneas).toBe(1);
  });

  it('respeta el orden en que se pidieron', async () => {
    const enTurno = crearCarril();
    const orden: number[] = [];
    await Promise.all([3, 1, 2].map((n, i) =>
      enTurno(async () => { await respirar(); orden.push(i); return n; }),
    ));
    expect(orden).toEqual([0, 1, 2]);
  });

  it('una tarea que falla no atasca la cola y su error llega a quien la pidió', async () => {
    const enTurno = crearCarril();
    const rota = enTurno(() => Promise.reject(new Error('PlantUML tardó demasiado en responder.')));
    const siguiente = enTurno(() => Promise.resolve('sigue viva'));

    await expect(rota).rejects.toThrow('PlantUML tardó demasiado en responder.');
    await expect(siguiente).resolves.toBe('sigue viva');
  });

  it('una tarea que lanza en síncrono tampoco atasca la cola', async () => {
    const enTurno = crearCarril();
    const rota = enTurno(() => { throw new Error('boom'); });
    const siguiente = enTurno(() => Promise.resolve('ok'));

    await expect(rota).rejects.toThrow('boom');
    await expect(siguiente).resolves.toBe('ok');
  });

  it('cada carril es independiente', async () => {
    const a = crearCarril();
    const b = crearCarril();
    const puerta = diferida<string>();

    const bloqueadaEnA = a(() => puerta.promesa);
    // `b` no tiene por qué esperar a que `a` se destasque.
    await expect(b(() => Promise.resolve('libre'))).resolves.toBe('libre');

    puerta.resolver('por fin');
    await expect(bloqueadaEnA).resolves.toBe('por fin');
  });
});
