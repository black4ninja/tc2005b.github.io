/**
 * Ejecuta un comando aislado. En producción envuelve todo en bubblewrap
 * (`bwrap`): red cortada (--unshare-net), filesystem de solo lectura salvo el
 * workdir, PID namespace propio y muere con el padre. En development sin sandbox
 * (macOS) corre directo, solo para probar la lógica localmente.
 *
 * Los límites de recursos se aplican con `ulimit` dentro de un wrapper `bash -c`
 * antes de `exec`. El reloj de pared lo hace este proceso (SIGKILL al grupo).
 */
import { spawn } from 'child_process';
import { config } from '../../config/index.js';
import type { ResultadoCorrida } from './tipos.js';

export interface OpcionesCorrida {
  /** argv del comando real (rutas absolutas de binarios + flags), en el workdir. */
  argv: string[];
  /** Workdir en el HOST (se monta como /work en el sandbox). */
  cwdHost: string;
  /** Binds read-only extra (toolchains). */
  binds: string[];
  /** Env dentro del sandbox. */
  env: Record<string, string>;
  stdin: string;
  timeoutMs: number;
  salidaMaxBytes: number;
  procesos: number;
  /** Si se define, aplica `ulimit -v` (solo binarios nativos; NUNCA la JVM). */
  memoriaMb?: number;
}

/** Punto de montaje del workdir dentro del sandbox. */
const WORK = '/work';

// El wrapper de ulimits corre con bash, no con sh: en Debian/Ubuntu `sh` es dash,
// que no implementa `ulimit -u` y aborta ese límite (el corta-fork-bombs) con un
// "Illegal option -u" que además ensucia el stderr del alumno.
const SHELL = '/bin/bash';

function comandoUlimit(op: OpcionesCorrida): string {
  // Fuera del sandbox (dev en macOS) los ulimits son POR-USUARIO y rompen cosas
  // (posix_spawn EAGAIN); ahí basta el reloj de pared. Los límites reales viven
  // en producción, dentro de bubblewrap.
  if (!config.juez.sandbox) return ':';
  const cpu = Math.ceil(op.timeoutMs / 1000) + 1; // margen sobre el reloj de pared
  const partes = [`ulimit -t ${cpu}`, `ulimit -u ${op.procesos}`, `ulimit -f 65536`];
  // ulimit -v rompe la JVM (reserva mucha memoria virtual): por eso el llamador
  // solo lo pide para binarios nativos.
  if (op.memoriaMb) partes.push(`ulimit -v ${op.memoriaMb * 1024}`);
  return partes.join('; ');
}

/** argv de bubblewrap para envolver `cmd`. */
function argvBwrap(op: OpcionesCorrida, cwd: string): string[] {
  const args: string[] = [
    '--die-with-parent',
    '--unshare-all', // incluye --unshare-net: sin red
    '--new-session',
    '--ro-bind', '/usr', '/usr',
    '--ro-bind-try', '/bin', '/bin',
    '--ro-bind-try', '/lib', '/lib',
    '--ro-bind-try', '/lib64', '/lib64',
    '--ro-bind-try', '/etc/alternatives', '/etc/alternatives',
    '--ro-bind-try', '/etc/ssl', '/etc/ssl',
    '--proc', '/proc',
    '--dev', '/dev',
    '--tmpfs', '/tmp',
    '--bind', cwd, WORK,
    '--chdir', WORK,
    '--clearenv',
    '--setenv', 'HOME', WORK,
  ];
  for (const b of op.binds) {
    args.push('--ro-bind', b, b);
  }
  for (const [k, v] of Object.entries(op.env)) {
    args.push('--setenv', k, v);
  }
  return [config.juez.bwrapBin, ...args];
}

/**
 * Corre `op.argv` aislado y devuelve stdout/stderr/exit, si agotó el reloj de
 * pared, la señal y si la salida se truncó. Nunca lanza por código de salida ≠ 0.
 */
export function correrAislado(op: OpcionesCorrida): Promise<ResultadoCorrida> {
  return new Promise((resolve) => {
    const ulimits = comandoUlimit(op);
    // Wrapper: aplica ulimits y hace exec del comando real ("$@").
    const wrapper = `${ulimits}; exec "$@"`;

    let comando: string;
    let args: string[];
    let cwd: string | undefined;
    let env: NodeJS.ProcessEnv | undefined;

    if (config.juez.sandbox) {
      // bwrap ... -- /bin/bash -c '<wrapper>' bash <argv...>
      const base = argvBwrap(op, op.cwdHost);
      comando = base[0];
      args = [...base.slice(1), '--', SHELL, '-c', wrapper, 'bash', ...op.argv];
      cwd = undefined; // el chdir lo hace bwrap
      env = {}; // bwrap ya limpió el env con --clearenv/--setenv
    } else {
      // Sin sandbox (dev): corre en el workdir heredando el env del proceso (para
      // que el toolchain local funcione, p. ej. SDKROOT del swiftc de macOS) y
      // superponiendo el del lenguaje.
      comando = SHELL;
      args = ['-c', wrapper, 'bash', ...op.argv];
      cwd = op.cwdHost;
      env = { ...process.env, HOME: op.cwdHost, ...op.env };
    }

    const inicio = Date.now();
    const hijo = spawn(comando, args, {
      cwd,
      env,
      detached: true, // grupo de procesos propio → poder matar todo el árbol
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let salida: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let error: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let truncado = false;
    let agotoTiempo = false;
    let terminado = false;

    const matarGrupo = (senal: NodeJS.Signals) => {
      try {
        if (hijo.pid) process.kill(-hijo.pid, senal);
      } catch {
        // ya murió
      }
    };

    const temporizador = setTimeout(() => {
      agotoTiempo = true;
      matarGrupo('SIGKILL');
    }, op.timeoutMs);

    const acumular = (buf: Buffer<ArrayBufferLike>, chunk: Buffer): Buffer<ArrayBufferLike> => {
      if (truncado) return buf;
      const combinado = Buffer.concat([buf, chunk]);
      if (combinado.length > op.salidaMaxBytes) {
        truncado = true;
        matarGrupo('SIGKILL');
        return combinado.subarray(0, op.salidaMaxBytes);
      }
      return combinado;
    };

    hijo.stdout.on('data', (c: Buffer) => { salida = acumular(salida, c); });
    hijo.stderr.on('data', (c: Buffer) => { error = acumular(error, c); });

    hijo.on('error', (err) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(temporizador);
      resolve({
        salida: salida.toString('utf8'),
        error: `No se pudo iniciar el proceso: ${err.message}`,
        exitCode: null,
        agotoTiempo: false,
        senal: null,
        duracionMs: Date.now() - inicio,
        truncado,
      });
    });

    hijo.on('close', (code, senal) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(temporizador);
      resolve({
        salida: salida.toString('utf8'),
        error: error.toString('utf8'),
        exitCode: code,
        agotoTiempo,
        senal: senal as NodeJS.Signals | null,
        duracionMs: Date.now() - inicio,
        truncado,
      });
    });

    // Alimenta stdin; ignora EPIPE si el proceso ya cerró su entrada.
    hijo.stdin.on('error', () => { /* EPIPE: el proceso no leyó stdin */ });
    hijo.stdin.end(op.stdin);
  });
}
