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

Si no, ejecuta `docker exec -it mi-servidor bash` y luego `su estudiante` (contraseña: `password`).
:::

---

## 1. Clonar el repositorio

La aplicación está en GitHub. La vamos a **clonar** (descargar una copia) usando `git`:

```bash
cd ~
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
ls
```

Verás algo como:

```
README.md  controllers/  index.js  middleware/  models/  package.json  public/  routes/  sql/  util/  views/  .env.example
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

`SESSION_SECRET` es una cadena aleatoria que se usa para **firmar las cookies de sesión** de los usuarios. Si alguien la conoce, podría falsificar sesiones. Por eso debe ser **larga, aleatoria e impredecible**.

En lugar de inventarla, le pedimos a Node.js que genere una segura por nosotros:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Te imprimirá algo como:

```
a8f4c2e9b1d7036e54a1f8c2b9e6d3a7f1c8b5e2d9a6f3c0e7b4a1d8f5c2e9b6
```

**Copia ese valor** (selecciónalo con el mouse, click derecho → Copiar). Lo vamos a usar en el siguiente paso.

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

Antes de meter PM2 en el medio, vamos a probar que la app arranca bien. Ejecuta:

```bash
npm start
```

Deberías ver:

```
Servidor escuchando en http://localhost:3000
```

¡La app está corriendo! Pero está bloqueando la terminal. Vamos a probarla **abriendo otra ventana de terminal en tu computadora** y ejecutando:

```bash
curl http://localhost:3000
```

Verás muchísimo HTML como respuesta — es la página principal de la app, que ya está accesible desde tu computadora gracias al `-p 3000:3000` que usamos al levantar el contenedor.

:::tip También puedes abrir el navegador
Mientras la app está corriendo, abre tu navegador y ve a `http://localhost:3000`. Vas a ver la página de bienvenida del **Deploy Workshop**.
:::

### Detener la aplicación

Vuelve a la terminal donde está corriendo `npm start` y presiona:

```
Ctrl + C
```

Esto detiene el proceso. Pero **acabamos de descubrir un problema**: cuando cerramos la terminal, la app se muere. En un servidor real necesitamos que **siga viva sin importar qué pase**. Para eso usamos **PM2**.

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

Te va a pedir la contraseña de `sudo` — es la misma del usuario: `password`.

:::warning ¿Por qué `sudo`?
Porque instalar algo de forma global modifica carpetas del sistema. `sudo` es como decir *"hazlo como administrador"*. En tu propia computadora con Mac/Windows también pasa: por eso a veces te pide tu contraseña al instalar programas.
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
