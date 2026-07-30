/**
 * Chequeos estructurales del verificador de ejercicios. Lógica pura: corre sin
 * servidor, sin BD y sin compiladores (los chequeos que sí compilan viven en
 * `revisarEjecucion` y se prueban con `scripts/verificar-ejercicios.ts`).
 */
import { describe, it, expect } from 'vitest';
import { componerCodigo, MARCADOR_SOLUCION } from '../src/models/EjercicioProgramacion.js';
import {
  revisarEstructura,
  type EjercicioVerificable,
} from '../src/services/ejercicios-verificacion.service.js';

/** Ejercicio sano mínimo; cada test rompe solo lo que quiere comprobar. */
function ejercicio(over: Partial<EjercicioVerificable> = {}): EjercicioVerificable {
  return {
    slug: 'suma',
    titulo: 'Suma',
    publicado: true,
    lenguajes: ['kotlin'],
    modoEvaluacion: 'programa',
    plantillaCodigo: {},
    codigoInicial: { kotlin: 'fun main() {}' },
    solucionesReferencia: { kotlin: ['fun main() { println(3) }'] },
    casos: [
      { entrada: '1 2\n', salidaEsperada: '3\n', oculto: false },
      { entrada: '2 3\n', salidaEsperada: '5\n', oculto: true },
    ],
    limiteTiempoMs: 5000,
    limiteMemoriaMb: 256,
    ...over,
  };
}

const codigos = (h: { codigo: string }[]) => h.map((x) => x.codigo);

describe('revisarEstructura', () => {
  it('un ejercicio bien formado no genera hallazgos', () => {
    expect(revisarEstructura(ejercicio())).toEqual([]);
  });

  it('sin casos es error: no hay nada que evaluar', () => {
    const h = revisarEstructura(ejercicio({ casos: [] }));
    expect(codigos(h)).toContain('sin-casos');
    expect(h.find((x) => x.codigo === 'sin-casos')!.nivel).toBe('error');
  });

  it('avisa si ningún caso es oculto', () => {
    const casos = [{ entrada: '1 2\n', salidaEsperada: '3\n', oculto: false }];
    expect(codigos(revisarEstructura(ejercicio({ casos })))).toContain('sin-casos-ocultos');
  });

  it('marca la salida esperada que queda vacía al normalizar', () => {
    // Solo espacios y saltos: normalizarSalida lo deja en '', así que lo pasaría
    // cualquier programa que no imprima nada.
    const casos = [{ entrada: '1\n', salidaEsperada: '   \n\n', oculto: true }];
    expect(codigos(revisarEstructura(ejercicio({ casos })))).toContain('salida-vacia');
  });

  it('NO marca como frágil lo que la comparación ya normaliza', () => {
    // CRLF y espacios al final de línea los absorbe normalizarSalida: marcarlos
    // sería ruido. Este test fija esa decisión.
    const casos = [
      { entrada: '1 2\r\n', salidaEsperada: '3   \r\n', oculto: false },
      { entrada: '2 3\n', salidaEsperada: '5\n\n\n', oculto: true },
    ];
    expect(revisarEstructura(ejercicio({ casos }))).toEqual([]);
  });

  it('detecta entradas repetidas', () => {
    const casos = [
      { entrada: '1 2\n', salidaEsperada: '3\n', oculto: false },
      { entrada: '1 2\n', salidaEsperada: '3\n', oculto: true },
    ];
    expect(codigos(revisarEstructura(ejercicio({ casos })))).toContain('entrada-repetida');
  });

  it('en modo plantilla exige el marcador en cada lenguaje', () => {
    const h = revisarEstructura(
      ejercicio({ modoEvaluacion: 'plantilla', plantillaCodigo: { kotlin: 'fun main() {}' } }),
    );
    expect(codigos(h)).toContain('plantilla-sin-marcador');
    expect(h.find((x) => x.codigo === 'plantilla-sin-marcador')!.nivel).toBe('error');
  });

  it('acepta la plantilla que sí trae el marcador', () => {
    const plantilla = `${MARCADOR_SOLUCION}\nfun main() { println(suma(1,2)) }`;
    const h = revisarEstructura(
      ejercicio({ modoEvaluacion: 'plantilla', plantillaCodigo: { kotlin: plantilla } }),
    );
    expect(codigos(h)).not.toContain('plantilla-sin-marcador');
  });

  it('avisa por lenguaje declarado sin solución de referencia', () => {
    const h = revisarEstructura(ejercicio({ lenguajes: ['kotlin', 'swift'] }));
    const sin = h.filter((x) => x.codigo === 'sin-solucion');
    expect(sin).toHaveLength(1);
    expect(sin[0].lenguaje).toBe('swift');
  });
});

describe('componerCodigo', () => {
  it('en modo programa devuelve el código tal cual', () => {
    expect(componerCodigo('programa', 'IGNORADA', 'CODIGO')).toBe('CODIGO');
  });

  it('en modo plantilla sustituye TODAS las apariciones del marcador', () => {
    const plantilla = `A${MARCADOR_SOLUCION}B${MARCADOR_SOLUCION}C`;
    expect(componerCodigo('plantilla', plantilla, 'X')).toBe('AXBXC');
  });

  it('sin plantilla cae al código del alumno en vez de romper', () => {
    expect(componerCodigo('plantilla', undefined, 'CODIGO')).toBe('CODIGO');
  });
});
