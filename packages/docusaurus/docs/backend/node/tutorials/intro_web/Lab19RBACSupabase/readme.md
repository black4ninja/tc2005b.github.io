---
sidebar_position: 19.5
---
# RBAC paso a paso (PostgreSQL + Supabase)

> **Duración estimada:** 1 hora 45 minutos.
> **Prerrequisitos:** Lab12 (EJS), Lab13 (MVC), Lab14 (Sesiones), **Lab17BDSupabase**, **Lab18AutenticacionSupabase**. Debes tener tu `test-project/` del Lab18 Supabase **funcionando** antes de empezar.

## ¿Qué vamos a construir hoy?

Vamos a extender el proyecto del **Lab18AutenticacionSupabase** para agregarle **control de acceso basado en roles (RBAC)**. Al terminar, tu sistema podrá:

- Asignarle un rol a cada usuario.
- Definir qué permisos tiene cada rol.
- Bloquear rutas según el permiso requerido.
- Mostrar u ocultar elementos de la interfaz dependiendo del permiso del usuario.

Como caso de uso vamos a construir un **sistema de notas**: cada usuario, dependiendo de su rol, podrá ver notas, crearlas, editarlas o eliminarlas.

> **Nota importante sobre seguridad.** Quizás escuchaste que "RBAC ya está deprecado y ahora se usa ABAC". **Eso es incorrecto.** RBAC sigue siendo el modelo de control de acceso más usado en la industria y es exigido por estándares como HIPAA, GDPR, PCI DSS y SOC 2. ABAC y ReBAC son modelos **complementarios** que se construyen encima de RBAC, no en su lugar. Al final del laboratorio veremos por qué y cuándo conviene usar cada uno. Las referencias oficiales están al final del documento.

## ¿Qué es RBAC?

RBAC significa *Role-Based Access Control* (control de acceso basado en roles). La idea es muy simple:

```
Usuario ──tiene──> Rol ──posee──> Permiso ──autoriza──> Acción sobre Recurso
```

En vez de decir "Ana puede crear notas, Beto puede editar notas, Carla puede borrar notas..." (lo cual no escala), decimos:

- "Ana es **lector**, los lectores pueden **ver_notas**".
- "Beto es **editor**, los editores pueden **ver_notas**, **crear_nota**, **editar_nota**".
- "Carla es **administrador**, los administradores pueden hacer **todo**".

Si mañana cambia la política y los editores también pueden borrar, **modificas un solo registro** (el del rol editor) en vez de actualizar a cada usuario.

## Sección 1 — Verifica tu Lab18AutenticacionSupabase (5 min)

Antes de empezar, asegúrate de que tu proyecto del Lab18 Supabase corre correctamente:

```bash
cd test-project
node index.js
```

Abre el navegador en `http://localhost:3000/usuarios/registro`, registra un usuario y haz login. Si todo funciona, listo: vamos a extender ese mismo proyecto.

> **Importante.** No vas a descargar ningún `.zip`. El código base es el que tú mismo construiste en el Lab18AutenticacionSupabase. Si te falta algún archivo, regresa al Lab18 antes de continuar.

Tu estructura debería verse así (heredada de Lab17BDSupabase + Lab18AutenticacionSupabase):

```
test-project/
├── controllers/
│   ├── games.controller.js   (del Lab17.5)
│   └── usuarios.controller.js
├── models/
│   ├── games.model.js        (del Lab17.5)
│   └── usuarios.model.js
├── views/
│   └── usuarios/
│       ├── registro.ejs
│       └── logged.ejs
├── routes/
│   ├── games.routes.js       (del Lab17.5)
│   └── usuarios.routes.js
├── util/
│   ├── database.js           (pool de pg)
│   └── is-auth.js
├── .env                      (DATABASE_URL, SESSION_SECRET)
├── index.js
└── package.json
```

> **Nota de naming.** En la pista Supabase la carpeta de utilidades se llama `util/` (singular), no `utils/`. Igualmente el método de búsqueda en `User` se llama `findByUsername` (no `findUser`). Vamos a respetar esa convención durante todo el lab.

## Sección 2 — Diseñar el esquema en Supabase (20 min)

Vamos a agregar **5 tablas nuevas** al proyecto Supabase que ya tienes. La tabla `users` que ya existe NO se modifica.

### Modelo entidad-relación

