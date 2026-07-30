# Juez de ejercicios — provisión del servidor

El módulo **Ejercicios** compila y ejecuta código de los alumnos (**Kotlin** y
**Swift**) **en el propio servidor** (`groups.meeplab.com`), aislando cada corrida
con **bubblewrap**. No usa Docker ni servicios de pago. Este documento cubre la
**provisión** (una sola vez) y cómo verificarla.

> El código del motor vive en `packages/api/src/services/judge/`. Todo se
> configura por variables de entorno; no hay rutas del servidor hardcodeadas.

## 1. Requisitos del sistema

- Linux con **unprivileged user namespaces** habilitados (Ubuntu 22.04+ los trae
  activos por defecto). Verificar:
  ```bash
  cat /proc/sys/kernel/unprivileged_userns_clone   # debe ser 1 (o no existir en kernels nuevos)
  ```
  Si es `0`: `sudo sysctl -w kernel.unprivileged_userns_clone=1` (y persistir en
  `/etc/sysctl.d/`).
- El proceso del API corre como un **usuario sin privilegios** (no root). El
  sandbox añade aislamiento encima; no eleva privilegios.

## 2. Instalar las herramientas

```bash
# Sandbox
sudo apt-get update && sudo apt-get install -y bubblewrap

# JDK + Kotlin (para kotlinc y java)
sudo apt-get install -y openjdk-21-jdk-headless
# Kotlin: el asset trae la versión en el nombre, así que resuélvela desde la API
# (el atajo /releases/latest/download/kotlin-compiler.zip devuelve 404).
KOTLIN_URL=$(curl -sL https://api.github.com/repos/JetBrains/kotlin/releases/latest \
  | grep -oE 'https://[^"]*kotlin-compiler-[^"]*\.zip' | head -1)
curl -sL "$KOTLIN_URL" -o /tmp/kotlinc.zip
sudo unzip -q /tmp/kotlinc.zip -d /opt        # crea /opt/kotlinc
rm -f /tmp/kotlinc.zip                        # ~87 MB; /tmp suele ser un tmpfs chico

# Swift (toolchain oficial de swift.org; ver https://www.swift.org/install/linux/
# para la versión/distro actuales. El build de ubuntu24.04 corre bien en 24.10).
# Se extrae en streaming: el tarball pesa ~1 GB y no cabe en un /tmp tmpfs.
sudo mkdir -p /opt/swift
curl -sL https://download.swift.org/swift-6.3.3-release/ubuntu2404/swift-6.3.3-RELEASE/swift-6.3.3-RELEASE-ubuntu24.04.tar.gz \
  | sudo tar xz -C /opt/swift --strip-components=1
```

Comprueba que existan:
- `/opt/kotlinc/bin/kotlinc`
- `$JAVA_HOME/bin/java` (p. ej. `/usr/lib/jvm/java-21-openjdk-amd64`)
- `/opt/swift/usr/bin/swiftc`

## 3. Variables de entorno (`.env` del API)

```dotenv
JUEZ_SANDBOX=true                 # obligatorio en el servidor
KOTLIN_HOME=/opt/kotlinc
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
SWIFT_HOME=/opt/swift

# Opcionales (valores por defecto entre paréntesis)
# JUEZ_CONCURRENCIA=2             # corridas simultáneas
# JUEZ_TIEMPO_MS=5000            # límite de ejecución por caso
# JUEZ_MEMORIA_MB=256           # -Xmx (JVM) / ulimit -v (nativo)
# JUEZ_COMPILACION_TIMEOUT_MS=30000
# JUEZ_TRABAJO_DIR=/tmp/juez     # workdirs efímeros
# JUEZ_SALIDA_MAX_BYTES=65536
# JUEZ_PROCESOS=256              # ulimit -u (corta fork bombs; la JVM cuenta cada hilo)
```

## 4. Verificar

Desde `packages/api`, con el entorno cargado:

```bash
cd packages/api
JUEZ_SANDBOX=true \
KOTLIN_HOME=/opt/kotlinc JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 SWIFT_HOME=/opt/swift \
./node_modules/.bin/tsx scripts/probar-juez.ts
```

