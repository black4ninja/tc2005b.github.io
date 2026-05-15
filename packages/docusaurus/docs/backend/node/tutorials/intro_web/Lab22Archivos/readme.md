---
sidebar_position: 22
---
# Archivos

## Antes de empezar: migrando de npm a pnpm

:::warning Contexto de seguridad
Durante septiembre de 2025 ocurrió uno de los ataques de **cadena de suministro (supply chain)** más grandes en la historia de npm: se comprometieron las cuentas de varios mantenedores populares y se publicaron versiones maliciosas de paquetes con millones de descargas semanales. El código inyectado robaba credenciales y variables de entorno durante la instalación. Esto nos recuerda que **instalar dependencias no es una operación inocente**: cada `npm install` ejecuta código de terceros en tu máquina.
:::

Como medida de mitigación y buena práctica, en este laboratorio (y de aquí en adelante) vamos a usar **pnpm** en lugar de **npm**.

### ¿Qué es pnpm?

`pnpm` (*performant npm*) es un gestor de paquetes para Node.js, alternativo a `npm`. Usa exactamente el mismo `package.json` y el mismo registro de paquetes (npmjs.com), así que **no cambia tus dependencias ni tu código**: solo cambia *cómo* se instalan y se guardan.

### ¿En qué se diferencia de npm?

| Aspecto | npm | pnpm |
|---|---|---|
| Almacenamiento | Copia cada dependencia dentro de `node_modules` de cada proyecto | Guarda **una sola copia** de cada versión en un almacén global y la enlaza (hard links) a cada proyecto |
| Espacio en disco | Se duplica en cada proyecto | Se comparte; ahorra mucho espacio |
| Velocidad | Más lento al reinstalar | Mucho más rápido (reusa el almacén global) |
| `node_modules` | Plano: cualquier paquete puede importar dependencias que no declaró | Estricto: solo puedes importar lo que declaraste en `package.json` |
| Seguridad | Scripts de instalación se ejecutan por defecto | A partir de pnpm 10 los *lifecycle scripts* de dependencias **no se ejecutan automáticamente**; debes aprobarlos explícitamente |

### ¿Por qué se recomienda la migración?

1. **Superficie de ataque menor:** pnpm no ejecuta automáticamente los scripts `postinstall`/`preinstall` de las dependencias. Buena parte del malware de los ataques recientes se activaba precisamente en esos scripts.
2. **`node_modules` estricto:** evita el "dependency hell" donde tu código funciona por accidente al usar un paquete que nunca instalaste explícitamente.
3. **Rapidez y ahorro de disco:** al compartir un almacén global, instalar es más rápido y ocupa mucho menos espacio, especialmente con muchos proyectos.
4. **Compatibilidad total:** usa el mismo `package.json`; migrar es prácticamente transparente.

### Cómo instalar y usar pnpm

```bash
# Instalación (una sola vez, de forma global)
npm install -g pnpm

# Verifica la versión
pnpm --version
```

La equivalencia de comandos es directa:

| npm | pnpm |
|---|---|
| `npm init -y` | `pnpm init` |
| `npm install` | `pnpm install` |
| `npm i express` | `pnpm add express` |
| `npm i -D nodemon` | `pnpm add -D nodemon` |
| `npm run dev` | `pnpm dev` |

:::tip
A partir de aquí, todos los comandos de esta práctica usarán `pnpm`. Si en otro tutorial ves los comandos con `npm`, usa la tabla anterior para encontrar su equivalente.
:::

## Uso de multer

Para este laboratorio vamos a simplificar un poco nuestra arquitectura y solo trabajaremos con rutas y controladores, pues vamos a crear un archivo público y no haremos conexión con ninguna fuente de información.

Empecemos configurando un proyecto desde 0, a estas alturas ya debes de saber como:

```bash
pnpm init
```

A diferencia de `npm init -y`, el comando `pnpm init` genera el `package.json` directamente con los valores por defecto, sin pedirte los parámetros uno por uno, así que la ejecución del init es más rápida.

Introduce los valores generales que necesites del proyecto para el archivo principal usaremos **index.js**.

![lab_22](imgs/001.png)


