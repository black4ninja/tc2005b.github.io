---
sidebar_position: 2
---

# Parte 2 — Desplegar la aplicación

Ahora que tenemos un servidor virtual encendido y vacío, vamos a:

1. Clonar el repositorio de la aplicación.
2. Instalar las dependencias.
3. Configurar las variables de entorno (`.env`).
4. Probar la aplicación manualmente.
5. Instalar **PM2** y dejar la aplicación corriendo en segundo plano.

:::warning Antes de empezar
Asegúrate de estar **dentro del contenedor** como usuario `estudiante`. El prompt debe verse así:

```
estudiante@3a7fa64f27c8:~$
```

Si no, abre una terminal en la carpeta `servidor-virtual/` y ejecuta `docker compose exec mi-servidor bash`.
:::

---

## 1. Clonar el repositorio

La aplicación está en GitHub. La vamos a **clonar** (descargar una copia) usando `git`. Como ya entraste al contenedor en `/home/estudiante`, no necesitas moverte a ningún lado:

```bash
git clone https://github.com/black4ninja/deploy-workshop.git
```

`git clone` baja una copia completa del repositorio en una carpeta nueva llamada `deploy-workshop`. Verás algo como:

```
Cloning into 'deploy-workshop'...
remote: Enumerating objects: 89, done.
remote: Counting objects: 100% (89/89), done.
...
Receiving objects: 100% (89/89), 45.32 KiB | 2.85 MiB/s, done.
Resolving deltas: 100% (12/12), done.
```

Entra a la carpeta y mira qué hay dentro:

```bash
cd deploy-workshop
ls -la
```

:::info ¿Por qué `ls -la` y no solo `ls`?
La bandera `-a` ("all") muestra **archivos ocultos** (los que empiezan con `.`). En este proyecto hay archivos importantes como `.env.example` y `.gitignore` que `ls` por sí solo **no muestra**. La bandera `-l` ("long") muestra detalles como permisos, dueño, fecha y tamaño.
:::

Verás algo como:

```
drwxr-xr-x  ... .
drwxr-xr-x  ... ..
-rw-r--r--  ... .env.example
-rw-r--r--  ... .gitignore
-rw-r--r--  ... README.md
drwxr-xr-x  ... controllers
-rw-r--r--  ... index.js
drwxr-xr-x  ... middleware
drwxr-xr-x  ... models
-rw-r--r--  ... package.json
drwxr-xr-x  ... public
drwxr-xr-x  ... routes
drwxr-xr-x  ... sql
drwxr-xr-x  ... util
drwxr-xr-x  ... views
```

:::tip ¿Qué es esta aplicación?
Es un **gestor de tareas** sencillo:
- Sirve HTML usando **Express** + **EJS** (templates de servidor)
- Permite **registro y login** de usuarios (con sesiones)
- Cada usuario puede crear, editar, completar y borrar tareas
- Funciona **sin base de datos** (modo memoria) o **con PostgreSQL** (Supabase) — nosotros vamos a usar el modo memoria
:::

---

## 2. Instalar las dependencias

Como cualquier proyecto Node.js, la aplicación necesita sus dependencias instaladas (Express, EJS, etc.). Las dependencias están listadas en `package.json`. Para instalarlas:

```bash
npm install
```

Tarda un par de minutos. Verás líneas como:

```
added 156 packages, and audited 157 packages in 32s
```

:::warning Si ves warnings de "deprecated"
Es normal y los puedes **ignorar**. Solo te preocupa si ves la palabra `error` o `ERR!`.
:::

Verás que se creó una carpeta `node_modules/` enorme — ahí viven todas las dependencias. **Nunca** se sube a GitHub (por eso está en `.gitignore`).

---

## 3. Configurar las variables de entorno (`.env`)

### ¿Qué es un archivo `.env`?

Un archivo `.env` (de "**env**ironment", entorno) es donde guardamos **configuración secreta** o que **cambia entre entornos** (desarrollo, producción, etc.). Por ejemplo:

- Contraseñas de bases de datos
- Secretos de sesión
- Claves de APIs externas
- Puerto donde corre la app

**Nunca** se suben a GitHub (siempre van en `.gitignore`). Lo que sí se sube es un archivo `.env.example` con las **variables que necesitas** pero **sin los valores reales**, para que otros desarrolladores sepan qué configurar.

### Ver el archivo de ejemplo

```bash
cat .env.example
```

Verás algo como:

```
# DATABASE_URL=postgresql://user:pass@host:5432/dbname
# SESSION_SECRET=cambia_esto_por_una_cadena_segura
# PORT=3000
```

Las líneas con `#` al inicio están **comentadas** (ignoradas).

