---
sidebar_position: 17.5
---
# Interacción con la Base de Datos (PostgreSQL + Supabase)

En este laboratorio vamos a conectar nuestro proyecto de NodeJS con una base de datos relacional. En particular usaremos **PostgreSQL** hospedada en **Supabase**, un servicio administrado en la nube que nos evita instalar un servidor local en cada computadora del salón.

La meta es que veas el flujo completo de una aplicación web moderna contra una base de datos y que incorpores desde el día uno tres prácticas de seguridad que luego vas a repetir en cualquier proyecto serio:

1. Guardar credenciales en variables de entorno (`.env`) en lugar de hardcodearlas en el código.
2. Usar **queries parametrizadas** para evitar inyección de SQL.
3. Trabajar con un dataset de volumen real para justificar paginación y JOINs.
4. Conocer **Row Level Security (RLS)**, una característica propia de PostgreSQL/Supabase que aplica reglas de acceso a nivel de la propia base de datos.

**Pre-requisitos**:
- Haber terminado los laboratorios previos (Express, EJS, MVC).
- Conocimiento general de bases de datos relacionales y SQL básico.
- Tener una cuenta de correo (Google o GitHub) para crear tu cuenta de Supabase.
- NO necesitas tener PostgreSQL instalado en tu computadora — todo corre en la nube.

Todo lo que aplicaremos funciona igual con cualquier otro servicio de PostgreSQL administrado (Neon, Railway, AWS RDS, etc). Supabase lo elegimos porque tiene un plan gratuito generoso y una consola muy amigable.

## Arquitectura del laboratorio

Antes de empezar a escribir código conviene tener clara la foto completa de cómo se conectan las piezas. Así vas a saber por qué estamos creando cada archivo y en qué capa cae.

```
        ┌──────────────┐
        │   Browser    │
        │ (el alumno)  │
        └──────┬───────┘
               │   HTTP   (GET /games?page=2,
               │           GET /games/buscar?titulo=Zelda)
               v
 ┌───────────────────────────────────────────────┐
 │        Node.js + Express                      │
 │        localhost:3000                         │
 │                                               │
 │   ┌─────────┐    ┌───────────────┐            │
 │   │ routes/ │───>│ controllers/  │            │
 │   └─────────┘    └───────┬───────┘            │
 │                          │                    │
 │                          v                    │
 │                   ┌───────────────┐           │
 │                   │   models/     │           │
 │                   │  (SQL $1,$2)  │           │
 │                   └───────┬───────┘           │
 │                           │                   │
 │                           v                   │
 │                   ┌───────────────┐  lee      │
 │                   │   pg.Pool     │<── .env   │
 │                   │  (util/db.js) │           │
 │                   └───────┬───────┘           │
 └───────────────────────────┼───────────────────┘
                             │  SQL sobre TLS
                             │  (puerto 6543, pooler)
                             v
 ┌───────────────────────────────────────────────┐
 │          Supabase  —  PostgreSQL              │
 │                                               │
 │   ┌─────────┐  ┌────────┐  ┌─────────────┐    │
 │   │ studios │  │ genres │  │ platforms   │    │
 │   └────┬────┘  └───┬────┘  └──────┬──────┘    │
 │        │           │              │           │
 │        └─────┬─────┴──────┬───────┘           │
 │              v            v                   │
 │        ┌──────────┐  ┌─────────────────┐      │
 │        │  games   │──│ game_platforms  │      │
 │        └──────────┘  └─────────────────┘      │
 │                                               │
 │        + Row Level Security (bonus final)     │
 └───────────────────────────────────────────────┘
```

**Cómo se lee:**

1. El navegador manda un request HTTP al Express que corre en tu máquina.
2. Express lo entrega al **router**, que decide qué **controller** atiende la URL.
3. El controller le pide los datos al **model**, que es el único archivo que sabe SQL.
4. El model usa un **pool de conexiones** de la librería `pg` (node-postgres). El pool lee credenciales de `.env` — nunca están hardcodeadas.
5. La conexión sale por TLS al puerto 6543 de Supabase (pooler de Postgres).
6. Supabase ejecuta el SQL contra las 5 tablas relacionales del catálogo y regresa las filas.
7. El model devuelve al controller, el controller renderiza la vista EJS, y el HTML final regresa al navegador.

