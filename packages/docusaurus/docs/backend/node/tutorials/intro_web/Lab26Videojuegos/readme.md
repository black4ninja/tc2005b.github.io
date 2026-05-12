---
sidebar_position: 26
---

# Lab 26 — Taller de Videojuegos Web

En este taller construirás un videojuego completo desde cero usando únicamente las tecnologías que ya conoces: **Node.js, Express, EJS y JavaScript del navegador**. No necesitas imágenes, sprites ni assets de ningún tipo: vamos a dibujar todo con la **Canvas API** usando rectángulos, líneas y texto.

El juego se llama **Highway Dodger**: un arcade endless top-down donde conduces un auto por una autopista de varios carriles esquivando rivales que aparecen a velocidad creciente. Cuanto más sobrevives, más puntos sumas, y al final tu puntaje queda registrado en un leaderboard servido por tu propia API REST en Express.

> Importante: el taller se divide en **dos clases**. Al final de la **Clase 1** tendrás un juego jugable de extremo a extremo (un *vertical slice*). En la **Clase 2** añadirás dificultad creciente, una API REST de puntajes y un leaderboard renderizado con EJS.

---

## ¿Qué vas a aprender?

Además de la sintaxis específica, este taller cubre el **proceso real de creación de un videojuego**:

1. **Mini Game Design Document (GDD)**: cómo aterrizar la idea antes de tocar código.
2. **Mecánica base y game loop**: el corazón de cualquier videojuego.
3. **Vertical slice**: la primera versión "delgada pero completa" del juego.
4. **Iteración y polish**: cómo se pasa de un MVP a algo más pulido.
5. **Integración full-stack**: cómo un juego web habla con un servidor vía API REST.

---

## Conceptos previos al código

### 1. ¿Qué es un *game loop*?

Un **game loop** (bucle de juego) es la estructura que mantiene al juego corriendo. Cada "vuelta" del loop se llama un **frame** y normalmente se ejecuta ~60 veces por segundo. En cada frame se hacen tres cosas:

```
mientras (el juego esté vivo):
    1. INPUT   → leer qué teclas/botones está presionando el jugador
    2. UPDATE  → mover objetos, detectar colisiones, actualizar lógica
    3. RENDER  → dibujar el estado actual en pantalla
```

En el navegador, el game loop se implementa con `requestAnimationFrame()`, una función que el navegador llama justo antes del siguiente repintado de pantalla. La gran ventaja sobre `setInterval` es que se sincroniza con la tasa de refresco del monitor (típicamente 60 Hz) y se pausa cuando la pestaña está en segundo plano.

### 2. ¿Qué es un Game Design Document (GDD)?

Un **GDD** es el documento donde se define qué es el juego antes de empezar a programarlo. Para proyectos profesionales puede tener cientos de páginas; para un taller corto basta con un **GDD de una página** que contenga:

| Campo | Qué responde |
|---|---|
| Título y *tagline* | Nombre del juego + frase de una línea |
| Concepto / pitch | ¿De qué trata el juego? (2-3 oraciones) |
| Género | Arcade, plataformas, puzzle, etc. |
| Mecánica base | El verbo principal del jugador ("saltar", "esquivar", "disparar") |
| Controles | Qué teclas se usan y qué hacen |
| Objetivo | ¿Qué busca el jugador? |
| Condición de victoria | ¿Cuándo gana? |
| Condición de derrota | ¿Cuándo pierde? |
| Look & feel | Paleta, tipografía, "vibe" general |
| Alcance MVP | Qué SÍ está y qué NO está en la primera versión |

> Nota: la última fila ("alcance MVP") es la más importante en un taller corto. Sin ella, el proyecto se infla y nunca termina.

### 3. ¿Qué es un *vertical slice*?

Un **vertical slice** es la rebanada más delgada posible del juego donde **todos los sistemas centrales funcionan juntos**: input, lógica, render y condición de fin. Aunque tenga poco contenido (un solo nivel, pocos enemigos), ya se siente como un juego completo: empieza, se juega y termina.

