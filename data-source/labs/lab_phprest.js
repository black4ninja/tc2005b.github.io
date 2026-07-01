// Created by Denisse Maldonado
const LAB = {
  id: 'lab_phprest',
  numero: null,
  titulo: 'Servicios web REST con php',
  descripcion: 'En este laboratorio haremos una introducci\u00f3n a los conceptos de servicios web basados en REST, as\u00ed como su implementaci\u00f3n y consumo con php.',
  modalidad: 'Individual',
  objetivos: [
    'Que conozcas el concepto de servicio web y sus caracter\u00edsticas',
    'Que conozcas las diferentes tecnolog\u00edas que existen para implementar servicios web',
    'Que implementes un servicio web REST',
    'Que consumas un servicio web REST'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>Revisa junto con el profesor la presentaci\u00f3n <a target="_blank" href="documentos/PHP-RESTws.pptx">PHP REST Web Services</a>.</li>' +
      '<li>Dise\u00f1a e implementa un servicio web con php basado en REST, para ello puedes utilizar <a href="http://silex.sensiolabs.org" target="_blank">SILEX</a> o cualquier otro framework REST como <a href="http://www.slimframework.com/" target="_blank">Slim Framework</a>, o <a href="http://flightphp.com/" target="_blank">Flight php</a>. Considera al menos 2 operaciones en el servicio. Si gustas puedes utilizar alguno de tus laboratorios anteriores, y seleccionar una parte de la funcionalidad para implementarla como operaciones del servicio, o bien, dise\u00f1ar un servicio completamente nuevo. Nombra la carpeta donde pongas tu servicio como <code>lab20_servicio</code></li>' +
      '<li>Considera <a href="https://platzi.com/blog/como-crear-apis/" target="_blank">esta gu\u00eda en el dise\u00f1o y desarrollo de tu servicio</a>.</li>' +
      '<li>Implementa (o utiliza una p\u00e1gina o sitio que hayas desarrollado en laboratorios anteriores) un cliente que consuma las operaciones del servicio web. Recuerda responder las preguntas del laboratorio dentro del sitio. Nombra la carpeta donde est\u00e9 la aplicaci\u00f3n que consuma tu servicio como <code>lab20_cliente</code></li>' +
      '<li>Si utilizaste alguna base de datos, tambi\u00e9n debes incluir el script de creaci\u00f3n dentro de los archivos del servicio.</li>' +
    '</ol>',
  preguntas: [
    '\u00bfA qu\u00e9 se refiere la descentralizaci\u00f3n de servicios web?',
    '\u00bfC\u00f3mo puede implementarse un entorno con servicios web disponibles a\u00fan cuando falle un servidor?'
  ],
  recursos: [
    { texto: 'Architectural Styles and the Design of Network-based Software Architectures', url: 'http://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm', externo: true },
    { texto: 'Restcookbook.com', url: 'http://restcookbook.com/', externo: true },
    { texto: 'RESTful Services', url: 'https://www.freecodecamp.org/news/restful-services-part-i-http-in-a-nutshell-aab3bfedd131/', externo: true },
    { texto: 'How I Explained REST to My Wife', url: 'http://www.looah.com/source/view/2284', externo: true }
  ],
  entrega: 'Por medio de tu repositorio individual en bitbucket o github. Recuerda incluir tanto la carpeta del servicio como la del cliente.'
};