Este mismo patrón lo vas a repetir en el siguiente laboratorio (Autenticación). La capa de seguridad adicional que aparece al final — **Row Level Security** — vive del lado derecho del diagrama, dentro de Supabase, y es lo que veremos en el bonus.

## Crear el proyecto en Supabase

Entra a [supabase.com](https://supabase.com) y crea tu cuenta. Una vez dentro del dashboard:

1. Da clic en **New project**.
2. Selecciona tu organización (se crea una por default con el nombre de tu cuenta).
3. Asigna un nombre al proyecto, por ejemplo `lab17bd-supabase`.
4. **Genera y guarda bien la contraseña de la base de datos** — la vas a necesitar después y Supabase no la vuelve a mostrar.
5. Elige la región más cercana (por ejemplo `East US (North Virginia)` si estás en México).
6. Haz clic en **Create new project** y espera ~1 minuto mientras se provisiona.

Mientras se aprovisiona verás una barra de progreso. Cuando termine, el sidebar izquierdo mostrará todos los módulos del proyecto (Table Editor, SQL Editor, Authentication, Storage, etc.) y en la parte superior aparecerá el nombre que le diste. Los dos menús que vamos a usar son:

- **SQL Editor** — para ejecutar SQL directamente sobre tu base.
- **Table Editor** — para ver las tablas y datos de forma visual.
- **Project Settings > Database** — de aquí vamos a sacar la cadena de conexión.
- **Project Settings > API Keys** — de aquí vamos a sacar la URL pública y la **publishable key** (para el bonus).

## Crear el esquema y cargar datos

Esta vez, en lugar de usar un DBMS local, vamos a usar el **SQL Editor** de Supabase. Busca el ícono en el sidebar izquierdo y abre una nueva query.

Pega el siguiente script para crear las tablas del catálogo de videojuegos. Nota que usamos `SERIAL PRIMARY KEY` (el equivalente PostgreSQL a `AUTO_INCREMENT`) y definimos llaves foráneas explícitas:

```
DROP TABLE IF EXISTS game_platforms CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS platforms CASCADE;
DROP TABLE IF EXISTS genres CASCADE;
DROP TABLE IF EXISTS studios CASCADE;

CREATE TABLE studios (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL UNIQUE,
    country       VARCHAR(60),
    founded_year  INT
);

CREATE TABLE genres (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE platforms (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(80) NOT NULL UNIQUE,
    manufacturer  VARCHAR(80)
);

CREATE TABLE games (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(160) NOT NULL,
    studio_id     INT REFERENCES studios(id) ON DELETE SET NULL,
    genre_id      INT REFERENCES genres(id)  ON DELETE SET NULL,
    release_year  INT,
    price         NUMERIC(6,2),
    rating        NUMERIC(3,1)
);

CREATE INDEX idx_games_title  ON games (title);
CREATE INDEX idx_games_year   ON games (release_year);
CREATE INDEX idx_games_studio ON games (studio_id);
CREATE INDEX idx_games_genre  ON games (genre_id);

CREATE TABLE game_platforms (
    game_id     INT NOT NULL REFERENCES games(id)     ON DELETE CASCADE,
    platform_id INT NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, platform_id)
);
```

Haz clic en **Run** y verifica que no haya errores.

Si todo corrió bien, en el panel inferior del editor aparece el mensaje **Success. No rows returned**. Abre el **Table Editor** en el sidebar izquierdo: deben listarse las 5 tablas recién creadas (`studios`, `genres`, `platforms`, `games`, `game_platforms`), todas vacías todavía.

Ahora vamos a cargar un dataset **con volumen real** — 30 estudios, 15 géneros, 12 plataformas, 95 juegos y 413 relaciones juego-plataforma. Elegimos este tamaño intencionalmente: con solo un puñado de registros la paginación, los JOINs y las agregaciones no tienen sentido práctico y cuesta ver su utilidad.

Descarga el archivo con todos los `INSERT` y pégalo en el SQL Editor de Supabase:

<a href="/docs/node/tutorials/intro_web/Lab17BDSupabase/seed.sql" download="seed.sql">Descargar seed.sql</a>

Ejecútalo con **Run**. Como son más de 550 inserts, puede tardar un par de segundos.

Para validar, corre:

```
SELECT COUNT(*) FROM games;
SELECT COUNT(*) FROM studios;
SELECT COUNT(*) FROM genres;
SELECT COUNT(*) FROM platforms;
SELECT COUNT(*) FROM game_platforms;
```

Las cuentas deben dar exactamente: `games` = 95, `studios` = 30, `genres` = 15, `platforms` = 12, `game_platforms` = 413. Después entra a **Table Editor > games** y navega las filas: vas a reconocer títulos como *Elden Ring*, *The Witcher 3* y *Baldur's Gate 3* con sus precios y ratings.

## Obtener la cadena de conexión

En el **topbar** del dashboard (arriba de todo, junto al nombre del proyecto) haz clic en el botón **Connect**. Se abre un modal que por defecto te muestra la opción **Direct connection** seleccionada.

Antes de copiar nada, cambia la selección a **Transaction pooler** — es el recomendado para servidores Express que abren muchas conexiones cortas. Copia el valor que aparece en el campo URI; se ve algo así:

```
postgres://postgres.xxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Sustituye `[YOUR-PASSWORD]` por la contraseña que guardaste al crear el proyecto. Guárdala, la vamos a meter al archivo `.env` en un momento.

El modal también te muestra otras dos variantes que vale la pena conocer: **Direct connection** (puerto 5432, una conexión por cliente, útil solo para operaciones administrativas) y **Session pooler** (puerto 5432, mantiene la sesión entre queries, útil para clientes que usan prepared statements largos). Para este lab usamos el **Transaction pooler**.

## Preparar el proyecto de NodeJS

Ahora vamos a crear el proyecto base igual que en los laboratorios anteriores. Abre una terminal en una carpeta nueva y ejecuta:

```
npm init -y
npm i express body-parser ejs pg dotenv
```

Las dos librerías nuevas son:

- **pg**: el driver oficial de PostgreSQL para NodeJS. Se encarga de abrir conexiones a la base, enviar queries y parsear los resultados.
- **dotenv**: lee variables de entorno desde un archivo `.env` y las expone en `process.env`.

Crea un archivo `.gitignore` con lo siguiente:

```
node_modules
.env
```

El segundo es **muy importante**: `.env` contendrá tu contraseña de base de datos, y si la subes a un repositorio público queda expuesta al mundo.

Ahora crea un archivo `.env` (sin extensión adicional, solo `.env`) con este contenido, sustituyendo con tu cadena real:

```
DATABASE_URL=postgres://postgres.xxxxxxxx:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx
```

Las dos últimas (`SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`) las sacas de **Project Settings > API Keys** y las usaremos hasta la sección bonus. La **publishable key** es la llave pública de tu proyecto — está diseñada para ser embebida en código de frontend. (Si ves un tab **Legacy anon, service_role API keys**, **no lo uses**: ese sistema está siendo reemplazado por el de Publishable/Secret).

## Primera conexión a Supabase

Crea `index.js` con la plantilla base que ya conoces, pero esta vez cargando `dotenv` al inicio:

```
require('dotenv').config();

const express    = require('express');
const path       = require('path');
const bodyParser = require('body-parser');
const { Pool }   = require('pg');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5
});

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send('Hola Mundo — Lab17BDSupabase');
});

