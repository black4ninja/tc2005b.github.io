/**
 * Config por lenguaje: cómo se escribe el fuente, se compila y se ejecuta, y qué
 * necesita montarse (read-only) dentro del sandbox.
 *
 * Memoria: la JVM reserva muchísima memoria VIRTUAL de arranque, así que
 * `ulimit -v` la MATA aunque el heap real sea pequeño. Por eso Kotlin limita con
 * `-Xmx` (heap) y NO usa ulimit -v; Swift, binario nativo, sí usa ulimit -v.
 */
import fs from 'fs';
import path from 'path';
import { config } from '../../config/index.js';
import type { Lenguaje } from './tipos.js';

export interface ContextoLenguaje {
  memoriaMb: number;
}

export interface ConfigLenguaje {
  nombre: string;
  /** Nombre del archivo fuente en el workdir (Kotlin exige clase = archivo). */
  archivoFuente: string;
  /** Rutas absolutas del host a montar read-only en el sandbox (toolchains). */
  binds: string[];
  /** Variables de entorno dentro del sandbox. */
  env: Record<string, string>;
  /** argv de compilación, relativo al workdir (/work). '' compilar = interpretado. */
  compilar: string[];
  /** argv de ejecución, relativo al workdir. */
  ejecutar: (ctx: ContextoLenguaje) => string[];
  /** 'jvm' = memoria ya limitada por -Xmx; 'ulimit' = aplicar ulimit -v. */
  limiteMemoria: 'jvm' | 'ulimit';
  /** Heurística best-effort: ¿el stderr delata falta de memoria? */
  esOom(stderr: string): boolean;
}

const PATH_BASE = '/usr/bin:/bin';

/**
 * Debian/Ubuntu no dejan la config de la JVM dentro del JDK: `$JAVA_HOME/conf/*`
 * son symlinks a `/etc/java-NN-openjdk`. Montar solo JAVA_HOME deja el symlink
 * colgando dentro del sandbox y la JVM ni arranca ("Error loading java.security
 * file"). Devuelve el directorio a montar, o nada si el JDK es autocontenido.
 */
function bindsConfJvm(javaHome: string): string[] {
  try {
    const real = fs.realpathSync(path.join(javaHome, 'conf', 'security', 'java.security'));
    if (real.startsWith(javaHome + path.sep)) return []; // ya cubierto por el bind de JAVA_HOME
    return [path.dirname(path.dirname(real))]; // …/security/java.security → /etc/java-NN-openjdk
  } catch {
    return []; // sin JDK legible aquí; el error real saldrá al compilar
  }
}

function lenguajeKotlin(): ConfigLenguaje {
  const home = config.juez.kotlin.home;
  const javaHome = config.juez.kotlin.javaHome;
  const kotlinc = home ? path.join(home, 'bin', 'kotlinc') : 'kotlinc';
  const java = javaHome ? path.join(javaHome, 'bin', 'java') : 'java';
  const binDirs = [home && path.join(home, 'bin'), javaHome && path.join(javaHome, 'bin')].filter(Boolean);
  return {
    nombre: 'Kotlin',
    archivoFuente: 'Main.kt',
    binds: [home, javaHome, ...(javaHome ? bindsConfJvm(javaHome) : [])].filter(Boolean) as string[],
    env: {
      PATH: [...binDirs, PATH_BASE].join(':'),
      ...(javaHome ? { JAVA_HOME: javaHome } : {}),
    },
    compilar: [kotlinc, 'Main.kt', '-include-runtime', '-d', 'main.jar'],
    ejecutar: (ctx) => [
      java,
      `-Xmx${ctx.memoriaMb}m`,
      '-XX:-UsePerfData', // no escribir hsperfdata en el sandbox
      '-jar',
      'main.jar',
    ],
    limiteMemoria: 'jvm',
    esOom: (stderr) => /OutOfMemoryError|unable to allocate|Cannot allocate memory/i.test(stderr),
  };
}

function lenguajeSwift(): ConfigLenguaje {
  const home = config.juez.swift.home;
  const usrBin = home ? path.join(home, 'usr', 'bin') : '';
  const swiftc = usrBin ? path.join(usrBin, 'swiftc') : 'swiftc';
  const libSwift = home ? path.join(home, 'usr', 'lib', 'swift', 'linux') : '';
  return {
    nombre: 'Swift',
    archivoFuente: 'main.swift',
    binds: home ? [home] : [],
    env: {
      PATH: [usrBin, PATH_BASE].filter(Boolean).join(':'),
      ...(libSwift ? { LD_LIBRARY_PATH: libSwift } : {}),
    },
    compilar: [swiftc, 'main.swift', '-o', 'main'],
    ejecutar: () => ['./main'],
    limiteMemoria: 'ulimit',
    esOom: (stderr) => /Cannot allocate memory|out of memory|std::bad_alloc/i.test(stderr),
  };
}

const CATALOGO: Record<Lenguaje, () => ConfigLenguaje> = {
  kotlin: lenguajeKotlin,
  swift: lenguajeSwift,
};

/** Config del lenguaje resuelta contra el entorno actual. */
export function getLenguaje(lenguaje: Lenguaje): ConfigLenguaje {
  return CATALOGO[lenguaje]();
}
