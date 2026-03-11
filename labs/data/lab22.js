// Created by Denisse Maldonado
const LAB = {
  id: 'lab22',
  numero: 22,
  titulo: 'Subir y bajar archivos',
  descripcion: 'En esta actividad exploraremos el manejo de archivos con node + express.',
  modalidad: 'Individual',
  objetivos: [
    'Entender c\u00f3mo funciona la subida de archivos a un servidor.',
    'Desarrollar aplicaciones web que le permitan a los usuarios subir archivos que se almacenen en el servidor.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>' +
        'Para poder enviar archivos al servidor, primero debemos preparar la petici\u00f3n HTTP desde el cliente para indicar que vamos a enviar un archivo por medio de una forma que va a enviar muchos datos en partes, y definir un control de entradas tipo <code>file</code> para que el usuario pueda seleccionar un archivo de su computadora:' +
        '<pre><code>' +
'&lt;form action="archivo" method="POST"  enctype="multipart/form-data"&gt;\n' +
'    &lt;input type="file" name="archivo"&gt;\n' +
'    &lt;input type="submit" name="enviar" value="subir"&gt;' +
        '</code></pre>' +
      '</li>' +
      '<li>' +
        'Para poder manejar archivos desde node, requerimos instalar el paquete <code>multer</code>. Para usar multer, tenemos que registrar el middleware y configurar c\u00f3mo queremos manejar los archivos:' +
        '<pre><code>' +
'const multer = require(\'multer\');\n' +
'\n' +
'//fileStorage: Es nuestra constante de configuraci\u00f3n para manejar el almacenamiento\n' +
'const fileStorage = multer.diskStorage({\n' +
'    destination: (request, file, callback) => {\n' +
'        //\'uploads\': Es el directorio del servidor donde se subir\u00e1n los archivos\n' +
'        callback(null, \'uploads\');\n' +
'    },\n' +
'    filename: (request, file, callback) => {\n' +
'        //aqu\u00ed configuramos el nombre que queremos que tenga el archivo en el servidor,\n' +
'        //para que no haya problema si se suben 2 archivos con el mismo nombre concatenamos el timestamp\n' +
'        callback(null, new Date().toISOString() + \'-\' + file.originalname);\n' +
'    },\n' +
'});\n' +
'\n' +
'//Idealmente registramos multer despu\u00e9s de bodyParser (la siguiente l\u00ednea ya deber\u00eda existir)\n' +
'app.use(bodyParser.urlencoded({ extended: false }));\n' +
'\n' +
'//En el registro, pasamos la constante de configuraci\u00f3n y\n' +
'//usamos single porque es un s\u00f3lo archivo el que vamos a subir,\n' +
'//pero hay diferentes opciones si se quieren subir varios archivos.\n' +
'//\'archivo\' es el nombre del input tipo file de la forma\n' +
'app.use(multer({ storage: fileStorage }).single(\'archivo\'));' +
        '</code></pre>' +
        'Para acceder a los datos del archivo en el controlador, como por ejemplo si queremos guardar la ruta en la base de datos, podemos acceder a los atributos por medio del objeto <code>request.file</code>:' +
        '<pre><code>' +
'const.postArchivo = (request, response, next) => {\n' +
'    const ruta_archivo = request.file.path;\n' +
'};' +
        '</code></pre>' +
      '</li>' +
      '<li>Para limitar el tipo de archivos que se pueden subir, podemos crear una nueva constante de configuraci\u00f3n y pasar la constante al registro:' +
        '<pre><code>' +
'const fileFilter = request, file, callback => {\n' +
'    if (file.mimetype == \'image/png\' ||\n' +
'        file.mimetype == \'image/jpg\' ||\n' +
'        file.mimetype == \'image/jpeg\' ) {\n' +
'            callback(null, true);\n' +
'    } else {\n' +
'            callback(null, false);\n' +
'    }\n' +
'}\n' +
'\n' +
'app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single(\'archivo\'));' +
        '</code></pre>' +
      '</li>' +
      '<li>Para poder ver las im\u00e1genes de nuestro servidor en nuestros clientes, es necesario indicar que el directorio donde se encuentran las im\u00e1genes, tambi\u00e9n puede ser utilizado de manera est\u00e1tica:' +
        '<pre><code>' +
'app.use(\'/uploads\', express.static(path.join(__dirname, \'uploads\')));' +
        '</code></pre>' +
        'Es importante que a este folder le agreguemos un archivo index.html vac\u00edo, para que los contenidos del directorio no puedan ser listados.' +
      '</li>' +
      '<li>Agrega la funcionalidad para trabajar con archivos en tus laboratorios anteriores o proyecto. Recuerda que siempre tienes tambi\u00e9n la opci\u00f3n de crear un prototipo para explorar estas caracter\u00edsticas.</li>' +
      '<li>Si tienes formas de edici\u00f3n de archivos, es importante que agregues funcionalidad para que si no se sube un nuevo archivo, no se modifique el archivo que ya estaba almacenado.</li>' +
    '</ol>',
  recursos: [
    { texto: 'multer', url: 'https://www.npmjs.com/package/multer', externo: true },
    { texto: 'pdfkit', url: 'https://www.npmjs.com/package/pdfkit', externo: true },
    { texto: 'The Express + Node.js Handbook', url: 'https://www.freecodecamp.org/news/the-express-handbook/', externo: true },
    { texto: 'i18n', url: 'https://www.npmjs.com/package/i18n', externo: true }
  ],
  entrega: 'A trav\u00e9s de tu repositorio personal (Bitbucket o GitHub).'
};
