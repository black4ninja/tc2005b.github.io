/**
 * Lab 10 - Rutas y formas
 * Created by Denisse Maldonado
 */
const LAB = {
  id: 'lab10',
  numero: 10,
  titulo: 'Rutas y formas',
  descripcion: 'En esta actividad veremos como programar desde el servidor un modulo simple de ruteo y como mandarle datos al servidor.',
  modalidad: 'Individual',
  objetivos: [
    'Entender como responder desde el servidor a las diferentes rutas para poder disenar y programar el ruteo de una aplicacion.',
    'Entender las diferentes maneras de enviar datos a un servidor por medio de HTTP, para poder realizar un procesamiento con estos datos.',
    'Entender como funciona el ambiente de ejecucion de Node.js, y su forma asincrona de manejo de eventos.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>' +
        '<div class="center-align">' +
          '<img class="responsive-img" alt="Diagrama de secuencia de una interaccion con distintos metodos de HTTP" src="uml/rutas_formas.png">' +
        '</div>' +
      '</li>' +
      '<li>Sigue la demostracion del profesor en la sesion de clase.</li>' +
      '<li>Utilizando alguno de tus laboratorios anteriores (o si lo prefieres empieza de 0), elabora una aplicacion web con las siguientes caracteristicas:' +
        '<ul>' +
          '<li>La aplicacion debe poder responder al menos a 3 rutas diferentes, y mandar una respuesta HTTP 404 cuando la ruta no existe.</li>' +
          '<li>En alguna de las rutas, la aplicacion debe contener al menos 1 forma que debe enviar datos al servidor por POST. El servidor debe reaccionar ante este envio y guardar los datos en un archivo de texto dentro del mismo servidor.</li>' +
        '</ul>' +
      '</li>' +
    '</ol>',
  recursos: [
    { texto: 'The Node.js Event Loop', url: 'https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/', externo: true },
    { texto: 'Anatomy of an HTTP Transaction', url: 'https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/', externo: true },
    { texto: 'Documentacion del modulo HTTP de Node.js', url: 'https://nodejs.org/dist/latest-v14.x/docs/api/http.html#http_http', externo: true },
    { texto: 'How to Create and Validate Modern Web Forms with HTML5', url: 'https://www.freecodecamp.org/news/create-and-validate-modern-web-forms-html5/', externo: true },
    { texto: 'Text fields in UI Design: 7 Common Styles', url: 'https://uxplanet.org/text-fields-in-ui-design-7-common-styles-ea5a76689892', externo: true }
  ],
  entrega: 'A traves de tu repositorio personal.'
};
