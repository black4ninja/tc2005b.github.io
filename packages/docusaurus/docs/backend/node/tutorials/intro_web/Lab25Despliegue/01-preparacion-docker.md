---
sidebar_position: 1
---

# Parte 1 — Preparar el servidor virtual con Docker

En esta parte vamos a crear el "servidor virtual" donde después instalaremos nuestra aplicación. Para eso vamos a:

1. Verificar que Docker esté instalado.
2. Escribir un archivo llamado **Dockerfile** que describe cómo debe ser nuestro servidor.
3. **Construir** una imagen a partir de ese Dockerfile.
4. **Levantar** un contenedor a partir de esa imagen.
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

:::warning Si dice "command not found"
Significa que Docker **no está instalado** o no está abierto. Instala [Docker Desktop](https://www.docker.com/products/docker-desktop/) y ábrelo. Espera a que la ballena de la barra de menú deje de animarse antes de volver a probar.
:::

---

## 2. Crear una carpeta de trabajo

Vamos a crear una carpeta donde guardaremos el Dockerfile. En la terminal escribe:

```bash
mkdir servidor-virtual
cd servidor-virtual
```

`mkdir` crea la carpeta y `cd` te mete dentro de ella. Ahora estás "parado" dentro de esa carpeta vacía.

---

## 3. Crear el Dockerfile

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

# Instalar Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Crear un usuario "estudiante" con permisos para usar sudo
RUN useradd -m -s /bin/bash estudiante \
    && echo "estudiante:password" | chpasswd \
    && usermod -aG sudo estudiante

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
- **`curl ... setup_18.x | bash -`**: descarga e instala Node.js versión 18.
- **`useradd ... estudiante`**: crea un usuario llamado **estudiante** con contraseña `password`. En Linux es buena práctica no trabajar como `root` (administrador máximo), por eso creamos un usuario normal.
- **`EXPOSE 80 3000`**: declara que el contenedor va a usar los puertos 80 (Nginx) y 3000 (Express).
- **`CMD ["tail", "-f", "/dev/null"]`**: un truco para que el contenedor no se apague después de iniciar. Le decimos *"quédate ahí parado esperando, no hagas nada"*.
:::

---

## 4. Construir la imagen

Ahora vamos a usar el Dockerfile como receta para crear una **imagen**. Una imagen es como un **molde**: a partir de ella podemos crear muchos contenedores idénticos.

En la terminal (asegúrate de estar parado en la carpeta `servidor-virtual` con `pwd`), ejecuta:

```bash
docker build -t servidor-virtual .
```

**¿Qué significa cada parte?**

- `docker build` → construye una imagen.
- `-t servidor-virtual` → le pone el nombre `servidor-virtual` a la imagen.
- `.` (el punto final) → indica que el Dockerfile está en la carpeta actual.

:::warning Esto tarda varios minutos
La primera vez puede tardar **5 a 10 minutos** porque está descargando Ubuntu, Node.js, Nginx y todos los paquetes desde internet. Verás muchas líneas de texto pasando — es normal. Espera hasta que veas algo como:

```
=> => writing image sha256:302b0cb34d14...
=> => naming to docker.io/library/servidor-virtual:latest
```
:::

### Verificar que la imagen se creó

```bash
docker images
```

Deberías ver tu imagen en la lista:

```
REPOSITORY          TAG       IMAGE ID       CREATED          SIZE
servidor-virtual    latest    302b0cb34d14   1 minute ago     440MB
```

---

## 5. Levantar el contenedor

Tener la imagen no es suficiente — es solo el molde. Ahora vamos a **crear un contenedor** a partir de ella, que es el "servidor real" en ejecución.

```bash
docker run -d --name mi-servidor -p 80:80 -p 3000:3000 servidor-virtual
```

**¿Qué significa cada parte?**

- `docker run` → crea y enciende un contenedor.
- `-d` → "detached", lo deja corriendo en segundo plano (sin bloquear tu terminal).
- `--name mi-servidor` → le pone el nombre `mi-servidor` al contenedor.
- `-p 80:80` → conecta el **puerto 80 de tu computadora** con el **puerto 80 del contenedor**. Cuando alguien entra a `http://localhost` (puerto 80) en tu navegador, la petición llega al contenedor.
- `-p 3000:3000` → lo mismo pero para el puerto 3000.
- `servidor-virtual` → el nombre de la imagen que vamos a usar.

El comando responde con un ID largo (algo como `3a7fa64f27c8...`). Eso es el ID del contenedor recién creado.

### Verificar que el contenedor está corriendo

```bash
docker ps
```

Deberías ver:

```
CONTAINER ID   IMAGE              COMMAND               STATUS         PORTS                                        NAMES
3a7fa64f27c8   servidor-virtual   "tail -f /dev/null"   Up 5 seconds   0.0.0.0:80->80/tcp, 0.0.0.0:3000->3000/tcp   mi-servidor
```

:::tip Si ves el contenedor en Docker Desktop
Abre Docker Desktop, ve a la pestaña **Containers** y verás `mi-servidor` corriendo. Desde ahí también lo puedes detener, reiniciar o ver sus logs con clicks.
:::

---

## 6. Entrar al servidor virtual

Ahora viene la parte interesante: vamos a **entrar dentro del contenedor** para trabajar dentro de él como si fuéramos administradores de un servidor real.

```bash
docker exec -it mi-servidor bash
```

**¿Qué significa cada parte?**

- `docker exec` → ejecuta un comando dentro de un contenedor que ya está corriendo.
- `-it` → "interactive + terminal", abre una sesión interactiva donde podemos escribir comandos.
- `mi-servidor` → el nombre del contenedor.
- `bash` → el programa que queremos ejecutar (la terminal de Linux).

Notarás que el **prompt cambió**. Ahora se ve algo así:

```
root@3a7fa64f27c8:/#
```

¡Felicidades! **Ya no estás en tu computadora**: estás dentro del contenedor Linux. Cualquier comando que escribas ahora se ejecuta **dentro del servidor virtual**.

### Cambiar al usuario `estudiante`

Por buenas prácticas no vamos a trabajar como `root` (administrador máximo). Cambiamos al usuario `estudiante`:

```bash
su estudiante
```

Te pedirá la contraseña: escribe `password` y presiona Enter (no se va a ver lo que escribes, es normal en Linux).

El prompt cambia otra vez:

```
estudiante@3a7fa64f27c8:/$
```

Para confirmar quién eres:

```bash
whoami
```

Debería responder:

```
estudiante
```

Y para ver dónde estás parado:

```bash
pwd
```

Probablemente estés en `/` (la raíz del sistema). Vamos a movernos a la carpeta personal del usuario:

```bash
cd ~
pwd
```

Ahora deberías estar en `/home/estudiante`.

---

## Estado actual

Hasta aquí hemos logrado esto:

```
   TU COMPUTADORA                              CONTENEDOR mi-servidor
  ┌───────────────────┐                       ┌──────────────────────────┐
  │                   │                       │  Ubuntu 22.04            │
  │  Docker Desktop   │   ────  conecta  ───→ │  Node.js 18 instalado    │
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
- ✅ `docker ps` muestra el contenedor `mi-servidor` con estado **Up**
- ✅ Estás dentro del contenedor (el prompt dice `estudiante@...`)
- ✅ Puedes ejecutar `whoami` y responde `estudiante`
:::

---

## Comandos útiles para administrar el contenedor

Si en algún momento necesitas:

| Acción | Comando (ejecutar **fuera** del contenedor) |
|--------|------|
| Detener el contenedor | `docker stop mi-servidor` |
| Encenderlo otra vez | `docker start mi-servidor` |
| Ver los contenedores activos | `docker ps` |
| Ver **todos** los contenedores (incluso apagados) | `docker ps -a` |
| Ver los logs del contenedor | `docker logs mi-servidor` |
| Borrar el contenedor (debe estar detenido) | `docker rm mi-servidor` |
| Salir de la sesión dentro del contenedor | `exit` (a veces necesitas dos `exit`: uno para salir de `estudiante`, otro para salir de `root`) |

:::warning Si cierras la terminal por accidente
**No te preocupes**: el contenedor sigue corriendo en segundo plano. Solo abre una terminal nueva y ejecuta `docker exec -it mi-servidor bash` otra vez para volver a entrar.
:::

---

Cuando estés listo, continúa con la **[Parte 2 — Desplegar la aplicación](./02-despliegue-app.md)**.
