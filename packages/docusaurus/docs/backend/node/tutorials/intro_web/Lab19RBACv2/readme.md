---
sidebar_position: 19
---
# RBAC paso a paso (versión actualizada)

> **Duración estimada:** 1 hora 45 minutos.
> **Prerrequisitos:** Lab12 (EJS), Lab13 (MVC), Lab14 (Sesiones), Lab17 (BD), Lab18 (Autenticación). Debes tener tu proyecto del **Lab18 funcionando** antes de empezar.

## ¿Qué vamos a construir hoy?

En esta práctica vamos a extender el proyecto del Lab18 para agregarle **control de acceso basado en roles (RBAC)**. Al terminar, tu sistema podrá:

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

## Sección 1 — Verifica tu Lab18 (5 min)

Antes de empezar, asegúrate de que tu proyecto del Lab18 corre correctamente:

```
cd tu-proyecto-lab18
npm start
```

Abre el navegador en `http://localhost:3000/usuarios/registro`, registra un usuario y haz login. Si todo funciona, listo: vamos a extender ese mismo proyecto.

> **Importante.** No vas a descargar ningún `.zip`. El código base es el que tú mismo construiste en el Lab18. Si te falta algún archivo, regresa al Lab18 antes de continuar.

Tu estructura debería verse así:

```
tu-proyecto-lab18/
├── controllers/
│   └── usuarios.controller.js
├── models/
│   └── usuarios.model.js
├── views/
│   └── usuarios/
│       ├── registro.ejs
│       ├── logged.ejs
│       └── css.ejs
├── routes/
│   └── usuarios.routes.js
├── utils/
│   ├── database.js
│   └── is-auth.js
├── public/
├── index.js
└── package.json
```

## Sección 2 — Diseñar el esquema de la base de datos (20 min)

Vamos a agregar **5 tablas nuevas** a la base de datos `users_test` que ya tenemos del Lab18. La tabla `users` que ya existe NO se modifica.

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

Conéctate a tu MariaDB y ejecuta:

```
USE users_test;

CREATE TABLE IF NOT EXISTS roles (
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permisos (
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    clave VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuario_rol (
    username VARCHAR(100) NOT NULL,
    id_rol INT NOT NULL,
    PRIMARY KEY (username, id_rol),
    FOREIGN KEY (username) REFERENCES users(username),
    FOREIGN KEY (id_rol) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS rol_permiso (
    id_rol INT NOT NULL,
    id_permiso INT NOT NULL,
    PRIMARY KEY (id_rol, id_permiso),
    FOREIGN KEY (id_rol) REFERENCES roles(id),
    FOREIGN KEY (id_permiso) REFERENCES permisos(id)
);

CREATE TABLE IF NOT EXISTS notas (
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(200) NOT NULL,
    contenido TEXT NOT NULL,
    autor VARCHAR(100) NOT NULL,
    creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (autor) REFERENCES users(username)
);
```

> **Nota.** La tabla `users` del Lab18 debe tener `username` como llave única o primaria para que las llaves foráneas funcionen. Si tu Lab18 no la tiene así, agrégala con `ALTER TABLE users ADD UNIQUE (username);` antes de ejecutar el script de arriba.

### Script SQL — datos semilla

Insertamos los 3 roles y 4 permisos iniciales:

```
INSERT INTO roles (nombre) VALUES
    ('lector'),
    ('editor'),
    ('administrador');

INSERT INTO permisos (clave) VALUES
    ('ver_notas'),
    ('crear_nota'),
    ('editar_nota'),
    ('eliminar_nota');
```

### Matriz de asignación rol → permiso

Esta es la política que vamos a programar:

| Rol | ver_notas | crear_nota | editar_nota | eliminar_nota |
|---|---|---|---|---|
| lector | ✅ | ❌ | ❌ | ❌ |
| editor | ✅ | ✅ | ✅ | ❌ |
| administrador | ✅ | ✅ | ✅ | ✅ |