```
┌──────────┐         ┌──────────────┐         ┌──────────┐         ┌─────────────┐         ┌──────────┐
│  users   │─────────│  usuario_rol │─────────│  roles   │─────────│ rol_permiso │─────────│ permisos │
│ (Lab18)  │ 1     N │              │ N     1 │          │ 1     N │             │ N     1 │          │
└──────────┘         └──────────────┘         └──────────┘         └─────────────┘         └──────────┘

┌──────────┐
│  notas   │  (recurso protegido por permisos)
└──────────┘
```

- `roles`: catálogo de roles disponibles (lector, editor, administrador).
- `permisos`: catálogo de permisos disponibles (ver_notas, crear_nota, editar_nota, eliminar_nota).
- `usuario_rol`: relaciona qué rol tiene cada usuario.
- `rol_permiso`: relaciona qué permisos tiene cada rol.
- `notas`: el recurso que vamos a proteger.

### Script SQL — crear las tablas

Abre el **SQL Editor** de tu proyecto Supabase y ejecuta:

```sql
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS roles (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permisos (
    id    SERIAL PRIMARY KEY,
    clave VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuario_rol (
    username VARCHAR(60) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    id_rol   INT         NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
    PRIMARY KEY (username, id_rol)
);

CREATE TABLE IF NOT EXISTS rol_permiso (
    id_rol     INT NOT NULL REFERENCES roles(id)    ON DELETE CASCADE,
    id_permiso INT NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (id_rol, id_permiso)
);

CREATE TABLE IF NOT EXISTS notas (
    id         SERIAL PRIMARY KEY,
    titulo     VARCHAR(200) NOT NULL,
    contenido  TEXT         NOT NULL,
    autor      VARCHAR(60)  NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    creada_en  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notas_autor ON notas (autor);
```

Tres decisiones de diseño que vale la pena marcar:

- **`SERIAL PRIMARY KEY`** — el equivalente PostgreSQL de `AUTO_INCREMENT`. Internamente Postgres crea una secuencia y asigna el siguiente valor en cada INSERT.
- **`REFERENCES ... ON DELETE CASCADE`** — si borras un rol, sus filas en `usuario_rol` y `rol_permiso` se borran automáticamente. Sin `CASCADE`, Postgres rechazaría el `DELETE` por integridad referencial. Esto es lo idiomático en PostgreSQL para tablas de relación.
- **`TIMESTAMPTZ` (timestamp with time zone)** — el tipo recomendado en PostgreSQL para fechas. A diferencia de `TIMESTAMP` "naive", almacena en UTC y convierte en lectura, lo que evita bugs cuando tu app corre en diferentes zonas horarias.

Verifica en **Table Editor** que las 5 tablas aparecieron vacías.

### Script SQL — datos semilla

Insertamos los 3 roles y 4 permisos iniciales:

```sql
INSERT INTO roles (nombre) VALUES
    ('lector'),
    ('editor'),
    ('administrador')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO permisos (clave) VALUES
    ('ver_notas'),
    ('crear_nota'),
    ('editar_nota'),
    ('eliminar_nota')
ON CONFLICT (clave) DO NOTHING;
```

> **¿Por qué `ON CONFLICT DO NOTHING`?** Si vuelves a correr este script (porque te equivocaste, o porque otro compañero ya lo corrió en un proyecto compartido), Postgres ignora las filas que ya existen en lugar de fallar con un error de constraint `UNIQUE`. Esto se conoce como **operación idempotente**: se puede ejecutar 1 vez o 100 veces y el resultado es el mismo. Es un buen hábito en scripts de migración y datos semilla.

### Matriz de asignación rol → permiso

Esta es la política que vamos a programar:

| Rol | ver_notas | crear_nota | editar_nota | eliminar_nota |
|---|---|---|---|---|
| lector | ✅ | ❌ | ❌ | ❌ |
| editor | ✅ | ✅ | ✅ | ❌ |
| administrador | ✅ | ✅ | ✅ | ✅ |

Tradúcela a SQL:

```sql
-- lector: solo ver
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.nombre = 'lector' AND p.clave = 'ver_notas'
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- editor: ver, crear, editar
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.nombre = 'editor' AND p.clave IN ('ver_notas','crear_nota','editar_nota')
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- administrador: todo
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.nombre = 'administrador'
ON CONFLICT (id_rol, id_permiso) DO NOTHING;
```