app.get('/test_db', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM games LIMIT 20');
        res.writeHead(200, { 'Content-type': 'application/json' });
        res.end(JSON.stringify(rows));
    } catch (e) {
        console.log(e);
        res.status(500).send('Error al conectar con la base de datos');
    }
});

app.listen(3000, () => {
    console.log('Servidor en http://localhost:3000');
});
```

Dos detalles importantes de esta configuración:

1. **`ssl: { rejectUnauthorized: false }`**: Supabase exige conexiones TLS. Esta opción acepta el certificado administrado por Supabase sin exigir que lo tengamos pre-instalado localmente.
2. **`connectionString` desde `.env`**: no hardcodeamos usuario, contraseña ni host; todo se lee de variables de entorno que nunca se suben al repositorio.

Corre tu servidor:

```
node index.js
```

Y visita `http://localhost:3000/test_db`. Deberías ver un arreglo JSON con 20 objetos, cada uno con los campos `id`, `title`, `studio_id`, `genre_id`, `release_year`, `price` y `rating`. El orden es el de inserción, así que el primero será *The Legend of Zelda: Breath of the Wild*.

Si te marca error de conexión, revisa: que la contraseña en `.env` sea correcta, que no haya espacios alrededor del `=`, y que la cadena URI sea la que copiaste de **Project Settings > Database**.