Tradúcela a SQL:

```
-- lector: solo ver
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.nombre = 'lector' AND p.clave = 'ver_notas';

-- editor: ver, crear, editar
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.nombre = 'editor' AND p.clave IN ('ver_notas','crear_nota','editar_nota');

-- administrador: todo
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.nombre = 'administrador';
```

### Consulta de validación

Antes de tocar código, verifica que la consulta clave funciona en tu cliente de MySQL/MariaDB. Esta consulta es la que pediremos desde Node:

```
SELECT p.clave
FROM users u
JOIN usuario_rol ur ON ur.username = u.username
JOIN roles r        ON r.id = ur.id_rol
JOIN rol_permiso rp ON rp.id_rol = r.id
JOIN permisos p     ON p.id = rp.id_permiso
WHERE u.username = 'tu_usuario_de_prueba';
```

Como aún no asignaste roles a tus usuarios, asígnale el rol de administrador a uno de los usuarios que registraste en el Lab18:

```
INSERT INTO usuario_rol (username, id_rol)
SELECT 'tu_usuario', r.id FROM roles r WHERE r.nombre = 'administrador';
```

Vuelve a correr la consulta. Debe regresarte 4 filas con los 4 permisos. Si funciona, la base ya está lista.

## Sección 3 — Extender el modelo de Usuario (15 min)

Vamos a agregar un método `getPermisos` a la clase `User` del Lab18 para traer los permisos desde la base de datos.

Abre `models/usuarios.model.js` y agrega este método **dentro de la clase `User`**, junto a `save()` y `findUser()`:

```
// Devuelve el array de permisos (strings) del usuario dado
static async getPermisos(username) {
    try {
        const connection = await db();
        const filas = await connection.execute(
            `SELECT p.clave
             FROM users u
             JOIN usuario_rol ur ON ur.username = u.username
             JOIN roles r        ON r.id = ur.id_rol
             JOIN rol_permiso rp ON rp.id_rol = r.id
             JOIN permisos p     ON p.id = rp.id_permiso
             WHERE u.username = ?`,
            [username]
        );
        await connection.release();
        // Convertimos el resultado [{clave:'ver_notas'}, {clave:'crear_nota'}] a ['ver_notas','crear_nota']
        return filas.map(f => f.clave);
    } catch (error) {
        throw error;
    }
}
```

> **Por qué devolvemos un array de strings y no objetos.** En el Lab19 anterior, los permisos venían como `[{permiso:'ver_clan'}, {permiso:'crear_tropa'}]`, lo que obligaba a iterar y comparar dentro de cada vista. Devolver `['ver_notas','crear_nota']` permite usar `permisos.includes('ver_notas')`, que es más limpio, más rápido y más fácil de leer.

### Modificar `do_login` para guardar los permisos en sesión

Abre `controllers/usuarios.controller.js` y modifica `do_login`. Justo después de validar la contraseña con `bcrypt.compare`, agrega la carga de permisos:

```
module.exports.do_login = async (req, res) => {
    try {
        const usuarios = await model.User.findUser(req.body.username);
        if (usuarios.length < 1) {
            res.render("usuarios/registro", { registro: false });
            return;
        }

        const usuario = usuarios[0];
        const doMatch = await bcrypt.compare(req.body.password, usuario.password);
        if (!doMatch) {
            res.render("usuarios/registro", { registro: false });
            return;
        }

        // ──── NUEVO: cargar permisos del usuario ────
        const permisos = await model.User.getPermisos(usuario.username);

        req.session.username   = usuario.username;
        req.session.isLoggedIn = true;
        req.session.permisos   = permisos; // array de strings
        console.log('Permisos del usuario:', permisos);

        res.render('usuarios/logged', {
            user: usuario,
            permisos: permisos,
        });
    } catch (error) {
        res.render("usuarios/registro", { registro: false });
    }
};
```

### Hito 1 — Verificar que los permisos se cargan

