---
sidebar_position: 28
---
# Storage en la nube (Supabase Storage)

En el [Lab22Archivos](../Lab22Archivos/) aprendimos a subir archivos al servidor con **multer** y los guardamos en una carpeta `public/` o `private/` del propio proyecto. En el [Lab17BDSupabase](../Lab17BDSupabase/) conectamos nuestro Express con **PostgreSQL en Supabase** y armamos un MVC completo. Este laboratorio cierra el círculo: vamos a **dejar de guardar archivos en el filesystem del servidor** y pasar a guardarlos en **Supabase Storage**, registrando su metadata en Postgres para tener un CRUD real.

Lo importante: el navegador del usuario **no habla directo con Supabase Storage**. Habla con nuestro Express, y nuestro Express habla con Supabase usando una llave secreta que jamás sale del servidor. El servidor es el **intermediario**.

## Objetivos

Al terminar este lab vas a poder:

1. Crear buckets públicos y privados en Supabase Storage.
2. Subir archivos desde un form HTML a tu Express y de ahí a Supabase Storage usando `@supabase/supabase-js` con la **secret key**.
3. Persistir la metadata del archivo (path, mime, tamaño) en una tabla `documents` de Postgres.
4. Implementar un CRUD completo: subir, listar con previews, ver el detalle, **reemplazar** el archivo y **eliminar**.
5. Entender por qué Storage y Postgres son sistemas separados y cómo mantener consistencia entre los dos manualmente.
6. (Bonus, autodidacta) Generar **signed URLs** para servir archivos privados al frontend sin exponerlos a internet.

**Pre-requisitos:**

- Haber terminado **Lab17BDSupabase** (MVC con `pg.Pool`, `.env`, queries parametrizadas).
- Haber terminado **Lab22Archivos** (multer, `enctype="multipart/form-data"`).
- Una cuenta de Supabase con el proyecto ya creado del Lab17 (lo vamos a reutilizar — solo agregamos buckets y una tabla).

Este lab es **autodidacta** — no se cubre en clase. Por eso las secciones de signed URLs están explicadas paso a paso; tómate tu tiempo.

## ¿Qué es Supabase Storage?

**Storage** es el servicio de Supabase para guardar archivos binarios (imágenes, PDFs, videos, ZIPs, lo que sea). Conceptualmente es un primo de **Amazon S3** o **Google Cloud Storage**: en vez de organizar archivos por carpetas en un disco, los organizas en **buckets**, y dentro de cada bucket cada archivo es un **objeto** identificado por un **path** (una "key" que se ve como una ruta pero no es una ruta real del filesystem).

Compáralo con lo que hicimos en el Lab22:

| Lab22Archivos (filesystem local)            | Lab28StorageSupabase (storage en la nube)                |
| ------------------------------------------- | -------------------------------------------------------- |
| El archivo vive en `./public/foto.png`      | El archivo vive en bucket `lab28-public`, path `documents/abc-foto.png` |
| Si el servidor se reinicia, el archivo está | Si el servidor se cae o lo redespliegas, el archivo sigue ahí |
| Se sirve con `express.static(...)`          | Lo sirve Supabase con su propia URL HTTPS                |
| Limitado al disco de la máquina             | Escala automáticamente, con CDN incluido                 |
| Si tu repo crece, choca el límite (~2 GB)   | Vive aparte; no afecta tu repo                           |

Hay dos tipos de buckets:

- **Público**: cualquiera con el path puede leer el objeto vía una URL HTTPS estable (`https://xxx.supabase.co/storage/v1/object/public/bucket/path`). Ideal para imágenes de producto, avatares públicos, archivos descargables abiertos.
- **Privado**: nadie puede leer un objeto sin un permiso temporal. Para acceder a uno, tu servidor pide a Supabase una **signed URL** que vence en X segundos. Ideal para recibos, comprobantes, archivos de usuarios autenticados.

### ¿Por qué el servidor es intermediario?

Podrías subir directamente desde el navegador a Supabase Storage (la librería oficial lo soporta), pero entonces el navegador tendría que llevar una llave de API. La única llave que puede subir a un bucket privado o saltarse RLS es la **secret key**, y esa **jamás puede llegar al navegador** — quien la tenga controla tu base de datos completa.

Por eso en este lab seguimos un patrón muy realista de producción:

```
Browser  ───multipart/form-data───▶  Express (tu servidor)
                                       │
                                       │ con SUPABASE_SECRET_KEY (env)
                                       ▼
                                  Supabase Storage
```

El servidor recibe el archivo, lo sube a Storage usando la secret key (que vive en `.env`), inserta una fila en la tabla `documents` con la metadata, y le devuelve al navegador una redirección o un JSON.

## Arquitectura del laboratorio

```
Browser
  │  POST /documents  (multipart/form-data, campo "file")
  ▼
Express  ─  multer.memoryStorage()        req.file.buffer en RAM (NO toca disco)
  │
  ▼
controllers/document.controller.js
  │  1) sube el buffer a Storage
  ▼
models/storage.repository.js
  │   supabase.storage.from(bucket).upload(path, buffer, ...)
  ▼
Supabase Storage  ──── objeto creado en "documents/uuid-archivo.png"
  │
  ▼  (de vuelta al controller)
  │  2) si OK, INSERT en la tabla "documents"
  ▼
models/document.model.js
  │   pool.query("INSERT INTO documents ...")
  ▼
PostgreSQL (Supabase)
  │
  ▼
Controller → res.redirect("/documents")
```

Detalles clave:

1. **`multer.memoryStorage()`**: contrasta con el Lab22 que usaba `diskStorage`. Aquí no queremos escribir en disco — el archivo entra como `req.file.buffer` (un `Buffer` de Node) y desde ahí pasa directo al SDK de Supabase, que lo manda por la red.
2. **`util/storage.js`**: crea **un** cliente de Supabase (con la secret key) que reutilizamos en todo el proyecto. Vive en `util/` igual que `database.js` porque es infraestructura, no acceso a datos.
3. **`models/storage.repository.js`**: aquí viven las operaciones contra Storage. Lo ponemos en `models/` porque Storage es "otra base" — el patrón es idéntico al del modelo de Postgres, solo cambia con qué sistema habla.
4. **Transaccionalidad manual**: Storage y Postgres son sistemas separados. Si subes un archivo y luego falla el INSERT, te queda un archivo huérfano en el bucket. En este lab vas a aprender el patrón de **compensación** que mantiene consistencia entre los dos.

