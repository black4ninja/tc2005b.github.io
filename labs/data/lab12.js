// Created by Denisse Maldonado
const LAB = {
  id: 'lab12',
  numero: 12,
  titulo: 'HTML din\u00e1mico',
  descripcion: 'En esta actividad instalaremos y exploraremos c\u00f3mo generar HTML din\u00e1mico desde el back-end.',
  modalidad: 'Individual',
  objetivos: [
    'Generar desde el back-end, interfaces din\u00e1micas HTML5 para el cliente por medio de un motor de <code>templates</code> y que incorporen <code>partials</code>.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>Recuerda que para generar una aplicaci\u00f3n es necesario inicializar el proyecto con <code>npm init</code>, e instalar <code>express</code> y <code>body-parser</code> con <code>npm install --save [nombre_paquete]</code>. Si es necesario, recuerda configurar el archivo <code>package.json</code> para incluir el script que quieres que se ejecute con <code>npm start</code>.</li>' +
      '<li>Sigue la demostraci\u00f3n del profesor en la sesi\u00f3n de clase.</li>' +
      '<li>Para devolver como respuesta un archivo html desde express, se requiere el m\u00f3dulo <code>path</code>, puedes incorporarlo con <code>const path = require(\'path\');</code> al inicio de tus archivos de c\u00f3digo. <br>' +
        'Por convenci\u00f3n, los archivos HTML se guardan en un directorio llamado <code>views</code>, en referencia a la capa de la vista de un estilo arquitect\u00f3nio MVC. Para devolver un archivo HTML, se realiza de la siguiente forma:' +
        '<p><pre><code>' +
'router.get(\'/una-ruta\', (request, response, next) => {\n' +
'    response.sendFile(path.join(__dirname, \'..\', \'views\', \'el-archivo.html\'));\n' +
'});' +
        '</code></pre></p>' +
        'La funci\u00f3n <code>join</code> sirve para armar la ruta, y la ventaja que tiene sobre hacerlo manualmente, es que considera el sistema operativo donde el c\u00f3digo resida para que no tengas problemas si est\u00e1s en MacOS, Linux o Windows.' +
        '<br>' +
        'La variable global <code>__dirname</code>, contiene el directorio del sistema de archivos donde se encuentra tu aplicaci\u00f3n, y el resto de los argumentos son cada uno de los directorios para llegar al archivo. Observa que despu\u00e9s de <code>__dirname</code>, el argumento es <code>\'..\'</code> debido a que si est\u00e1s en una carpeta de alguno de tus m\u00f3dulos, subir\u00e1s un nivel en los directorios para llegar al nivel ra\u00edz y de ah\u00ed viajar a la carpeta <code>views</code>, para finalmente llegar al archivo <code>el-archivo.html</code>.' +
      '</li>' +
      '<li>Por defecto, nuestro servidor no puede entregar un CSS como respuesta, entonces es necesario decirle que cuando un documento HTML requiere de un CSS, este archivo se mande de manera est\u00e1tica. Para ello debemos de configurar una carpeta de archivos est\u00e1ticos, por convenci\u00f3n la llamaremos <code>public</code>, y al folder donde pondremos los archivos css lo llamaremos <code>css</code>. Para poder incluirlos dentro de los HTML lo podemos hacer con el m\u00e9todo <code>static</code> de <code>express</code>:' +
        '<p><pre><code>' +
'app.use(express.static(path.join(__dirname, \'public\')));' +
        '</code></pre></p>' +
      '</li>' +
      '<li>Utilizando alguno de tus laboratorios anteriores (o si lo prefieres empieza de 0), elabora una aplicaci\u00f3n web con las siguientes caracter\u00edsticas:' +
        '<ul>' +
          '<li>La aplicaci\u00f3n debe poder responder al menos a 5 rutas diferentes, distribuidas en al menos 2 m\u00f3dulos, y mandar una respuesta HTTP 404 cuando la ruta no existe.</li>' +
          '<li>En alguna de las rutas, la aplicaci\u00f3n debe contener al menos 1 forma que debe enviar datos al servidor por POST. El servidor debe reaccionar ante este env\u00edo y guardar los datos en un archivo de texto dentro del mismo servidor.</li>' +
        '</ul>' +
      '</li>' +
      '<li>Vamos a utilizar <a target="_blank" href="https://ejs.co/">EJS</a> como motor de <em>templates</em> para generar html de manera din\u00e1mica. Este motor lo estaremos usando en los ejemplos, pero eres libre de utilizar alguno diferente en tus laboratorios y proyecto.</li>' +
      '<li>Para instalar EJS: <code>npm install --save ejs</code>.</li>' +
      '<li>Para configurar EJS en Express, debemos indicarle a Express que vamos a utilizar como motor para la capa de las vistas EJS, y en seguida indicar por medio de una variable de configuraci\u00f3n de Express, la carpeta donde estar\u00e1n almacenados los archivos html correspondientes a las vistas, por convenci\u00f3n, utilizaremos la carpeta <code>views</code>:' +
        '<pre><code>' +
'app.set(\'view engine\', \'ejs\');\n' +
'app.set(\'views\', \'views\');' +
        '</code></pre>' +
      '</li>' +
      '<li>Los archivos EJS (<code>.ejs</code>), son archivos que en su mayor\u00eda contienen c\u00f3digo HTML, pero que tambi\u00e9n permiten escribir c\u00f3digo JS, utilizando tags con el s\u00edmbolo <code>%</code> de la siguiente forma: <code>&lt;% c\u00f3digo de javascript %&gt;</code>. <br>' +
        'Para desplegar un <code>template</code> de EJS, lo hacemos con el m\u00e9todo <code>render</code>, y como argumento ponemos el nombre del archivo <code>.ejs</code> sin poner la extensi\u00f3n del archivo:' +
        '<pre><code>' +
'router.get(\'/una-ruta\', (request, response, next) => {\n' +
'    response.render(\'vista_ejs\');\n' +
'});' +
        '</code></pre>' +
        'Para escribir una variable en la vista, primero debemos de pasarle a la vista un objeto de javascript con los nombres y valores de las variables:' +
        '<pre><code>' +
'router.get(\'/una-ruta\', (request, response, next) => {\n' +
'    response.render(\'vista_ejs\', {variable: valor});\n' +
'});' +
        '</code></pre>' +
        'Y finalmente, para imprimir la variable en la vista utilizamos el operador <code>=</code>:' +
        '<pre><code>' +
'&lt;%= nombre_variable %&gt;' +
        '</code></pre>' +
      '</li>' +
      '<li>As\u00ed como imprimimos variables, tambi\u00e9n podemos poner c\u00f3digo de estructuras de control, por ejemplo:' +
        '<pre><code>' +
'&lt;% if (arreglo.length &gt; 0) { %&gt;\n' +
'    &lt;ul&gt;\n' +
'        &lt;% for (let elemento of arreglo) { %&gt;\n' +
'            &lt;li&gt;&lt;%= elemento.atributo %&gt;&lt;/li&gt;\n' +
'        &lt;% } %&gt;\n' +
'    &lt;/ul&gt;\n' +
'&lt;% } else { %&gt;\n' +
'    &lt;h1&gt;El arreglo est\u00e1 vac\u00edo&lt;/h1&gt;\n' +
'&lt;% } %&gt;' +
        '</code></pre>' +
      '</li>' +
      '<li>Refactoriza tu aplicaci\u00f3n para que mantenga la funcionalidad pero ahora trabaje con un motor de vistas.</li>' +
      '<li>Mejora tu aplicaci\u00f3n para que en lugar de guardar los datos en un archivo, ahora los despliegue en una de las p\u00e1ginas.</li>' +
      '<li>Como has podido experimentar, mantener las 5 p\u00e1ginas implica estar copiando y pegando pedazos de c\u00f3digo HTML, lo cual es un proceso propenso a errores. Los motores de vistas como EJS, permiten reutilizar c\u00f3digo sin la necesidad de estar copiando y pegando. Una estrategia para ello, es la utilizaci\u00f3n de <code>partials</code>, que son pedazos reutilizables de c\u00f3digo de una vista. Por convenci\u00f3n, dentro de la carpeta <code>views</code>, crearemos una carpeta <code>includes</code> en donde pondremos nuestros <code>partials</code>. <br>' +
        'Para incluir un partial en una vista:' +
        '<pre><code>' +
'&lt;%- include(\'includes/head.ejs\') %&gt;' +
        '</code></pre>' +
        'Observa el operador <code>-</code>. A diferencia del operador <code>=</code> que te protege de una inyecci\u00f3n de c\u00f3digo, el operador <code>-</code> no lo hace, pero esto es lo que permite que se inserte el c\u00f3digo HTML de nuestro <code>partial</code>.' +
      '</li>' +
      '<li>Refactoriza tu aplicaci\u00f3n para hacer un uso efectivo de los partials con aspectos como el c\u00f3digo del <code>head</code> de tu aplicaci\u00f3n, y quiz\u00e1s de la barra de navegaci\u00f3n (si cuentas con una) y del footer.</li>' +
    '</ol>',
  preguntas: [
    '\u00bfQu\u00e9 otros templating engines existen para node?'
  ],
  recursos: [
    { texto: 'pug', url: 'https://pugjs.org/', externo: true },
    { texto: 'Handlebars', url: 'https://handlebarsjs.com/', externo: true },
    { texto: 'EJS', url: 'https://ejs.co/', externo: true },
    { texto: 'Cross-site Scripting (XSS)', url: 'https://www.owasp.org/index.php/Cross-site_Scripting_(XSS)', externo: true }
  ],
  entrega: 'A trav\u00e9s de tu repositorio personal.'
};