### Consulta de validación

Antes de tocar código, verifica que la consulta clave funciona en el SQL Editor de Supabase. Esta consulta es la que pediremos desde Node:

```sql
SELECT p.clave
FROM users u
JOIN usuario_rol ur ON ur.username = u.username
JOIN roles r        ON r.id = ur.id_rol
JOIN rol_permiso rp ON rp.id_rol = r.id
JOIN permisos p     ON p.id = rp.id_permiso
WHERE u.username = 'tu_usuario_de_prueba';
```

Como aún no asignaste roles a tus usuarios, asígnale el rol de administrador a uno de los usuarios que registraste en el Lab18:

```sql
INSERT INTO usuario_rol (username, id_rol)
SELECT 'tu_usuario', r.id FROM roles r WHERE r.nombre = 'administrador'
ON CONFLICT (username, id_rol) DO NOTHING;
```

Vuelve a correr la consulta. Debe regresarte 4 filas con los 4 permisos. Si funciona, la base ya está lista.

## Sección 3 — Extender el modelo de Usuario (15 min)

Vamos a agregar un método `getPermisos` a la clase `User` del Lab18 para traer los permisos desde la base de datos.

Abre `models/usuarios.model.js` y agrega este método **dentro de la clase `User`**, junto a `save()` y `findByUsername()`:

```javascript
// Devuelve el array de permisos (strings) del usuario dado
static async getPermisos(username) {
    const sql = `
        SELECT p.clave
        FROM users u
        JOIN usuario_rol ur ON ur.username = u.username
        JOIN roles r        ON r.id = ur.id_rol
        JOIN rol_permiso rp ON rp.id_rol = r.id
        JOIN permisos p     ON p.id = rp.id_permiso
        WHERE u.username = $1
    `;
    const { rows } = await pool.query(sql, [username]);
    // Convertimos [{clave:'ver_notas'}, {clave:'crear_nota'}] a ['ver_notas','crear_nota']
    return rows.map(r => r.clave);
}
```

> **Por qué devolvemos un array de strings.** Si devolvieras `[{clave:'ver_notas'}, {clave:'crear_nota'}]`, cada vista tendría que iterar y comparar campo por campo. Devolver `['ver_notas','crear_nota']` permite usar `permisos.includes('ver_notas')`, que es más limpio, más rápido y más fácil de leer en EJS.

> **Nota sobre `pool.query`.** A diferencia del Lab19 versión MariaDB, aquí no hay `getConnection()` ni `release()`. El pool de `pg` toma una conexión libre, ejecuta la query y la regresa al pool automáticamente. Esto elimina toda una clase de bugs (conexiones colgadas que terminan agotando el pool).

### Modificar `do_login` para guardar los permisos en sesión

Abre `controllers/usuarios.controller.js` y modifica `do_login`. Justo después de validar la contraseña con `bcrypt.compare`, agrega la carga de permisos:

```javascript
exports.do_login = async (req, res) => {
    try {
        const usuario = await model.User.findByUsername(req.body.username);
        if (!usuario) {
            return res.redirect('/usuarios/login');
        }

        const doMatch = await bcrypt.compare(req.body.password, usuario.password);
        if (!doMatch) {
            return res.redirect('/usuarios/login');
        }

        // ──── NUEVO: cargar permisos del usuario ────
        const permisos = await model.User.getPermisos(usuario.username);

        req.session.username   = usuario.username;
        req.session.isLoggedIn = true;
        req.session.permisos   = permisos; // array de strings
        console.log('Permisos del usuario:', permisos);

        res.redirect('/usuarios/logged');

    } catch (e) {
        console.error(e);
        res.redirect('/usuarios/login');
    }
};
```

> **Patrón Post/Redirect/Get (PRG).** Igual que en el Lab18 Supabase, el POST exitoso responde con un redirect, no con un render directo. Eso evita que recargar la página re-envíe el formulario con la contraseña. La vista de éxito la sirve `get_logged` cuando el navegador hace el GET a `/usuarios/logged`.

### Hito 1 — Verificar que los permisos se cargan

Reinicia el servidor, haz login con tu usuario administrador y revisa la consola. Deberías ver algo como:

```
Permisos del usuario: [ 'ver_notas', 'crear_nota', 'editar_nota', 'eliminar_nota' ]
```

Si funciona, ya tenemos la mitad de RBAC. Lo siguiente es proteger las rutas.