## Crear los buckets en Supabase

Entra al dashboard de tu proyecto en [supabase.com](https://supabase.com) y en el sidebar izquierdo busca **Storage**.

### Bucket público

1. Click en **New bucket**.
2. Nombre: `lab28-public`.
3. Marca el checkbox **Public bucket**.
4. (Opcional) Establece `File size limit` en `10 MB` para coincidir con el límite que pondremos en multer.
5. Click **Save**.

Marcar **Public bucket** agrega automáticamente políticas RLS que permiten que cualquier persona haga `SELECT` (leer) los objetos. Subir y borrar siguen requiriendo la secret key — que es lo que usaremos desde el servidor.

### Bucket privado

Repite el proceso pero:

- Nombre: `lab28-private`.
- **Desmarca** el checkbox de Public bucket.

Este bucket queda completamente cerrado: sin signed URL, **nadie** puede leer sus objetos — ni siquiera tu propio frontend.

## Crear la tabla `documents`

Abre el **SQL Editor** del dashboard y pega:

```sql
DROP TABLE IF EXISTS documents CASCADE;

CREATE TABLE documents (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(160) NOT NULL,
    file_path    TEXT NOT NULL,
    bucket       VARCHAR(80) NOT NULL,
    mime_type    VARCHAR(120),
    size_bytes   BIGINT,
    is_public    BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_uploaded_at ON documents (uploaded_at DESC);
```

Lo que guardamos en cada columna y por qué:

- **`file_path`**: la "key" del objeto dentro del bucket, p.ej. `documents/abc123-foto.png`. Es la fuente de verdad — con esto reconstruimos cualquier URL (pública o firmada).
- **`bucket`**: a qué bucket pertenece. Aunque solo tenemos dos, guardarlo permite que el código evolucione sin migrar datos: la fila sabe a dónde ir.
- **`is_public`**: redunda con `bucket` (`lab28-public` ↔ true) pero permite filtros sin JOIN ni `CASE`. En producción serían tablas separadas o un enum; aquí mantenemos la cosa simple.
- **`mime_type`**: necesario para que el browser previsualice imágenes en vez de descargarlas.
- **`size_bytes`**: útil para mostrar y para validación.

:::tip Por qué guardamos `file_path` y no la URL completa
La URL pública la podemos **construir** en cualquier momento a partir del bucket y del path. Si guardáramos la URL y mañana decides cambiar de proyecto Supabase o renombrar el bucket, tendrías que migrar datos. El path nunca cambia.
:::

## Preparar el proyecto Node

Crea una carpeta nueva e inicializa:

```bash
pnpm init
pnpm add express ejs pg dotenv multer @supabase/supabase-js
```

La librería nueva es **`@supabase/supabase-js`** — el cliente oficial. La conocimos en el bonus del Lab17, pero ahí la usamos con la *publishable key*; aquí la usamos con la *secret key* para administrar Storage como sysadmin.

:::warning pnpm 10+ inserta `"type": "module"` por defecto
A partir de **pnpm 10**, `pnpm init` agrega `"type": "module"` al `package.json`. Este lab está escrito en **CommonJS** (`require(...)`), así que si dejas esa línea verás un error al arrancar:

```
ReferenceError: require is not defined in ES module scope
```

Abre tu `package.json` recién generado y **borra** la línea `"type": "module"` (o cámbiala a `"type": "commonjs"`).
:::

Mientras estás en `package.json`, agrega también el script `start`:

```json
{
  "scripts": {
    "start": "node index.js"
  }
}
```

`.gitignore` mínimo:

```
node_modules
.env
```

### El archivo `.env`

Crea un archivo `.env` en la raíz del proyecto con esta plantilla:

```
DATABASE_URL=postgresql://postgres.xxxxxxxx:TU_DATABASE_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PUBLIC_BUCKET=lab28-public
PRIVATE_BUCKET=lab28-private
```

Cada variable apunta a algo distinto y los nombres se parecen lo suficiente como para confundirse. Esta tabla las desambigua:

| Variable                | ¿Qué es?                                              | ¿Dónde la consigo?                                                 |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`          | Cadena de conexión TCP a **PostgreSQL** (lo que usa `pg.Pool`) | Botón **Connect** del topbar → **Session pooler** → URI            |
| `SUPABASE_URL`          | URL **base HTTPS** de tu proyecto (lo que usa `@supabase/supabase-js`) | Sidebar → **Project Settings → Data API → Project URL**            |
| `SUPABASE_SECRET_KEY`   | Llave de API tipo *secret* (`sb_secret_…`) — bypassea RLS | Sidebar → **Project Settings → API Keys → Secret key**             |
| `PUBLIC_BUCKET` / `PRIVATE_BUCKET` | Nombres de los buckets que creaste arriba    | Tú los nombraste; déjalos en `lab28-public` / `lab28-private`      |

### Conseguir `DATABASE_URL` y la contraseña

1. En el **topbar** del dashboard, da clic en **Connect**.
2. Cambia el dropdown a **Session pooler** (no Direct, no Transaction — mismo criterio que el Lab17).
3. Copia el campo **URI**. Verás algo como:
   ```
   postgresql://postgres.xxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
4. Sustituye `[YOUR-PASSWORD]` por la **Database password** de Postgres que generaste al crear el proyecto.

:::warning `[YOUR-PASSWORD]` es la Database password, NO la secret key
La Database password es la que generaste/guardaste al crear el proyecto, y solo sirve para autenticarte contra Postgres por TCP. **No es lo mismo** que `SUPABASE_SECRET_KEY` (`sb_secret_…`), que es una llave de API.

Si pegas la secret key dentro de `DATABASE_URL`, vas a ver errores tipo `password authentication failed for user "postgres.xxxxxxxx"` al arrancar.

¿Perdiste la Database password? En el sidebar izquierdo del dashboard, ve al icono de **Database** → **Database Settings** y usa el botón **Reset database password**. URL directa: `https://supabase.com/dashboard/project/<tu-ref>/database/settings`.
:::

### Conseguir `SUPABASE_URL` y `SUPABASE_SECRET_KEY`

`SUPABASE_URL`: ve a **Project Settings → Data API → Project URL** y copia el valor.

:::warning Pon SOLO la URL base, sin `/rest/v1/`
A veces, dependiendo de cómo navegues, el dashboard te muestra el "API URL" terminado en `/rest/v1/`. El SDK construye sus propios paths a partir del dominio base, así que la URL en `.env` debe terminar en el dominio:

```
✅ SUPABASE_URL=https://xxxxxxxx.supabase.co
❌ SUPABASE_URL=https://xxxxxxxx.supabase.co/rest/v1/
```
:::

`SUPABASE_SECRET_KEY`: ve a **Project Settings → API Keys** y copia el valor que empieza con `sb_secret_…`. Ignora el tab viejo **Legacy anon, service_role** — ese sistema se está retirando.

:::warning La secret key es la llave maestra
`SUPABASE_SECRET_KEY` (sb_secret_…) **bypassea Row Level Security**: puede leer y escribir cualquier cosa en tu proyecto como si fuera superusuario. Vive **solo** en `.env` y solo se usa desde código servidor. Si la subes al repositorio, si la imprimes en logs públicos, si la pegas en código que vaya al navegador — pierdes el control de tu proyecto. Si crees que se filtró, rótala desde la misma página de API Keys.
:::

## `util/database.js`

El mismo pool de `pg` del Lab17:

```js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5
});

module.exports = pool;
```

## `util/storage.js` — el cliente Supabase

```js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

module.exports = supabase;
```

El bloque `auth: { ... }` desactiva el manejo de sesiones de usuario — este cliente nunca representa a un usuario, así que no necesita persistir sesión ni refrescar tokens.

## `models/storage.repository.js` — operaciones contra Storage

Aquí van las cuatro operaciones que necesitamos: subir, borrar, construir URL pública, y crear URL firmada (para el bonus). Más un helper que arma paths seguros.

```js
const crypto = require('crypto');
const path   = require('path');
const supabase = require('../util/storage.js');

// Construye un path único: "documents/{uuid}-{slug}.{ext}"
exports.buildObjectPath = (originalName) => {
    const ext = path.extname(originalName).toLowerCase();
    const base = path.basename(originalName, ext);
    const slug = base
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quita acentos
        .replace(/[^a-z0-9]+/g, '-')                       // espacios/símbolos -> "-"
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'file';
    const uuid = crypto.randomUUID();
    return `documents/${uuid}-${slug}${ext}`;
};

exports.uploadObject = async (bucket, filePath, buffer, contentType) => {
    const { data, error } = await supabase
        .storage
        .from(bucket)
        .upload(filePath, buffer, { contentType, upsert: false });
    if (error) throw new Error(`Storage upload falló: ${error.message}`);
    return data;
};

exports.removeObject = async (bucket, filePath) => {
    const { data, error } = await supabase
        .storage
        .from(bucket)
        .remove([filePath]);
    if (error) throw new Error(`Storage remove falló: ${error.message}`);
    return data;
};

exports.getPublicUrl = (bucket, filePath) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
};

exports.createSignedUrl = async (bucket, filePath, expiresIn = 60) => {
    const { data, error } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);
    if (error) throw new Error(`createSignedUrl falló: ${error.message}`);
    return data.signedUrl;
};
```

Tres detalles para entender bien:

:::tip Path con UUID, no `file.originalname`
Si subes con `file.originalname` directo, choca apenas dos usuarios suban un `foto.png`. El UUID elimina colisiones de tajo. El slug del nombre original se queda solo para que cuando veas el path en el dashboard reconozcas a ojo qué es.
:::

- **`upsert: false`**: si el path ya existe, falla. Como cada path tiene un UUID nuevo, no debería ocurrir nunca — pero si pasa, queremos enterarnos en vez de sobreescribir silenciosamente.
- **`getPublicUrl` es síncrono**: no hace request a Supabase. Solo concatena `SUPABASE_URL` + bucket + path. Si el bucket no es público o el objeto no existe, igual te devuelve un string — la URL fallará al usarse.
- **`createSignedUrl` sí es async**: pega al backend de Supabase para que firme el token. Por eso devuelve promesa.

## `models/document.model.js` — CRUD en Postgres

Las funciones contra la tabla `documents`. Mismo patrón que `game.model.js` del Lab17 — solo cambia la tabla.

```js
const pool = require('../util/database.js');

exports.create = async ({ title, file_path, bucket, mime_type, size_bytes, is_public }) => {
    const sql = `
        INSERT INTO documents (title, file_path, bucket, mime_type, size_bytes, is_public)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;
    const { rows } = await pool.query(sql, [title, file_path, bucket, mime_type, size_bytes, is_public]);
    return rows[0];
};

