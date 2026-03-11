/**
 * Lab 8 - Introduccion al back-end
 * Created by Denisse Maldonado
 */
const LAB = {
  id: 'lab8',
  numero: 8,
  titulo: 'Introduccion al back-end',
  descripcion: 'En esta actividad haremos una introduccion al desarrollo en el back-end con node.',
  modalidad: 'Individual',
  objetivos: [
    'Entender como funcionan las aplicaciones web',
    'Preparar el ambiente de trabajo para hacer desarrollo en el back-end',
    'Instalar y ejecutar un servidor de aplicaciones web',
    'Atender peticiones HTTP desde el servidor y mandar respuestas HTTP'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>Sigue la demostracion del profesor en la sesion de clase.</li>' +
      '<li>Instala <a href="https://nodejs.org/en/" target="_blank">Node.js</a>. Node.js es un ambiente de ejecucion de JavaScript, el cual, a diferencia de js que se ejecuta en el navegador, permite tener acceso al sistema de archivos de la computadora, y ejecutar programas como servidores web.</li>' +
      '<li>Sigue la demostracion del profesor en la sesion de clase sobre los ejemplos basicos de node.</li>' +
      '<li>Escribe, prueba y ejecuta con node, scripts de js para los siguientes ejercicios y problemas. Muestra los resultados en consola:' +
        '<ul>' +
          '<li>Una funcion que reciba un arreglo de numeros y devuelva su promedio.</li>' +
          '<li>Una funcion que reciba un string y escriba el string en un archivo de texto. Apoyate del modulo <a href="https://nodejs.org/api/fs.html">fs</a>.</li>' +
          '<li>Escoge algun problema que hayas implementado en otro lenguaje de programacion, y dale una solucion en js que se ejecute sobre node.</li>' +
        '</ul>' +
      '</li>' +
      '<li>Sigue la demostracion del profesor en la sesion de clase sobre los ejemplos basicos para crear un servidor web que se ejecute sobre node, reciba peticiones de un cliente, y le responda.</li>' +
      '<li>Crea una pequena aplicacion web que al enviar una peticion al servidor, devuelva una de las paginas que creaste anteriormente en tus laboratorios.</li>' +
    '</ol>',
  recursos: [
    { texto: 'Introduction to Node.js', url: 'https://nodejs.dev/learn/introduction-to-nodejs', externo: true },
    { texto: 'Anatomy of an HTTP Transaction', url: 'https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/', externo: true },
    { texto: 'Documentacion del modulo HTTP de Node.js', url: 'https://nodejs.org/dist/latest-v14.x/docs/api/http.html#http_http', externo: true },
    { texto: 'JavaScript Clean Code', url: 'https://javascript.plainenglish.io/javascript-clean-code-all-you-need-to-know-f5db4045a400', externo: true },
    { texto: 'Synchronous vs Asynchronous JavaScript – Call Stack, Promises, and More', url: 'https://www.freecodecamp.org/news/synchronous-vs-asynchronous-in-javascript/', externo: true }
  ],
  entrega: 'A traves de tu repositorio personal'
};