![lab_22](imgs/002.png)

Ahora vamos a instalar las librerías básicas que necesitamos para este proyecto.

```bash
pnpm add express
pnpm add multer
```
Al momento hemos usado la librería de express que no es nueva para nosotros, la nueva librería que usaremos es la de **multer**.

Multer es una librería que nos permite manejar archivos dentro de nuestros formularios para poder subirlos al servidor, pero quizás te estés preguntando. ¿Por qué necesitamos hacer todo esto si tengo el input file disponible en mi formulario?. Si bien esto es correcto, al momento de subir al servidor veremos que esto no funciona, y de echo cuando analizamos la razón tiene todo un sentido de lógica.

Cuando manejamos un formulario simple por lo general estamos utilizando texto, por más complejo o grande que este sea siempre el texto será en cuestión de tamaño pequeño comparado con un archivo que tan solo en su base puede llegar a pesar más que el texto de un formulario.

Piensa en diferentes tipos de archivos, imágenes, videos, binarios, zips, entre otros si subiéramos de golpe esto al servidor tardaría mucho y se bloquearía nuestra interfaz como sucede en algunos sitios.

La magia de todo esto ocurre cuando "partimos" en pedazos nuestros archivos y los subimos poco a poco al servidor, aquí es donde entra multer que acepta cada uno de estos pedazos, reconstruye nuestro archivo y lo guarda en nuestro servidor.

Esta es la única manera a nivel teórica en como podemos subir archivos, librerías quizás existan otras pero dentro del mundo de nodeJs es la más común.

Vamos a cargar la base de nuestro **index.js** con lo siguiente:

```js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;
const log = console.log;

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
    // server starts listening for any attempts from a client to connect at port: {port}
    console.log(`Now listening on port ${port}`);
});
```

Un cambio que estamos haciendo es usar otro puerto para la ejecución del servidor en 3000.

> **Nota (macOS):** En macOS Monterey y posteriores el puerto **5000** está ocupado por defecto por el **Receptor de AirPlay** (verás un `403 Forbidden` con `Server: AirTunes/...`). Por eso usamos **3000**. Si prefieres liberar el 5000, puedes desactivarlo en *Ajustes del Sistema → General → AirDrop y Handoff → Receptor de AirPlay*.

> **Nota (Express ≥ 4.16):** Antes era común usar `body-parser` como dependencia aparte. Hoy ya no es necesario: `express.urlencoded()` viene integrado en Express. Si en otro tutorial ves `npm i body-parser` y `bodyParser.urlencoded(...)`, equivale a lo que hacemos arriba.

Ya que estamos sirviendo la carpeta pública, vamos a crearla dentro del proyecto y dentro de ella vamos a crear un archivo **index.html**, con el siguiente contenido.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hello World Simple App</title>
</head>
<body>
  <div class="container">
    <h1>Multipart File Upload</h1>
    <form action="/upload_file" method="POST" enctype="multipart/form-data" id="form">
      <div class="input-group">
        <label for="files">Select files</label>
        <input id="file" name="file" type="file" />
      </div>
      <button class="submit-btn" type="submit">Upload</button>
    </form>
  </div>
</body>
</html>
```

Algunos puntos importantes a tomar en cuenta desde aquí son los siguientes:

Definir la ruta del form en este caso a

```html
action="/upload_file"
method="POST"
enctype="multipart/form-data"
```

En el action vamos a definir la ruta que vamos a utilizar para subir nuestro archivo, en este caso será el  **/upload_file**.

También vamos a definir el action del envío de formulario como **POST**.

Por último necesitamos definir el formulario como multi-parte esto para el envío de los archivos.

El **multipart/form-data**, es la forma que te comenté antes donde le decimos a nuestro formulario que parta en pedazos la petición para subir archivos, esto rompe en varios paquetes TCP/IP y los manda al servidor para hacer su trabajo, es entonces donde multer entra a reconstruir cada paquete y recuperar el archivo.

Si ejecutamos el servidor y accedemos a la ruta de index.html, nos deberá aparecer lo siguiente:

![lab_22](imgs/003.png)

No es la mejor interfaz para nuestro proyecto pero funcionalmente servirá.

## Subiendo archivos públicos

Ya que tenemos nuestro form armado y corriendo vamos además de una carpeta **public**, aquí vamos a guardar los archivos que subamos en nuestro form.

![lab_22](imgs/004.png)

Como mencioné, no nos enfocaremos en una arquitectura completa para este laboratorio, pero al menos haremos el uso de rutas y controladores por facilidad. Para ello debemos crear a la altura de **index.js** otro archivo al que llamaremos **index.controller.js**,
 este archivo deberá contener de momento lo siguiente:

```js
const log = console.log