Debe imprimir `8/8 pruebas correctas.` (AC, WA, TLE y error de compilación en
Kotlin y Swift). Si un lenguaje sale `OMITIDO`, falta su `*_HOME`. Si hay `FAIL`,
revisa que el binario exista y que bubblewrap corra (`bwrap --version`).

## 5. Cómo aísla cada corrida

- **Red cortada** (`--unshare-net`): el código del alumno no sale a internet.
- **Filesystem de solo lectura** salvo un workdir efímero; `/tmp` es un tmpfs
  propio; PID namespace aislado; muere con el proceso padre.
- **Límites**: reloj de pared (SIGKILL), CPU (`ulimit -t`), procesos (`ulimit -u`),
  tamaño de archivo, y memoria (`-Xmx` en la JVM, `ulimit -v` en binarios nativos).
- **Salida acotada** para evitar respuestas gigantes.

> **Nota de seguridad honesta:** el modelo de amenaza son *alumnos identificados*,
> no internet anónimo. bubblewrap + límites cubren los accidentes y abusos comunes
> (bucles, fork bombs, lectura de disco, red). La detección de falta de memoria es
> heurística (sin cgroups). Endurecer con cgroups v2 (límite de memoria real) y
> `seccomp` queda como mejora futura si algún día se abre a público.

## 6. Modo development en macOS (sin servidor)

En macOS no hay bubblewrap: con `JUEZ_SANDBOX` sin definir (o `false`) el motor
corre **sin sandbox**. Sirve para **probar ejercicios y autorar material** en local.
**Nunca** usar `JUEZ_SANDBOX=false` en el servidor.

Con `NODE_ENV=development` en el `.env` —que es lo normal en local— el sandbox ya
queda apagado por defecto: no hace falta tocar `JUEZ_SANDBOX`.

### 6.1 Instalar los toolchains (Apple Silicon)

```bash
brew install kotlin openjdk@21   # kotlinc + el JDK 21 que usa el servidor
xcode-select --install           # Swift ya viene en las Command Line Tools
```

Swift no se instala aparte: las CLT traen `swiftc`. Comprueba las tres rutas:

```bash
/opt/homebrew/opt/kotlin/libexec/bin/kotlinc -version
/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home/bin/java -version
/Library/Developer/CommandLineTools/usr/bin/swiftc --version
```

### 6.2 Variables en el `.env` del API

```dotenv
KOTLIN_HOME=/opt/homebrew/opt/kotlin/libexec
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
SWIFT_HOME=/Library/Developer/CommandLineTools
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk
```

`SWIFT_HOME` apunta a las CLT porque el motor busca `$SWIFT_HOME/usr/bin/swiftc`,
que es justo el layout que tienen.

⚠️ **`SDKROOT` no es opcional.** El motor invoca `swiftc` por **ruta absoluta**, y
así no resuelve el SDK solo: falla con `unable to load standard library for target
'arm64-apple-macosx…'` y **todos los ejercicios de Swift salen como error de
compilación**. Con `SDKROOT` explícito compila. (Obtén la ruta con
`xcrun --show-sdk-path`.)

Verifica igual que en el servidor — debe dar `8/8`:

```bash
cd packages/api && ./node_modules/.bin/tsx scripts/probar-juez.ts
```

### 6.3 En qué NO se parece a producción

Sirve para validar enunciados, casos y veredictos, **no** el aislamiento:

| | Servidor | macOS local |
|---|---|---|
| Aislamiento bubblewrap (red, filesystem, PID) | sí | **no** |
| `ulimit` de CPU, procesos y memoria | sí | **no** — `comandoUlimit` devuelve `:` fuera del sandbox |
| Reloj de pared (→ `tiempo_excedido`) | sí | sí |
| Veredictos `aceptado`/`respuesta_incorrecta`/`error_compilacion` | sí | sí |

Dos consecuencias prácticas:

- **El código corre sin aislar, con tu usuario.** Vale para ejercicios que
  escribes tú; **no** pegues aquí envíos de alumnos sin leerlos.
