import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  environment: process.env.NODE_ENV || 'development',
  version: '1.0.0',
  databaseURI: process.env.DATABASE_URI || '',
  appId: process.env.APP_ID || 'tc2005b-api',
  masterKey: process.env.MASTER_KEY || '',
  parseMount: process.env.PARSE_MOUNT || '/parse',
  serverURL: process.env.SERVER_URL || 'http://localhost:3002/parse',
  email: {
    apiKey: process.env.MAILERSEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'no_reply@meeplab.com',
    fromName: process.env.EMAIL_FROM_NAME || 'TC2005B',
  },
  auth: {
    magicLinkExpiryMinutes: parseInt(process.env.MAGIC_LINK_EXPIRY_MINUTES || '15', 10),
    sessionExpiryDays: parseInt(process.env.SESSION_EXPIRY_DAYS || '7', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  cookies: {
    // Cookie de sesión para navegaciones top-level (p. ej. gate de /docs/*).
    name: process.env.SESSION_COOKIE_NAME || 'session_token',
    secure: (process.env.NODE_ENV || 'development') === 'production',
    sameSite: 'lax' as const,
  },
  /**
   * Juez de ejercicios: compila/ejecuta código del alumno en el servidor,
   * aislado con bubblewrap. Todo se configura por env para no hardcodear rutas
   * del servidor. Ver JUEZ.md (raíz) para la provisión.
   */
  juez: {
    /**
     * Aislar cada corrida con bubblewrap. Obligatorio en producción; en
     * development (macOS, sin bwrap) por defecto NO, para poder probar la
     * lógica localmente. Forzar con JUEZ_SANDBOX=true/false.
     */
    sandbox: process.env.JUEZ_SANDBOX
      ? process.env.JUEZ_SANDBOX === 'true'
      : (process.env.NODE_ENV || 'development') === 'production',
    bwrapBin: process.env.JUEZ_BWRAP || 'bwrap',
    /** Corridas simultáneas (compilar es pesado; mantener bajo). */
    concurrencia: parseInt(process.env.JUEZ_CONCURRENCIA || '2', 10),
    /** Timeout de compilación (ms); separado del límite de ejecución. */
    compilacionTimeoutMs: parseInt(process.env.JUEZ_COMPILACION_TIMEOUT_MS || '30000', 10),
    /** Directorio raíz para los workdirs efímeros de cada corrida. */
    trabajoDir: process.env.JUEZ_TRABAJO_DIR || '/tmp/juez',
    limites: {
      tiempoMs: parseInt(process.env.JUEZ_TIEMPO_MS || '5000', 10),
      memoriaMb: parseInt(process.env.JUEZ_MEMORIA_MB || '256', 10),
      salidaMaxBytes: parseInt(process.env.JUEZ_SALIDA_MAX_BYTES || '65536', 10),
      // Generoso: la JVM cuenta cada hilo contra RLIMIT_NPROC en Linux; aun así
      // corta fork bombs. Ajustable por env.
      procesos: parseInt(process.env.JUEZ_PROCESOS || '256', 10),
    },
    kotlin: {
      /** Directorio del compilador Kotlin (contiene bin/kotlinc). */
      home: process.env.KOTLIN_HOME || '',
      /** JDK que usa kotlinc/java. */
      javaHome: process.env.JAVA_HOME || '',
    },
    swift: {
      /** Directorio del toolchain Swift (contiene usr/bin/swiftc). */
      home: process.env.SWIFT_HOME || '',
    },
  },
};