module.exports.upload_file = async (req, res) => {
    log("Cargando el archivo")
    res.status(200).json({code: 200, msg:"Ok"})
}
```

Por último en nuestro archivo **index.js** antes de la declaración del servidor vamos a agregar la ruta para subir la imagen de la siguiente forma.

```js
const controller = require("./index.controller.js")
app.post('/upload_file', controller.upload_file);
```

Aquí recuerda que estamos definiendo el **POST** del formulario de **index.html** y también la ruta del action **/upload_file**.

Si cargamos un archivo y damos clic en **Upload** deberemos ver algo como lo siguiente.

![lab_22](imgs/005.png)

Ya tenemos la ruta preparada, ahora vamos con lo que necesitamos para el laboratorio.

Ahora bien, vamos a cargar el archivo que agregamos a nuestro proyecto, como ya mencionamos, usaremos multer para tomar el **multipart** de nuestro formulario y recibir el archivo.

Para ello necesitamos configurar en donde se guardará el archivo y con que nombre. Esto lo haremos de forma muy lineal con la siguiente configuración, dentro de nuestro archivo **index.controller.js** arriba de la función **upload_file**.

```js
const multer = require('multer'); // Using Promise API

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        console.log("File Destination:", './public/'); // Log the destination path
        callback(null, './public/');
    },
    filename: function (req, file, callback) {
        console.log("Uploaded File:", req.body); // Log received form data
        return callback(null, file.originalname);
    }
});

