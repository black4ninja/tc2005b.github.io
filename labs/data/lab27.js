/**
 * Lab 27 - Guia de despliegue
 * Created by Denisse Maldonado
 */
const LAB = {
  id: 'lab27',
  numero: 27,
  titulo: 'Guia de preparacion para el despliegue',
  descripcion: 'En esta actividad nos prepararemos para realizar el despliegue de aplicaciones.',
  modalidad: 'Individual',
  objetivos: [
    'Aprender a preparar las aplicaciones para desplegarlas en ambientes de produccion'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>' +
        '<p>Hasta el momento, hemos <em>hardcodeado</em> ciertos valores de configuracion en nuestro codigo. Esto lo realizamos por conveniencia ya que todo lo realizamos en nuestro ambiente de <strong>desarrollo</strong>, sin embargo, no es la mejor practica. Ahora que tendremos 2 ambientes, <strong>desarrollo</strong> y <strong>produccion</strong>, es importante que utilicemos <strong>variables de entorno</strong> para manejar efectivamente ambas configuraciones.</p>' +
        '<p>Las variables de entorno permiten inyectar valores desde el exterior de nuestra aplicacion dependiendo de la configuracion que queramos utilizar.</p>' +
        '<p>Para definir tu configuracion del entorno de desarrollo "<strong>dev</strong>", crea un archivo <code>nodemon.js</code> en la raiz de tu proyecto con el siguiente formato:</p>' +
        '<pre><code>{\n' +
        '    "env": {\n' +
        '        "NOMBRE_VARIABLE": "valor",\n' +
        '        "OTRA_VARIABLE": "valor"\n' +
        '    }\n' +
        '}</code></pre>' +
        '<p>Para acceder a los valores de las variables de entorno, se hace por medio del objeto <code>process.env.NOMBRE_VARIABLE</code>. Este objeto selecciona el valor de la variable dependiendo del ambiente (desarrollo o produccion).</p>' +
        '<p>Para definir la configuracion a utilizar, hay que hacerlo en el archivo <code>package.json</code>. Por el momento modificaremos los <code>scripts</code>, particularmente el <code>start</code>, y definiremos el script para el entorno de desarrollo:</p>' +
        '<pre><code>"scripts": {\n' +
        '    "start": "NODE_ENV=production NOMBRE_VARIABLE=valor OTRA_VARIABLE=valor node app.js"\n' +
        '    "start:dev": "nodemon app.js"\n' +
        '}</code></pre>' +
      '</li>' +
      '<li>' +
        '<p>Ahora es importante seguir buenas practicas en los headers de HTTP. Para ello podemos utilizar el paquete <code>helmet</code>. Recuerda que para instalarlo lo puedes hacer con <code>npm install --save helmet</code>. Para configurarlo, lo puedes hacer como cualquier otro middleware:</p>' +
        '<pre><code>const helmet = require("helmet");\n' +
        '\n' +
        'app.use(helmet());</code></pre>' +
      '</li>' +
      '<li>' +
        '<p>Para enviar respuestas optimizadas, node puede comprimir los archivos con el paquete <code>compression</code>. Recuerda que para instalarlo lo puedes hacer con <code>npm install --save compression</code>, y para configurarlo, igual que cualquier otro middleware:</p>' +
        '<pre><code>const compression = require("compression");\n' +
        '\n' +
        'app.use(compression());</code></pre>' +
      '</li>' +
      '<li>' +
        '<p>Para proteger las comunicaciones entre los clientes y nuestro servidor, debemos indicarle a node que trabaje con el protocolo https, que cifra las comunicaciones. Para ello, primero debemos de instalar y configurar SSL en nuestro servidor. Esto lo podemos hacer con el comando (en Windows hay que instalar primero openssl):</p>' +
        '<pre><code>openssl req -nodes -new -x509 -keyout server.key -out server.cert</code></pre>' +
        '<p>El comando anterior creara 2 archivos en nuestro servidor, la llave publica (<code>server.cert</code>) usada para cifrar y la llave privada (<code>server.key</code>) para descifrar. Para utilizar estos certificados con https, debemos realizar la siguiente configuracion:</p>' +
        '<pre><code>const https = require("https");\n' +
        'const fs = require("fs");\n' +
        '\n' +
        'const certificate = fs.readFileSync(\'server.cert\');\n' +
        'const privateKey = fs.readFileSync(\'server.key\');\n' +
        '\n' +
        '//sustituimos app.listen(process.env.PORT || 3000); por:\n' +
        'https.createServer({ key: privateKey, cert: certificate }, app).listen(process.env.PORT || 3000);</code></pre>' +
      '</li>' +
    '</ol>',
  preguntas: [
    '\u00bfQue elementos hay que configurar para un entorno de produccion?',
    '\u00bfQue variables de entorno tienes que crear en tu proyecto?'
  ],
  recursos: [
    { texto: 'helmet', url: 'https://github.com/helmetjs/helmet', externo: true },
    { texto: 'compression', url: 'https://www.npmjs.com/package/compression', externo: true },
    { texto: 'openssl', url: 'https://www.openssl.org/', externo: true },
    { texto: 'heroku', url: 'https://www.heroku.com/', externo: true },
    { texto: 'Guia de despliegue en DigitalOcean', url: 'https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04', externo: true },
    { texto: 'Guia de despliegue en AWS', url: 'https://aws.amazon.com/es/getting-started/hands-on/deploy-nodejs-web-app/', externo: true },
    { texto: 'Guia de despliegue en Google Cloud', url: 'documentos/CloudSQL-GAE-config.pdf', externo: false }
  ],
  entrega: 'A traves de tu repositorio personal'
};
