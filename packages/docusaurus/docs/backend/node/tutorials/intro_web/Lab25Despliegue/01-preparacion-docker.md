---
sidebar_position: 1
---

# Parte 1 — Preparar el servidor virtual con Docker

En esta parte vamos a crear el "servidor virtual" donde después instalaremos nuestra aplicación. Para eso vamos a:

1. Verificar que Docker esté instalado y que los puertos que vamos a usar estén libres.
2. Escribir un archivo llamado **Dockerfile** que describe cómo debe ser nuestro servidor.
3. Escribir un archivo **docker-compose.yml** que dice cómo arrancarlo.
4. **Levantar** el contenedor con un solo comando.
5. Entrar al contenedor y empezar a trabajar como si fuera un servidor real.

---

## 1. Abrir la terminal de tu computadora

Antes de tocar Docker, necesitas abrir la **terminal de tu sistema operativo** (no la del contenedor todavía).

- **Mac**: presiona `⌘ + Espacio` (Spotlight), escribe **Terminal** y dale Enter.
- **Windows**: busca **PowerShell** o **Command Prompt** en el menú Inicio y ábrelo.
- **Linux**: ya sabes (`Ctrl + Alt + T` en la mayoría de las distribuciones).

Verás una ventana negra (o blanca) con un cursor parpadeando. Escribe el siguiente comando y presiona Enter:

```bash
docker --version
```

**Resultado esperado** (la versión puede variar):

```
Docker version 24.0.7, build afdd53b
```

También verifica que tienes Docker Compose:

```bash
docker compose version
```

Debe responder algo como `Docker Compose version v2.x`.

