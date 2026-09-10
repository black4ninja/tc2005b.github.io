/**
 * Que la salida del alumno salga en UTF-8 pase lo que pase con el entorno.
 *
 * Esta prueba existe por un fallo real: un alumno mandó `println("2 años")` en
 * Kotlin —correcto— y el juez le devolvió `2 a?os` y «respuesta incorrecta».
 * `System.out` no usa `file.encoding` sino `stdout.encoding`, que al escribir a
 * una tubería se deriva del locale; y el sandbox arranca con `--clearenv`, así
 * que dentro el locale es POSIX y su juego de caracteres, ASCII. La JVM no
 * falla: sustituye por `?` lo que no cabe.
 *
 * Corre sin compiladores: solo comprueba cómo se arma el comando.
 */
import { describe, it, expect } from 'vitest';
import { getLenguaje } from '../src/services/judge/lenguajes.js';

const ejecutarKotlin = () => getLenguaje('kotlin').ejecutar({ memoriaMb: 256 });

describe('la JVM escribe en UTF-8', () => {
  it('fuerza el encoding de la salida por propiedad, no por entorno', () => {
    // `stdout.encoding` es la que manda de JDK 19 en adelante, y es la que
    // decide qué pasa con la ñ.
    expect(ejecutarKotlin()).toContain('-Dstdout.encoding=UTF-8');
    expect(ejecutarKotlin()).toContain('-Dstderr.encoding=UTF-8');
  });

  it('cubre también los JDK que usaban el nombre viejo', () => {
    expect(ejecutarKotlin()).toContain('-Dsun.stdout.encoding=UTF-8');
  });

  it('y lo que el alumno lea o escriba en ficheros', () => {
    expect(ejecutarKotlin()).toContain('-Dfile.encoding=UTF-8');
  });

  it('las flags van ANTES de -jar', () => {
    // Después de `-jar main.jar` son argumentos del programa del alumno, no de
    // la JVM: irían a `args` y no harían nada.
    const argv = ejecutarKotlin();
    const jar = argv.indexOf('-jar');
    expect(jar).toBeGreaterThan(-1);
    for (const flag of argv.filter((a) => a.startsWith('-D'))) {
      expect(argv.indexOf(flag)).toBeLessThan(jar);
    }
  });

  it('sigue limitando el heap, que es como se controla la memoria de la JVM', () => {
    // Las flags nuevas no deben haber desplazado a -Xmx: `ulimit -v` mata la
    // JVM, así que este es el único freno de memoria que tiene Kotlin.
    expect(ejecutarKotlin()).toContain('-Xmx256m');
  });
});

describe('el locale del sandbox', () => {
  it('Kotlin y Swift arrancan con un locale UTF-8', () => {
    // Cinturón sobre los tirantes de las flags: arregla a cualquier lenguaje,
    // incluidos los que se añadan después sin acordarse de esto.
    for (const lenguaje of ['kotlin', 'swift'] as const) {
      const { env } = getLenguaje(lenguaje);
      expect(env.LANG, lenguaje).toBe('C.UTF-8');
      expect(env.LC_ALL, lenguaje).toBe('C.UTF-8');
    }
  });

  it('no se lleva por delante el PATH del toolchain', () => {
    for (const lenguaje of ['kotlin', 'swift'] as const) {
      expect(getLenguaje(lenguaje).env.PATH, lenguaje).toContain('/usr/bin');
    }
  });
});
