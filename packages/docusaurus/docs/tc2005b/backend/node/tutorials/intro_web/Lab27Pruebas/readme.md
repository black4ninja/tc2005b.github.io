---
sidebar_position: 27
---

# Lab 27 — Pruebas unitarias con Jest

**Sesión 2 de 3 — Pruebas de Software**
**Tiempo estimado:** 40 minutos

En este laboratorio van a traducir los **casos de prueba diseñados en la sesión anterior** (Lab 1 de pruebas, sobre papel) a **pruebas automatizadas reales** usando **Jest**, sobre un proyecto base llamado `rpg-pruebas` — un pequeño RPG por turnos escrito en Node.js que ya tiene la lógica lista para ser probada.

> **Objetivo del lab:** Traducir los casos de prueba que diseñaron en el Lab 1 a pruebas automatizadas con Jest. Aplicar el **patrón AAA**, los **matchers correctos** y **explorar cobertura de código** sobre el proyecto `rpg-pruebas`.

---

## Entregables

Al final de la sesión deben tener estos tres archivos creados y todas las pruebas pasando en verde:

| Archivo / acción | Mínimo requerido |
|---|---|
| `tests/personaje.test.js` | 8 pruebas que cubran los casos diseñados en el Lab 1 |
| `tests/combate.test.js` | 4 pruebas para `calcularDanio()` |
| `tests/nivel.test.js` | 4 pruebas para `calcularRecompensa()` |
| Reporte de cobertura | Captura del reporte + breve análisis de qué quedó cubierto y qué no |

---

## Paso 0 — Preparar el ambiente

### Descargar el proyecto base

<a href="/docs/node/tutorials/intro_web/Lab27Pruebas/rpg-pruebas.zip" download="rpg-pruebas.zip">📦 Descargar rpg-pruebas.zip</a>

Descompriman el archivo y desde la terminal, dentro del proyecto, ejecuten:

```bash
cd rpg-pruebas
npm install
npm test    # debe pasar el test de ejemplo
```

Verifiquen que el test de ejemplo (`tests/ejemplo.test.js`) **pasa antes de empezar**. Si falla, revisen la instalación de Node y Jest antes de continuar.

### Estructura del proyecto

```
rpg-pruebas/
├── src/
│   ├── personaje.js        ← Clase Personaje (lo que prueban en Tarea 1)
│   ├── enemigo.js
│   ├── combate.js          ← Función calcularDanio (Tarea 2)
│   ├── nivel.js            ← Función calcularRecompensa (Tarea 3)
│   └── index.js
├── tests/
│   ├── ejemplo.test.js     ← test de ejemplo (ya viene incluido)
│   ├── personaje.test.js   ← lo crean ustedes
│   ├── combate.test.js     ← lo crean ustedes
│   └── nivel.test.js       ← lo crean ustedes
├── public/                 ← UI web del juego (no aplica para este lab)
└── package.json
```

---

## Recordatorio rápido — Patrón AAA

Todas las pruebas que escriban deben seguir el patrón **Arrange → Act → Assert**, visualmente separado con comentarios o líneas en blanco:

```js
test('descripción clara', () => {
  // Arrange: preparar datos
  const heroe = new Personaje('A', 100, 15, 5);

  // Act: ejecutar la acción
  heroe.recibirDanio(30);

  // Assert: verificar resultado
  expect(heroe.vidaActual).toBe(70);
});
```

---

## Tarea 1 — Pruebas para `Personaje` (8 pruebas mínimo)

Creen el archivo `tests/personaje.test.js`. Importen la clase y agrupen las pruebas con `describe`:

```js
const Personaje = require('../src/personaje');

describe('Personaje', () => {
  // tus tests aquí
});
```

### Casos a cubrir (mínimo 8)

| # | Caso de prueba | Matcher sugerido |
|---|---|---|
| 1 | Personaje recién creado tiene vida completa | `toBe(vidaMaxima)` |
| 2 | `recibirDanio` reduce la vida correctamente | `toBe(vida - daño)` |
| 3 | `recibirDanio` con valor letal deja la vida en 0 | `toBe(0)` |
| 4 | `recibirDanio` con valor negativo lanza error | `toThrow()` |
| 5 | `curar` aumenta la vida correctamente | `toBe(vida + cantidad)` |
| 6 | `curar` nunca excede la vida máxima | `toBe(vidaMaxima)` |
| 7 | `estaVivo` retorna `true` si vida > 0 | `toBeTruthy()` |
| 8 | `estaVivo` retorna `false` si vida = 0 | `toBeFalsy()` |
| 9 | `subirNivel` restaura la vida y aumenta stats | `toBe(...)` ×2 |
| 10 | `ganarExperiencia` sube de nivel al pasar el umbral | `toBe(2)` (nivel) |

