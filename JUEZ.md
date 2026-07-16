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
# JUEZ_PROCESOS=128              # ulimit -u (corta fork bombs)
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

## 6. Modo development (sin servidor)

En macOS no hay bubblewrap: con `JUEZ_SANDBOX` sin definir (o `false`) el motor
corre **sin sandbox**, solo para probar la lógica localmente si tienes `kotlinc`/
`swiftc` instalados. **Nunca** usar `JUEZ_SANDBOX=false` en el servidor.