## Queries parametrizadas y SQL injection

Ya tenemos una conexión funcional y nuestra primera query. Ahora vamos a abordar uno de los temas de seguridad más importantes cuando trabajas con bases de datos: **cómo evitar la inyección de SQL en la práctica**.

Imagina que quieres un endpoint que busque juegos por título. Una primera versión ingenua sería concatenar la variable a la query:

```
app.get('/buscar-inseguro', async (req, res) => {
    const titulo = req.query.titulo || '';
    const sql = `SELECT * FROM games WHERE title ILIKE '%${titulo}%'`;
    const { rows } = await pool.query(sql);
    res.json(rows);
});
```

Esto parece funcionar: si visitas `/buscar-inseguro?titulo=Zelda` te devuelve los juegos de Zelda. El problema es qué pasa si alguien pone algo malicioso como título. Por ejemplo:

```
/buscar-inseguro?titulo=' OR 1=1 --
```

La query que termina ejecutándose es:

```
SELECT * FROM games WHERE title ILIKE '%' OR 1=1 --%'
```

El `OR 1=1` hace que el `WHERE` se cumpla para todas las filas, y `--` comenta el resto. Resultado: te devuelve **todos los juegos**, aunque el usuario no tenía permiso de verlos todos. En un endpoint con datos sensibles (usuarios, pagos, tarjetas) esto sería un desastre.

La forma correcta es usar **queries parametrizadas** con los placeholders `$1`, `$2`, etc. El driver envía la query y los valores por separado, así Postgres nunca los interpreta como SQL:

```
app.get('/buscar', async (req, res) => {
    const titulo = req.query.titulo || '';
    const sql = `SELECT * FROM games WHERE title ILIKE $1`;
    const { rows } = await pool.query(sql, [`%${titulo}%`]);
    res.json(rows);
});
```

Prueba ambas rutas con el payload de inyección y compara lo que devuelve cada una:

- `/buscar-inseguro?titulo=' OR 1=1 --` regresa **las 50 primeras filas** (el límite del `LIMIT 50`), porque el `OR 1=1` forzó el `WHERE` a cumplirse para toda la tabla.
- `/buscar?titulo=' OR 1=1 --` regresa un arreglo **vacío**, porque el texto literal `' OR 1=1 --` nunca coincide con ningún título real del catálogo.

**Regla práctica**: nunca concatenes input de usuario dentro de un string SQL. Siempre pasa los valores como argumentos.

## Migrar a MVC

Como ya hicimos en el laboratorio de MVC, vamos a mover la lógica de base de datos fuera de `index.js`. Crea la siguiente estructura:

```
test-project/
├── index.js
├── util/
│   └── database.js
├── models/
│   └── game.model.js
├── controllers/
│   └── game.controller.js
├── routes/
│   └── game.routes.js
└── views/
    ├── games.ejs
    └── buscar.ejs
```

**`util/database.js`** — exporta el pool una sola vez:

```
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5
});

module.exports = pool;
```

**`models/game.model.js`** — el modelo, con queries seguras y una versión insegura intencional para la demo:

```
const pool = require('../util/database.js');

exports.fetchAll = async (page = 1, pageSize = 20) => {
    const offset = (page - 1) * pageSize;
    const sql = `
        SELECT g.id, g.title, g.release_year, g.price, g.rating,
               s.name AS studio,
               gn.name AS genre
        FROM games g
        LEFT JOIN studios s ON s.id = g.studio_id
        LEFT JOIN genres  gn ON gn.id = g.genre_id
        ORDER BY g.title
        LIMIT $1 OFFSET $2
    `;
    const { rows } = await pool.query(sql, [pageSize, offset]);
    return rows;
};

exports.count = async () => {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM games');
    return rows[0].total;
};

exports.findByTitle = async (titulo) => {
    const sql = `SELECT id, title, release_year, price, rating
                 FROM games WHERE title ILIKE $1
                 ORDER BY title LIMIT 50`;
    const { rows } = await pool.query(sql, [`%${titulo}%`]);
    return rows;
};

// Sólo para demostrar SQL injection — no usar en código real
exports.findByTitleInsegura = async (titulo) => {
    const sql = `SELECT id, title, release_year, price, rating
                 FROM games WHERE title ILIKE '%${titulo}%'
                 ORDER BY title LIMIT 50`;
    const { rows } = await pool.query(sql);
    return rows;
};
```