const upload = multer({ storage: storage }).array('file', 1);
```

La siguiente definición carga la librería de **multer** y especifica que el destino del archivo sea la carpeta pública que definimos hace unos pasos. Y para el archivo no haremos ningún cambio significativo, pasaremos el nombre que recibimos desde el inicio.

Ahora dentro de nuestra función de **/upload_file** vamos a sustituir el

```js
res.status(200).json({code: 200, msg:"Ok"})
```

Por lo siguiente, de modo que el handler completo dentro de **`index.controller.js`** quede así:

```js
module.exports.upload_file = async (req, res) => {
    upload(req, res, function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ code: 500, msg: "Error uploading file" });
        }

        console.log("Upload Successful:", req.files); // Log uploaded files
        res.status(200).json({ code: 200, msg: "Ok" });
    });
}
```

La línea más importante de todo este código es la siguiente:

```js
const upload = multer({ storage: storage }).array('file', 1);
```

Aquí no solo llamamos a nuestra configuración de **multer**, sino que vamos a recibir un arreglo de archivos que vienen de el **index.html** y el string **'file'** es el id que otorgamos en el formulario al **input** en su propiedad de **name** recuerda siempre esto ya que el primer error que se comete al estar aprendiendo en los formularios es definir estos ids.

Para nuestro caso solo vamos a subir un archivo pero **multer** nos permite agregar múltiples archivos desde la propiedad del file a partir de nuestro form. Te dejo esta configuración en caso de que en otros proyectos quieras trabajar con múltiples archivos, funciona prácticamente igual.

```js
var pathDest = req.files[0].destination.slice(1)
```

En esta línea puedes ver como funciona el arreglo puesto que al llamar **req.files[0]** lo que estamos haciendo es llamar al archivo según hayamos subido y aunque sea 1 sabemos que el primero será el de la posición 0.

Nuevamente vamos a ejecutar nuestro servidor y si volvemos a probar el resultado será el mismo pero dentro de nuestro proyecto pasará lo siguiente.

![lab_22](imgs/006.png)

Como puedes observar el archivo que hayamos puesto se ha subido correctamente a nuestra carpeta pública.

Como no hemos puesto ninguna limitación en cuestión de archivos realmente podemos subir lo que sea pero para efectos prácticos y que te quede más claro te recomiendo comiences con una imagen sea **.jpg** o **.png**.

## Consulta de archivos públicos

El siguiente paso quizás sea un poco obvio pero es el punto de partida para lograr identificar las variaciones con las que estaremos trabajando en el laboratorio.

De momento tenemos cargada la **imagen_prueba.png** o en tu caso el archivo que hayas subido.

Teniendo activo nuestro servidor ¿Cómo podemos ver este archivo?. Siempre es importante que tengas visibilidad en como acceder un archivo particular.

Para esto debemos considerar donde se encuentra guardado nuestro archivo y para ello olvida las rutas absolutas del sistema en donde este alojado el archivo puesto que estas rutas no son con las que trabajamos en el proyecto.

Las rutas que utilizamos son las rutas relativas y estas se construyen a través de las URL que vamos generando. Por default la carpeta **public** expone los archivos dentro de esta carpeta y por lo general son imágenes genéricas, templates de html, css, archivos js entre otros.

Si quiero acceder a un archivo dentro de esta carpeta basta con que agregue **\{\{dominio\}\}/\{\{ruta_desde_public\}\}**

```text
http://localhost:3000/imagen_prueba.png
```

En mi caso el resultado en el navegador es el siguiente:

![lab_22](imgs/007.png)

## Consulta de archivos privados

En el paso anterior manejamos los archivos estáticos, pero cuando trabajamos con subida de archivos lo ideal es que estos archivos no queden expuestos, y regresamos a lo mismo, todo en la carpeta **public** queda expuesto.

Otro riesgo que corremos al colocar todo en **public** es que si trabajamos con un repositorio este comenzará a crecer y podemos enfrentarnos a alcanzar el límite de tamaño del repositorio que normalmente va al rededor de los 2GB.

Lo ideal en estos casos es que vayamos creando una carpeta fuera del repositorio y desde ahí manejarlo.

Para el laboratorio simplemente lo haremos fuera de la carpeta **public** pero lo haremos dentro del proyecto.

**Nota: Recuerda tener siempre en cuenta el uso de los archivos en general, cada caso es diferente y debes estar preparado para el escenario correspondiente.**

Para comenzar vamos a expandir nuestro **index.html** con un nuevo formulario debajo del que ya tenemos.

```html
<div class="container">
    <h1>Multipart File Private Upload</h1>
    <form action="/upload_file_private" method="POST" enctype="multipart/form-data" id="form">
      <div class="input-group">
        <label for="files">Select files</label>
        <input id="file" name="file" type="file" />
      </div>
      <button class="submit-btn" type="submit">Upload</button>
    </form>
  </div>
