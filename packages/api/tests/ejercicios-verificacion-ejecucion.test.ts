/**
 * Chequeos del verificador que SÍ compilan y ejecutan. Necesitan el toolchain
 * instalado (ver JUEZ.md §6), así que la suite se OMITE cuando no lo hay —
 * mismo criterio que `idor.test.ts`, que se omite sin API.
 *
 * Usa Swift a propósito: `kotlinc` arranca una JVM por compilación y tarda
 * ~10× más, lo que volvería la suite impracticable. La lógica bajo prueba es
 * independiente del lenguaje.
 */
import { describe, it, expect } from 'vitest';
import { revisarEjecucion, type EjercicioVerificable } from '../src/services/ejercicios-verificacion.service.js';
import { lenguajeConfigurado } from '../src/services/judge/index.js';

const HAY_SWIFT = lenguajeConfigurado('swift');

const SUMA = `let p = readLine()!.split(separator: " ").map { Int($0)! }
print(p[0] + p[1])`;
const SUMA_ALT = `let p = readLine()!.split(separator: " ")
var t = 0
for x in p { t += Int(x)! }
print(t)`;
const RESTA = `let p = readLine()!.split(separator: " ").map { Int($0)! }
print(p[0] - p[1])`;
const STUB = `// TODO: imprime la suma
_ = readLine()`;

function ejercicio(over: Partial<EjercicioVerificable> = {}): EjercicioVerificable {
  return {
    slug: 'suma', titulo: 'Suma', publicado: true,
    lenguajes: ['swift'], modoEvaluacion: 'programa',
    plantillaCodigo: {}, codigoInicial: {}, solucionesReferencia: {},
    casos: [
      { entrada: '1 2\n', salidaEsperada: '3', oculto: false },
      { entrada: '10 5\n', salidaEsperada: '15', oculto: true },
    ],
    limiteTiempoMs: 8000, limiteMemoriaMb: 256,
    ...over,
  };
}

const codigos = async (ej: EjercicioVerificable) =>
  (await revisarEjecucion(ej)).map((h) => h.codigo).sort();

describe.skipIf(!HAY_SWIFT)('revisarEjecucion (requiere toolchain de Swift)', () => {
  it('solución correcta y stub sano: sin hallazgos', async () => {
    expect(await codigos(ejercicio({
      solucionesReferencia: { swift: [SUMA] },
      codigoInicial: { swift: STUB },
    }))).toEqual([]);
  }, 120_000);

  it('una solución de referencia que no pasa es error', async () => {
    expect(await codigos(ejercicio({ solucionesReferencia: { swift: [RESTA] } })))
      .toEqual(['solucion-rechazada']);
  }, 120_000);

  it('dos soluciones válidas equivalentes no generan ruido', async () => {
    expect(await codigos(ejercicio({ solucionesReferencia: { swift: [SUMA, SUMA_ALT] } })))
      .toEqual([]);
  }, 120_000);

  it('delata casos sobreajustados cuando dos soluciones válidas discrepan', async () => {
    // La salida esperada fija el orden de aparición: la solución que ordena es
    // igual de válida como programa y sin embargo falla. Eso es un defecto de
    // los CASOS, y solo se ve teniendo más de una solución.
    const ej = ejercicio({
      casos: [{ entrada: 'c a b\n', salidaEsperada: 'c\na\nb', oculto: false }],
      solucionesReferencia: {
        swift: [
          'readLine()!.split(separator: " ").forEach { print($0) }',
          'readLine()!.split(separator: " ").sorted().forEach { print($0) }',
        ],
      },
    });
    expect(await codigos(ej)).toEqual(['casos-sobreajustados', 'solucion-rechazada']);
  }, 120_000);

  it('detecta el código inicial que ya viene resuelto', async () => {
    expect(await codigos(ejercicio({
      solucionesReferencia: { swift: [SUMA] },
      codigoInicial: { swift: SUMA },
    }))).toEqual(['inicial-aceptado']);
  }, 120_000);

  it('avisa (no falla) cuando el código inicial no compila', async () => {
    // Es AVISO y no error a propósito: en los ejercicios que piden declarar un
    // tipo o implementar una interfaz, el starter no compila por definición.
    const h = await revisarEjecucion(ejercicio({
      solucionesReferencia: { swift: [SUMA] },
      codigoInicial: { swift: 'let x: Int = "no soy int"' },
    }));
    expect(h.map((x) => x.codigo)).toEqual(['inicial-no-compila']);
    expect(h[0].nivel).toBe('aviso');
  }, 120_000);
});