### Generar un SESSION_SECRET seguro

`SESSION_SECRET` es una cadena aleatoria que se usa para **firmar las cookies de sesión** de los usuarios. Cuando un usuario se loguea, Express le manda al navegador una cookie firmada con esta clave; cuando el usuario regresa, Express verifica con la misma clave que la cookie no fue alterada. **Si alguien conoce la clave, puede falsificar sesiones de cualquier usuario.**

Por eso debe cumplir tres reglas:

1. **Aleatoria**: nada de palabras del diccionario o frases pronunciables.
2. **Larga**: 32 bytes (256 bits) es lo recomendado en la industria.
3. **Secreta**: nunca se sube a GitHub, nunca se comparte por chat.

En lugar de inventarla, le pedimos a Node.js que la genere usando su módulo `crypto`, que produce números **criptográficamente seguros**:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Esto genera **32 bytes aleatorios** y los imprime como **hexadecimal** (caracteres del 0-9 y a-f), dándote una cadena de **64 caracteres** como esta:

```
a8f4c2e9b1d7036e54a1f8c2b9e6d3a7f1c8b5e2d9a6f3c0e7b4a1d8f5c2e9b6
```

**Copia ese valor** (selecciónalo con el mouse, click derecho → Copiar). Lo vamos a usar en el siguiente paso.

:::warning No uses una cadena que tú hayas inventado
Aunque te sientas creativo, **`miClaveSuperSecreta123!`** es muchísimo más fácil de adivinar que 32 bytes aleatorios reales. Las cadenas que uno se inventa siguen patrones humanos (palabras, fechas, nombres) que un atacante puede aprovechar. Siempre genera la clave con `crypto.randomBytes`.
:::

### Crear el archivo `.env`

Ahora creamos el archivo `.env` con `nano` (un editor de texto que vive dentro de la terminal):

```bash
nano .env
```

Se abre una ventana en blanco dentro de la terminal. Escribe (reemplazando `PEGA_AQUI_TU_VALOR` con la cadena que copiaste antes):

```
SESSION_SECRET=PEGA_AQUI_TU_VALOR
PORT=3000
```

Para **guardar y salir** de `nano`:

1. Presiona `Ctrl + O` (la letra O, no el número 0). Te pregunta el nombre del archivo: presiona Enter.
2. Presiona `Ctrl + X` para salir.

Verifica que se guardó bien:

```bash
cat .env
```

Deberías ver tus variables.

:::info ¿Por qué no configuramos DATABASE_URL?
La aplicación detecta si `DATABASE_URL` está vacía y, si lo está, **funciona en modo memoria**: guarda usuarios y tareas en RAM. Esto es perfecto para nuestra práctica, pero ten en cuenta que **al reiniciar el contenedor todos los datos se pierden**. En un despliegue real configurarías una base de datos PostgreSQL (Supabase, RDS, etc.).
:::

---

## 4. Probar la aplicación manualmente

Antes de levantarla con PM2, vamos a hacer una prueba "a mano" para confirmar que la app arranca bien. Ejecuta:

```bash
npm start
```

Deberías ver:

```
Servidor escuchando en http://localhost:3000
```

¡La app está corriendo! Pero **fíjate en dos cosas**:

1. La terminal está **bloqueada**: no te deja escribir nada más.
2. Si cierras esta terminal, **la app se muere**.

Vamos a probarla **abriendo otra ventana de terminal en tu computadora** y ejecutando:

```bash
curl http://localhost:3000
```

Verás muchísimo HTML como respuesta — es la página principal de la app, que ya está accesible desde tu computadora gracias al mapeo de puerto `3000:3000` que pusimos en el `docker-compose.yml`.

:::tip También puedes abrir el navegador
Mientras la app está corriendo, abre tu navegador y ve a `http://localhost:3000`. Vas a ver la página de bienvenida del **Deploy Workshop**.
:::

### Detener la aplicación

Vuelve a la terminal donde está corriendo `npm start` y presiona:

```
Ctrl + C
```

Esto **mata el proceso** y la app deja de responder. Para confirmarlo, vuelve a hacer `curl http://localhost:3000` y verás un error de conexión.

:::info ¿Para qué sirvió este paso?
Lo arrancamos a mano con `npm start` para **probar que la app sirve** y para que sientas el problema: si cierras la terminal o pasa cualquier cosa, **la app muere**. En un servidor real esto sería catastrófico — nadie podría usar la página hasta que alguien la reinicie manualmente. Por eso, en producción **nunca** se arranca una app así. Se usa un **gestor de procesos** como PM2, que es lo que vamos a hacer ahora.
:::

---

## 5. ¿Qué es PM2?