**`controllers/game.controller.js`**:

```
const model = require('../models/game.model.js');

module.exports.index = async (req, res) => {
    try {
        const page     = parseInt(req.query.page) || 1;
        const pageSize = 20;
        const [juegos, total] = await Promise.all([
            model.fetchAll(page, pageSize),
            model.count()
        ]);
        const totalPages = Math.ceil(total / pageSize);
        res.render('games', { juegos, page, totalPages, total });
    } catch (e) {
        console.log(e);
        res.status(500).send('Error al obtener los juegos');
    }
};

module.exports.buscarSeguro = async (req, res) => {
    const titulo = req.query.titulo || '';
    const resultados = await model.findByTitle(titulo);
    res.render('buscar', { titulo, resultados, modo: 'seguro' });
};

module.exports.buscarInseguro = async (req, res) => {
    const titulo = req.query.titulo || '';
    const resultados = await model.findByTitleInsegura(titulo);
    res.render('buscar', { titulo, resultados, modo: 'inseguro' });
};
```

**`routes/game.routes.js`**:

```
const express = require('express');
const router  = express.Router();
const controller = require('../controllers/game.controller.js');

router.get('/',                controller.index);
router.get('/buscar',          controller.buscarSeguro);
router.get('/buscar-inseguro', controller.buscarInseguro);

module.exports = router;
```

Y en `index.js` sustituye las rutas que hicimos antes por el registro del módulo:

```
const gameRoutes = require('./routes/game.routes.js');
app.use('/games', gameRoutes);
```

Crea las vistas `views/games.ejs` (tabla con paginación) y `views/buscar.ejs` (formulario de búsqueda). El detalle completo de las vistas está en el ejemplo descargable al final del laboratorio.

Ahora entra a `http://localhost:3000/games` y vas a ver la tabla paginada. Pasa a `?page=2`, `?page=3` — cada página te trae 20 juegos distintos. Con 95 registros totales vas a tener 5 páginas; las primeras 4 con 20 juegos y la última con 15. Ésta es la razón por la que armamos un dataset grande: con pocos registros la paginación simplemente no se nota y el patrón parece opcional.

## Bonus: Supabase JS Client + Row Level Security

Hasta aquí tratamos a Supabase como un Postgres cualquiera y nos conectamos por el driver `pg`. Eso es una de las dos formas en que Supabase permite acceder a tus datos. La otra es el **cliente JavaScript oficial** (`@supabase/supabase-js`), que habla con una **API REST autogenerada** a partir de tu esquema. Son dos filosofías muy distintas y conviene que entiendas cuándo usar cada una antes de escribir código.

### ¿Por qué dos formas de acceso?

**Con el driver `pg` (lo que hicimos hasta ahora):**

- Abres una conexión TCP directa al PostgreSQL con usuario y contraseña de administrador.
- Esa conexión **confía en ti**: una vez conectado puedes leer/escribir cualquier tabla. La autorización depende 100% del código de tu servidor.
- La credencial (usuario + password) es muy sensible. Si se filtra, quien la tenga puede leer toda tu base.
- **Solo sirve desde un servidor** que tú controles. No puedes usar `pg` desde un navegador o una app móvil porque tendrías que mandar la contraseña al cliente.
- Ideal para: backends donde escribes todo el SQL, queries complejas con muchos JOINs, transacciones, migrations.

**Con `@supabase/supabase-js`:**

- No abres una conexión a Postgres. Haces requests HTTP(S) a una API REST que Supabase genera automáticamente a partir de tus tablas.
- La API **no confía en ti** por default: para cada request valida permisos contra las políticas de **Row Level Security (RLS)** definidas en tu base.
- Se usa con llaves de API (`sb_publishable_...` y `sb_secret_...`) que identifican el contexto del request, no abren una sesión de base.
- **Funciona en el navegador y móvil** con seguridad — siempre que tengas RLS configurado, la publishable key es segura en código público.
- Se integra con el resto del stack de Supabase (Auth, Realtime, Storage) en un solo cliente.
- Ideal para: código que corre en el cliente (web/mobile), prototipos rápidos, apps que aprovechan Auth/Realtime, endpoints públicos de solo lectura.

