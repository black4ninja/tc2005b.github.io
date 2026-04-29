---
sidebar_position: 3
---

# Parte 3 — Configurar Nginx como proxy inverso

En este punto la app ya responde en `http://localhost:3000`, pero **no en `http://localhost`** (puerto 80). El puerto 80 es el estándar de la web: cuando entras a `google.com` no escribes `google.com:80`, lo asume el navegador.

Para que nuestra app responda directamente en el puerto 80, vamos a poner a **Nginx** delante de Express, haciéndola de **proxy inverso**.

---

## ¿Qué es un proxy inverso?

Un **proxy inverso** es un programa que se para "delante" de tu aplicación y **redirige** todas las peticiones que recibe hacia ella. Es como un **recepcionista de hotel**: todos los visitantes entran por la puerta principal (puerto 80), y el recepcionista los manda a la habitación correcta (puerto 3000).

```
                             SIN proxy inverso

   Navegador  ──→  http://localhost:3000  ──→  Express  (el usuario tiene que saber el puerto)


                             CON proxy inverso (Nginx)

   Navegador  ──→  http://localhost  ──→  Nginx (puerto 80)  ──→  Express (puerto 3000)
                                          ↑
                                  recibe todo el tráfico
                                  y lo redirige
```

### ¿Por qué no exponer Express directamente en el puerto 80?

1. **Concurrencia**: Nginx maneja **miles** de conexiones simultáneas con muy pocos recursos. Express está hecho para lógica de aplicación, no para aguantar tráfico masivo.
2. **Seguridad**: Nginx puede bloquear ataques comunes, limitar peticiones por IP y ocultar información del servidor.
3. **HTTPS**: configurar SSL es **mucho más fácil** en Nginx que en Express.
4. **Archivos estáticos**: Nginx sirve imágenes/CSS/JS más rápido que Node.js.
5. **Múltiples apps**: en un servidor real puedes tener varias apps (cada una en su puerto interno) y un solo Nginx que las reparte según el dominio.

Es **el patrón estándar** en producción.

---

## 1. Crear el archivo de configuración

Nginx busca configuraciones de sitios en la carpeta `/etc/nginx/sites-available/`. Vamos a crear un archivo ahí.

:::warning Asegúrate de estar dentro del contenedor
Si abriste otra terminal, vuelve a entrar al contenedor desde la carpeta `servidor-virtual/`:

```bash
docker compose exec mi-servidor bash
```

(Ya entras directamente como `estudiante`, no necesitas `su`).
:::

Crea el archivo con `nano`:

```bash
sudo nano /etc/nginx/sites-available/deploy-workshop
```

Pega este contenido en el editor:

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Guarda con `Ctrl + O`, Enter, y sal con `Ctrl + X`.

### ¿Qué significa cada línea?

:::tip Línea por línea
- **`server { ... }`**: define un sitio web. Un mismo Nginx puede tener varios bloques `server` para distintos dominios.
- **`listen 80;`**: este sitio escucha en el puerto 80 (HTTP estándar).
- **`server_name localhost;`**: responde solo a peticiones a `localhost`. En un servidor real pondrías tu dominio: `server_name miapp.com;`.
- **`location / { ... }`**: define qué hacer con las peticiones a la raíz del sitio (todo).
- **`proxy_pass http://localhost:3000;`**: ¡la línea clave! Reenvía la petición al puerto 3000, donde está corriendo Express.
- **`proxy_set_header Host $host;`**: pasa el header `Host` original al backend (Express). Sin esto, Express vería `localhost` en vez del dominio real.
- **`proxy_set_header X-Real-IP $remote_addr;`**: le dice a Express cuál es la IP real del usuario. Sin esto, Express vería siempre la IP de Nginx.
- **`Upgrade` y `Connection`**: necesarios si la app usa **WebSockets** (conexiones en tiempo real). No los usamos aquí, pero es buena práctica incluirlos.
:::

---

## 2. Activar el sitio

Tener el archivo en `sites-available/` no es suficiente — solo **declara** la configuración. Para **activarla** hay que crear un **enlace simbólico** (acceso directo) en `sites-enabled/`.

```bash
sudo ln -s /etc/nginx/sites-available/deploy-workshop /etc/nginx/sites-enabled/
```