## Sección 4 — Middleware genérico `has-permission` (10 min)

En el Lab19 versión MariaDB se creaba **un archivo de middleware por permiso** (`can-create.js`, `can-view.js`, etc.). Eso no escala: si tu sistema crece a 20 permisos, terminarías con 20 archivos casi idénticos.

Vamos a hacerlo mejor: **un solo middleware parametrizable**.

Crea el archivo `util/has-permission.js`:

```javascript
// Middleware factory: recibe el permiso requerido y devuelve un middleware Express
module.exports = (permisoRequerido) => {
    return (req, res, next) => {
        const permisos = req.session.permisos || [];
        if (permisos.includes(permisoRequerido)) {
            return next();
        }
        return res.status(403).send(
            `Acceso denegado: necesitas el permiso "${permisoRequerido}".`
        );
    };
};
```

> **¿Qué patrón es éste?** Es una *closure*: una función que devuelve otra función. La externa recibe el parámetro de configuración (qué permiso exigir) y la interna es el middleware real que Express ejecuta. Es el mismo patrón que usa `express.static('public')`: tú le pasas un argumento y te devuelve el middleware listo. Es exactamente la misma estructura que `is-auth.js` que ya conoces, solo que parametrizada.

Más adelante lo usarás así:

```javascript
router.post('/notas/crear', isAuth, hasPermission('crear_nota'), controller.post_crear);
//                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                  esto es un middleware Express normal
```

## Sección 5 — Dominio de notas: modelo, controlador y rutas (25 min)

### 5.1 Modelo `models/notas.model.js`

Crea el archivo `models/notas.model.js`:

```javascript
const pool = require('../util/database.js');

exports.Nota = class {
    constructor(titulo, contenido, autor) {
        this.titulo    = titulo;
        this.contenido = contenido;
        this.autor     = autor;
    }

    async crear() {
        const sql = `INSERT INTO notas (titulo, contenido, autor)
                     VALUES ($1, $2, $3)
                     RETURNING id, titulo, contenido, autor, creada_en`;
        const { rows } = await pool.query(sql, [this.titulo, this.contenido, this.autor]);
        return rows[0];
    }

    static async obtenerTodas() {
        const sql = `SELECT id, titulo, contenido, autor, creada_en
                     FROM notas
                     ORDER BY creada_en DESC`;
        const { rows } = await pool.query(sql);
        return rows;
    }

    static async obtenerPorId(id) {
        const sql = `SELECT id, titulo, contenido, autor, creada_en
                     FROM notas WHERE id = $1`;
        const { rows } = await pool.query(sql, [id]);
        return rows[0] || null;
    }

    static async actualizar(id, titulo, contenido) {
        const sql = `UPDATE notas
                     SET titulo = $1, contenido = $2
                     WHERE id = $3
                     RETURNING id`;
        const { rows } = await pool.query(sql, [titulo, contenido, id]);
        return rows[0] || null;
    }

    static async eliminar(id) {
        const sql = `DELETE FROM notas WHERE id = $1 RETURNING id`;
        const { rows } = await pool.query(sql, [id]);
        return rows[0] || null;
    }
};
```

Cuatro detalles a observar:

1. **Placeholders `$1, $2, $3`** — sintaxis de PostgreSQL, igual que en el Lab17.5 y Lab18. Son queries parametrizadas: el driver envía la query y los valores por separado, lo que nos protege de SQL injection.
2. **`RETURNING`** — característica propia de PostgreSQL. El INSERT/UPDATE/DELETE, además de hacer la operación, te regresa las columnas que pidas. Útil para confirmar la operación o para devolver el `id` recién creado sin un segundo SELECT.
3. **`rows[0] || null`** — devolver `null` cuando no hay fila es más limpio que un array vacío. El controlador hace `if (!nota)` en lugar de `if (rows.length === 0)`.
4. **Nada de `release()`** — el pool de `pg` libera automáticamente la conexión al terminar `pool.query()`. No hay forma de "olvidar" liberarla.

### 5.2 Controlador `controllers/notas.controller.js`

Crea el archivo `controllers/notas.controller.js`:

