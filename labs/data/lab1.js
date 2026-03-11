// Created by Denisse Maldonado
const LAB = {
  id: 'lab1',
  numero: 1,
  titulo: 'Introducci\u00f3n a las aplicaciones web, HTML5 y ciclo de vida de los sistemas de informaci\u00f3n',
  descripcion: 'En esta actividad se abordar\u00e1n brevemente los conceptos fundamentales para comenzar con el Construcci\u00f3n de software y toma de decisiones, y se har\u00e1 un breve repaso sobre html5.',
  modalidad: 'Individual',
  objetivos: [
    'Comprender conceptos b\u00e1sicos del desarrollo web.',
    'Comprender las principales etiquetas HTML (im\u00e1genes, hiperv\u00ednculos, listas, tablas, formas)',
    'Desarrollar interfaces de usuario sencillas en HTML',
    'Explorar editores para desarrollo web',
    'Comprender el ciclo de vida y de desarrollo de los sistemas de informaci\u00f3n'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>Revisa uno o varios de los siguientes editores para desarrollo web:' +
        '<ul>' +
          '<li><a href="https://code.visualstudio.com/" target="_blank">Visual Studio Code</a> (Recomendado)</li>' +
          '<li><a href="https://www.jetbrains.com/webstorm/" target="_blank">WebStorm</a></li>' +
          '<li><a href="https://zed.dev/" target="_blank">Zed</a></li>' +
          '<li><a href="http://www.sublimetext.com/" target="_blank">Sublime Text</a></li>' +
          '<li><a href="http://codepen.io/" target="_blank">Codepen</a> (En l\u00ednea)</li>' +
          '<li><a href="https://codesandbox.io/" target="_blank">CodeSandbox</a> (En l\u00ednea)</li>' +
        '</ul>' +
      '</li>' +
      '<li>Instala y/o configura el (los) de tu preferencia. Eres libre de utilizar cualquier otro que te agrade que no est\u00e9 en la lista anterior, y de ser as\u00ed, comparte el enlace en el grupo de Discord del curso para que los dem\u00e1s lo conozcan.</li>' +
      '<li>Crea una p\u00e1gina personal o un peque\u00f1o sitio donde muestres el uso de las principales etiquetas HTML. Puedes hablar de tus principales proyectos o aficiones, incluir art\u00edculos interesantes tuyos, sobre t\u00ed, o sobre algo que te apasione. Usa componentes sem\u00e1nticos como por ejemplo <code>&lt;header&gt;</code>, <code>&lt;footer&gt;</code> o <code>&lt;strong&gt;</code> en lugar de <code>&lt;div id="header"&gt;</code>, <code>&lt;div id="footer"&gt;</code> y <code>&lt;b&gt;</code>. El sitio o p\u00e1gina debe incluir alguna forma con controles.' +
        '<ul>' +
          '<li>No utilices etiquetas desaprobadas.</li>' +
          '<li>Recuerda incluir tus datos e informaci\u00f3n de contacto (nombre, matr\u00edcula, correo electr\u00f3nico).</li>' +
          '<li>Utiliza tu creatividad.</li>' +
          '<li><strong>No</strong> es necesario que la p\u00e1gina cuente con estilos, ni JavaScript.</li>' +
          '<li>Pon el nombre del editor HTML que utilizaste y el enlace al sitio del editor como pie de p\u00e1gina.</li>' +
          '<li>Valida tus documentos con la herramienta <a href="http://validator.w3.org" target="_blank">validator.w3.org</a></li>' +
        '</ul>' +
      '</li>' +
      '<li>Responde las preguntas de la siguiente secci\u00f3n en alg\u00fan lugar del sitio.</li>' +
      '<li>De ser necesario, soporta tus respuestas utilizando libros, revistas o sitios WEB. En cualquier caso, <strong>cita las fuentes utilizadas</strong>. Recuerda que si utilizas p\u00e1rrafos de otros autores, deben estar citados adecuadamente.</li>' +
    '</ol>',
  preguntas: [
    '\u00bfCu\u00e1l es la diferencia entre Internet y la World Wide Web?',
    '\u00bfCu\u00e1les son las partes de un URL?',
    '\u00bfCu\u00e1l es el prop\u00f3sito de los m\u00e9todos HTTP: GET, HEAD, POST, PUT, PATCH, DELETE?',
    '\u00bfQu\u00e9 m\u00e9todo HTTP se debe utilizar al enviar un formulario HTML, por ejemplo cuando ingresas tu usuario y contrase\u00f1a en alg\u00fan sitio? \u00bfPor qu\u00e9?',
    '\u00bfQu\u00e9 m\u00e9todo HTTP se utiliza cuando a trav\u00e9s de un navegador web se accede a una p\u00e1gina a trav\u00e9s de un URL?',
    'Un servidor web devuelve una respuesta HTTP con c\u00f3digo 200. \u00bfQu\u00e9 significa esto? \u00bfOcurri\u00f3 alg\u00fan error?',
    '\u00bfEs responsabilidad del desarrollador corregir un sitio web si un usuario reporta que intent\u00f3 acceder al sitio y se encontr\u00f3 con un error 404? \u00bfPor qu\u00e9?',
    '\u00bfEs responsabilidad del desarrollador corregir un sitio web si un usuario reporta que intent\u00f3 acceder al sitio y se encontr\u00f3 con un error 500? \u00bfPor qu\u00e9?',
    '\u00bfQu\u00e9 significa que un atributo HTML5 est\u00e9 depreciado o desaprobado (deprecated)? Menciona algunos elementos de HTML 4 que en HTML5 est\u00e9n desaprobados.',
    '\u00bfCu\u00e1les son las diferencias principales entre HTML 4 y HTML5?',
    '\u00bfQu\u00e9 componentes de estructura y estilo tiene una tabla?',
    '\u00bfCu\u00e1les son los principales controles de una forma HTML5?',
    '\u00bfQu\u00e9 tanto soporte HTML5 tiene el navegador que utilizas? Puedes utilizar la siguiente p\u00e1gina para descubrirlo: http://html5test.com/ (Al responder la pregunta recuerda poner el navegador que utilizas)',
    'Sobre el ciclo de vida y desarrollo de los sistemas de informaci\u00f3n: \u00bfCu\u00e1l es el ciclo de vida de los sistemas de informaci\u00f3n? \u00bfCu\u00e1l es el ciclo de desarrollo de sistemas de informaci\u00f3n?'
  ],
  recursos: [
    { texto: 'Ejemplo nuevos elementos en html5', url: 'lab1HtmlEjemplo.html', externo: false },
    { texto: 'An introduction to HTTP: everything you need to know', url: 'https://www.freecodecamp.org/news/http-and-everything-you-need-to-know-about-it/', externo: true },
    { texto: 'HTTP Request Methods - Get vs Put vs Post Explained with Code Examples', url: 'https://www.freecodecamp.org/news/http-request-methods-explained/', externo: true },
    { texto: 'The HTML Handbook', url: 'https://www.freecodecamp.org/news/the-html-handbook/', externo: true },
    { texto: 'Beginner\'s HTML Cheat Sheet', url: 'https://medium.com/level-up-web/beginners-html-cheat-sheet-f9b1e3ce88a6', externo: true },
    { texto: 'www.w3schools.com', url: 'http://www.w3schools.com', externo: true },
    { texto: 'www.w3.org/html/', url: 'http://www.w3.org/html/', externo: true },
    { texto: 'validator.w3.org', url: 'http://validator.w3.org', externo: true },
    { texto: 'Web Fundamentals', url: 'https://developers.google.com/web', externo: true },
    { texto: 'http://html5demos.com/', url: 'http://html5demos.com/', externo: true },
    { texto: 'http://diveintohtml5.info/', url: 'http://diveintohtml5.info/', externo: true },
    { texto: 'http://html5.validator.nu', url: 'http://html5.validator.nu', externo: true },
    { texto: 'http://caniuse.com/', url: 'http://caniuse.com/', externo: true },
    { texto: 'http://html5doctor.com/', url: 'http://html5doctor.com/', externo: true },
    { texto: 'I bet you didn\'t know about these 15 HTML features.', url: 'https://medium.com/codex/i-bet-you-didnt-know-about-these-15-html-features-9b0824dba28f', externo: true }
  ],
  entrega: 'Una vez que termines, registra la actividad en tu plan de aprendizaje. Guarda tu trabajo en tu computadora personal. En el laboratorio 2 se dar\u00e1n las instrucciones para la entrega de este laboratorio y de todos los siguientes.'
};
