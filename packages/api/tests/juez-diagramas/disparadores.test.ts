/**
 * Lectura del disparador de una transición.
 *
 * Un disparador es un evento de LLAMADA: `cargar()` y `cargar` nombran la misma
 * operación. Compararlos como cadenas distintas hacía fallar a un alumno por
 * escribir dos paréntesis, que es justo el tipo de veredicto que mide la
 * notación en lugar del modelo. Estos casos fijan que la lista de argumentos se
 * descarta, igual que en los mensajes de secuencia.
 */
import { describe, it, expect } from 'vitest';
import { disparadorDeTransicion } from '../../src/services/juez-diagramas/catalogo.js';
import { evaluarDiagrama } from '../../src/services/juez-diagramas/evaluar.js';

describe('disparadorDeTransicion', () => {
  it('descarta guarda, acción y lista de argumentos', () => {
    expect(disparadorDeTransicion('pulsar')).toBe('pulsar');
    expect(disparadorDeTransicion('pulsar()')).toBe('pulsar');
    expect(disparadorDeTransicion('reanudar(desde Int)')).toBe('reanudar');
    expect(disparadorDeTransicion('pulsar [hay red] / cargar()')).toBe('pulsar');
    expect(disparadorDeTransicion('recibir(bloque) [ultimo] / cerrar()')).toBe('recibir');
    expect(disparadorDeTransicion('')).toBe('');
  });
});

describe('trazabilidad con el clasificador', () => {
  const contexto = [{
    nombre: 'clases' as const,
    tipo: 'clases' as const,
    motor: 'mermaid' as const,
    codigo: `classDiagram
  class Descarga {
    +iniciar() void
    +completar() void
  }`,
  }];

  const juzgar = (maquina: string) => evaluarDiagrama({
    motor: 'mermaid',
    tipoDiagrama: 'estados',
    codigo: maquina,
    aserciones: [{
      tipo: 'disparador-existe-como-operacion',
      parametros: { contexto: 'clases', clasificador: 'Descarga' },
    }],
    contexto,
  });

  it('acepta el disparador escrito con paréntesis', async () => {
    const r = await juzgar('stateDiagram-v2\n  [*] --> Quieta\n  Quieta --> EnCurso: iniciar()\n  EnCurso --> [*]: completar()');
    expect(r.aserciones[0].paso, r.aserciones[0].detalle).toBe(true);
  });

  it('acepta el mismo disparador escrito sin paréntesis', async () => {
    const r = await juzgar('stateDiagram-v2\n  [*] --> Quieta\n  Quieta --> EnCurso: iniciar\n  EnCurso --> [*]: completar');
    expect(r.aserciones[0].paso, r.aserciones[0].detalle).toBe(true);
  });

  it('sigue rechazando un disparador que no es operación del clasificador', async () => {
    const r = await juzgar('stateDiagram-v2\n  [*] --> Quieta\n  Quieta --> EnCurso: usuarioTocaBoton()\n  EnCurso --> [*]: completar');
    expect(r.aserciones[0].paso).toBe(false);
    expect(r.aserciones[0].detalle).toContain('usuarioTocaBoton');
  });
});