```

Ahora vamos a añadir una nueva ruta de **POST** en el **index.js**

```js
app.post('/upload_file_private', controller.upload_file_private);
```

Y dentro de nuestro archivo **index.controller.js** definiremos la función:

```js
module.exports.upload_file_private = async (req, res) => {
    log("Cargando el archivo")
    res.status(200).json({code: 200, msg:"Ok"})
}
```

Nuevamente ejecutamos el servidor y debemos ver algo como lo siguiente con el nuevo formulario.

![lab_22](imgs/008.png)

![lab_22](imgs/009.png)

Ahora vamos a crear una nueva carpeta en el proyecto llamada **private** a la altura de **index.js**.

> **Importante:** Multer **no crea** la carpeta destino automáticamente. Si no existe, la subida fallará con `HTTP 500` y en consola verás `ENOENT: no such file or directory './private/...'`. Asegúrate de crear la carpeta **antes** de probar.

![lab_22](imgs/010.png)

Como alternativa más robusta (recomendada para evitar este error en cualquier máquina) puedes crear la carpeta desde el propio código al arrancar el servidor. Agrega esta línea en tu `index.js` justo después de `const fs = require('fs');`:

```js
fs.mkdirSync('./private', { recursive: true });
```

El siguiente paso será crear una nueva configuración de multer para subir nuestros nuevos archivos a esta carpeta.

```js
const storage2 = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './private/');
    },
    filename: function (req, file, callback) {
        return callback(null, file.originalname);
    }
});
const upload2 = multer({ storage: storage2 }).array('file', 1);
```

**Nota: Esta es una configuración adicional a la que ya tenemos, la anterior no la vayas a eliminar**

Por último sustituimos el

```js
res.status(200).json({code: 200, msg:"Ok"})
```

Por el código de subida de la información, dejando la función `upload_file_private` así:

```js
module.exports.upload_file_private = async (req, res) => {
    upload2(req, res, function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ code: 500, msg: "Error uploading file" });
        }

        console.log("Upload Successful:", req.files); // Log uploaded files
        res.status(200).json({ code: 200, msg: "Ok" });
    });
}
```

![lab_1](imgs/011.png)

Con el resultado anterior observamos que la misma imagen queda arriba dentro de nuestra carpeta privada. Pero para acceder a ella es donde tenemos que empezar a localizar lo que pasa en nuestra aplicación.

Con lo que vimos de la carpeta **public** podemos acceder a este archivo pero la incógnita que nos queda es si hacer este proceso de la carpeta **private** es lo que necesito para proteger mis archivos, ¿Cómo doy acceso a ellos cuando se necesiten?

Para esto es que no podemos dar acceso público, pero podemos dar un acceso a través de una URL.

Este es el proceso de control ya que al dar acceso mediante URL podemos agregar tanto procesamiento adicional al archivo en caso de ser necesario o en su defecto protegerlo con el sistema de autenticación que definamos para el **API**.

Esta ruta va dentro de **`index.js`**:

```js
app.get('/get_private_file/:file', controller.get_private_file);
```

Hasta ahora, solo habíamos utilizado 2 formas para obtener información de nuestro request:

```js
req.body  // POST
req.query // GET
```

Ahora añadiremos el **req.params** que nos permite agregar un parámetro sin importar el tipo de conexión a través de la url y separarlo por **/**, por tanto podemos recibir tantos parámetros como deseemos.

Dentro de nuestro **`index.controller.js`** debemos agregar la librería `path` al inicio del archivo (junto a los demás `require`):

```js
const path = require('path');
```

Y al final colocamos nuestra función para acceder al archivo privado:

```js
module.exports.get_private_file = async (req, res) => {
    // Saneamos el nombre para evitar path traversal (ver nota de seguridad abajo)
    const fileName = path.basename(req.params.file);
    const filePath = path.join(__dirname, './private', fileName);

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("sendFile error:", err.message);
            res.status(404).json({ code: 404, msg: "Archivo no encontrado" });
        }
    });
}
```

Con el uso del método de express **res.sendFile** podemos interpretar un archivo y cargarlo del lado del cliente. El callback opcional permite responder con un JSON limpio cuando el archivo no existe en lugar de dejar que Express devuelva un 404 plano.

> **Seguridad — path traversal:** Si pasas el `req.params.file` directo a `path.join`, un alumno (o atacante) puede pedir `/get_private_file/..%2F..%2Fetc%2Fpasswd` y leer archivos fuera de la carpeta `private/`. Por eso usamos **`path.basename()`**, que descarta cualquier prefijo de ruta y solo deja el nombre del archivo. Es una práctica mínima pero crítica al exponer descargas por nombre.

Este último paso es bastante sencillo en términos de solo realizar la canalización del archivo a la carpeta **private** pero tomando en cuenta que esto nos da control de acceso y de procesamiento en el proceso de consultar archivos que no están directamente abiertos al público nos permite hacer muchas cosas a largo plazo.

De esta manera podemos trabajar con archivos en nuestro servidor, utilizando multer y haciendo variaciones, un proyecto de manejo de archivos tiene varias consideraciones importantes y adicionales que puedes manejar, revisa esto para evitar caer en problemas según el tipo de arquitectura o servidores que estés utilizando.

<a href="/docs/node/tutorials/intro_web/Lab22Archivos/test-project.zip" download="lab22-archivos.zip">Ver ejemplo completo</a>