Reinicia el servidor, haz login con tu usuario administrador y revisa la consola. Deberías ver algo como:

```
Permisos del usuario: [ 'ver_notas', 'crear_nota', 'editar_nota', 'eliminar_nota' ]
```

Si funciona, ya tenemos la mitad de RBAC. Lo siguiente es proteger las rutas.

## Sección 4 — Middleware genérico `has-permission` (10 min)

En el Lab19 anterior creabas **un archivo de middleware por permiso** (`can-create.js`, `can-view.js`, etc.). Esto no escala: si tu sistema crece a 20 permisos, terminarías con 20 archivos casi idénticos.

Vamos a hacerlo mejor: **un solo middleware parametrizable**.

Crea el archivo `utils/has-permission.js`:

```
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

> **¿Qué patrón es éste?** Es una *closure*: una función que devuelve otra función. La externa recibe el parámetro de configuración (qué permiso exigir) y la interna es el middleware real que Express ejecuta. Es el mismo patrón que usa `express.static('public')`: tú le pasas un argumento y te devuelve el middleware listo.

Más adelante lo usarás así:

```
router.post('/notas/crear', isAuth, hasPermission('crear_nota'), controller.post_crear);
//                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                  esto es un middleware Express normal
```

## Sección 5 — Dominio de notas: modelo, controlador y rutas (25 min)

### 5.1 Modelo `models/notas.model.js`

Crea el archivo `models/notas.model.js`:

```
const db = require('../utils/database.js');

exports.Nota = class {
    constructor(titulo, contenido, autor) {
        this.titulo    = titulo;
        this.contenido = contenido;
        this.autor     = autor;
    }

    async crear() {
        const connection = await db();
        try {
            const result = await connection.execute(
                'INSERT INTO notas (titulo, contenido, autor) VALUES (?, ?, ?)',
                [this.titulo, this.contenido, this.autor]
            );
            return result;
        } finally {
            await connection.release();
        }
    }

    static async obtenerTodas() {
        const connection = await db();
        try {
            return await connection.execute(
                'SELECT id, titulo, contenido, autor, creada_en FROM notas ORDER BY creada_en DESC'
            );
        } finally {
            await connection.release();
        }
    }

    static async obtenerPorId(id) {
        const connection = await db();
        try {
            const filas = await connection.execute(
                'SELECT id, titulo, contenido, autor FROM notas WHERE id = ?',
                [id]
            );
            return filas[0] || null;
        } finally {
            await connection.release();
        }
    }

    static async actualizar(id, titulo, contenido) {
        const connection = await db();
        try {
            return await connection.execute(
                'UPDATE notas SET titulo = ?, contenido = ? WHERE id = ?',
                [titulo, contenido, id]
            );
        } finally {
            await connection.release();
        }
    }

    static async eliminar(id) {
        const connection = await db();
        try {
            return await connection.execute('DELETE FROM notas WHERE id = ?', [id]);
        } finally {
            await connection.release();
        }
    }
};
```

> **Nota sobre el patrón `try/finally`.** En el Lab18 usábamos `try/catch` y liberábamos la conexión solo en el camino feliz. El problema: si la query lanza error, la conexión queda colgada. Usar `try/finally` garantiza que la conexión siempre se libere, lo cual previene el agotamiento del pool.

### 5.2 Controlador `controllers/notas.controller.js`

Crea el archivo `controllers/notas.controller.js`:

```
const model = require('../models/notas.model.js');