**PM2** es un **gestor de procesos** para Node.js. Lo que hace es:

- Mantener tu aplicación viva **24/7**, incluso si te desconectas del servidor.
- **Reiniciarla automáticamente** si se cae por un error.
- Manejar los **logs** (los `console.log` y errores).
- Permitirte ver el **estado** de tus apps con un solo comando.

Es como cuando dejas Spotify abierto en segundo plano: cierras la ventana pero la música sigue sonando. PM2 hace exactamente eso pero con tu servidor.

### Instalar PM2

PM2 se instala **globalmente** en el sistema (con `-g`) para poder usarlo desde cualquier carpeta:

```bash
sudo npm install -g pm2
```

:::info ¿Por qué `sudo`?
Porque instalar algo de forma global modifica carpetas del sistema. `sudo` es como decir *"hazlo como administrador"*. En tu propia computadora con Mac/Windows también pasa: por eso a veces te pide tu contraseña al instalar programas.

En este lab configuramos el contenedor para que **`sudo` no pida contraseña** (con `NOPASSWD` en el Dockerfile) y así la práctica fluya sin interrupciones. **En un servidor real no harías esto** — siempre te pedirá la contraseña como medida de seguridad.
:::

Verifica que se instaló:

```bash
pm2 --version
```

---

## 6. Levantar la aplicación con PM2

Asegúrate de estar en la carpeta `deploy-workshop` (`pwd` debe responder `/home/estudiante/deploy-workshop`). Si no, ejecuta `cd ~/deploy-workshop`.

Ahora arrancamos la app:

```bash
pm2 start index.js --name deploy-workshop
```

**¿Qué significa cada parte?**

- `pm2 start` → arranca un proceso.
- `index.js` → el archivo principal de la app (lo dice el `package.json` en `"main"` y `"start"`).
- `--name deploy-workshop` → le ponemos un nombre amigable para identificarla.

Verás una tabla con la app en estado `online`:

```
┌─────┬──────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┐
│ id  │ name             │ namespace   │ version │ mode    │ pid      │ status │
├─────┼──────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┤
│ 0   │ deploy-workshop  │ default     │ 1.0.0   │ fork    │ 1234     │ online │
└─────┴──────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┘
```

¡La app está corriendo en segundo plano! Aunque cierres la terminal, sigue viva.

### Verificar

```bash
pm2 status
```

Debería mostrar la misma tabla, con `deploy-workshop` en `online`.

```bash
curl http://localhost:3000
```

Debería responder con HTML.

---

## Comandos útiles de PM2

Estos son los que vas a usar más seguido:

| Comando | ¿Qué hace? |
|---------|------------|
| `pm2 status` | Lista todas las apps que PM2 está manejando |
| `pm2 logs` | Muestra los logs en vivo de todas las apps (Ctrl+C para salir) |
| `pm2 logs deploy-workshop` | Logs solo de tu app |
| `pm2 restart deploy-workshop` | Reinicia la app (útil si cambiaste código) |
| `pm2 stop deploy-workshop` | La detiene (no la borra, queda en pausa) |
| `pm2 delete deploy-workshop` | La quita por completo de PM2 |

---

## Estado actual

```
   TU COMPUTADORA                              CONTENEDOR mi-servidor
  ┌───────────────────┐                       ┌──────────────────────────┐
  │                   │                       │  Ubuntu 22.04            │
  │  Docker Desktop   │                       │  Node.js 18              │
  │                   │                       │  Nginx (instalado)       │
  │  Navegador        │   ──── puerto 80 ──→  │  Puerto 80: VACÍO        │
  │                   │   ── puerto 3000 ──→  │  Puerto 3000: Express ✓  │
  │                   │                       │     └─ PM2 manteniéndolo │
  └───────────────────┘                       │        vivo              │
                                              └──────────────────────────┘
```

La app responde en `http://localhost:3000`, pero todavía **no responde en `http://localhost`** (puerto 80) que es el estándar de la web. En la siguiente parte vamos a configurar **Nginx** para que ese puerto reenvíe al 3000 automáticamente.

:::tip Checkpoint — Parte 2
Antes de continuar, verifica que:

- ✅ Existe la carpeta `~/deploy-workshop` con todo el código clonado
- ✅ Existe el archivo `.env` con `SESSION_SECRET` y `PORT`
- ✅ `pm2 status` muestra la app `deploy-workshop` en estado **online**
- ✅ `curl http://localhost:3000` responde HTML
- ✅ Si abres `http://localhost:3000` en tu navegador, ves la página de la app
:::

---

Cuando estés listo, continúa con la **[Parte 3 — Configurar Nginx como proxy inverso](./03-configurar-nginx.md)**.