> *"Un vertical slice es la rebanada más delgada del juego que ya se siente como un juego."*

Para el taller, el vertical slice será: **un auto, una autopista con scroll, rivales que aparecen, colisión, game over y reinicio**. Eso es lo que tendrás al final de la Clase 1.

---

## El juego: Highway Dodger — Mini-GDD

| Campo | Valor |
|---|---|
| **Título / Tagline** | *Highway Dodger* — "Esquiva, sobrevive, supera tu récord." |
| **Concepto** | Arcade endless top-down: conduces por una autopista de 4 carriles. Los rivales bajan a velocidad creciente. Cuanto más sobrevives, más puntos. |
| **Género** | Arcade / endless / single-player |
| **Mecánica base** | Cambiar de carril + esquivar |
| **Controles** | `←` `→` (o `A` `D`) para cambiar de carril |
| **Objetivo** | Sobrevivir el mayor tiempo posible y entrar al top 10 |
| **Victoria** | No hay (es *endless*) — el score es el premio |
| **Derrota** | Colisión con un auto rival |
| **Look & Feel** | Minimalista, neón sobre fondo oscuro, tipografía monoespaciada |
| **Alcance MVP** | Auto, autopista con scroll, spawn de rivales, colisión, game over, reinicio, score por tiempo |

### Mockup del juego

```
 ┌──────────────────────┐
 │ SCORE: 1240          │
 │ │ │ │ │              │
 │ │ │█│ │  ← rival     │
 │ │ │ │ │              │
 │ │█│ │ │  ← rival     │
 │ │ │ │ │              │
 │ │ │█│ │  ← jugador   │
 │ │ │ │ │              │
 └──────────────────────┘
```

---

## Clase 1 — Vertical Slice

> Objetivo de la clase: al cerrar, cada quien tiene en `localhost:3000` un juego jugable de principio a fin.

### Bloque 1 — Setup del proyecto

Crea una carpeta nueva e inicializa el proyecto. Si necesitas refrescar Express o EJS, revisa el [Lab 11 — Express](../Lab11Express/readme.md) y el [Lab 12 — EJS](../Lab12EJS/readme.md).

```bash
mkdir highway-dodger
cd highway-dodger
npm init -y
npm install express ejs
```

Crea la siguiente estructura de carpetas y archivos:

```
highway-dodger/
├── package.json
├── server.js
├── views/
│   └── index.ejs
└── public/
    ├── style.css
    └── game.js
```

**`server.js`** (versión inicial):

```js
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index');
});

app.listen(PORT, () => {
  console.log(`Highway Dodger en http://localhost:${PORT}`);
});
```

**`views/index.ejs`**:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Highway Dodger</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main>
    <h1>HIGHWAY DODGER</h1>
    <canvas id="game" width="320" height="480"></canvas>
  </main>
  <script src="/game.js"></script>
</body>
</html>
```

**`public/style.css`**:

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Courier New', monospace;
  background: #0a0a14;
  color: #e0e0ff;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 20px;
}

main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

h1 {
  letter-spacing: 4px;
  color: #00ffaa;
  text-shadow: 0 0 12px #00ffaa;
}

canvas {
  background: #111122;
  border: 2px solid #00ffaa;
  box-shadow: 0 0 24px rgba(0, 255, 170, 0.3);
  display: block;
}
```

**`public/game.js`** (vacío por ahora, lo llenamos en el siguiente bloque).

Arranca el servidor y verifica que carga la página:

```bash
node server.js
```

Abre `http://localhost:3000` — debes ver el título y un canvas oscuro con borde verde.

> Prueba a cambiar el `width`/`height` del canvas o los colores en `style.css` para que reconozcas qué controla cada cosa.

---

### Bloque 2 — Canvas + game loop

Vamos a montar el game loop con `requestAnimationFrame`. La idea es separar la **actualización de lógica** (`update`) del **dibujado** (`render`). Para que el juego se mueva igual de rápido en todas las computadoras usamos **delta time**: el tiempo (en segundos) que pasó desde el último frame.

