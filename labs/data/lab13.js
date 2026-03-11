// Created by Denisse Maldonado
const LAB = {
  id: 'lab13',
  numero: 13,
  titulo: 'MVC',
  descripcion: 'En esta actividad exploraremos el estilo arquitect\u00f3nico Modelo-Vista-Controlador y lo implementaremos con node+express.',
  modalidad: 'Individual',
  objetivos: [
    'Entender el estilo arquitect\u00f3nico Modelo-Vista-Controlador.',
    'Dise\u00f1ar aplicaciones con un estilo arquitect\u00f3nico Modelo-Vista-Controlador.',
    'Implementar aplicaciones con un estilo arquitect\u00f3nico Modelo-Vista-Controlador.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>Atiende a la explicaci\u00f3n del profesor del <a href="https://docs.google.com/presentation/d/1ap7zdACiT7ouGfzzh9dEcrQd6AsoaAgRinjZUXSWHvk/edit?usp=sharing">tema MVC</a> y pregunta tus dudas.</li>' +
      '<li>Recuerda que para generar una aplicaci\u00f3n es necesario inicializar el proyecto con <code>npm init</code>, e instalar <code>express</code>, <code>body-parser</code> y un template engine como EJS con <code>npm install --save [nombre_paquete]</code>. Si es necesario, recuerda configurar el archivo <code>package.json</code> para incluir el script que quieres que se ejecute con <code>npm start</code>.</li>' +
      '<li>A continuaci\u00f3n, haremos una implementaci\u00f3n a partir del dise\u00f1o que se presenta en el siguiente diagrama de secuencia:' +
        '<div class="center-align">' +
          '<img alt="Diagrama de secuencia de una interacci\u00f3n con un estilo arquitect\u00f3nico MVC" src="uml/mvc_secuencia.png">' +
        '</div>' +
        'Por convenci\u00f3n, nuestros controladores los pondremos en una carpeta <code>controllers</code>. Comenzaremos a mover la l\u00f3gica que antes hab\u00edamos puesto en las vistas, hacia una variable que exportaremos del controlador. Utilizaremos de ejemplo el controlador <code>a_controller.js</code>:' +
        '<pre><code>' +
'exports.action = (request, response, next) => {\n' +
'    response.render(\'view_file\', { \n' +
'        atribute_1: \'Data 1\', \n' +
'        atribute_2: \'Data 2\'\n' +
'    });\n' +
'};' +
        '</code></pre>' +
      '</li>' +
      '<li>El archivo con la ruta quedar\u00e1 m\u00e1s ligero, ya que \u00fanicamente tendr\u00e1n nuestra ruta y la referencia hacia el controlador que utilizar\u00e1n, quedando de la siguiente forma:' +
        '<pre><code>' +
'const aController = require(\'../controllers/a_controller\');\n' +
'\n' +
'router.get(\'/add\', aController.action);' +
        '</code></pre>' +
      '</li>' +
      '<li>Para implementar la capa del modelo, por convenci\u00f3n, utilizaremos una carpeta <code>models</code>. Ah\u00ed pondremos cada uno de los archivos de nuestro modelo. Es com\u00fan tener un archivo de modelo por tabla de la base de datos. Un archivo de modelo, t\u00edpicamente tiene la siguiente estructura:' +
        '<pre><code>' +
'module.exports = class Modelo {\n' +
'\n' +
'    //Constructor de la clase. Sirve para crear un nuevo objeto, y en \u00e9l se definen las propiedades del modelo\n' +
'    constructor(my_value) {\n' +
'        this.attribute_1 = my_value;\n' +
'    }\n' +
'\n' +
'    //Este m\u00e9todo servir\u00e1 para guardar de manera persistente el nuevo objeto. \n' +
'    save() {\n' +
'        \n' +
'    }\n' +
'\n' +
'    //Este m\u00e9todo servir\u00e1 para devolver los objetos del almacenamiento persistente.\n' +
'    static fetchAll() {\n' +
'        \n' +
'    }\n' +
'\n' +
'}' +
        '</code></pre>' +
        '<p>Para usar el modelo en el controlador:</p>' +
        '<pre><code>' +
'const Modelo = require(\'../models/modelo\');\n' +
'\n' +
'//Para crear un objeto de nuestro modelo\n' +
'const objeto = new Modelo(\'Valor de la instancia\');\n' +
'objeto.save();\n' +
'\n' +
'//Para recuperar la lista de objetos del modelo\n' +
'const objetos = Modelo.fetchAll();' +
        '</code></pre>' +
        '<p>Por el momento, podemos utilizar un arreglo para almacenar la informaci\u00f3n, entonces en el archivo del modelo podemos crear un arreglo <code>const objetos = []</code>, llenar en m\u00e9todo <code>save()</code> con <code>objetos.push(this);</code> y <code>fetchAll()</code> con <code>return objetos;</code></p>' +
      '</li>' +
      '<li>Refactoriza alguno de tus laboratorios anteriores o el avance de tu proyecto utilizando un estilo arquitect\u00f3nico MVC. Otra opci\u00f3n es que crees una nueva aplicaci\u00f3n utilizando este patr\u00f3n.</li>' +
      '<li>Agrega una nueva funcionalidad que toque todos los puntos clave de la arquitectura.</li>' +
    '</ol>',
  preguntas: [
    '\u00bfQu\u00e9 beneficios encuentras en el estilo MVC?',
    '\u00bfEncuentras alguna desventaja en el estilo arquitect\u00f3nico MVC?'
  ],
  recursos: [
    { texto: 'Ejercicio: Diagramas de secuencia', url: 'documentos/EjerciciosDiagramaSecuencia.docx', externo: true },
    { texto: 'How Model-View-Controller Architecture Works', url: 'https://www.freecodecamp.org/news/model-view-architecture/', externo: true },
    { texto: 'MVC', url: 'https://developer.mozilla.org/en-US/docs/Glossary/MVC', externo: true },
    { texto: 'The 20 Essential Principles of Software Development: LoD, SoC, SOLID, and Beyond.', url: 'https://levelup.gitconnected.com/the-20-essential-principles-of-software-development-lod-soc-solid-and-beyond-7a39a98b685d', externo: true },
    { texto: 'Understanding the SOLID Principles', url: 'https://blog.stackademic.com/understanding-the-solid-principles-85c625cc27fc', externo: true }
  ],
  entrega: 'A trav\u00e9s de tu repositorio personal.'
};