### Ejemplo modelo (caso #2)

```js
test('recibirDanio reduce la vida correctamente', () => {
  // Arrange
  const heroe = new Personaje('Aria', 100, 15, 5);

  // Act
  heroe.recibirDanio(30);

  // Assert
  expect(heroe.vidaActual).toBe(70);
});
```

> **Tip:** Para casos de error (como el #4) recuerden envolver la llamada en una arrow function:
> ```js
> expect(() => heroe.recibirDanio(-10)).toThrow();
> ```

---

## Tarea 2 — Pruebas para `combate.calcularDanio` (4 pruebas mínimo)

Creen `tests/combate.test.js`. Esta función es **pura**: dados un atacante y un defensor, retorna el daño con un mínimo garantizado de **1**.

> **Pista:** pueden usar **objetos planos** en lugar de instancias completas de `Personaje`, ya que la función solo necesita que tengan las propiedades `ataque` y `defensa`.

```js
const { calcularDanio } = require('../src/combate');

test('daño normal: ataque mayor que defensa', () => {
  // Arrange
  const a = { ataque: 15 };
  const d = { defensa: 5 };

  // Act
  const danio = calcularDanio(a, d);

  // Assert
  expect(danio).toBe(10);
});
```

### Casos a cubrir (mínimo 4)

| # | Escenario | Resultado esperado |
|---|---|---|
| 1 | Daño normal: ataque > defensa | Retorna `ataque − defensa` |
| 2 | Defensa = ataque (frontera) | Retorna **1** (mínimo garantizado) |
| 3 | Defensa > ataque | Retorna **1** (no negativo) |
| 4 | Ataque y defensa iguales a cero | Retorna **1** |

---

## Tarea 3 — Pruebas para `nivel.calcularRecompensa` (4 pruebas mínimo)

Creen `tests/nivel.test.js`. Esta función aplica una **tabla de decisión** según la diferencia de niveles entre enemigo y personaje.

### Tabla de decisión

| Diferencia (enemigo − personaje) | Multiplicador | Ejemplo con `xpBase=100` |
|---|---|---|
| enemigo 3+ niveles abajo (≤ −3) | **0.5 ×** | 50 |
| enemigo 1 ó 2 abajo (−2 a −1) | **0.75 ×** | 75 |
| mismo nivel (0) | **1.0 ×** | 100 |
| enemigo 1 ó 2 arriba (1 a 2) | **1.5 ×** | 150 |
| enemigo 3+ arriba (≥ 3) | **2.0 ×** | 200 |

Diseñen **al menos un caso por cada fila** de la tabla. Presten especial atención a los **valores frontera**: diferencia exactamente `−3`, `−2`, `0`, `2`, `3`.

```js
const { calcularRecompensa } = require('../src/nivel');

test('mismo nivel: multiplicador 1.0', () => {
  // Arrange
  const xpBase = 100;
  const nivelEnemigo = 5;
  const nivelPersonaje = 5;

  // Act
  const xp = calcularRecompensa(xpBase, nivelEnemigo, nivelPersonaje);

  // Assert
  expect(xp).toBe(100);
});
```

---

## Verificación — Explorar cobertura y entregar

Cuando tengan todas sus pruebas escritas, ejecuten:

```bash
npm test -- --coverage
```

Tomen una **captura del reporte** que aparece en la terminal. La idea aquí **no es alcanzar un porcentaje específico**, sino **explorar qué tanto de la lógica de `personaje.js`, `combate.js` y `nivel.js` están ejercitando sus pruebas** — y reflexionar sobre las ramas que quedaron sin cubrir.

El reporte se ve así en consola (los porcentajes dependen de sus pruebas — y suelen ser **más bajos de lo que esperan**):

```
----------------|---------|----------|---------|---------|
File            | % Stmts | % Branch | % Funcs | % Lines |
----------------|---------|----------|---------|---------|
All files       |   58.0  |   45.0   |   60    |  58.0   |
 personaje.js   |   65.0  |   50.0   |   70    |  65.0   |
 combate.js     |   55.0  |   40.0   |   50    |  55.0   |
 nivel.js       |   50.0  |   45.0   |   60    |  50.0   |
----------------|---------|----------|---------|---------|
```

> Jest también genera un reporte HTML detallado en `coverage/lcov-report/index.html`. Ábranlo en el navegador para ver **línea por línea** qué se ejecutó (verde) y qué no (rojo) — es la parte más útil del reporte.

### ¿Qué deben observar?

Más que el número global, fíjense en:

- **Líneas en rojo:** ¿qué casos del código nunca se ejecutaron? ¿Vale la pena agregar un test que las cubra, o es código defensivo difícil de alcanzar?
- **Ramas (`branches`) sin cubrir:** un `if/else` donde solo se prueba uno de los dos caminos. La cobertura de ramas suele ser **más baja** que la de statements — esto es normal.
- **Comparación entre archivos:** ¿Cuál de los tres módulos quedó mejor cubierto? ¿Por qué?

### Entregable concreto del análisis

Escriban en el `README.md` del proyecto (o como comentario al subir la tarea) **mínimo 3 oraciones** respondiendo:

1. ¿Qué módulo (`personaje.js`, `combate.js` o `nivel.js`) quedó mejor cubierto y por qué crees que fue así?
2. ¿Qué línea o rama específica en rojo te llamó la atención? Cita el archivo y el número de línea.
3. ¿Qué decidirías hacer con esa línea: agregar un test que la cubra, marcarla como código defensivo aceptable, o refactorizar? Justifica brevemente.

> No se preocupen si su cobertura final no es del 80% o 90%. Lo importante es que entiendan **qué significa cada número** y **qué decisión tomarían** para subirlo si fuera necesario.

---

## ⚠️ Antes de entregar

1. **Todas las pruebas deben pasar** (verde). Si alguna falla, arreglen el test o reporten el bug en el código.
2. **Cada test debe tener un nombre descriptivo.** No se acepta `'funciona'` o `'test1'`.
3. **Cada test debe seguir el patrón AAA** visualmente separado (con comentarios o líneas en blanco).
4. **Suban el zip del proyecto completo** (sin `node_modules`) a la plataforma.
5. **Incluyan el análisis de cobertura** (las 3 oraciones en `README.md` o como comentario de entrega) junto con la captura del reporte.

---

## Evaluación

| Criterio | Puntos | Observaciones |
|---|---|---|
| Cantidad de pruebas (mínimo 16) | **20** | 8 personaje + 4 combate + 4 nivel |
| Patrón AAA aplicado correctamente | **20** | Visualmente separado en cada test |
| Matchers correctos (`toBe` vs `toEqual`, etc.) | **20** | Especialmente `toThrow` para errores |
| Exploración de cobertura | **20** | Captura del reporte + breve análisis de qué quedó cubierto y qué no |
| Nombres descriptivos en los tests | **10** | Que el reporte sea legible |
| Todas las pruebas pasan | **10** | Sin tests rotos ni `skip` |
| **Total** | **100** | |

---

## Referencia rápida — Cheatsheet de matchers

| Matcher | Cuándo usarlo |
|---|---|
| `.toBe(x)` | Igualdad estricta para primitivos: números, strings, booleanos. |
| `.toEqual(x)` | Igualdad **profunda** para objetos y arrays. |
| `.toBeTruthy()` | Verifica que el valor sea "verdadero" (no `false`, `0`, `null`, `undefined`). |
| `.toBeFalsy()` | Verifica que el valor sea "falso" (`false`, `0`, `null`, `undefined`). |
| `.toBeGreaterThan(x)` | Verifica que un número sea mayor que `x`. |
| `.toBeLessThan(x)` | Verifica que un número sea menor que `x`. |
| `.toBeCloseTo(x)` | Comparar números decimales (evita problemas de precisión). |
| `.toThrow()` | Verificar que una función lance error. **Envolver en arrow**: `() => fn()` |
| `.toContain(x)` | Verificar que un array contenga un elemento. |

### Errores comunes que evitar

| ✗ Si haces esto… | ✓ Hazlo así |
|---|---|
| `.toBe({a:1})` con un objeto | `.toEqual({a:1})` para objetos |
| `expect(fn(-1)).toThrow()` *(ejecuta `fn` antes de aserta)* | `expect(() => fn(-1)).toThrow()` *(envuelve en arrow function)* |
| `test('test1', () => {...})` | `test('recibirDanio reduce vida', () => {...})` |
| Reusar el mismo objeto entre tests | Usar `beforeEach` para crear uno fresco |

---

## Recursos

- [Jest — Getting Started](https://jestjs.io/docs/getting-started)
- [Jest — Using Matchers](https://jestjs.io/docs/using-matchers)
- [Jest — Expect API reference](https://jestjs.io/docs/expect)
- [Martin Fowler — Test Coverage](https://martinfowler.com/bliki/TestCoverage.html)