Edita `public/game.js`:

```js
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// Estado del juego
const state = {
  testX: 0
};

function update(dt) {
  // dt es el tiempo (en segundos) desde el último frame
  state.testX += 100 * dt; // se mueve 100 px por segundo
  if (state.testX > W) state.testX = 0;
}

function render() {
  // Limpiar el canvas
  ctx.fillStyle = '#111122';
  ctx.fillRect(0, 0, W, H);

  // Dibujar un rectángulo de prueba
  ctx.fillStyle = '#00ffaa';
  ctx.fillRect(state.testX, H / 2, 40, 40);
}

let lastTime = performance.now();

function loop(now) {
  const dt = (now - lastTime) / 1000; // milisegundos → segundos
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

Recarga la página: debes ver un cuadrado verde cruzando el canvas de izquierda a derecha en bucle.

> Importante: nota que **el cuadrado se mueve a la misma velocidad sin importar la computadora**. Eso es gracias a `dt`. Si en vez de `100 * dt` usaras `state.testX += 1`, en pantallas de 144 Hz el cuadrado se movería más del doble de rápido que en una de 60 Hz.

---

### Bloque 3 — Auto del jugador + input

Vamos a definir 4 carriles y un auto que cambia entre ellos con `←` y `→`. En lugar de mover el auto con velocidad continua, lo "saltamos" instantáneamente entre carriles — es más arcade y más fácil de programar.

Reemplaza el contenido de `game.js`:

```js
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// Configuración
const LANES = 4;
const LANE_WIDTH = W / LANES;
const CAR_WIDTH = 32;
const CAR_HEIGHT = 56;

// Helper: convierte un índice de carril (0..3) a la coordenada X del centro del auto
function laneToX(lane) {
  return lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
}

const player = {
  lane: 1,       // empieza en el segundo carril
  y: H - 80      // cerca del borde inferior
};

// --- Input ---
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') {
    player.lane = Math.max(0, player.lane - 1);
  }
  if (e.key === 'ArrowRight' || e.key === 'd') {
    player.lane = Math.min(LANES - 1, player.lane + 1);
  }
});

function update(dt) {
  // Por ahora el auto solo cambia de carril vía input. Nada que hacer aquí.
}

function render() {
  // Fondo
  ctx.fillStyle = '#111122';
  ctx.fillRect(0, 0, W, H);

  // Jugador
  ctx.fillStyle = '#00ffaa';
  ctx.fillRect(laneToX(player.lane), player.y, CAR_WIDTH, CAR_HEIGHT);
}

let lastTime = performance.now();
function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

Recarga: ahora puedes mover el auto con las flechas. El auto se "engancha" a los 4 carriles.

> Prueba: cambia `LANES = 3` o `LANES = 5`. Verás que todo se reajusta solo porque las medidas son derivadas.

---

### Bloque 4 — Carretera con scroll

Una autopista vacía es aburrida. Vamos a pintar **líneas divisorias entre carriles** y a hacer que se desplacen hacia abajo para dar sensación de velocidad. El truco está en mantener un *offset* que crece con el tiempo y se reinicia cuando supera la altura del segmento.

Añade una constante de velocidad de scroll y modifica `update` y `render`:

```js
// Junto a las otras constantes:
const ROAD_SPEED = 320; // píxeles por segundo
const DASH_HEIGHT = 28;
const DASH_GAP = 22;

// Junto al state:
let roadOffset = 0;

function update(dt) {
  roadOffset = (roadOffset + ROAD_SPEED * dt) % (DASH_HEIGHT + DASH_GAP);
}

function render() {
  // Fondo
  ctx.fillStyle = '#111122';
  ctx.fillRect(0, 0, W, H);

  // Líneas divisorias entre carriles
  ctx.fillStyle = '#3a3a5a';
  for (let lane = 1; lane < LANES; lane++) {
    const x = lane * LANE_WIDTH - 2;
    for (let y = -DASH_HEIGHT + roadOffset; y < H; y += DASH_HEIGHT + DASH_GAP) {
      ctx.fillRect(x, y, 4, DASH_HEIGHT);
    }
  }

  // Jugador
  ctx.fillStyle = '#00ffaa';
  ctx.fillRect(laneToX(player.lane), player.y, CAR_WIDTH, CAR_HEIGHT);
}
```