exports.findAll = async () => {
    const { rows } = await pool.query(
        'SELECT * FROM documents ORDER BY uploaded_at DESC'
    );
    return rows;
};

exports.findById = async (id) => {
    const { rows } = await pool.query(
        'SELECT * FROM documents WHERE id = $1', [id]
    );
    return rows[0];
};

exports.updateMetadata = async (id, { title }) => {
    const { rows } = await pool.query(
        'UPDATE documents SET title = $1 WHERE id = $2 RETURNING *',
        [title, id]
    );
    return rows[0];
};

exports.replaceFile = async (id, { file_path, mime_type, size_bytes }) => {
    const sql = `
        UPDATE documents
        SET file_path  = $1,
            mime_type  = $2,
            size_bytes = $3,
            uploaded_at = NOW()
        WHERE id = $4
        RETURNING *
    `;
    const { rows } = await pool.query(sql, [file_path, mime_type, size_bytes, id]);
    return rows[0];
};

exports.remove = async (id) => {
    const { rows } = await pool.query(
        'DELETE FROM documents WHERE id = $1 RETURNING file_path, bucket',
        [id]
    );
    return rows[0];
};
```

Lo más útil del DELETE es el `RETURNING file_path, bucket`: nos devuelve esos campos en la misma query, sin tener que hacer un `SELECT` antes. El controller los necesita para luego borrar el objeto de Storage.

## `routes/document.routes.js` — rutas y configuración de multer

```js
const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const controller = require('../controllers/document.controller.js');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }  // 10 MB
});

router.get('/',                  controller.index);
router.get('/new',               controller.showCreate);
router.post('/',                 upload.single('file'), controller.create);
router.get('/:id',               controller.show);
router.get('/:id/edit',          controller.showEdit);
router.get('/:id/signed-url',    controller.getSignedUrl);
router.post('/:id',              upload.single('file'), controller.update);
router.post('/:id/delete',       controller.destroy);

