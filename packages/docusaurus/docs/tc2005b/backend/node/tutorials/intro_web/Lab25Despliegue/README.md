---
sidebar_position: 25
---

# Despliegue de Aplicaciones Web

## Introducción

Hasta este punto del curso has construido aplicaciones web que corren en **tu propia computadora**. Cuando ejecutas `npm start` y abres `http://localhost:3000`, **solo tú** puedes ver la aplicación, porque vive dentro de tu equipo.

**Desplegar** (en inglés *deploy*) significa publicar tu aplicación en un servidor para que **cualquier persona en el mundo** pueda acceder a ella desde su navegador.

En el mundo real, las empresas pagan por servidores dedicados o servicios en la nube (AWS, Azure, DigitalOcean, etc.) para alojar sus aplicaciones. En este laboratorio, como no contamos con un servidor real, vamos a **simular uno** usando una herramienta llamada **Docker**.

:::info Lo que necesitas
- **Docker Desktop** instalado en tu computadora — [Descargar aquí](https://www.docker.com/products/docker-desktop/)
- Un navegador web (Chrome, Firefox, Safari)
- Un editor de código (VS Code recomendado)
- Conexión a internet
:::

---

## Conceptos previos

Antes de empezar a tocar comandos, necesitas entender algunos conceptos. **No te preocupes si suena complicado**: vamos a explicarlo todo con ejemplos.

### ¿Qué es un servidor?

Un **servidor** es simplemente una computadora que está **encendida 24/7** y que **escucha peticiones** desde internet. Cuando entras a `youtube.com`, tu navegador le pide a un servidor de Google que le mande el video. Ese servidor es una computadora física (o virtual) en algún centro de datos.

```
Tu computadora                                    Servidor de YouTube
   (cliente)         ─── pide video ───→        (computadora encendida)
                     ←── manda video ───
```

Un servidor **no tiene pantalla, mouse ni teclado conectados directamente**: se administra a distancia escribiendo comandos en una **terminal**.

### ¿Qué es una terminal?

La **terminal** (o consola) es una ventana donde le hablas a la computadora **escribiendo texto** en lugar de hacer clic en botones. Cada línea que escribes es un **comando**.

En un servidor real (que normalmente corre **Linux**), la terminal es la única forma de trabajar. Por eso necesitas conocer comandos básicos como estos:

| Comando | ¿Qué hace? |
|---------|------------|
| `pwd` | Te dice **en qué carpeta estás** parado |
| `ls` | **Lista** los archivos y carpetas de donde estás |
| `cd carpeta` | **Entra** a una carpeta |
| `cd ..` | **Sale** de la carpeta actual (sube un nivel) |
| `mkdir nombre` | **Crea** una carpeta nueva |
| `cat archivo` | **Muestra** el contenido de un archivo |
| `nano archivo` | **Abre** un archivo en un editor de texto simple |
| `exit` | **Sale** de la terminal |

:::tip No tengas miedo a la terminal
Al principio se ve intimidante, pero después de usarla unas cuantas veces te vas a dar cuenta de que es **mucho más rápida** que clickear en ventanas. Vas a usar muy pocos comandos en este laboratorio.
:::

### ¿Qué es un puerto?

Imagina que tu computadora es un **edificio con muchas puertas numeradas**. Cuando una aplicación se ejecuta, se "para" detrás de una puerta específica esperando visitas.

- **Puerto 80**: la puerta estándar de la web (HTTP). Cuando escribes `http://google.com` sin número de puerto, tu navegador intenta entrar por la puerta 80.
- **Puerto 443**: la puerta de la web segura (HTTPS, con candado).
- **Puerto 3000**: la puerta donde **suele correr Express** durante desarrollo (la elegimos nosotros).
- **Puerto 5432**: la puerta de PostgreSQL, etc.

Una aplicación **solo puede usar una puerta a la vez**. Si dos apps intentan usar el mismo puerto, una de las dos falla.

```
Tu computadora
  ┌────────────────────────────────┐
  │  Puerto 80   →  (vacío)        │
  │  Puerto 443  →  (vacío)        │
  │  Puerto 3000 →  Express app    │ ← aquí corre tu app
  │  Puerto 5432 →  Base de datos  │
  └────────────────────────────────┘
```

### ¿Qué es Docker?

**Docker** es una herramienta que te permite ejecutar **una computadora dentro de tu computadora**. Esa computadora interna se llama **contenedor** y viene con un sistema operativo (Linux), programas instalados y todo lo que necesitas, **sin afectar a tu sistema real**.

Es como tener una mini-máquina virtual que puedes prender, apagar y borrar las veces que quieras. Si rompes algo dentro del contenedor, **no le pasa nada a tu computadora**.

```
   ┌─────────────────────────────────────────────────┐
   │   TU COMPUTADORA (Mac / Windows)                │
   │                                                 │
   │   ┌───────────────────────────────────────┐     │
   │   │  CONTENEDOR DOCKER (Linux Ubuntu)     │     │
   │   │                                       │     │
   │   │   - Node.js                           │     │
   │   │   - Nginx                             │     │
   │   │   - Tu aplicación                     │     │
   │   │                                       │     │
   │   └───────────────────────────────────────┘     │
   │                                                 │
   └─────────────────────────────────────────────────┘
```

:::info Aclaración importante
Docker **no es lo mismo** que un servidor real. Lo estamos usando como **simulador** porque no tenemos uno físico. En la vida profesional, los pasos que aprenderás aquí son **exactamente los mismos** que harías en un servidor de verdad.
:::

---

## ¿Qué vamos a hacer en este laboratorio?

Vamos a tomar una aplicación Node.js + Express ya construida (la vamos a clonar de GitHub) y la vamos a desplegar dentro de un **contenedor Docker** que simula un servidor de internet. Al terminar, vas a poder abrir `http://localhost` en tu navegador y ver la aplicación funcionando como si estuviera publicada en internet.

### Flujo final

Así se va a ver una petición cuando termines el laboratorio:

```
   Navegador                                                    Contenedor (servidor virtual)
  ┌───────────┐         ┌──────────────────────────────────────────────────────────────┐
  │           │  ──→    │                                                              │
  │  Chrome   │  HTTP   │  Puerto 80          Puerto 3000                              │
  │           │  ────→  │  ┌──────────┐  ──→  ┌──────────────┐  ──→  HTML / JSON       │
  │           │         │  │  Nginx   │       │   Express    │                         │
  │           │  ←──    │  └──────────┘  ←──  └──────────────┘  ←──  respuesta         │
  └───────────┘         │                                                              │
                        └──────────────────────────────────────────────────────────────┘
```

Cuando alguien abre `http://localhost` en su navegador:

1. El navegador toca la **puerta 80** del contenedor.
2. Detrás de esa puerta está **Nginx**, un programa que sabe dirigir tráfico.
3. Nginx **redirige** la petición al **puerto 3000**, donde está corriendo tu app **Express**.
4. Express genera el HTML de respuesta y lo manda de vuelta por el mismo camino.

---

## Estructura del laboratorio

El laboratorio está dividido en 4 partes que **debes hacer en orden**:

1. **[Parte 1 — Preparar el servidor virtual con Docker](./01-preparacion-docker.md)** — Crear y levantar el contenedor que simulará nuestro servidor.
2. **[Parte 2 — Desplegar la aplicación](./02-despliegue-app.md)** — Clonar el repositorio, configurar variables de entorno y levantar la app con PM2.
3. **[Parte 3 — Configurar Nginx como proxy inverso](./03-configurar-nginx.md)** — Hacer que la app sea accesible desde el puerto 80.
4. **[Material complementario — Dominios y SSL](./04-extra-dominio-ssl.md)** — *(No se realiza en el laboratorio)* Cómo funcionarían los dominios y los certificados HTTPS gratuitos en un servidor real.

:::tip Tiempo estimado
Cada parte toma entre **20 y 40 minutos**. Tómate tu tiempo y lee con calma — entender el **porqué** de cada paso es más importante que terminar rápido.
:::

---

## Repositorio de la aplicación

La aplicación que vamos a desplegar es un **gestor de tareas** sencillo construido con Express + EJS. Tiene registro de usuarios, login y CRUD de tareas. Está disponible en:

🔗 **[https://github.com/black4ninja/deploy-workshop](https://github.com/black4ninja/deploy-workshop)**

No necesitas descargarla manualmente: la vamos a clonar **desde dentro del contenedor** en la Parte 2.

:::warning Antes de continuar
Asegúrate de tener **Docker Desktop** abierto y corriendo. En Mac aparece un icono de ballena en la barra superior; en Windows aparece en la bandeja del sistema. Si el icono está animado o gris, espera a que esté quieto y blanco antes de seguir.
:::

Cuando estés listo, continúa con la **[Parte 1 — Preparar el servidor virtual con Docker](./01-preparacion-docker.md)**.