Recarga: la carretera ahora "fluye" hacia abajo. El auto se siente como si avanzara aunque en realidad solo se mueven las líneas.

> Nota: este es un truco clásico de los juegos arcade. El jugador casi no se mueve en pantalla; lo que se mueve es el mundo.

---

### Bloque 5 — Spawn de rivales

Los rivales son simplemente otros autos que aparecen arriba y bajan a la misma velocidad de la carretera. Los guardamos en un **array de entidades** y los actualizamos en cada frame.

Añade arriba del `update`:

```js
const enemies = []; // array de { lane, y }
let spawnTimer = 0;
const SPAWN_INTERVAL = 0.9; // segundos entre spawns
```

Reemplaza `update` y añade un bloque a `render`:

```js
function update(dt) {
  roadOffset = (roadOffset + ROAD_SPEED * dt) % (DASH_HEIGHT + DASH_GAP);

  // Spawn de rivales
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnTimer = SPAWN_INTERVAL;
    enemies.push({
      lane: Math.floor(Math.random() * LANES),
      y: -CAR_HEIGHT
    });
  }

  // Mover rivales hacia abajo y descartar los que salieron
  for (const e of enemies) {
    e.y += ROAD_SPEED * dt;
  }
  // Eliminar enemigos fuera de pantalla (de atrás hacia adelante)
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].y > H) enemies.splice(i, 1);
  }
}

function render() {
  // ... el código anterior (fondo, líneas, jugador) sigue igual

  // Rivales — añadir antes del jugador para que el jugador quede encima
  ctx.fillStyle = '#ff66cc';
  for (const e of enemies) {
    ctx.fillRect(laneToX(e.lane), e.y, CAR_WIDTH, CAR_HEIGHT);
  }
}
```

> Importante: el orden de `render` importa. Los elementos se pintan unos encima de otros. Si quieres que el jugador siempre quede arriba visualmente, píntalo al final.

Recarga: rivales magenta aparecen aleatoriamente y bajan. Ya hay esquiva.

---

### Bloque 6 — Colisión + game over

Detectamos colisiones con **AABB** (*Axis-Aligned Bounding Box*): dos rectángulos chocan si se solapan en X **y** en Y al mismo tiempo. Es la prueba de colisión más simple y rápida.

```js
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx &&
         ay < by + bh && ay + ah > by;
}
```

Añade al state una bandera de game over:

```js
let gameOver = false;
```

En `update`, al final, verifica colisión con cada rival:

```js
  if (!gameOver) {
    const px = laneToX(player.lane);
    for (const e of enemies) {
      const ex = laneToX(e.lane);
      if (rectsOverlap(px, player.y, CAR_WIDTH, CAR_HEIGHT,
                       ex, e.y, CAR_WIDTH, CAR_HEIGHT)) {
        gameOver = true;
        break;
      }
    }
  }
```

Y al inicio de `update`, congela todo si ya terminó la partida:

```js
function update(dt) {
  if (gameOver) return;
  // ...el resto del update...
}
```

Añade un overlay de game over en `render`:

```js
  if (gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ff66cc';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 10);

    ctx.fillStyle = '#e0e0ff';
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText('Presiona ESPACIO para reiniciar', W / 2, H / 2 + 20);
  }
```

Y añade reinicio con la tecla espacio:

```js
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' && gameOver) {
    enemies.length = 0;
    spawnTimer = 0;
    gameOver = false;
    player.lane = 1;
  }
});
```

Recarga: choca contra un rival → pantalla de game over → espacio reinicia.

> Prueba a ajustar `SPAWN_INTERVAL` para hacer el juego más difícil o más fácil.

---

### Bloque 7 — Score por tiempo

