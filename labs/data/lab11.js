/**
 * Lab 11 - Express
 * Created by Denisse Maldonado
 */
const LAB = {
  id: 'lab11',
  numero: 11,
  titulo: 'Express',
  descripcion: 'En esta actividad instalaremos y exploraremos Express, un framework de Node.js para hacer desarrollo en el back-end.',
  modalidad: 'Individual',
  objetivos: [
    'Preparar el ambiente de trabajo con Node.js + NPM + Express',
    'Entender lo que son los frameworks de desarrollo web de back-end.',
    'Explorar Node.js + Express'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>Verifica que ya cuentes con <code>npm</code> ejecutando el comando <code>npm -V</code>. En caso negativo, instala npm y node.</li>' +
      '<li>Haz que tu trabajo sea un proyecto de npm ejecutando <code>npm init</code> desde tu carpeta de trabajo, y sigue las indicaciones del comando.<br>Observa y analiza el contenido del archivo <code>package.json</code>.<br>Podras iniciar el servidor con <code>npm start</code>.</li>' +
      '<li>Si deseas instalar nuevos paquetes, utiliza <code>npm install <em>[nombre_paquete]</em></code>.</li>' +
      '<li>Instala Express desde tu carpeta de trabajo con <code>npm install express</code>.</li>' +
      '<li>Observa nuevamente el archivo <code>package.json</code> e identifica que cambio.</li>' +
      '<li>Para que automaticamente se reinicie el servidor cada vez que haces un cambio en un archivo, agrega al <code>package.json</code> el script <code>"dev": "node --watch app.js"</code>, y ejecuta tus proyectos con <code>npm run dev</code></li>' +
      '<li>Sigue la demostracion del profesor en la sesion de clase.</li>' +
      '<li>Estructura basica de una aplicacion con express:' +
        '<pre><code>' +
'const express = require(\'express\');\n' +
'const app = express();\n' +
'\n' +
'//Middleware\n' +
'app.use((request, response, next) =&gt; {\n' +
'    console.log(\'Middleware!\');\n' +
'    next(); //Le permite a la peticion avanzar hacia el siguiente middleware\n' +
'});\n' +
'\n' +
'app.use((request, response, next) =&gt; {\n' +
'    console.log(\'Otro middleware!\');\n' +
'    response.send(\'\\u00a1Hola mundo!\'); //Manda la respuesta\n' +
'});\n' +
'\n' +
'app.listen(3000);' +
        '</code></pre>' +
      '</li>' +
      '<li>Para agregar rutas:' +
        '<pre><code>' +
'app.use(\'/ruta\', (request, response, next) =&gt; {\n' +
'    response.send(\'Respuesta de la ruta "/ruta"\');\n' +
'});' +
        '</code></pre>' +
      '</li>' +
      '<li>Para instalar un paquete para manipular facilmente los datos de las peticiones: <code>npm install --save body-parser</code>. Para utilizar el paquete:' +
        '<pre><code>' +
'const bodyParser = require(\'body-parser\');\n' +
'\n' +
'app.use(bodyParser.urlencoded({extended: false}));\n' +
'\n' +
'app.use(\'/alguna-ruta\', (request, response, next) =&gt; {\n' +
'    console.log(request.body);\n' +
'});' +
        '</code></pre>' +
      '</li>' +
      '<li>Para limitar las rutas a un tipo de peticion en particular, en lugar de <code>use()</code>, puedes usar, por ejemplo, <code>get()</code> o <code>post()</code>.</li>' +
      '<li>Si los archivos comienzan a crecer, es importante reestructurarlos semanticamente en modulos para que sean mas faciles de mantener. Puedes separar un archivo en express utilizando el ruteador de express. Por convencion, crearemos el nuevo archivo en una carpeta <code>routes</code>:' +
        '<pre><code>' +
'const express = require(\'express\');\n' +
'\n' +
'const router = express.Router();\n' +
'\n' +
'router.get(\'/ruta\', (request, response, next) =&gt; {\n' +
'    response.send(\'Respuesta de la ruta "/modulo/ruta"\');\n' +
'});\n' +
'\n' +
'module.exports = router;' +
        '</code></pre>' +
        '<p>Y el archivo principal quedaria:</p>' +
        '<pre><code>' +
'const express = require(\'express\');\n' +
'const app = express();\n' +
'\n' +
'const misRutas = require(\'./routes/nombre_archivo\');\n' +
'\n' +
'app.use(\'/modulo\', misRutas);\n' +
'\n' +
'app.listen(3000);' +
        '</code></pre>' +
      '</li>' +
      '<li>Para determinar el estado HTTP de una respuesta, puedes utilizar el metodo <code>status()</code> en el objeto de la respuesta.</li>' +
      '<li>Utilizando alguno de tus laboratorios anteriores (o si lo prefieres empieza de 0), elabora una aplicacion web con las siguientes caracteristicas:' +
        '<ul>' +
          '<li>La aplicacion debe poder responder al menos a 5 rutas diferentes, distribuidas en al menos 2 modulos, y mandar una respuesta HTTP 404 cuando la ruta no existe.</li>' +
          '<li>En alguna de las rutas, la aplicacion debe contener al menos 1 forma que debe enviar datos al servidor por POST. El servidor debe reaccionar ante este envio y guardar los datos en un archivo de texto dentro del mismo servidor.</li>' +
          '<li>Deberas separar las rutas creadas en un archivo diferente y seguir lo visto en la practica del <a href="https://meeplab2015.github.io/tc2005b-docusaurus/docs/backend/node/tutorials/intro_web/Lab11Express/#separando-en-clases">Docusaurus.</a> La seccion que dice separando en clases.</li>' +
        '</ul>' +
      '</li>' +
    '</ol>',
  preguntas: [
    'Describe el archivo package.json.'
  ],
  recursos: [
    { texto: 'npm-install', url: 'https://docs.npmjs.com/cli/v6/commands/npm-install', externo: true },
    { texto: 'nodemon', url: 'https://www.npmjs.com/package/nodemon', externo: true },
    { texto: 'Express', url: 'https://expressjs.com', externo: true },
    { texto: 'body-parser', url: 'https://www.npmjs.com/package/body-parser', externo: true },
    { texto: 'JavaScript Modules – A Beginner\'s Guide', url: 'https://www.freecodecamp.org/news/javascript-modules-beginners-guide/', externo: true }
  ],
  entrega: 'A traves de tu repositorio personal.'
};