module.exports = router;
```

Dos cambios pequeños pero importantes vs. el Lab22:

:::tip Multer en la ruta, no en el controller
En el Lab22 invocábamos `upload(req, res, callback)` dentro del controller. Aquí lo registramos como **middleware** de la ruta (`upload.single('file')`). Esto es más idiomático en Express: cuando entra al handler, `req.file` ya está poblado (o no, si no vino archivo). El controller queda más limpio y enfocado en la lógica de negocio.
:::

- **`multer.memoryStorage()`** en vez de `diskStorage`: el archivo NUNCA toca el disco del servidor. Llega a `req.file.buffer` y desde ahí pasa al SDK de Supabase.
- **`upload.single('file')`** en vez de `.array('file', 1)`: como solo aceptamos un archivo por documento, `single` deja `req.file` (no `req.files[0]`).

## Entrypoint — `index.js`

Crea `index.js` en la raíz del proyecto con el bootstrap de Express:

```js
require('dotenv').config();

const express = require('express');
const path    = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Redirigimos la raíz al listado.
app.get('/', (req, res) => res.redirect('/documents'));

// Módulo de documentos bajo MVC.
const documentRoutes = require('./routes/document.routes.js');
app.use('/documents', documentRoutes);

// Error handler. Entre otras cosas atrapa el 413 cuando multer
// rechaza un archivo por superar limits.fileSize.
app.use((err, req, res, next) => {
    console.log(err);
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).send('Archivo demasiado grande (máx 10 MB).');
    }
    res.status(500).send('Error del servidor');
});

app.listen(3000, () => {
    console.log('Servidor en http://localhost:3000');
});
```

Tres detalles que se cocinan ahí:

- **`require('dotenv').config()`** va al inicio del todo, antes de cualquier otro `require`. Los módulos como `util/database.js` y `util/storage.js` también lo invocan por su cuenta (es idempotente), pero si lo olvidas aquí y alguien hace `process.env.X` en el cuerpo de `index.js` antes de que esos módulos se carguen, te da `undefined`.
- **`app.set('views', 'views')`** dice a Express dónde buscar los `.ejs`. Como ejecutamos `node index.js` desde la raíz del proyecto, "views" es relativo a esa carpeta.
- **El error handler de 4 argumentos** (`err, req, res, next`) es la firma especial que Express reconoce como middleware de error — si pones solo 3 argumentos no se activa. Lo necesitamos para convertir el `MulterError` con código `LIMIT_FILE_SIZE` en una respuesta clara: sin él, multer lanza el error sin que nadie lo atrape y el cliente recibe un 500 genérico.

Ya con `index.js` en su sitio y el script `start` agregado al `package.json`, puedes hacer:

```bash
pnpm start
```

Y deberías ver `Servidor en http://localhost:3000` en la consola. Si arrancas antes de tener los buckets, la tabla o el `.env` completos, el servidor levanta de todos modos — los errores aparecen cuando intentas usar las rutas.

## CRUD paso a paso

Antes de los handlers, todos comparten un encabezado común — los `require` y dos constantes que leen los nombres de bucket del `.env`. Es lo primero que va arriba de `controllers/document.controller.js`:

```js
const model   = require('../models/document.model.js');
const storage = require('../models/storage.repository.js');

const PUBLIC_BUCKET  = process.env.PUBLIC_BUCKET  || 'lab28-public';
const PRIVATE_BUCKET = process.env.PRIVATE_BUCKET || 'lab28-private';
```

A partir de aquí, cada subsección agrega uno o dos `module.exports.<handler>` a este mismo archivo. Para no ensuciar los snippets repetiremos las constantes; piensa que todos los handlers viven en un solo archivo y comparten ese encabezado.

### 1. CREATE — subir un archivo nuevo

Necesitamos dos handlers: uno que **muestra** el formulario (GET) y otro que **procesa** la subida (POST).

```js
// GET /documents/new — solo renderiza el form vacío.
module.exports.showCreate = (req, res) => {
    res.render('upload', { error: null });
};
```

Form en `views/upload.ejs` (lo importante):

```html
<form action="/documents" method="post" enctype="multipart/form-data">
    <input name="title" type="text" />
    <input name="file" type="file" required />
    <input name="is_public" type="checkbox" checked />
    <button type="submit">Subir</button>
</form>
```

Tres cosas a recordar:

- `enctype="multipart/form-data"` (sin esto, `req.file` queda undefined — es el error #1 del Lab22).
- El `name` del input debe ser exactamente `file` para que matche con `upload.single('file')`.
- El checkbox manda `is_public=on` cuando va marcado, nada cuando va desmarcado.

Y el handler del controller:

```js
module.exports.create = async (req, res) => {
    if (!req.file) {
        return res.status(400).render('upload', { error: 'Falta el archivo.' });
    }
    const title    = (req.body.title || '').trim() || req.file.originalname;
    const isPublic = req.body.is_public === 'on';
    const bucket   = isPublic ? PUBLIC_BUCKET : PRIVATE_BUCKET;
    const filePath = storage.buildObjectPath(req.file.originalname);

    // 1) Subir a Storage.
    try {
        await storage.uploadObject(bucket, filePath, req.file.buffer, req.file.mimetype);
    } catch (e) {
        return res.status(500).render('upload', { error: 'Error subiendo a Storage: ' + e.message });
    }

    // 2) INSERT en BD. Si falla, COMPENSAR borrando el objeto recién subido.
    try {
        await model.create({
            title, file_path: filePath, bucket,
            mime_type: req.file.mimetype, size_bytes: req.file.size, is_public: isPublic
        });
    } catch (e) {
        try { await storage.removeObject(bucket, filePath); }
        catch (e2) { console.log('Compensación también falló:', e2.message); }
        return res.status(500).render('upload', { error: 'Error registrando en BD: ' + e.message });
    }

    res.redirect('/documents?flash=creado');
};
```

:::warning Transaccionalidad manual
Storage y Postgres son sistemas separados que **no comparten transacción**. Si pasas el `INSERT` y luego falla el upload, te queda una fila apuntando a un archivo inexistente. Si pasa el upload y falla el INSERT, te queda un archivo huérfano en el bucket.

Por eso ordenamos **Storage primero, BD después**, y si la BD falla compensamos manualmente borrando el objeto. Es un patrón que vas a repetir cuando integres cualquier par de sistemas que no compartan transacción (Stripe + tu BD, S3 + tu BD, etc.).
:::

### 2. READ — listar

El controller hace `findAll()` y antes de mandar a la vista enriquece cada doc con su URL pública (si aplica):

```js
// GET /documents — lista todos los documentos.
module.exports.index = async (req, res) => {
    try {
        const docs = await model.findAll();
        // Para los documentos públicos calculamos la URL al renderizar (no la
        // persistimos en BD). Para los privados no calculamos nada: la vista
        // pedirá la signed URL después con fetch.
        const enriched = docs.map(doc => ({
            ...doc,
            publicUrl: doc.is_public
                ? storage.getPublicUrl(doc.bucket, doc.file_path)
                : null
        }));
        res.render('documents', { docs: enriched, flash: req.query.flash });
    } catch (e) {
        console.log(e);
        res.status(500).send('Error al listar documentos');
    }
};
```

Importante: la URL pública la calculamos al renderizar, no se guarda en BD. Si mañana cambias de bucket o de proyecto Supabase, no hay que migrar datos — el código simplemente vuelve a construir las URLs nuevas.

Para los documentos privados, la vista no recibe URL alguna del lado servidor. En su lugar, en el navegador hace un `fetch('/documents/:id/signed-url')` por cada imagen privada y al recibir la URL la asigna al `<img>`. Eso lo vemos en el bonus.

### 3. READ — detalle

```js
// GET /documents/:id — detalle de un documento.
module.exports.show = async (req, res) => {
    try {
        const doc = await model.findById(req.params.id);
        if (!doc) return res.status(404).send('Documento no encontrado');

        const publicUrl = doc.is_public
            ? storage.getPublicUrl(doc.bucket, doc.file_path)
            : null;

        res.render('document', { doc, publicUrl });
    } catch (e) {
        console.log(e);
        res.status(500).send('Error al obtener el documento');
    }
};
```

Mismo patrón que `index` pero con un solo doc. Si la fila no existe, regresamos 404 explícito antes de tocar Storage.

### 4. UPDATE

Igual que en CREATE, necesitamos dos handlers: uno para **mostrar** el formulario de edición y otro para **procesar** el guardado.

```js
// GET /documents/:id/edit — formulario de edición precargado.
module.exports.showEdit = async (req, res) => {
    try {
        const doc = await model.findById(req.params.id);
        if (!doc) return res.status(404).send('Documento no encontrado');
        res.render('edit', { doc, error: null });
    } catch (e) {
        console.log(e);
        res.status(500).send('Error al cargar la edición');
    }
};
```

El handler de POST tiene **dos sub-flujos** que conviven en el mismo método según si vino archivo en el form o no:

```js
// POST /documents/:id — actualiza metadata y/o reemplaza el archivo.
module.exports.update = async (req, res) => {
    const id = req.params.id;
    let doc;
    try {
        doc = await model.findById(id);
        if (!doc) return res.status(404).send('Documento no encontrado');
    } catch (e) {
        console.log(e);
        return res.status(500).send('Error al cargar el documento');
    }

    const newTitle = (req.body.title || '').trim() || doc.title;

    // ── Caso A: no vino archivo nuevo → solo actualizamos el título.
    if (!req.file) {
        try {
            await model.updateMetadata(id, { title: newTitle });
        } catch (e) {
            return res.status(500).render('edit', { doc, error: 'Error al actualizar: ' + e.message });
        }
        return res.redirect('/documents/' + id + '?flash=actualizado');
    }

    // ── Caso B: vino archivo nuevo → reemplazo en 3 pasos.
    const newPath = storage.buildObjectPath(req.file.originalname);
    const oldPath = doc.file_path;

    // 1) Sube el nuevo. En este instante ambos archivos coexisten en Storage.
    try {
        await storage.uploadObject(doc.bucket, newPath, req.file.buffer, req.file.mimetype);
    } catch (e) {
        return res.status(500).render('edit', { doc, error: 'Error subiendo el archivo nuevo: ' + e.message });
    }

    // 2) Apunta la fila al nuevo. Si esto falla, COMPENSAR borrando el nuevo.
    try {
        await model.replaceFile(id, {
            file_path:  newPath,
            mime_type:  req.file.mimetype,
            size_bytes: req.file.size
        });
        if (newTitle !== doc.title) {
            await model.updateMetadata(id, { title: newTitle });
        }
    } catch (e) {
        try { await storage.removeObject(doc.bucket, newPath); }
        catch (e2) { console.log('Compensación también falló:', e2.message); }
        return res.status(500).render('edit', { doc, error: 'Error en BD: ' + e.message });
    }

    // 3) Ya está. Limpia el viejo. Si esto falla, no rompe nada: archivo huérfano.
    try { await storage.removeObject(doc.bucket, oldPath); }
    catch (e) { console.log('No se pudo borrar el archivo viejo:', e.message); }

    res.redirect('/documents/' + id + '?flash=reemplazado');
};
```

¿Por qué ese orden en el reemplazo? **Mantiene siempre al menos un archivo accesible**: durante el cambio, o el viejo o el nuevo (o ambos) están disponibles. Lo opuesto — borrar el viejo antes de subir el nuevo — abriría una ventana donde la fila apuntaría a nada.

### 5. DELETE

```js
module.exports.destroy = async (req, res) => {
    const removed = await model.remove(req.params.id);     // 1) BD primero
    if (!removed) return res.status(404).send('No encontrado');
    try { await storage.removeObject(removed.bucket, removed.file_path); }  // 2) Storage después
    catch (e) { console.log('Archivo huérfano en Storage:', e.message); }
    res.redirect('/documents?flash=eliminado');
};
```

:::tip Orden de DELETE: BD primero, Storage después
En CREATE fuimos Storage → BD. En DELETE invertimos el orden a propósito.

- **Si falla la BD**: no tocamos Storage. Estado consistente.
- **Si la BD pasa y Storage falla**: el archivo queda huérfano en el bucket — anómalo pero **no rompe la app**: ninguna fila apunta a él. Auditable con un script.
- **El orden contrario sería peor**: si borráramos el archivo y luego fallara la BD, tendríamos una fila viva apuntando a un archivo inexistente. Cada vez que alguien intente ver el doc, vería un 404.
:::

## Bonus — Bucket privado y Signed URLs

Esta sección es **autodidacta**: no la veremos en clase. Léela con calma; el concepto cambia cómo piensas sobre acceso a archivos en producción.

### ¿Qué es una signed URL y por qué existe?

Imagina que tienes una foto que solo el usuario dueño debería poder ver — un comprobante de pago, una credencial, una imagen médica. Si la subes a un bucket público, cualquiera con el link la ve. Si la subes a un bucket privado, ni tu propio frontend la puede pedir directo.

La **signed URL** es la solución: es una URL HTTPS normal, pero al final lleva un parámetro `?token=...` firmado criptográficamente por Supabase con tu llave. Cuando alguien la pega en su navegador, Supabase valida el token antes de servir el archivo. Si el token expiró, devuelve 400.

Analogía: una signed URL es como un **boleto de cine**. Es válido durante la función, después se vuelve papel. Si lo encuentras en la calle al día siguiente, no te deja entrar.

Diferencias importantes vs. URL pública:

| URL pública                            | Signed URL                                        |
| -------------------------------------- | ------------------------------------------------- |
| Eterna                                 | Vence en X segundos                               |
| Cualquiera con el link la usa          | Cualquiera con el link la usa **hasta que vence** |
| Cualquiera puede compartirla           | Si se comparte, el link muere pronto              |
| Bucket marcado como **Public**         | Bucket marcado como **Private**                   |
| Se construye, no requiere red          | Se pide a Supabase con `createSignedUrl(...)`     |

### Patrón de subida (no cambia)

Subir a un bucket privado es **idéntico** a subir a uno público: el servidor usa la secret key, que bypassea RLS, así que no importa si el bucket es público o privado. En el form solo desmarcas el checkbox `is_public` y el controller enruta al bucket que toca.

Lo que cambia es la **lectura**.

### Patrón de lectura (donde aparece la signed URL)

```
Browser                            Express                       Supabase Storage
   │                                 │                                  │
   │ GET /documents/:id/signed-url   │                                  │
   ├────────────────────────────────▶│                                  │
   │                                 │ findById                         │
   │                                 │ supabase.storage                 │
   │                                 │   .from(bucket)                  │
   │                                 │   .createSignedUrl(path, 60)     │
   │                                 ├─────────────────────────────────▶│
   │                                 │◀──── { signedUrl } ──────────────┤
   │   { url: "https://...?token=" } │                                  │
   │◀────────────────────────────────┤                                  │
   │                                                                    │
   │   GET https://...?token=  (ya sin pasar por Express)               │
   ├───────────────────────────────────────────────────────────────────▶│
   │◀───── archivo ─────────────────────────────────────────────────────┤
```

El paso final es elegante: el archivo va directo del cliente a Supabase, sin volver a pasar por nuestro servidor. El servidor solo hizo de portero un instante para autorizar el acceso.

El handler en el controller:

```js
module.exports.getSignedUrl = async (req, res) => {
    const doc = await model.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    if (doc.is_public) {
        return res.json({ url: storage.getPublicUrl(doc.bucket, doc.file_path) });
    }
    // No pasamos tercer argumento: usamos el default (60 s) definido en
    // storage.repository.js. Si quieres cambiarlo, modifícalo en un solo lugar.
    const url = await storage.createSignedUrl(doc.bucket, doc.file_path);
    res.json({ url });
};
```

Y la vista, que hace fetch desde JS de cliente:

```html
<div id="private-preview">cargando preview privado…</div>

<script>
    (async () => {
        const r = await fetch('/documents/<%= doc.id %>/signed-url');
        const { url } = await r.json();
        document.getElementById('private-preview').innerHTML =
            '<img src="' + url + '" alt="(privado)">';
    })();
</script>
```

Observa el flujo: el HTML inicial NO contiene la URL del archivo (ni la podría contener, no existe todavía). Cuando carga, el JS pide al servidor que le firme una URL, y solo cuando la tiene la inserta en el DOM. En Network del DevTools verás dos requests: el `GET /documents/:id/signed-url` (a tu Express, devuelve JSON) y luego el `GET https://...?token=...` (directo a Supabase, devuelve la imagen).

### Parámetros importantes de `createSignedUrl`

- **`expiresIn`** (segundos, no milisegundos): cuánto dura la URL. Para imágenes inline 60-300 segundos sobra; para descargas iniciadas por el usuario, 3600 (una hora).
- **`download: true`** (opcional, tercer arg): fuerza `Content-Disposition: attachment` para que el browser descargue en vez de mostrar. Útil para PDFs y archivos genéricos.
- **`transform: { width: 400 }`** (opcional): redimensiona imágenes al vuelo. No lo usamos en este lab, pero es útil para thumbnails.

:::warning Riesgos de las signed URLs
- **No están atadas a un usuario**: cualquiera con el link la usa hasta que expira. Si el usuario reenvía el link por WhatsApp en los próximos 60 segundos, su contacto también accede. Por eso `expiresIn` debe ser corto.
- **No las loggees** con detalles ni las pongas en analytics. Quedan en archivos accesibles.
- **No las envíes por email**: el email queda en historiales, snapshots, etc.
- **No hay revocación directa**: una vez emitida, vive hasta vencer. Para "revocar" tendrías que mover o borrar el objeto (y todas las URLs firmadas se rompen).
:::

### Errores comunes del bonus

1. **Usar `publishable key` del lado servidor para "saltarse" RLS**: no funciona — la publishable respeta RLS igual que un cliente normal. Para administración server-side se necesita la secret key.
2. **Olvidar `expiresIn`**: el SDK de Supabase no tiene default — si llamas `supabase.storage.from(b).createSignedUrl(path)` sin segundo argumento, lanza TypeError. Por eso `storage.repository.js` lo declara con `expiresIn = 60` y el controller llama sin tercer argumento; así el default vive en un solo lugar.
3. **Pasarle milisegundos a `expiresIn`**: pones `60000` pensando "un minuto" y termina siendo 60000 segundos (~16 horas). El parámetro es **segundos**.
4. **Confundir `getPublicUrl` con `createSignedUrl`**: el primero es síncrono y siempre devuelve algo, incluso si el bucket no es público (la URL fallará al usarse). El segundo es async, valida que firmaba bien, y si el path no existe falla con error.
5. **Pedir signed URL para un objeto en bucket público**: técnicamente funciona, pero es innecesario. El handler maneja este caso devolviendo la URL pública directo.

## Vistas EJS completas

Las cuatro vistas que el controller renderiza. Las muestro con el HTML estructural y la lógica EJS — los estilos inline `<style>` los recorto para no ocupar pantalla, pero los tienes íntegros en `test-project/views/*.ejs`.

### `views/upload.ejs` — form para crear

```html
<!DOCTYPE HTML>
<html lang="es">
<head><meta charset="UTF-8"><title>Nuevo documento</title></head>
<body>
    <a href="/documents">← volver</a>
    <h1>Nuevo documento</h1>

    <% if (error) { %>
        <div class="error"><%= error %></div>
    <% } %>

    <form action="/documents" method="post" enctype="multipart/form-data">
        <label for="title">Título</label>
        <input id="title" name="title" type="text"
               placeholder="(opcional — usa el nombre del archivo si lo dejas vacío)" />

        <label for="file">Archivo</label>
        <input id="file" name="file" type="file" required />

        <label>
            <input id="is_public" name="is_public" type="checkbox" checked />
            Bucket público (desmárcalo para usar el privado + signed URLs)
        </label>

        <button type="submit">Subir</button>
    </form>
</body>
</html>
```

Recuerda: `enctype="multipart/form-data"` es lo que permite que el archivo llegue al servidor. Sin él, `req.file` queda `undefined`.

### `views/documents.ejs` — listado

```html
<!DOCTYPE HTML>
<html lang="es">
<head><meta charset="UTF-8"><title>Documentos</title></head>
<body>
    <h1>Documentos</h1>

    <% if (flash === 'creado')      { %><div>Documento creado.</div><% } %>
    <% if (flash === 'actualizado') { %><div>Documento actualizado.</div><% } %>
    <% if (flash === 'reemplazado') { %><div>Archivo reemplazado.</div><% } %>
    <% if (flash === 'eliminado')   { %><div>Documento eliminado.</div><% } %>

    <a href="/documents/new">+ Nuevo documento</a>

    <table>
        <thead>
            <tr>
                <th>#</th><th>Preview</th><th>Título</th><th>Tipo</th>
                <th>Tamaño</th><th>Visibilidad</th><th>Subido</th><th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            <% docs.forEach(doc => { %>
                <tr>
                    <td><%= doc.id %></td>
                    <td>
                        <% if (doc.is_public && doc.mime_type && doc.mime_type.startsWith('image/')) { %>
                            <img src="<%= doc.publicUrl %>" alt="<%= doc.title %>" style="max-width:80px">
                        <% } else if (!doc.is_public && doc.mime_type && doc.mime_type.startsWith('image/')) { %>
                            <img data-signed-id="<%= doc.id %>" alt="(privado)" style="max-width:80px">
                        <% } else { %>
                            —
                        <% } %>
                    </td>
                    <td><a href="/documents/<%= doc.id %>"><%= doc.title %></a></td>
                    <td><%= doc.mime_type || '' %></td>
                    <td><%= doc.size_bytes ? (doc.size_bytes / 1024).toFixed(1) + ' KB' : '' %></td>
                    <td><%= doc.is_public ? 'público' : 'privado' %></td>
                    <td><%= new Date(doc.uploaded_at).toLocaleString('es-MX') %></td>
                    <td>
                        <a href="/documents/<%= doc.id %>/edit">editar</a>
                        <form style="display:inline" method="post"
                              action="/documents/<%= doc.id %>/delete"
                              onsubmit="return confirm('¿Eliminar?')">
                            <button type="submit">eliminar</button>
                        </form>
                    </td>
                </tr>
            <% }) %>
            <% if (docs.length === 0) { %>
                <tr><td colspan="8">Sin documentos todavía.</td></tr>
            <% } %>
        </tbody>
    </table>

    <script>
        // Para cada thumbnail privado pedimos su signed URL y la asignamos al src.
        // Demuestra el flujo Browser → Express → Supabase sin exponer la secret key.
        document.querySelectorAll('img[data-signed-id]').forEach(async img => {
            const id = img.getAttribute('data-signed-id');
            const r = await fetch('/documents/' + id + '/signed-url');
            if (!r.ok) return;
            const { url } = await r.json();
            if (url) img.src = url;
        });
    </script>
</body>
</html>
```

Nota cómo distinguimos en el `<img>`: los públicos llevan `src` directo con `<%= doc.publicUrl %>`; los privados llevan `data-signed-id` y un `src` vacío que el `<script>` puebla al cargar.

### `views/document.ejs` — detalle

```html
<!DOCTYPE HTML>
<html lang="es">
<head><meta charset="UTF-8"><title><%= doc.title %></title></head>
<body>
    <a href="/documents">← volver</a>
    <h1><%= doc.title %></h1>
    <p>Documento #<%= doc.id %></p>

    <dl>
        <dt>Visibilidad</dt>
        <dd><%= doc.is_public ? 'público' : 'privado (signed URL)' %></dd>
        <dt>Bucket</dt>      <dd><code><%= doc.bucket %></code></dd>
        <dt>Path</dt>        <dd><code><%= doc.file_path %></code></dd>
        <dt>MIME</dt>        <dd><%= doc.mime_type || '—' %></dd>
        <dt>Tamaño</dt>      <dd><%= doc.size_bytes ? (doc.size_bytes / 1024).toFixed(1) + ' KB' : '—' %></dd>
        <dt>Subido</dt>      <dd><%= new Date(doc.uploaded_at).toLocaleString('es-MX') %></dd>
    </dl>

    <div>
        <% if (doc.is_public) { %>
            <% if (doc.mime_type && doc.mime_type.startsWith('image/')) { %>
                <img src="<%= publicUrl %>" alt="<%= doc.title %>" style="max-width:100%">
            <% } else { %>
                <a href="<%= publicUrl %>" target="_blank">Abrir archivo (URL pública)</a>
            <% } %>
        <% } else { %>
            <div id="private-preview">cargando preview privado…</div>
        <% } %>
    </div>

    <p>
        <a href="/documents/<%= doc.id %>/edit">Editar</a>
        <form style="display:inline" method="post"
              action="/documents/<%= doc.id %>/delete"
              onsubmit="return confirm('¿Eliminar?')">
            <button type="submit">Eliminar</button>
        </form>
    </p>

    <% if (!doc.is_public) { %>
        <script>
            // El servidor jamás exporta la secret key. En vez de eso expone
            // /documents/:id/signed-url que devuelve una URL firmada temporal.
            (async () => {
                const r = await fetch('/documents/<%= doc.id %>/signed-url');
                const target = document.getElementById('private-preview');
                if (!r.ok) { target.textContent = 'No se pudo obtener la URL firmada.'; return; }
                const { url } = await r.json();
                const mime = '<%= doc.mime_type || "" %>';
                if (mime.startsWith('image/')) {
                    target.innerHTML = '<img src="' + url + '" alt="(privado)" style="max-width:100%">';
                } else {
                    target.innerHTML = '<a href="' + url + '" target="_blank">Abrir archivo (signed URL, expira pronto)</a>';
                }
            })();
        </script>
    <% } %>
</body>
</html>
```

### `views/edit.ejs` — form de edición

```html
<!DOCTYPE HTML>
<html lang="es">
<head><meta charset="UTF-8"><title>Editar #<%= doc.id %></title></head>
<body>
    <a href="/documents/<%= doc.id %>">← volver al detalle</a>
    <h1>Editar #<%= doc.id %></h1>

    <% if (error) { %>
        <div class="error"><%= error %></div>
    <% } %>

    <form action="/documents/<%= doc.id %>" method="post" enctype="multipart/form-data">
        <label for="title">Título</label>
        <input id="title" name="title" type="text" value="<%= doc.title %>" />

        <hr>
        <label for="file">Reemplazar archivo (opcional)</label>
        <input id="file" name="file" type="file" />
        <p>
            Si dejas vacío, solo se actualiza el título.<br>
            Si seleccionas un archivo, se sube uno nuevo, la fila apunta a él y el anterior se borra del bucket.
        </p>

        <button type="submit">Guardar</button>
    </form>
</body>
</html>
```

El form usa el mismo `POST /documents/:id` para los dos sub-flujos. La diferencia la decide el controller en función de si `req.file` viene poblado o no.

## Verificación end-to-end

Configuración (una sola vez):

1. `cd test-project && pnpm install`.
2. En Supabase: crea los buckets `lab28-public` (público) y `lab28-private` (privado).
3. SQL Editor → ejecuta `schema.sql`.
4. Copia `.env.example` a `.env` y rellena los 5 valores.
5. `pnpm start` → debe imprimir `Servidor en http://localhost:3000`.

CREATE público:

6. Navegador → `http://localhost:3000/documents/new`.
7. Sube una PNG o JPG, título "Prueba pública", checkbox **marcado** → Subir.
8. Debe redirigir a `/documents` con el thumbnail visible.
9. Verifica en Supabase → Storage → `lab28-public` → carpeta `documents/`: el archivo está.
10. Verifica en Table Editor → `documents`: una fila con `is_public=true`, `bucket=lab28-public`.

READ:

11. Click en el título → debe ver el detalle con la imagen grande.
12. Volver a `/documents` y confirmar el orden por `uploaded_at DESC`.

UPDATE solo metadata:

13. Edit → cambia solo el título → Guardar.
14. Verifica en BD que `file_path` no cambió.

UPDATE reemplazar archivo:

15. Edit → selecciona OTRA imagen → Guardar.
16. Verifica en Storage que existe el archivo nuevo y el viejo ya **no** existe.
17. Verifica en BD que `file_path` apunta al nuevo y `uploaded_at` se actualizó.

DELETE:

18. Eliminar → confirma.
19. Verifica que la fila ya no está en `documents` Y que el objeto ya no está en el bucket.

CREATE privado (bonus):

20. `/documents/new` → sube imagen con checkbox **desmarcado** → Subir.
21. En la lista, el thumbnail debe aparecer **después de un instante** (porque carga vía signed URL).
22. DevTools → Network → debe verse el request `GET /documents/:id/signed-url` con respuesta JSON `{ "url": "https://...?token=..." }`.
23. Copia esa URL firmada y pégala en otra pestaña → debe servir el archivo.

Signed URL expira:

24. Temporalmente baja `expiresIn` a 5 en `models/storage.repository.js`, reinicia, recarga la vista, copia la URL firmada, espera 10 segundos, pégala → debe responder 400 con mensaje de expirada.
25. Vuelve `expiresIn` a 60.

Casos negativos:

26. Quita `enctype="multipart/form-data"` del form → la subida debe devolver "Falta el archivo".
27. Sube un archivo > 10 MB → debe responder 413 "Archivo demasiado grande".
28. Borra manualmente el objeto desde el dashboard de Storage y entra al detalle → la página carga pero la imagen aparece rota (esperado).

## Errores comunes y cómo depurarlos

1. **Sube pero no se ve la imagen**: revisa el `mime_type` en BD. Si está como `application/octet-stream`, te falta pasar `contentType: req.file.mimetype` al `upload`.
2. **"The resource already exists"**: cambiaste `upsert: false` a `true` y subiste dos veces el mismo path. Asegúrate de que `buildObjectPath` regrese paths únicos (debería, con el UUID).
3. **403 / 401 al subir**: estás usando la publishable key en `util/storage.js`. Cambia a la secret key.
4. **400 al pegar la URL pública**: el bucket no está marcado como Public. Re-edita el bucket en el dashboard.
5. **`req.file` undefined**: te falta `enctype="multipart/form-data"` o el `name="file"` del input no coincide con `upload.single('file')`.
6. **Pool de Postgres se agota**: estás abriendo conexiones nuevas en cada request en vez de usar el `pool` exportado. Importa siempre `require('../util/database.js')`.
7. **"Failed to fetch" al obtener signed URL**: revisa la consola del servidor: probablemente el path en BD ya no existe en Storage (fue borrado manualmente).

## Siguientes pasos

- **Múltiples archivos por documento**: cambiar `upload.single('file')` por `upload.array('files', 5)` y una tabla relacional `document_files`.
- **Validación de tipo MIME**: rechazar archivos no soportados antes de subir (`if (!req.file.mimetype.startsWith('image/')) return ...`).
- **Transformaciones de imagen al vuelo**: pasar `transform: { width: 400 }` a `createSignedUrl` para que Supabase te devuelva un thumbnail.
- **Integrar Supabase Auth + RLS** para que cada usuario solo vea sus documentos. La signed URL se vuelve poderosa cuando el backend valida primero quién la pide.
- **Lifecycle / cleanup**: un cron job que elimina objetos huérfanos (sin fila en `documents`) más viejos que X días — pequeño ejercicio de scripting que cierra el patrón de compensación.
- **Mover a un ORM** como Prisma para que el modelo `documents` venga con tipos automáticos.

<a href="/docs/node/tutorials/intro_web/Lab28StorageSupabase/test-project.zip" download="lab28-storage-supabase.zip">Ver ejemplo completo</a>