`ln -s` crea un acceso directo. Es la convención estándar de Nginx en Ubuntu/Debian: tienes todas tus configuraciones en `sites-available/` y solo "enciendes" las que quieres con un symlink en `sites-enabled/`.

### Eliminar la configuración por defecto

Nginx viene con una página de bienvenida en `/etc/nginx/sites-enabled/default`. Si la dejamos, va a chocar con la nuestra. La eliminamos:

```bash
sudo rm /etc/nginx/sites-enabled/default
```

:::info ¿Por qué no la borramos de `sites-available`?
Porque queremos **desactivarla**, no perderla. Si más adelante la queremos volver, basta con crear el symlink otra vez.
:::

---

## 3. Validar la configuración

Antes de reiniciar Nginx, vamos a pedirle que **revise la sintaxis** del archivo (por si hay errores de tipeo):

```bash
sudo nginx -t
```

Si todo está bien, responde:

```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

:::warning Si ves errores
Lee con calma el mensaje: te dice **en qué archivo y en qué línea** está el problema. Lo más común es que falte un `;` al final de alguna línea o que un bloque `{` no esté cerrado con `}`. Vuelve a abrir el archivo con `sudo nano /etc/nginx/sites-available/deploy-workshop` y arregla.
:::

---

## 4. Reiniciar Nginx

Para que Nginx aplique la nueva configuración, hay que reiniciarlo:

```bash
sudo service nginx restart
```

Si todo va bien, no te dice nada (silencio = éxito en Linux). Para verificar que está corriendo:

```bash
sudo service nginx status
```

Deberías ver `nginx is running`.

:::info Por qué `service` y no `systemctl`
En servidores reales con Linux Ubuntu se usa `systemctl` para administrar servicios. Sin embargo, dentro del contenedor Docker no tenemos `systemd` instalado (lo dejamos fuera para mantener el contenedor liviano), así que usamos el comando viejo `service` que sigue funcionando.
:::

---

## 5. Verificar el despliegue

¡Momento de la verdad! **Sal del contenedor** (no es necesario, pero por claridad):

Abre tu **navegador** (Chrome, Firefox, etc.) y entra a:

```
http://localhost
```

(Sin puerto, sin `:3000`).

Deberías ver la **página de bienvenida de Deploy Workshop**. ¡Felicidades! Acabas de desplegar tu primera aplicación. 🎉

### Probar la funcionalidad completa

Para confirmar que todo funciona:

1. **Regístrate**: abre `http://localhost/registro` y crea un usuario.
2. **Loguéate**: ve a `http://localhost/login` con esas credenciales.
3. **Crea una tarea**: en la lista de tareas, agrega una nueva.
4. **Cambia su estado**: márcala como completada.
5. **Cierra sesión** y entra otra vez para ver que la sesión persiste correctamente.

:::warning Si reinicias el contenedor pierdes los datos
Recuerda que estamos en **modo memoria** (sin base de datos). Si ejecutas `docker restart mi-servidor`, los usuarios y tareas se pierden. Es **correcto** para esta práctica, pero en un despliegue real configurarías una base de datos persistente.
:::

---

## Estado final

```
   TU COMPUTADORA                              CONTENEDOR mi-servidor
  ┌───────────────────┐                       ┌─────────────────────────────────┐
  │                   │                       │  Ubuntu 22.04                   │
  │  Navegador        │                       │                                 │
  │  http://localhost │   ─── puerto 80 ──→   │  Nginx (puerto 80) ──┐          │
  │                   │                       │       (proxy inverso) │         │
  │                   │                       │                       ▼         │
  │                   │                       │  Express (puerto 3000)          │
  │                   │                       │       └─ PM2 manteniéndolo vivo │
  │                   │                       │                                 │
  └───────────────────┘                       └─────────────────────────────────┘
```

Cuando entras a `http://localhost`:

1. El navegador toca el **puerto 80** del contenedor.
2. **Nginx** recibe la petición.
3. Nginx la **reenvía** al **puerto 3000** (Express).
4. **Express** genera el HTML y lo devuelve por el mismo camino.
5. PM2 garantiza que Express **siempre esté vivo** aunque haya un error.