El score más simple para un endless: **puntos = tiempo vivo**. Lo acumulamos en `update` y lo dibujamos en `render`.

```js
// En el state:
let score = 0;

// En update (antes del game over check):
score += dt * 100; // 100 puntos por segundo

// Al reiniciar, también:
score = 0;

// En render, antes del overlay de game over:
ctx.fillStyle = '#00ffaa';
ctx.font = 'bold 16px "Courier New", monospace';
ctx.textAlign = 'left';
ctx.fillText('SCORE: ' + Math.floor(score), 10, 24);
```

> Cierre Clase 1: **Vertical slice cumplido**. Tu juego ya tiene input, lógica, render, condición de derrota, reinicio y feedback (score). Es un juego completo aunque sea pequeño.

---

## Clase 2 — Expansión + API REST

> Objetivo de la clase: añadir dificultad creciente, una API REST de puntajes en Express y un leaderboard.

### Bloque 1 — Recap y bug fixes

Empieza con el código que cerraste la clase pasada. Verifica que arranca con `node server.js` y que el juego es jugable. Si descubres bugs, este es el momento (típicos: el auto se queda fuera de carriles, los enemigos se solapan al spawnar en el mismo carril seguido, el score no se reinicia, etc.).

### Bloque 2 — Dificultad creciente

Que el juego se acelere con el tiempo lo hace mucho más interesante. Vamos a hacer que `ROAD_SPEED` y la frecuencia de spawn cambien con el score.

Convierte `ROAD_SPEED` en una variable y añade lógica en `update`:

```js
// Cambia "const ROAD_SPEED" por:
let roadSpeed = 320;
const BASE_ROAD_SPEED = 320;
const BASE_SPAWN_INTERVAL = 0.9;

// En update, antes del scroll:
roadSpeed = BASE_ROAD_SPEED + Math.min(score / 4, 320); // tope para no romper

// Y cuando hagas spawn, recalcula el intervalo:
spawnTimer = Math.max(0.35, BASE_SPAWN_INTERVAL - score / 5000);
```

Reemplaza los usos de `ROAD_SPEED` por `roadSpeed`. Reinicia `roadSpeed = BASE_ROAD_SPEED` al reiniciar la partida.

> Prueba: juega un minuto. La sensación debe ser que cada vez te cuesta más esquivar.

### Bloque 3 — Polish visual

Mejoras pequeñas con gran impacto:

```js
// En el render del jugador, antes del fillRect:
ctx.shadowColor = '#00ffaa';
ctx.shadowBlur = 12;
ctx.fillStyle = '#00ffaa';
ctx.fillRect(laneToX(player.lane), player.y, CAR_WIDTH, CAR_HEIGHT);
ctx.shadowBlur = 0;

// Indicador de velocidad en la esquina superior derecha:
ctx.fillStyle = '#888';
ctx.font = '12px "Courier New", monospace';
ctx.textAlign = 'right';
ctx.fillText('SPEED ' + Math.floor(roadSpeed), W - 10, 22);
```

> Nota: `shadowBlur` con `fillRect` te da un efecto de "neón" gratis. Es caro de rendimiento si lo usas en cientos de objetos, pero para un par está bien.

### Bloque 4 — API REST de puntajes en Express

Ahora viene la parte full-stack. Vamos a guardar puntajes **en memoria** (un simple array dentro de Express) y exponerlos vía dos endpoints REST. **No es una base de datos real** — el array se borra cuando reinicies el servidor — pero es suficiente para entender el patrón. El siguiente paso natural sería una BD como en el [Lab 17 — Base de datos](../Lab17BD/readme.md).

Modifica `server.js`:

```js
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json()); // necesario para leer JSON del body
app.use(express.static(path.join(__dirname, 'public')));

// "BD" en memoria
let scores = [];

function topScores() {
  return [...scores].sort((a, b) => b.score - a.score).slice(0, 10);
}

app.get('/', (req, res) => {
  res.render('index', { scores: topScores() });
});

app.get('/api/scores', (req, res) => {
  res.json(topScores());
});

app.post('/api/scores', (req, res) => {
  const { name, score } = req.body;
  if (typeof name !== 'string' || typeof score !== 'number') {
    return res.status(400).json({ error: 'name (string) y score (number) son requeridos' });
  }
  scores.push({
    name: name.slice(0, 12),
    score: Math.floor(score),
    date: Date.now()
  });
  res.json(topScores());
});

app.listen(PORT, () => {
  console.log(`Highway Dodger en http://localhost:${PORT}`);
});
```

Prueba los endpoints sin abrir el juego, desde una terminal nueva:

```bash
# Insertar un score
curl -X POST -H 'Content-Type: application/json' \
  -d '{"name":"PROF","score":1234}' \
  http://localhost:3000/api/scores

# Ver el top
curl http://localhost:3000/api/scores
```

> Importante: este patrón (`GET` para leer + `POST` para crear + JSON en ambos lados) es **REST básico**. Lo mismo que harías con una BD real, pero usando un array como sustituto.

### Bloque 5 — Fetch desde el cliente

Cuando el jugador pierde, vamos a pedirle su nombre con `prompt()` (lo más simple) y enviar el score al servidor con `fetch`. Si ya viste el [Lab 24 — AJAX](../Lab24AJAX/readme.md), esto te será familiar.

En `game.js`, añade una bandera para no enviar el score dos veces:

```js
let scoreSubmitted = false;
```

Cuando `gameOver` se vuelva `true`, dispara una función async:

```js
// En update, donde detectas la colisión:
if (rectsOverlap(/* ... */)) {
  gameOver = true;
  submitScore();
  break;
}

// Nueva función:
async function submitScore() {
  if (scoreSubmitted) return;
  scoreSubmitted = true;

  const name = (prompt('GAME OVER\nTu nombre (max 12):', 'ANON') || 'ANON').trim() || 'ANON';

  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score: Math.floor(score) })
    });
    const top = await res.json();
    console.log('Nuevo top 10:', top);
  } catch (err) {
    console.error('No se pudo enviar el score', err);
  }
}
```

No olvides resetear `scoreSubmitted = false` cuando reinicien con espacio.

Recarga, choca, escribe tu nombre y revisa la consola del navegador — debes ver el top 10. Luego refresca la página completa: si el servidor no se reinició, tu score sigue ahí (porque `let scores = []` vive en memoria del proceso Node).

### Bloque 6 — Leaderboard renderizado con EJS

Ya tenemos los scores en el servidor. Vamos a mostrarlos debajo del canvas usando EJS — exactamente el mismo `<% %>` que viste en el Lab 12.

Edita `views/index.ejs`:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Highway Dodger</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <main>
    <h1>HIGHWAY DODGER</h1>
    <canvas id="game" width="320" height="480"></canvas>

    <section id="leaderboard">
      <h2>TOP 10</h2>
      <ol>
        <% scores.forEach(function(s) { %>
          <li>
            <span class="name"><%= s.name %></span>
            <span class="score"><%= s.score %></span>
          </li>
        <% }); %>
        <% if (scores.length === 0) { %>
          <li class="empty">Sin puntajes aún — sé el primero.</li>
        <% } %>
      </ol>
    </section>
  </main>
  <script src="/game.js"></script>
</body>
</html>
```

Añade estilos para el leaderboard en `style.css`:

```css
#leaderboard {
  width: 320px;
  background: #14142a;
  border: 1px solid #2a2a4a;
  padding: 12px 16px;
}

#leaderboard h2 {
  color: #ff66cc;
  font-size: 14px;
  letter-spacing: 3px;
  margin-bottom: 8px;
}

#leaderboard ol {
  list-style: decimal inside;
  font-size: 14px;
}

#leaderboard li {
  padding: 4px 0;
  border-bottom: 1px dashed #2a2a4a;
  display: flex;
  justify-content: space-between;
}

#leaderboard li.empty {
  color: #666;
  font-style: italic;
  justify-content: flex-start;
}

#leaderboard .score {
  color: #00ffaa;
}
```