- Swift compila contra el **SDK de macOS**, no contra glibc. Para ejercicios de
  consola (stdin/stdout, colecciones, POO) es equivalente; si algún día uno usa
  API específicas de plataforma, valídalo en el servidor.

## 7. Verificar ejercicios (autoría)

Para generar material en lote sin resolver cada ejercicio a mano, cada ejercicio
puede llevar **soluciones de referencia**, y un verificador las usa como puerta
de calidad.

```bash
cd packages/api
./node_modules/.bin/tsx scripts/verificar-ejercicios.ts [slugColeccion] \
    [--slug <ejSlug>] [--lenguaje kotlin|swift] [--publicados] [--rapido] [--json]
```

Solo **lee** de la BD, y **sale con código 1 si hay errores** (los avisos no
rompen), así que sirve de puerta antes de publicar. `--rapido` salta todo lo que
compila: útil para pasar por el catálogo entero en segundos.

### 7.1 Soluciones de referencia: por qué son VARIAS

`EjercicioProgramacion.solucionesReferencia` guarda una **lista** por lenguaje,
no una sola. No es por comodidad:

- Con **una** solución compruebas que el ejercicio es resoluble.
- Con **dos o más** compruebas algo que no se ve leyendo los casos: que no estén
  **sobreajustados**. Si dos soluciones igual de legítimas dan veredictos
  distintos, el defecto está en los **casos**, no en el código — típicamente
  porque fijan un orden de iteración o un formato que el enunciado no pide.

Esa segunda comprobación no es heurística, y es la razón de que el campo sea una
lista. Escribe al menos dos soluciones con **estrategias distintas** (p. ej. una
con `Set` y otra ordenando) para que el contraste sirva de algo.

Nunca se exponen al alumno: viven en `toSafeJSON()`, que es la representación de
**admin**; el DTO del alumno es una whitelist aparte que no las incluye.

### 7.2 Qué revisa

| Chequeo | Nivel | Qué significa |
|---|---|---|
| `sin-casos` | error | No hay nada que evaluar |
| `plantilla-sin-marcador` | error | En modo plantilla, sin `{{solucion}}` se compilaría solo el driver |
| `solucion-rechazada` | error | Una solución de referencia no es `aceptado`: o no es resoluble así, o los casos están mal |
| `casos-sobreajustados` | error | Dos soluciones válidas discrepan (ver 7.1) |
| `inicial-no-compila` | error | El alumno arrancaría con un error que no es suyo |
| `inicial-aceptado` | error | El ejercicio viene resuelto, o los casos no discriminan |
| `sin-solucion` | aviso | Sin solución de referencia no se puede verificar |
| `sin-casos-ocultos` | aviso | El alumno ve todas las salidas esperadas |
| `salida-vacia` | aviso | La salida esperada queda vacía al normalizar: la pasa cualquier programa mudo |
| `entrada-repetida` | aviso | Dos casos con la misma entrada; uno no aporta |

El **código inicial** hace de "solución incorrecta" para el test de
discriminación, en vez de inventar un programa trivial: así funciona igual en
modo plantilla, donde un programa vacío ni compilaría y el chequeo no probaría
nada.

> **No** se marcan CRLF ni espacios al final de línea: `normalizarSalida` ya los
> absorbe al comparar, así que no hacen frágil a un caso y avisar de ellos sería
> ruido.

### 7.3 Dónde vive

- Lógica: `src/services/ejercicios-verificacion.service.ts` (pura, sobre un objeto
  plano — no depende de Parse).
- CLI: `scripts/verificar-ejercicios.ts`.
- Pruebas: `tests/ejercicios-verificacion.test.ts` (estructura, corre siempre) y
  `tests/ejercicios-verificacion-ejecucion.test.ts` (compila de verdad; se
  **omite** sin toolchain, igual que `idor.test.ts` sin API).

La composición del harness la comparten el juez y el verificador
(`componerCodigo`): si fueran dos implementaciones, el verificador podría dar por
bueno algo que al alumno le falla.