:::tip Checkpoint — Parte 3 (FINAL)
Antes de cerrar el laboratorio, verifica que:

- ✅ Tu navegador muestra la app en `http://localhost` (sin `:3000`)
- ✅ Puedes registrarte, loguearte y crear tareas
- ✅ `sudo nginx -t` no reporta errores
- ✅ `pm2 status` sigue mostrando la app en `online`
- ✅ `sudo service nginx status` reporta `nginx is running`
:::

---

## Errores comunes y cómo resolverlos

### `502 Bad Gateway` al abrir `http://localhost`

Significa que **Nginx no encuentra al backend** (Express). Causas:

- Express no está corriendo. Verifica con `pm2 status` que la app esté en `online`. Si no, ejecuta `pm2 restart deploy-workshop`.
- La app cambió de puerto. Verifica que tu `.env` tenga `PORT=3000` y que el `proxy_pass` en Nginx también apunte a `3000`.

### `403 Forbidden` o página de Nginx por defecto

Significa que **la configuración por defecto sigue activa**. Asegúrate de haber ejecutado:

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo service nginx restart
```

### El navegador no carga nada (timeout)

- Verifica que el contenedor esté corriendo: `docker compose ps` (desde la carpeta `servidor-virtual/`). Si no aparece `mi-servidor` con estado `Up`, ejecuta `docker compose start` y vuelve a entrar.
- Verifica que los puertos estén mapeados: en `docker compose ps` debes ver `0.0.0.0:80->80/tcp`.

### `pm2: command not found`

Significa que PM2 no está instalado o que nvm no se cargó en esta sesión.

1. Verifica que nvm esté activo: `command -v nvm`. Debería responder `nvm`. Si responde vacío, ejecuta `source ~/.bashrc` para cargarlo.
2. Verifica que Node esté disponible: `node --version`. Debería responder `v20.x.x`.
3. Si todo está bien, instala PM2 otra vez: `npm install -g pm2` (sin `sudo`).

---

## Resumen del laboratorio

Lo que aprendiste:

1. ✅ Qué es un servidor, un puerto y una terminal.
2. ✅ Cómo usar Docker para simular un servidor.
3. ✅ Cómo escribir un Dockerfile básico.
4. ✅ Cómo construir imágenes y levantar contenedores.
5. ✅ Cómo clonar un repositorio dentro de un servidor.
6. ✅ Cómo manejar variables de entorno con `.env`.
7. ✅ Qué es PM2 y cómo mantener una app corriendo en segundo plano.
8. ✅ Qué es un proxy inverso y por qué se usa Nginx.
9. ✅ Cómo configurar Nginx para reenviar tráfico a Express.

**Estos pasos son los mismos** que harías en un servidor real (DigitalOcean, AWS EC2, Linode, etc.). La única diferencia es que en lugar de `docker compose exec` usarías SSH para conectarte al servidor.

:::warning Ojo: si haces `docker compose down` se pierde todo el trabajo
Toda la configuración que acabas de hacer (la app clonada, las dependencias instaladas, el `.env`, PM2 corriendo, la config de Nginx) vive **dentro del contenedor**.

Si ejecutas `docker compose down`, el contenedor se borra y **vas a perder todo**. La próxima vez que levantes el contenedor con `docker compose up -d`, tendrás que repetir las **Partes 2 y 3** completas.

Si solo quieres apagar el contenedor sin perder el trabajo, usa **`docker compose stop`** (apaga sin borrar) y después **`docker compose start`** (vuelve a encender desde el mismo estado).

En un despliegue real esto se resuelve usando **volúmenes persistentes** o, mejor aún, dejando que la app, las dependencias y la base de datos vivan en su propio servicio (cada uno en su contenedor). Es tema para un curso más avanzado.
:::

---

## ¿Y si quisiera publicarlo en internet de verdad?

Eso requeriría:

- **Un servidor real** con IP pública (no `localhost`).
- **Un dominio** (`miapp.com`) apuntando a esa IP.
- **HTTPS** con un certificado SSL.

Aunque **no se cubre como parte del laboratorio**, es importante que sepas cómo se haría. Echa un vistazo al **[Material complementario — Dominios y SSL](./04-extra-dominio-ssl.md)**.
