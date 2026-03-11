// Created by Denisse Maldonado
const LAB = {
  id: 'lab18',
  numero: 18,
  titulo: 'Autentificaci\u00f3n',
  descripcion: 'En esta actividad exploraremos el proceso de autentificaci\u00f3n de usuarios.',
  modalidad: 'Individual',
  objetivos: [
    'Entender c\u00f3mo funciona la autentificaci\u00f3n de usuarios.',
    'Desarrollar aplicaciones web con autentificaci\u00f3n de usuarios.',
    'Desarrollar aplicaciones web con rutas protegidas.',
    'Desarrollar aplicaciones web protegidas contra ataques CSRF.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>Revisa junto con el profesor la presentaci\u00f3n sobre <a href="https://docs.google.com/presentation/d/1aDxfQzo8-GToBXJwlzsa9mAic2AlC3gs495dKYh0VS0/edit?usp=sharing" target="_blank">Autentificaci\u00f3n</a></li>' +
      '<li>' +
        'Crea la funcionalidad para registrar nuevos usuarios. Recuerda validar que el usuario no exista. Es importante que cuando se guarda un password, lo encriptemos con un m\u00e9todo no desencriptable, para que si alguien tiene acceso a la base de datos, no pueda descifrar el password. Un paquete que nos puede servir para ello es <code>bcryptjs</code>, por lo que hay que instalarlo con <code>npm install --save bcryptjs</code>. <br>' +
        'Para encriptar los passwords:' +
        '<pre><code>' +
'//En un modelo\n' +
'const bcrypt = require(\'bcryptjs\');\n' +
'\n' +
'//Dentro del m\u00e9todo del modelo que crea el usuario\n' +
'//El segundo argumento es el n\u00famero de veces que se aplica el algoritmo, actualmente 12 se considera un valor seguro\n' +
'//El c\u00f3digo es as\u00edncrono, por lo que hay que regresar la promesa\n' +
'return bcrypt.hash(password, 12);' +
        '</code></pre>' +
      '</li>' +
      '<li>Crea la funcionalidad para que un usuario se autentifique. Para ello deber\u00e1s realizar una consulta a la base de datos recuperando el usuario (si es que existe) y posteriormente, comparar el password introducido por el usuario con el password encriptado en la base de datos. Esto se puede lograr en el controlador de la siguiente forma:' +
        '<pre><code>' +
'bcrypt.compare(request.body.password, user.password)\n' +
'    .then(doMatch => {\n' +
'        if (doMatch) {\n' +
'            request.session.isLoggedIn = true;\n' +
'            request.session.user = user;\n' +
'            return request.session.save(err => {\n' +
'                response.redirect(\'/\');\n' +
'            });\n' +
'        }\n' +
'        response.redirect(\'/login\');\n' +
'    }).catch(err => {\n' +
'        response.redirect(\'/login\');\n' +
'    });' +
        '</code></pre>' +
      '</li>' +
      '<li>Para mejorar la seguridad de nuestro sitio, es importante proteger las rutas. En el c\u00f3digo anterior definimos una variable de sesi\u00f3n (<code>isLoggedIn</code>) para indicar que el usuario est\u00e1 autentificado. Esta variable nos puede ayudar en los controladores para proteger una ruta en particular:' +
        '<pre><code>' +
'exports.ruta = (request, response, next) => {\n' +
'    if (!request.session.isLoggedIn) {\n' +
'        return response.redirect(\'/login\');\n' +
'    }\n' +
'    //Resto del c\u00f3digo de la ruta...\n' +
'}' +
        '</code></pre>' +
        'Una alternativa m\u00e1s elegante y sin repetici\u00f3n de c\u00f3digo, es implementando la protecci\u00f3n en un middleware. Esto lo podemos hacer en un nuevo archivo, por ejemplo, <code>is-auth.js</code>:' +
        '<pre><code>' +
'module.exports = (request, response, next) => {\n' +
'    if (!request.session.isLoggedIn) {\n' +
'        return response.redirect(\'/login\');\n' +
'    }\n' +
'    next();\n' +
'}' +
        '</code></pre>' +
        'Para usar nuestro middleware, basta con ir a cualquier archivo de rutas o nuestro archivo principal y agregar:' +
        '<pre><code>' +
'const isAuth = require(\'./is-auth.js\');\n' +
'\n' +
'router.get(\'/miRuta\', isAuth, miControlador.miAccion);' +
        '</code></pre>' +
      '</li>' +
      '<li>Nuestro trabajo hasta ahora, ha sido suficientemente bueno para usuarios de confianza. Sin embargo, la web no es un lugar seguro. Por ello es importante preparar nuestras aplicaciones para protegernos contra usuarios malintencionados. Un ataque com\u00fan es el Cross-Site Request Forgery (CSRF), el cual implica aprovecharse de una sesi\u00f3n de otro usuario, com\u00fanmente perpetrado desde una p\u00e1gina que parece la oficial pero que en realidad no lo es. <br>' +
        'Para evitar ataques de CSRF, tenemos que asegurar que nuestros usuarios est\u00e9n trabajando sobre las vistas que nosotros proveemos. Esto lo podemos lograr por medio de un Token CSRF en nuestras formas y con ayuda de la instalaci\u00f3n del paquete <code>csurf</code>. <br>' +
        'Para usar el paquete en nuestra aplicaci\u00f3n: 1) tenemos que configurar el middleware, lo cual automaticamente proteger\u00e1 todas nuestras peticiones POST:' +
        '<pre><code>' +
'const csrf = require(\'csurf\');\n' +
'const csrfProtection = csrf();\n' +
'\n' +
'//...Y despu\u00e9s del c\u00f3digo para inicializar la sesi\u00f3n...\n' +
'app.use(csrfProtection);' +
        '</code></pre>' +
        'Al proteger las peticiones POST, nuestra aplicaci\u00f3n deja parcialmente de funcionar porque no estamos mandando el token CSRF desde nuestras formas, por ello tenemos que 2) Mandarle el token a las vistas desde el controlador:' +
        '<pre><code>' +
'exports.getAccion = (request, response, next) => {\n' +
'    response.render(\'/ruta\', {\n' +
'        csrfToken: request.csrfToken()\n' +
'    });\n' +
'}' +
        '</code></pre>' +
        'Y 3) tenemos que desplegarlo en la vista:' +
        '<pre><code>' +
'&lt;form action="ruta" method="POST"&gt;\n' +
'&lt;input type="hidden" name="_csrf" value="&lt;%= csrfToken %&gt;" &gt;' +
        '</code></pre>' +
      '</li>' +
      '<li>Una alternativa elegante al paso 2) del apartado anterior, es utilizando Middleware y variables locales de las vistas:' +
        '<pre><code>' +
'app.use((request, response, next) => {\n' +
'    response.locals.csrfToken = request.csrfToken();\n' +
'    next();\n' +
'});' +
        '</code></pre>' +
      '</li>' +
      '<li>Contin\u00faa mejorando tus laboratorios anteriores o tu proyecto, esta vez agreg\u00e1ndoles autentificaci\u00f3n de usuarios, protecci\u00f3n de rutas y protecci\u00f3n contra ataques CSRF. Recuerda que siempre tienes tambi\u00e9n la opci\u00f3n de crear una nueva aplicaci\u00f3n.</li>' +
    '</ol>',
  preguntas: [
    '\u00bfQu\u00e9 otras formas de autentificaci\u00f3n existen?'
  ],
  recursos: [
    { texto: 'bcryptjs', url: 'https://www.npmjs.com/package/bcryptjs', externo: true },
    { texto: 'CSRF', url: 'https://owasp.org/www-community/attacks/csrf', externo: true },
    { texto: 'csurf', url: 'https://www.npmjs.com/package/csurf', externo: true },
    { texto: 'Double CSRF', url: 'https://www.npmjs.com/package/csrf-csrf', externo: true }
  ],
  entrega: 'A trav\u00e9s de tu repositorio personal (Bitbucket o GitHub).'
};