Refresca la página: ahora ves el top 10 server-side cada vez que entras. Si juegas y mueres, el score se envía vía `fetch` — pero el render del leaderboard solo se actualiza al refrescar la página entera. Esto es intencional: te muestra **dos formas distintas** de obtener datos:

- **Server-side render con EJS**: datos frescos cuando se carga la página.
- **Fetch desde el cliente**: datos frescos sin recargar.

> Reto opcional: después de enviar el score, llama también `await fetch('/api/scores')` y reconstruye el leaderboard en el DOM con JavaScript. Eso sería 100% AJAX, sin recargar.

### Bloque 7 — Showcase y cierre conceptual

Cada quien muestra su juego. Discusión guiada:

- ¿Qué partes son del *vertical slice* (Clase 1) y qué partes son *expansión* (Clase 2)?
- Lo que ya tenemos es **vertical**: el juego se juega de inicio a fin. Lo que sigue sería **horizontal**: más niveles, audio, power-ups, multijugador, persistencia en BD real. *Más contenido del mismo tipo*.
- ¿Qué pasaría si quisiéramos que el leaderboard sobreviva al reinicio del servidor? → Necesitarías una BD real (revisa [Lab 17](../Lab17BD/readme.md)).
- ¿Qué pasaría si fueran 1,000 jugadores simultáneos? → Cuello de botella en el array en memoria, problemas de concurrencia.

---

## Proyecto de referencia

Si quieres comparar tu solución con un proyecto base ya armado al final de Clase 2:

<a href="/docs/node/tutorials/intro_web/Lab26Videojuegos/test-project.zip" download="lab26-highway-dodger.zip">Descargar Highway Dodger (proyecto completo)</a>

> Nota: el zip **no incluye** `node_modules`. Después de descomprimir, ejecuta `npm install` y luego `node server.js` (o `npm start`).

---

## Retos opcionales

Para quien termine antes o quiera seguir trabajando en casa:

1. **Audio**: usa la [Web Audio API](https://developer.mozilla.org/es/docs/Web/API/Web_Audio_API) para tocar un beep al chocar.
2. **Power-ups**: añade un cuadrado dorado que aparece ocasionalmente y otorga 3 segundos de invulnerabilidad.
3. **Carriles dinámicos**: comienza con 3 carriles y abre un 4° al llegar a cierto score.
4. **Persistencia real**: integra una BD como en el Lab 17 para que el leaderboard sobreviva al reinicio.
5. **Mobile/touch**: detecta swipes en pantallas táctiles (`touchstart`/`touchend`).
6. **Animación de explosión**: al chocar, dibuja un efecto de partículas (cuadritos que se expanden y se desvanecen).
7. **Skins por carril**: que cada carril tenga un color distinto y los rivales hereden el color del carril.

---

## Recursos y bibliografía

### Game development con Canvas

- [MDN — 2D Breakout game pure JavaScript](https://developer.mozilla.org/es/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript) — el tutorial canónico de juego con Canvas.
- [MDN — Canvas API: Basic animations](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations)
- [MDN — Window.requestAnimationFrame()](https://developer.mozilla.org/es/docs/Web/API/Window/requestAnimationFrame)

### Diseño de videojuegos

- [Indie Game Academy — Free GDD Template & How-To Guide](https://indiegameacademy.com/free-game-design-document-template-how-to-guide/) — plantilla de GDD comentada.
- [Wikipedia — Vertical slice](https://en.wikipedia.org/wiki/Vertical_slice)
- [Rami Ismail — Prototypes & Vertical Slice](https://ltpf.ramiismail.com/prototypes-and-vertical-slice/)

### Stack del taller

- [Express — Serving static files](https://expressjs.com/en/starter/static-files.html)
- [EJS — Documentation](https://ejs.co/#docs)
- [Lab 11 — Express](../Lab11Express/readme.md)
- [Lab 12 — EJS](../Lab12EJS/readme.md)
- [Lab 24 — AJAX](../Lab24AJAX/readme.md)