:::warning Si dice "command not found"
Significa que Docker **no está instalado** o no está abierto. Instala [Docker Desktop](https://www.docker.com/products/docker-desktop/) y ábrelo. Espera a que la ballena de la barra de menú deje de animarse antes de volver a probar.
:::

---

## 2. Verificar que los puertos 80 y 3000 estén libres

Vamos a usar los puertos **80** (web pública) y **3000** (Express). Si hay otro programa usándolos, Docker no podrá levantar el contenedor.

En **Mac/Linux**:

```bash
lsof -nP -iTCP:80 -sTCP:LISTEN
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

En **Windows** (PowerShell):

```powershell
Get-NetTCPConnection -LocalPort 80 -State Listen
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

**Resultado esperado**: ningún output (silencio = puerto libre).

:::warning Si algún puerto está ocupado
- En Mac, **AirPlay Receiver** suele ocupar el puerto 5000 y a veces otros. Apágalo en `Configuración del Sistema → General → AirDrop y Handoff → AirPlay Receiver`.
- Si tienes otro proyecto Node.js corriendo (por ejemplo, otro `npm start` abierto), ciérralo con `Ctrl + C`.
- Si aparece algún proceso desconocido en el puerto, anota el `PID` que muestra `lsof` y mátalo con `kill <PID>`.
:::

---

## 3. Crear una carpeta de trabajo

Vamos a crear una carpeta donde guardaremos los archivos de Docker. En la terminal escribe:

```bash
mkdir servidor-virtual
cd servidor-virtual
```

`mkdir` crea la carpeta y `cd` te mete dentro de ella. Ahora estás "parado" dentro de esa carpeta vacía.

---

## 4. Crear el Dockerfile

Un **Dockerfile** es un archivo de texto con una **receta paso a paso** para construir un servidor virtual. Le decimos: *"empieza con Ubuntu, instala Node.js, instala Nginx, crea un usuario, deja todo listo"*.

Abre tu editor de código (VS Code) en la carpeta `servidor-virtual`. Crea un archivo nuevo llamado exactamente:

```
Dockerfile
```

(Sin extensión, sin `.txt`, sin nada más). Pega adentro el siguiente contenido:

```dockerfile
FROM ubuntu:22.04

# Evitar que la instalación de paquetes pida confirmación
ENV DEBIAN_FRONTEND=noninteractive

# Instalar paquetes básicos del sistema
RUN apt-get update && apt-get install -y \
    curl \
    git \
    nano \
    vim \
    nginx \
    gnupg \
    ca-certificates \
    sudo \
    && apt-get clean

# Instalar Node.js 20 (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Crear un usuario "estudiante" con permisos para usar sudo
# (sin que nos pida contraseña al usar sudo, para no atorarnos durante el lab)
RUN useradd -m -s /bin/bash estudiante \
    && echo "estudiante:password" | chpasswd \
    && usermod -aG sudo estudiante \
    && echo "estudiante ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/estudiante \
    && chmod 0440 /etc/sudoers.d/estudiante

# Abrir los puertos 80 (web) y 3000 (Express)
EXPOSE 80 3000

# Mantener el contenedor encendido
CMD ["tail", "-f", "/dev/null"]
```

Guarda el archivo.

### ¿Qué hace cada parte?

:::tip ¿Qué significa todo esto?
- **`FROM ubuntu:22.04`**: empezamos desde una imagen base de Ubuntu Linux 22.04. Es como decir *"dame una computadora con Ubuntu recién instalado"*.
- **`ENV DEBIAN_FRONTEND=noninteractive`**: evita que durante la instalación de paquetes el sistema te pregunte cosas (queremos que sea automático).
- **`RUN apt-get update && apt-get install ...`**: instala programas. `apt-get` es el "instalador" de Ubuntu, equivalente a `npm install` pero para programas del sistema. Estamos instalando: `curl` (para descargar archivos), `git` (para clonar repos), `nano` y `vim` (editores de texto), `nginx` (servidor web), `sudo` (para tener permisos de administrador).
- **`curl ... setup_20.x | bash -`**: descarga e instala Node.js versión 20 LTS (la versión recomendada actualmente).
- **`useradd ... estudiante`**: crea un usuario llamado **estudiante** con contraseña `password`. En Linux es buena práctica no trabajar como `root` (administrador máximo), por eso creamos un usuario normal.
- **`echo "estudiante ALL=(ALL) NOPASSWD:ALL"`**: configura que el usuario `estudiante` pueda usar `sudo` **sin que le pidan contraseña**. En un servidor real **no harías esto** (sería inseguro), pero aquí lo dejamos así para que la práctica fluya sin interrupciones.
- **`EXPOSE 80 3000`**: declara que el contenedor va a usar los puertos 80 (Nginx) y 3000 (Express).
- **`CMD ["tail", "-f", "/dev/null"]`**: un truco para que el contenedor no se apague después de iniciar. Le decimos *"quédate ahí parado esperando, no hagas nada"*.
:::

---

## 5. Crear el archivo `docker-compose.yml`

Tener solo el Dockerfile no es suficiente: también necesitamos decirle a Docker **cómo correrlo** (qué puertos abrir, qué nombre darle al contenedor, etc.). Podríamos hacerlo con un comando `docker run` larguísimo, pero es mucho más limpio escribir un archivo `docker-compose.yml`.

**Docker Compose** es una herramienta de Docker que lee un archivo `docker-compose.yml` y arma el contenedor automáticamente. Es lo que se usa en producción real.

En la **misma carpeta `servidor-virtual/`** (al lado del Dockerfile), crea otro archivo llamado:

```
docker-compose.yml
```

Pega adentro este contenido:

```yaml
services:
  mi-servidor:
    build: .
    container_name: mi-servidor
    user: estudiante
    working_dir: /home/estudiante
    ports:
      - "80:80"
      - "3000:3000"
    tty: true
    stdin_open: true
```

Guarda el archivo.

### ¿Qué dice esta configuración?

:::tip Línea por línea
- **`services:`**: declaramos los servicios (contenedores) que componen nuestra aplicación. En este caso solo tenemos uno.
- **`mi-servidor:`**: el nombre interno del servicio.
- **`build: .`**: construye la imagen usando el Dockerfile que está en esta misma carpeta (`.`).
- **`container_name: mi-servidor`**: el nombre que verás en `docker ps` y en Docker Desktop.
- **`user: estudiante`**: cuando entres al contenedor, ya estarás logueado como `estudiante` (¡no como `root`!).
- **`working_dir: /home/estudiante`**: tu carpeta de trabajo por defecto al entrar.
- **`ports: - "80:80"`**: conecta el puerto 80 de tu computadora con el puerto 80 del contenedor. Lo mismo con el 3000.
- **`tty: true` y `stdin_open: true`**: mantienen el contenedor con una "consola" disponible para que podamos entrar a él interactivamente.
:::

---

## 6. Levantar el contenedor

Ahora viene la magia. Asegúrate de estar parado en la carpeta `servidor-virtual` (verifica con `pwd`). Ejecuta:

```bash
docker compose up -d --build
```

**¿Qué significa cada parte?**

- `docker compose up` → lee `docker-compose.yml` y levanta los servicios.
- `-d` → "detached", lo deja corriendo en segundo plano (sin bloquear tu terminal).
- `--build` → primero construye la imagen desde el Dockerfile (la primera vez tarda).

:::warning Esto tarda varios minutos la primera vez
La primera vez puede tardar **5 a 10 minutos** porque Docker está descargando Ubuntu, Node.js, Nginx y todos los paquetes desde internet. Verás muchas líneas de texto pasando — es normal. Espera hasta que veas algo como:

```
✔ Container mi-servidor  Started
```
:::

### Verificar que el contenedor está corriendo

```bash
docker compose ps
```

Deberías ver:

```
NAME          IMAGE                    COMMAND               STATUS         PORTS
mi-servidor   servidor-virtual-...     "tail -f /dev/null"   Up 5 seconds   0.0.0.0:80->80/tcp, 0.0.0.0:3000->3000/tcp
```

:::tip También en Docker Desktop
Abre Docker Desktop, ve a la pestaña **Containers** y verás `mi-servidor` corriendo. Desde ahí también lo puedes detener, reiniciar o ver sus logs con clicks.
:::

---

## 7. Entrar al servidor virtual

Ahora viene la parte interesante: vamos a **entrar dentro del contenedor** para trabajar dentro de él como si fuéramos administradores de un servidor real.

```bash
docker compose exec mi-servidor bash
```

**¿Qué significa cada parte?**

- `docker compose exec` → ejecuta un comando dentro de un contenedor que ya está corriendo.
- `mi-servidor` → el nombre del servicio (definido en `docker-compose.yml`).
- `bash` → el programa que queremos ejecutar (la terminal de Linux).

Notarás que el **prompt cambió**. Ahora se ve algo así:

```
estudiante@3a7fa64f27c8:~$
```

¡Felicidades! **Ya no estás en tu computadora**: estás dentro del contenedor Linux, **logueado automáticamente como el usuario `estudiante`** y parado en su carpeta personal `/home/estudiante`. Cualquier comando que escribas ahora se ejecuta **dentro del servidor virtual**.

Para confirmar:

```bash
whoami
pwd
```

Deberían responder `estudiante` y `/home/estudiante` respectivamente.

:::info Antes era más complicado
En despliegues "manuales" tendrías que entrar al contenedor como `root` y luego cambiar al usuario `estudiante` con `su` y entrar a su carpeta con `cd ~`. Gracias a `user:` y `working_dir:` en el `docker-compose.yml`, todo eso ya está resuelto.
:::

---

## Estado actual

Hasta aquí hemos logrado esto:

```
   TU COMPUTADORA                              CONTENEDOR mi-servidor
  ┌───────────────────┐                       ┌──────────────────────────┐
  │                   │                       │  Ubuntu 22.04            │
  │  Docker Desktop   │   ────  conecta  ───→ │  Node.js 20 instalado    │
  │  está corriendo   │                       │  Nginx instalado         │
  │                   │                       │  Usuario: estudiante     │
  │                   │   puerto 80  ←──────→ │  Puerto 80 escuchando    │
  │                   │   puerto 3000 ←─────→ │  Puerto 3000 escuchando  │
  └───────────────────┘                       │                          │
                                              │  (vacío, sin app aún)    │
                                              └──────────────────────────┘
```

Tienes un servidor virtual encendido, con Linux, Node.js y Nginx, esperando que le instales una aplicación.

:::tip Checkpoint — Parte 1
Antes de continuar, verifica que:

- ✅ Docker Desktop está abierto y corriendo
- ✅ `docker compose ps` muestra el contenedor `mi-servidor` con estado **Up**
- ✅ Estás dentro del contenedor (el prompt dice `estudiante@...`)
- ✅ `whoami` responde `estudiante`
- ✅ `pwd` responde `/home/estudiante`
:::

---

## Comandos útiles para administrar el contenedor

Si en algún momento necesitas hacer alguno de estos, **ejecútalos desde la carpeta `servidor-virtual/`** (donde está el `docker-compose.yml`), **fuera del contenedor**:

| Acción | Comando |
|--------|---------|
| Detener el contenedor | `docker compose stop` |
| Encenderlo otra vez | `docker compose start` |
| Reiniciarlo | `docker compose restart` |
| Ver el estado | `docker compose ps` |
| Ver los logs | `docker compose logs` |
| Entrar al contenedor | `docker compose exec mi-servidor bash` |
| **Apagar y borrar** el contenedor | `docker compose down` |
| Apagar, borrar **y empezar de cero** | `docker compose down --rmi local -v` |
| Salir de la sesión dentro del contenedor | `exit` |

:::warning ¿Qué hace `docker compose down`?
**Apaga y borra el contenedor**. Toda la configuración que hagas adentro (apps clonadas, archivos creados, paquetes instalados) **se pierde**. Si quieres apagarlo sin perder el trabajo de adentro, usa `docker compose stop` en su lugar.
:::

:::tip Si cierras la terminal por accidente
**No te preocupes**: el contenedor sigue corriendo en segundo plano. Solo abre una terminal nueva, ve a la carpeta `servidor-virtual/` y ejecuta `docker compose exec mi-servidor bash` otra vez para volver a entrar.
:::

---

Cuando estés listo, continúa con la **[Parte 2 — Desplegar la aplicación](./02-despliegue-app.md)**.