En resumen: **`pg` es la llave maestra del sótano; `supabase-js` es la puerta principal con torniquete**. En proyectos reales es común usar las dos: `pg` para tareas administrativas del backend, `supabase-js` para el acceso que hace tu frontend.

### Las nuevas API Keys de Supabase

Entra a **Project Settings > API Keys**. Vas a ver dos secciones (ignora por completo el tab viejo **Legacy anon, service_role API keys** — ese sistema se está retirando):

- **Publishable key** (`sb_publishable_...`): es pública. Se puede embeber en JavaScript que corre en el browser o en una app móvil. Supabase **siempre aplica RLS** a los requests hechos con esta llave. Si no tienes políticas, no ves datos.
- **Secret key** (`sb_secret_...`): privilegiada. Solo va en código de servidor que tú controlas. **Ignora RLS** y puede leer/escribir cualquier cosa. Nunca la expongas al cliente.

Para este bonus vamos a usar la **publishable key**, específicamente porque queremos ver a RLS en acción.

### Configurar el cliente y hacer la primera query

Instala el cliente:

```
npm i @supabase/supabase-js
```

Asegúrate de tener en tu `.env`:

```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx
```

Crea un archivo `supabase-example.js`:

```
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY
);

async function main() {
    const { data, error } = await supabase
        .from('games')
        .select('id, title, release_year, price, rating')
        .order('rating', { ascending: false })
        .limit(10);

    if (error) { console.error(error.message); return; }
    console.table(data);
}

main();
```

Córrelo:

```
node supabase-example.js
```

Si lo pruebas **ahora mismo** te va a regresar un arreglo vacío (`[]`), aunque la tabla tenga 95 juegos. ¿Por qué?

Porque es una publishable key y Supabase está aplicando el comportamiento por default: `deny-all` para cualquier tabla sin RLS configurado con políticas explícitas. Esto es **exactamente lo contrario** al driver `pg`, que una vez conectado te deja leer todo. Para que la publishable key pueda leer los juegos hay que decirle a la base qué tiene permitido devolver.

### Activar RLS y crear una política

1. En el sidebar izquierdo entra a **Authentication > Policies** (también puedes llegar desde **Table Editor > games > RLS**).
2. Para la tabla `games`, haz clic en **Enable RLS**.
3. Agrega una política nueva con estas opciones:
   - **Policy name**: `Allow public read on games`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `anon, authenticated`
   - **USING expression**: `true`

Guarda la política y confirma que en la pestaña **Policies** de la tabla `games` aparezca listada con estado **Enabled** y el ícono de candado de la tabla cambie a abierto.

Vuelve a correr `node supabase-example.js` y ahora sí verás los 10 juegos con mejor rating.

**La lección clave de RLS**: las reglas de acceso viven **dentro de la base de datos**, no en el código de la aplicación. Si un programador olvida validar permisos en un endpoint, la base sigue aplicando la política y corta el acceso. Combinado con Supabase Auth (que veremos en el siguiente laboratorio), puedes escribir políticas como *"cada usuario solo ve sus propios juegos favoritos"* y eso se va a cumplir no importa qué request llegue — porque la base sabe quién está autenticado. Esta capa extra de defensa es una de las razones principales para elegir PostgreSQL/Supabase cuando manejas datos sensibles.

## Siguientes pasos

- Mueve la lógica del cliente Supabase a tu modelo (igual que hicimos con `pg`) y agrega rutas que comparen tiempos de respuesta entre ambos enfoques.
- Investiga **ORMs** como [Prisma](https://www.prisma.io/) o [Drizzle](https://orm.drizzle.team/). Un ORM te genera queries parametrizadas automáticamente, te da autocompletado de columnas en tu editor y valida tipos en tiempo de compilación — la siguiente capa de protección contra inyección.
- Investiga los otros servicios de Supabase: Auth (lo usaremos en el próximo laboratorio), Realtime y Storage.
- Revisa la documentación oficial del driver [`pg`](https://node-postgres.com/) y de [Supabase JS](https://supabase.com/docs/reference/javascript/introduction).
- **Jamás subas tu archivo `.env` al repositorio**. Úsalo solo en desarrollo y, en producción, configura las variables de entorno a través de tu plataforma de despliegue.
