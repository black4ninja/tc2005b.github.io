// Created by Denisse Maldonado
const LAB = {
  id: 'lab17',
  numero: 17,
  titulo: 'Interacci\u00f3n con la base de datos',
  descripcion: 'En esta actividad comenzaremos con la interacci\u00f3n con una base de datos desde node.',
  modalidad: 'Individual',
  objetivos: [
    'Entender c\u00f3mo interact\u00faa una aplicaci\u00f3n web con una base de datos.',
    'Desarrollar aplicaciones web que interact\u00faen con bases de datos.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>Para interactuar con una base de datos, debemos crear la base de datos. Para este laboratorio usaremos MySQL, sin embargo, la l\u00f3gica es muy similar si decides trabajar con cualquier otro motor de bases de datos. Crea tu base de datos, crea algunas tablas y ponles algunos datos, de manera similar a la demostraci\u00f3n del profesor.</li>' +
      '<li>Para poder interactuar con el manejador de base de datos MySQL, ocuparemos el paquete <code>mysql2</code>.</li>' +
      '<li>Para poder conectarnos con la base de datos, utilizaremos el archivo <code>database.js</code>, el cual crearemos dentro de un folder con nuestras librer\u00edas de apoyo, t\u00edpicamente nombrado <code>util</code>. El archivo se encargar\u00e1 de manejar las conexiones con nuestra base de datos:' +
        '<pre><code>' +
'const mysql = require(\'mysql2\');\n' +
'\n' +
'const pool = mysql.createPool({\n' +
'    host: \'localhost\',\n' +
'    user: \'root\',\n' +
'    database: \'database_name\',\n' +
'    password: \'el_password_de_tu_usuario_de_la_bd\'\n' +
'});\n' +
'\n' +
'module.exports = pool.promise();' +
        '</code></pre>' +
        'Aseg\u00farate de cambiar los valores de los atributos del objeto de js para que coincidan con los de tu base de datos. Como podr\u00e1s observar, se exporta una promesa. Las promesas permiten manejar f\u00e1cilmente c\u00f3digo que se ejecuta de manera as\u00edncrona.' +
      '</li>' +
      '<li>A continuaci\u00f3n, haremos una implementaci\u00f3n a partir del dise\u00f1o que se presenta en el siguiente diagrama de secuencia:' +
        '<div class="center-align">' +
          '<img alt="Diagrama de secuencia de una interacci\u00f3n con un estilo arquitect\u00f3nico MVC" src="uml/mvc_bd_secuencia.png">' +
        '</div>' +
      '</li>' +
      '<li>Para conectarnos con la base de datos y ejecutar consultas desde nuestra aplicaci\u00f3n:' +
        '<pre><code>' +
'const db = require(\'./util/database\');\n' +
'\n' +
'db.execute(\'Consulta SQL por ejemplo: SELECT * FROM mi_tabla\');' +
        '</code></pre>' +
        'Ahora, debido a que en <code>database.js</code> devolvimos una promesa, esto nos permite hacer algo despu\u00e9s de que ejecutamos la consulta con el m\u00e9todo <code>.then()</code>, e incluso manejar los errores con el m\u00e9todo <code>.catch()</code>. Por ejemplo, si queremos recuperar los registros de la tabla videojuegos:' +
        '<pre><code>' +
'db.execute(\'SELECT * FROM videojuegos\')\n' +
'    .then(([rows, fieldData]) => {\n' +
'        console.log(rows);\n' +
'    })\n' +
'    .catch(err => {\n' +
'        console.log(err);\n' +
'    });' +
        '</code></pre>' +
        'En la variable <code>rows</code>, tendremos cada uno de los registros de nuestra consulta.' +
      '</li>' +
      '<li>El c\u00f3digo de interacci\u00f3n con la base de datos, si seguimos buenas pr\u00e1cticas, lo escribiremos siempre en nuestros modelos. Por lo que normalmente, el m\u00e9todo <code>fetchAll()</code> de nuestros modelos quedar\u00eda con el siguiente formato:' +
        '<pre><code>' +
'static fetchAll() {\n' +
'    return db.execute(\'SELECT * FROM videojuegos\');\n' +
'}' +
        '</code></pre>' +
        'Y el c\u00f3digo del controlador (asumiendo que tenemos un template de la vista llamado \'vista.html\' que despliega el contenido de un arreglo de js llamado videojuegos):' +
        '<pre><code>' +
'exports.getVideojuegos = (request, response, next) => {\n' +
'    Videojuegos.fetchAll()\n' +
'        .then(([rows, fieldData]) => {\n' +
'            response.render(\'vista\', {\n' +
'                videojuegos: rows\n' +
'            })\n' +
'        })\n' +
'        .catch(err => console.log(err));\n' +
'}' +
        '</code></pre>' +
      '</li>' +
      '<li>Ahora, para insertar un registro en la base de datos, nuestro c\u00f3digo del m\u00e9todo <code>save()</code> en los modelos, tendr\u00eda el siguiente formato:' +
        '<pre><code>' +
'save() {\n' +
'    return db.execute(\'INSERT INTO videojuegos (nombre_columna_1, nombre_columna_2) VALUES (?, ?)\',\n' +
'        [this.variable_valor_1, this.variable_valor_2]\n' +
'    );\n' +
'\n' +
'}' +
        '</code></pre>' +
        'Como podr\u00e1s ver, no se insertan los valores directamente en el string, sino se pone un signo de interrogaci\u00f3n, esto es para evitar ataques de inyecci\u00f3n de SQL, ya que el m\u00e9todo execute, al pasar estos datos en un arreglo como segundo argumento, evita que si se inserta c\u00f3digo SQL, \u00e9ste no se ejecute y simplemente sea interpretado como un string. <br>' +
        'El c\u00f3digo del controlador quedar\u00eda con el siguiente formato:' +
        '<pre><code>' +
'exports.insertarVideojuego = (request, response, next) => {\n' +
'    const videojuego = new Videojuego(request.body.nombre, request.body.plataforma);\n' +
'    videojuego.save().then(() => {\n' +
'        response.redirect(\'/\');\n' +
'    }).catch(err => console.log(err));\n' +
'};' +
        '</code></pre>' +
      '</li>' +
      '<li>En ocasiones es necesario recuperar un registro en particular de la base de datos, y muchas veces queremos que esto pueda realizarse desde las rutas. Para indicarle al ruteador de express que un valor en una ruta es una variable, podemos hacerlo agregando como prefijo el s\u00edmbolo <code>:</code> seguido del nombre que le queremos dar a la variable:' +
        '<pre><code>' +
'router.get(\'/videojuegos/:videojuego_id\', controllerVideojuegos.getVideojuego);' +
        '</code></pre>' +
        'Y en el controlador para hacer uso de la variable:' +
        '<pre><code>' +
'export.getVideojuego = (request, response, next) => {\n' +
'    const id = request.params.videojuego_id;\n' +
'    //Resto del c\u00f3digo del controlador...\n' +
'}' +
        '</code></pre>' +
      '</li>' +
      '<li>Contin\u00faa mejorando tus laboratorios anteriores o tu proyecto agreg\u00e1ndoles interacci\u00f3n con la base de datos. Aseg\u00farate de al menos realizar una consulta que devuelva varios registros, una consulta que devuelva 1 s\u00f3lo registro, una inserci\u00f3n, y una edici\u00f3n de un registro de la base de datos. Recuerda que siempre tienes tambi\u00e9n la opci\u00f3n de crear una nueva aplicaci\u00f3n.</li>' +
    '</ol>',
  preguntas: [
    '\u00bfQu\u00e9 ventajas tiene escribir el c\u00f3digo SQL \u00fanicamente en la capa del modelo?',
    '\u00bfQu\u00e9 es SQL injection y c\u00f3mo se puede prevenir?'
  ],
  recursos: [
    { texto: 'mysql2', url: 'https://www.npmjs.com/package/mysql2', externo: true },
    { texto: 'SQL Injection in a Nutshell', url: 'https://www.andreafortuna.org/2016/05/16/sql-injection-in-a-nutshell/', externo: true },
    { texto: 'SQL Injection Attacks, Visually Explained', url: 'https://medium.com/visually-explained/sql-injection-attacks-visually-explained-c71b5f9e1af2', externo: true },
    { texto: 'OWASP Appsec Tutorial Series - Episode 2: SQL Injection', url: 'https://www.youtube.com/watch?v=pypTYPaU7mM', externo: true },
    { texto: 'SQL Injection Prevention Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html', externo: true },
    { texto: 'Testing for SQL Injection (OTG-INPVAL-005)', url: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05-Testing_for_SQL_Injection', externo: true },
    { texto: 'Common Security Issues in Web Applications. Part 1', url: 'https://medium.com/codeep-io/common-security-issues-in-web-applications-part-1-af339360c646', externo: true },
    { texto: 'How JavaScript Promises Work \u2013 Handbook for Beginners', url: 'https://www.freecodecamp.org/news/the-javascript-promises-handbook/', externo: true },
    { texto: 'CRUD Operations \u2013 What is CRUD?', url: 'https://www.freecodecamp.org/news/crud-operations-explained/', externo: true },
    { texto: 'uuid: M\u00f3dulo para crear id\'s \u00fanicos', url: 'https://www.npmjs.com/package/uuid', externo: true }
  ],
  entrega: 'A trav\u00e9s de tu repositorio personal (Bitbucket o GitHub).'
};
