// Created by Denisse Maldonado
const LAB = {
  id: 'lab14',
  numero: 14,
  titulo: 'Manejo de sesiones y cookies',
  descripcion: 'En esta actividad exploraremos el manejo de sesiones y cookies con node+express.',
  modalidad: 'Individual',
  objetivos: [
    'Entender la manera en que funcionan las sesiones.',
    'Entender la manera en que funcionan las cookies.',
    'Implementar aplicaciones web que mantengan los datos a trav\u00e9s de diferentes peticiones.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>Atiende a la explicaci\u00f3n del profesor del <a target="_blank" href="https://docs.google.com/presentation/d/1cwqnbuAjRjemiQLoctHAqobvApkE7CVEKN0PtUmxVl8/edit?usp=sharing">tema sesiones y cookies</a> y pregunta tus dudas.</li>' +
      '<li>Recuerda que para generar una aplicaci\u00f3n es necesario inicializar el proyecto con <code>npm init</code>, e instalar <code>express</code>, <code>body-parser</code> y un template engine como EJS con <code>npm install --save [nombre_paquete]</code>. Si es necesario, recuerda configurar el archivo <code>package.json</code> para incluir el script que quieres que se ejecute con <code>npm start</code>.</li>' +
      '<li>Las cookies viajan en el header de la respuesta, por lo que para definir una cookie, lo podemos hacer en la capa del controlador por medio del m\u00e9todo <code>setHeader(\'Set-Cookie\')</code> de la respuesta HTTP:' +
        '<pre><code>' +
'exports.accion = (request, response, next) => {\n' +
'    response.setHeader(\'Set-Cookie\', \'nombre_cookie\', \'valor_cookie\');\n' +
'}' +
        '</code></pre>' +
        'A partir de que definimos una cookie, el navegador mandar\u00e1 en el header de la petici\u00f3n, todas las cookies que corresponden al sitio. Para acceder a las cookies en el controlador, lo podemos hacer por medio del header \'Cookie\' de la petici\u00f3n:' +
        '<pre><code>' +
'exports.accion = (request, response, next) => {\n' +
'    request.get(\'Cookie\');\n' +
'}' +
        '</code></pre>' +
        '<p>Para acceder a un valor de una cookie en particular, puedes hacer manipulando el string, por ejemplo con <code>request.get(\'Cookie\').split(\';\')[1].trim().split(\'=\')[1];</code> o bien, con instalando alg\u00fan m\u00f3dulo como <code>cookie-parser</code>.</p>' +
      '</li>' +
      '<li>Adem\u00e1s del valor, puedes agregarle m\u00e1s propiedades a la cookie como fecha de expiraci\u00f3n, segundos de vida, el dominio al que quieres que se env\u00ede, o la propiedad <code>Secure</code>, que s\u00f3lo enviar\u00e1 la cookie si viaja por HTTPS. <br>' +
        'Es importante tener cuidado con el uso de las cookies, ya que los usuarios pueden editarlas desde el navegador. Para que la cookie no pueda ser le\u00edda por el c\u00f3digo js del navegador, se le puede agregar la propiedad <code>HttpOnly</code>. Esto protege de ataques XSS.' +
        '<pre><code>' +
'exports.accion = (request, response, next) => {\n' +
'    response.setHeader(\'Set-Cookie\', \'nombre_cookie=valor_cookie; HttpOnly\');\n' +
'}' +
        '</code></pre>' +
      '</li>' +
      '<li>Para manejar sesiones de manera muy pr\u00e1ctica, instalaremos el paquete <code>express-session</code>.</li>' +
      '<li>Para preparar el entorno para trabajar con sesiones, agregamos como middleware el manejo de sesiones:' +
        '<pre><code>' +
'const session = require(\'express-session\');\n' +
'\n' +
'app.use(session({\n' +
'    secret: \'mi string secreto que debe ser un string aleatorio muy largo, no como \u00e9ste\', \n' +
'    resave: false, //La sesi\u00f3n no se guardar\u00e1 en cada petici\u00f3n, sino s\u00f3lo se guardar\u00e1 si algo cambi\u00f3 \n' +
'    saveUninitialized: false, //Asegura que no se guarde una sesi\u00f3n para una petici\u00f3n que no lo necesita\n' +
'}));' +
        '</code></pre>' +
      '</li>' +
      '<li>Para utilizar las variables de sesi\u00f3n en un controlador:' +
        '<pre><code>' +
'exports.action = (request, response, next) {\n' +
'    request.session.nombre_variable = valor;\n' +
'};' +
        '</code></pre>' +
        'Si revisas la consola desde el navegador, podr\u00e1s observar una cookie con tu variable de sesi\u00f3n y con el valor encriptado.' +
      '</li>' +
      '<li>Para eliminar una sesi\u00f3n, lo cual es principalmente \u00fatil cuando un usuario sale de la aplicaci\u00f3n, puedes hacerlo de la siguiente forma:' +
        '<pre><code>' +
'exports.logout = (request, response, next) => {\n' +
'    request.session.destroy(() => {\n' +
'        response.redirect(\'/\'); //Este c\u00f3digo se ejecuta cuando la sesi\u00f3n se elimina.\n' +
'    });\n' +
'};' +
        '</code></pre>' +
      '</li>' +
      '<li>Mejora alguno de tus laboratorios anteriores o avanza en tu proyecto haciendo un uso pertinente de sesiones y cookies. Otra opci\u00f3n es que crees una nueva aplicaci\u00f3n para que explores la aplicaci\u00f3n de estos conceptos.</li>' +
      '<li>En ocasiones, como por ejemplo para mandar mensajes de error al usuario, deseamos utilizar variables de sesi\u00f3n que tengan un tiempo de vida de s\u00f3lo 1 petici\u00f3n. Estas variables se llaman <code>flash</code>. Si deseas utilizarlas, el paquete <code>connect-flash</code> lo hace sencillo.</li>' +
    '</ol>',
  preguntas: [
    '\u00bfQu\u00e9 beneficios encuentras en el estilo MVC?',
    '\u00bfEncuentras alguna desventaja en el estilo arquitect\u00f3nico MVC?'
  ],
  recursos: [
    { texto: 'HTTP cookie', url: 'https://en.wikipedia.org/wiki/HTTP_cookie', externo: true },
    { texto: 'cookie-parser', url: 'https://www.npmjs.com/package/cookie-parser', externo: true },
    { texto: 'Setting and Using Cookies with a Node.js / Express Server', url: 'https://medium.com/@ethantcollins98/setting-and-using-cookies-with-a-node-js-express-server-49479673d043', externo: true },
    { texto: 'HTTP Cookies in Node.js', url: 'https://www.geeksforgeeks.org/http-cookies-in-node-js/', externo: true },
    { texto: 'XSS', url: 'https://owasp.org/www-community/attacks/xss/', externo: true },
    { texto: 'express-session', url: 'https://www.npmjs.com/package/express-session', externo: true },
    { texto: 'connect-flash', url: 'https://www.npmjs.com/package/connect-flash', externo: true }
  ],
  entrega: 'A trav\u00e9s de tu repositorio personal.'
};
