/**
 * Orquesta el ciclo de vida de una corrida: workdir efímero → escribir fuente →
 * compilar (una vez) → correr por cada entrada. Cada paso pasa por el sandbox.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../../config/index.js';
import type { Lenguaje, Limites, ResultadoCorrida } from './tipos.js';
import { getLenguaje, type ConfigLenguaje } from './lenguajes.js';
import { correrAislado } from './sandbox.js';

export interface Workdir {
  dir: string;
  lang: ConfigLenguaje;
  lenguaje: Lenguaje;
}

/** Crea un workdir efímero y escribe el fuente del alumno. */
export async function prepararWorkdir(lenguaje: Lenguaje, codigo: string): Promise<Workdir> {
  const lang = getLenguaje(lenguaje);
  await fs.mkdir(config.juez.trabajoDir, { recursive: true });
  const dir = await fs.mkdtemp(path.join(config.juez.trabajoDir, `${lenguaje}-`));
  await fs.writeFile(path.join(dir, lang.archivoFuente), codigo, 'utf8');
  return { dir, lang, lenguaje };
}

/** Borra el workdir (best-effort). */
export async function limpiarWorkdir(wd: Workdir): Promise<void> {
  await fs.rm(wd.dir, { recursive: true, force: true }).catch(() => {});
}

export interface ResultadoCompilacion {
  ok: boolean;
  error: string;
}

/** Compila el fuente en el workdir. Lenguaje interpretado (sin `compilar`) → ok. */
export async function compilar(wd: Workdir): Promise<ResultadoCompilacion> {
  if (wd.lang.compilar.length === 0) return { ok: true, error: '' };
  const corrida = await correrAislado({
    argv: wd.lang.compilar,
    cwdHost: wd.dir,
    binds: wd.lang.binds,
    env: wd.lang.env,
    stdin: '',
    timeoutMs: config.juez.compilacionTimeoutMs,
    salidaMaxBytes: config.juez.limites.salidaMaxBytes,
    procesos: config.juez.limites.procesos,
    // La compilación no lleva ulimit -v (kotlinc/swiftc son procesos JVM/nativos
    // que reservan mucha memoria virtual).
  });
  if (corrida.agotoTiempo) {
    return { ok: false, error: 'La compilación excedió el tiempo permitido.' };
  }
  const ok = corrida.exitCode === 0 && corrida.senal === null;
  return { ok, error: ok ? '' : corrida.error || corrida.salida };
}

/** Corre el binario/JVM ya compilado con una entrada. */
export async function correrEntrada(
  wd: Workdir,
  stdin: string,
  limites: Limites,
): Promise<ResultadoCorrida> {
  return correrAislado({
    argv: wd.lang.ejecutar({ memoriaMb: limites.memoriaMb }),
    cwdHost: wd.dir,
    binds: wd.lang.binds,
    env: wd.lang.env,
    stdin,
    timeoutMs: limites.tiempoMs,
    salidaMaxBytes: limites.salidaMaxBytes,
    procesos: limites.procesos,
    // ulimit -v solo para lenguajes nativos; la JVM se limita con -Xmx.
    memoriaMb: wd.lang.limiteMemoria === 'ulimit' ? limites.memoriaMb : undefined,
  });
}