module.exports.get_lista = async (req, res) => {
    try {
        const notas = await model.Nota.obtenerTodas();
        res.render('notas/lista', {
            notas: notas,
            permisos: req.session.permisos || [],
            username: req.session.username,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener notas');
    }
};

module.exports.get_form_crear = (req, res) => {
    res.render('notas/crear', {
        permisos: req.session.permisos || [],
    });
};

module.exports.post_crear = async (req, res) => {
    try {
        const nota = new model.Nota(
            req.body.titulo,
            req.body.contenido,
            req.session.username
        );
        await nota.crear();
        res.redirect('/notas');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al crear la nota');
    }
};

module.exports.get_form_editar = async (req, res) => {
    try {
        const nota = await model.Nota.obtenerPorId(req.params.id);
        if (!nota) return res.status(404).send('Nota no encontrada');
        res.render('notas/editar', {
            nota: nota,
            permisos: req.session.permisos || [],
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener la nota');
    }
};

module.exports.post_editar = async (req, res) => {
    try {
        await model.Nota.actualizar(
            req.params.id,
            req.body.titulo,
            req.body.contenido
        );
        res.redirect('/notas');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al editar la nota');
    }
};

module.exports.post_eliminar = async (req, res) => {
    try {
        await model.Nota.eliminar(req.params.id);
        res.redirect('/notas');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al eliminar la nota');
    }
};
```

### 5.3 Rutas `routes/notas.routes.js`

Crea el archivo `routes/notas.routes.js`:

```
const express        = require('express');
const router         = express.Router();
const controller     = require('../controllers/notas.controller.js');
const isAuth         = require('../utils/is-auth.js');
const hasPermission  = require('../utils/has-permission.js');

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

Abre tu `index.js` y agrega:

```
const notasRoutes = require('./routes/notas.routes.js');
// ... después del resto de los app.use ...
app.use('/notas', notasRoutes);
```

## Sección 6 — Vistas EJS y render condicional (10 min)

Crea la carpeta `views/notas/` y dentro tres archivos.

### `views/notas/lista.ejs`

```
<html>
<head>
    <%- include('./../usuarios/css.ejs') %>
    <title>Mis notas</title>
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
            <small>por <%= nota.autor %> — <%= nota.creada_en %></small>

            <% if (permisos.includes('editar_nota')) { %>
                <a href="/notas/<%= nota.id %>/editar">Editar</a>
            <% } %>

            <% if (permisos.includes('eliminar_nota')) { %>
                <form action="/notas/<%= nota.id %>/eliminar" method="POST" style="display:inline">
                    <button type="submit">Eliminar</button>
                </form>
            <% } %>
        </article>
        <hr>
    <% } %>
</body>
</html>
```

### `views/notas/crear.ejs`

```
<html>
<head>
    <%- include('./../usuarios/css.ejs') %>
    <title>Nueva nota</title>
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

```
<html>
<head>
    <%- include('./../usuarios/css.ejs') %>
    <title>Editar nota</title>
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

### Asignar el rol a cada uno (vía SQL)

```
-- Limpiar asignaciones previas (por si reinstalas)
DELETE FROM usuario_rol WHERE username IN ('ana','beto','carla');

INSERT INTO usuario_rol (username, id_rol)
SELECT 'ana', id FROM roles WHERE nombre = 'lector';

INSERT INTO usuario_rol (username, id_rol)
SELECT 'beto', id FROM roles WHERE nombre = 'editor';

INSERT INTO usuario_rol (username, id_rol)
SELECT 'carla', id FROM roles WHERE nombre = 'administrador';
```

### Matriz de pruebas esperadas

| Usuario | Rol | Ver lista | Crear | Editar | Eliminar |
|---|---|---|---|---|---|
| ana | lector | ✅ | ❌ | ❌ | ❌ |
| beto | editor | ✅ | ✅ | ✅ | ❌ |
| carla | administrador | ✅ | ✅ | ✅ | ✅ |

### Cómo probar

1. Inicia sesión como `ana`. Ve a `/notas`. Debe verse la lista pero **sin** los botones de crear/editar/eliminar.
2. Cierra sesión, entra como `beto`. Debes ver botón de "+ Nueva nota" y "Editar" en cada nota, pero **no** botón de eliminar.
3. Cierra sesión, entra como `carla`. Debes ver todos los botones disponibles.

### Prueba de bypass (importante para entender por qué validamos en servidor)

Estando logueado como `ana` (lector), abre las herramientas del navegador y ejecuta:

```
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