```javascript
const model = require('../models/notas.model.js');

exports.get_lista = async (req, res) => {
    try {
        const notas = await model.Nota.obtenerTodas();
        res.render('notas/lista', {
            notas: notas,
            permisos: req.session.permisos || [],
            username: req.session.username,
        });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener notas');
    }
};

exports.get_form_crear = (req, res) => {
    res.render('notas/crear', {
        permisos: req.session.permisos || [],
    });
};

exports.post_crear = async (req, res) => {
    try {
        const nota = new model.Nota(
            req.body.titulo,
            req.body.contenido,
            req.session.username
        );
        await nota.crear();
        res.redirect('/notas');
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al crear la nota');
    }
};

exports.get_form_editar = async (req, res) => {
    try {
        const nota = await model.Nota.obtenerPorId(req.params.id);
        if (!nota) return res.status(404).send('Nota no encontrada');
        res.render('notas/editar', {
            nota: nota,
            permisos: req.session.permisos || [],
        });
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al obtener la nota');
    }
};

exports.post_editar = async (req, res) => {
    try {
        await model.Nota.actualizar(
            req.params.id,
            req.body.titulo,
            req.body.contenido
        );
        res.redirect('/notas');
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al editar la nota');
    }
};

exports.post_eliminar = async (req, res) => {
    try {
        await model.Nota.eliminar(req.params.id);
        res.redirect('/notas');
    } catch (e) {
        console.error(e);
        res.status(500).send('Error al eliminar la nota');
    }
};
```

### 5.3 Rutas `routes/notas.routes.js`

Crea el archivo `routes/notas.routes.js`:

```javascript
const express        = require('express');
const router         = express.Router();
const controller     = require('../controllers/notas.controller.js');
const isAuth         = require('../util/is-auth.js');
const hasPermission  = require('../util/has-permission.js');

// Ver lista de notas
router.get('/', isAuth, hasPermission('ver_notas'), controller.get_lista);

// Crear nueva nota (formulario + envío)
router.get('/crear',  isAuth, hasPermission('crear_nota'), controller.get_form_crear);
router.post('/crear', isAuth, hasPermission('crear_nota'), controller.post_crear);

// Editar nota existente
router.get('/:id/editar',  isAuth, hasPermission('editar_nota'), controller.get_form_editar);
router.post('/:id/editar', isAuth, hasPermission('editar_nota'), controller.post_editar);

// Eliminar nota
router.post('/:id/eliminar', isAuth, hasPermission('eliminar_nota'), controller.post_eliminar);

module.exports = router;
```

Observa el patrón: cada ruta lleva **dos middlewares** antes del controlador:

1. `isAuth`: verifica que el usuario esté logueado.
2. `hasPermission('...')`: verifica que tenga el permiso específico.

Si cualquiera de los dos falla, la petición se corta antes de llegar al controlador.

### 5.4 Registrar el router en `index.js`

Abre tu `index.js` y agrega junto a las otras rutas (donde ya tienes `app.use('/usuarios', usuarioRoutes)` y `app.use('/games', ...)`):

```javascript
const notasRoutes = require('./routes/notas.routes.js');
app.use('/notas', notasRoutes);
```

## Sección 6 — Vistas EJS y render condicional (10 min)

Crea la carpeta `views/notas/` y dentro tres archivos.

### `views/notas/lista.ejs`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Mis notas</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; }
        article { border: 1px solid #ddd; padding: 1rem; margin: 1rem 0; border-radius: 6px; }
        button { cursor: pointer; }
    </style>
</head>
<body>
    <h1>Notas (<%= username %>)</h1>

    <% if (permisos.includes('crear_nota')) { %>
        <p><a href="/notas/crear">+ Nueva nota</a></p>
    <% } %>

    <% if (notas.length === 0) { %>
        <p>No hay notas todavía.</p>
    <% } %>

    <% for (const nota of notas) { %>
        <article>
            <h2><%= nota.titulo %></h2>
            <p><%= nota.contenido %></p>
            <small>por <strong><%= nota.autor %></strong> — <%= nota.creada_en %></small>

            <div style="margin-top: 0.8rem;">
                <% if (permisos.includes('editar_nota')) { %>
                    <a href="/notas/<%= nota.id %>/editar">Editar</a>
                <% } %>

                <% if (permisos.includes('eliminar_nota')) { %>
                    <form action="/notas/<%= nota.id %>/eliminar" method="POST" style="display:inline">
                        <button type="submit">Eliminar</button>
                    </form>
                <% } %>
            </div>
        </article>
    <% } %>
</body>
</html>
```

### `views/notas/crear.ejs`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Nueva nota</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 480px; margin: 2rem auto; }
        label { display: block; margin-top: 0.8rem; }
        input, textarea { width: 100%; padding: 0.5rem; box-sizing: border-box; }
    </style>
</head>
<body>
    <h1>Nueva nota</h1>
    <form action="/notas/crear" method="POST">
        <label for="titulo">Título</label>
        <input id="titulo" name="titulo" type="text" required>

        <label for="contenido">Contenido</label>
        <textarea id="contenido" name="contenido" rows="6" required></textarea>

        <button type="submit">Guardar</button>
        <a href="/notas">Cancelar</a>
    </form>
</body>
</html>
```

### `views/notas/editar.ejs`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Editar nota</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 480px; margin: 2rem auto; }
        label { display: block; margin-top: 0.8rem; }
        input, textarea { width: 100%; padding: 0.5rem; box-sizing: border-box; }
    </style>
</head>
<body>
    <h1>Editar nota</h1>
    <form action="/notas/<%= nota.id %>/editar" method="POST">
        <label for="titulo">Título</label>
        <input id="titulo" name="titulo" type="text" value="<%= nota.titulo %>" required>

        <label for="contenido">Contenido</label>
        <textarea id="contenido" name="contenido" rows="6" required><%= nota.contenido %></textarea>

        <button type="submit">Guardar cambios</button>
        <a href="/notas">Cancelar</a>
    </form>
</body>
</html>
```

> **Defensa en profundidad.** Aunque ocultemos el botón "Editar" para los lectores, eso es solo una mejora de experiencia. La protección **real** vive en el middleware `hasPermission` del backend. Nunca confíes en lo que oculta el frontend: siempre valida en el servidor. Un atacante puede mandar el `POST /notas/1/editar` directamente con `curl` o Postman.

## Sección 7 — Pruebas con 3 usuarios (8 min)

Vamos a crear un usuario por cada rol y probar la matriz completa.

### Crear los usuarios de prueba

Si todavía no los registraste vía la web, regístralos uno por uno desde `http://localhost:3000/usuarios/registro`:

- `ana` con cualquier contraseña
- `beto` con cualquier contraseña
- `carla` con cualquier contraseña

### Asignar el rol a cada uno (vía SQL Editor de Supabase)

```sql
-- Limpiar asignaciones previas (por si reinstalas)
DELETE FROM usuario_rol WHERE username IN ('ana','beto','carla');

INSERT INTO usuario_rol (username, id_rol)
SELECT 'ana', id FROM roles WHERE nombre = 'lector'
ON CONFLICT (username, id_rol) DO NOTHING;

INSERT INTO usuario_rol (username, id_rol)
SELECT 'beto', id FROM roles WHERE nombre = 'editor'
ON CONFLICT (username, id_rol) DO NOTHING;

INSERT INTO usuario_rol (username, id_rol)
SELECT 'carla', id FROM roles WHERE nombre = 'administrador'
ON CONFLICT (username, id_rol) DO NOTHING;
```

### Matriz de pruebas esperadas

| Usuario | Rol | Ver lista | Crear | Editar | Eliminar |
|---|---|---|---|---|---|
| ana | lector | ✅ | ❌ | ❌ | ❌ |
| beto | editor | ✅ | ✅ | ✅ | ❌ |
| carla | administrador | ✅ | ✅ | ✅ | ✅ |

### Cómo probar

1. Inicia sesión como `ana`. Ve a `/notas`. Debe verse la lista pero **sin** los botones de crear/editar/eliminar.
2. Cierra sesión (reinicia el servidor o agrega una ruta de logout), entra como `beto`. Debes ver botón de "+ Nueva nota" y "Editar" en cada nota, pero **no** botón de eliminar.
3. Repite como `carla`. Debes ver todos los botones disponibles.

### Prueba de bypass (importante para entender por qué validamos en servidor)

Estando logueado como `ana` (lector), abre las herramientas del navegador y ejecuta:

```javascript
fetch('/notas/crear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'titulo=test&contenido=test'
}).then(r => console.log(r.status));
```

El servidor debe responder **403**. Si responde **200**, tu middleware `hasPermission` no está aplicado correctamente — revísalo.

## Sección 8 — Reflexión y cierre (2 min)

### Problema del *role explosion*

Imagina que tu sistema crece y aparecen casos como:

- "El editor puede editar **sus propias** notas, no las de otros."
- "Los empleados pueden ver notas **solo en horario laboral**."
- "Los gerentes pueden aprobar gastos **menores a $1000**, los directores cualquier monto."

RBAC puro no expresa bien estas reglas, porque dependen de **atributos** del usuario, del recurso o del contexto, no solo del rol.

### RBAC vs ABAC vs ReBAC en una tabla

| Modelo | Pregunta clave | Cuándo usarlo | Ejemplo en producción |
|---|---|---|---|
| **RBAC** | ¿Qué rol tiene? | Estructura organizacional estable, permisos por categoría de usuario. | La mayoría de sistemas empresariales: SAP, Salesforce, paneles administrativos. |
| **ABAC** | ¿Qué atributos tiene esta solicitud? | Reglas dinámicas que dependen de contexto (hora, ubicación, sensibilidad del recurso). | AWS IAM Conditions, Azure RBAC + ABAC, motores XACML. |
| **ReBAC** | ¿Qué relación hay entre el usuario y el recurso? | Apps con muchas relaciones de propiedad y compartición. | Google Drive (Google Zanzibar), GitHub, Notion, SpiceDB. |

**La realidad**: los sistemas modernos usan los tres en capas. RBAC como base, ABAC para reglas contextuales, ReBAC para relaciones de propiedad. No es "uno u otro": es **uno encima de otro**.

### ¿Y entonces RBAC está deprecado?

**No.** RBAC sigue siendo el estándar requerido por:

- **HIPAA** (información médica en EE.UU.)
- **GDPR** (datos personales en la UE)
- **PCI DSS** (datos de tarjetas)
- **SOC 2** (auditorías de software empresarial)
- **NIST INCITS 359** (estándar formal desde 2004)

ABAC se introdujo en **NIST SP 800-162 (2014)** explícitamente como **guía complementaria**, no como reemplazo. En enero de 2026 se aprobó el estándar **OpenID AuthZEN 1.0**, que define un protocolo común para que motores RBAC, ABAC y ReBAC interoperen. La industria está consolidando la idea de **convivencia**, no de sustitución.

### Bonus Supabase: RLS como complemento (no reemplazo) de RBAC

En el Lab17BDSupabase viste **Row Level Security (RLS)**. Vale la pena marcar la diferencia:

- **RBAC** vive en tu **aplicación** (middleware Express). Decide *si* la petición puede ejecutarse.
- **RLS** vive en la **base de datos** (políticas Postgres). Decide *qué filas* puede ver/modificar la sesión actual de Postgres, sin importar lo que diga la app.

Lo robusto es usar ambos: tu middleware bloquea peticiones sin permiso, y RLS te protege en caso de un bug en el middleware o de un acceso directo a la BD desde otra app. Cuando aprendas Supabase Auth (con JWT) podrás conectar el `auth.uid()` de Supabase a tus políticas RLS y tener un sistema de defensa en profundidad real.

### Ejercicio retador (opcional, para casa)

Agrega **una sola condición ABAC** al sistema: que un editor solo pueda editar **sus propias** notas (no las de otros editores).

Pista: en el controlador `post_editar`, antes de hacer el `UPDATE`, compara `req.session.username` con `nota.autor`. Si son distintos y el usuario no es administrador, devuelve 403. Esto **no** es RBAC puro: estás usando un atributo del recurso (su autor) y un atributo del usuario (su username) para decidir. Bienvenido al modelo híbrido.

## Referencias

- [NIST SP 800-162 — Guide to Attribute Based Access Control (ABAC) Definition and Considerations](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)
- [NIST SP 800-178 — A Comparison of Attribute Based Access Control (ABAC) Standards](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-178.pdf)
- [NIST INCITS 359 — Role-Based Access Control](https://csrc.nist.gov/projects/role-based-access-control)
- [OpenID AuthZEN 1.0 — Authorization API Specification (2026)](https://openid.net/wg/authzen/)
- [Okta — RBAC vs ABAC: Definitions & When to Use](https://www.okta.com/identity-101/role-based-access-control-vs-attribute-based-access-control/)
- [Oso — RBAC vs ABAC vs ReBAC: What is the best access policy paradigm?](https://www.osohq.com/learn/rbac-vs-abac-vs-rebac-what-is-the-best-access-policy-paradigm)
- [Supabase — Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
