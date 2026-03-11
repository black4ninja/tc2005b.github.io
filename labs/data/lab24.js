/**
 * Lab 24 - AJAX
 * Created by Denisse Maldonado
 */
const LAB = {
  id: 'lab24',
  numero: 24,
  titulo: 'AJAX',
  descripcion: 'En esta actividad haremos una introduccion a las tecnologias AJAX.',
  modalidad: 'Individual',
  objetivos: [
    'Comprender que es AJAX y su mecanica basica de operacion',
    'Desarrollar aplicaciones que incorporen tecnologias AJAX'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>' +
        'Revisa junto con tu profesor la presentacion <a target="_blank" href="https://docs.google.com/presentation/d/1hEc8nvsEXjizjd2ZJJot8Xw_-Co84kP1P4FT2jCcVPE/edit?usp=sharing">Introduccion a AJAX</a>.' +
      '</li>' +
      '<li>' +
        '<div class="center-align">' +
          '<img class="responsive-img" alt="Diagrama de secuencia de una interaccion asincrona con AJAX" src="uml/ajax.png">' +
        '</div>' +
        'Primero, debemos preparar al servidor para que en lugar de enviar una pagina HTML completa, envie unicamente una parte de la pagina, texto, o datos. El ejemplo que realizaremos sera con datos estructurados en formato JSON, que es lo ideal para que nuestro servidor pueda atender distintos tipos de clientes. Para poder manipular facilmente las peticiones que llegan en formato JSON, es necesario registrar el middleware para manejar JSON que incluye <code>bodyParser</code>: ' +
        '<pre><code>' +
        'app.use(bodyParser.json());' +
        '</code></pre>' +
        'Y para enviar las respuestas en formato JSON, en nuestro controlador tenemos que cambiar la respuesta por:<br>' +
        '<pre><code>' +
        'response.status(200).json({message: "Respuesta asincrona"});' +
        '</code></pre>' +
      '</li>' +
      '<li>' +
        'Para poder hacer una peticion asincrona desde el javascript de nuestro cliente, debemos identificar el evento que detonara la peticion asincrona. En el caso de los botones, debemos asegurarnos que NO sean del tipo submit, y tambien debemos de eliminar los tags <code>form</code> para evitar que se dispare una peticion asincrona. <br>' +
        'Un ejemplo de codigo js asincrono en nuestro cliente, es el siguiente:' +
        '<pre><code>' +
        'const accion_asincrona = () => {\n' +
        '    const mensaje = document.getElementById(\'mensaje\').value;\n' +
        '    //El token de proteccion CSRF\n' +
        '    const csrf = document.getElementById(\'_csrf\').value;\n' +
        '\n' +
        '    //funcion que manda la peticion asincrona\n' +
        '    fetch(\'/ruta/asincrona\', {\n' +
        '        method: \'POST\',\n' +
        '        headers: {\n' +
        '            \'Content-Type\': \'application/json\',\n' +
        '            \'csrf-token\': csrf\n' +
        '        }\n' +
        '        body: JSON.stringify(data)\n' +
        '    }).then(result => {\n' +
        '        return result.json(); //Regresa otra promesa\n' +
        '    }).then(data => {\n' +
        '        //Modificamos el DOM de nuestra pagina de acuerdo a los datos de la segunda promesa\n' +
        '        //...\n' +
        '    }).catch(err => {\n' +
        '        console.log(err);\n' +
        '    });\n' +
        '};\n' +
        '\n' +
        'document.getElementById(\'mi_boton\').click = accion_asincrona;' +
        '</code></pre>' +
      '</li>' +
      '<li>' +
        'Para alguno de tus laboratorios anteriores o tu proyecto (o si lo prefieres empieza con una nueva aplicacion), integra al menos 1 componentes AJAX. Recuerda que el componente debe comunicarse con el servidor y debe actualizar alguna parte del sitio de manera asincrona.' +
        '<ul>' +
          '<li>Indica en alguna parte del sitio cuales fueron los componentes AJAX que utilizaste.</li>' +
          '<li>Utiliza una arquitectura MVC.</li>' +
          '<li>El componente debe tener coherencia y cierto nivel de complejidad.</li>' +
          '<li>Recuerda que tu aplicacion debe ser agradable para el usuario, y que las preguntas deben contestarse en alguna pagina dentro de tu sitio.</li>' +
        '</ul>' +
      '</li>' +
    '</ol>',
  preguntas: [
    '\u00bfQue importancia tiene AJAX en el desarrollo de RIA\'s (Rich Internet Applications)?',
    '\u00bfQue implicaciones de seguridad tiene AJAX? \u00bfDonde se deben hacer las validaciones de seguridad, del lado del cliente o del lado del servidor?',
    '\u00bfQue es JSON?'
  ],
  recursos: [
    { texto: 'What\'s AJAX', url: 'https://developer.mozilla.org/en-US/docs/Web/Guide/AJAX/Getting_Started', externo: true },
    { texto: 'Introduction to fetch()', url: 'https://developers.google.com/web/updates/2015/03/introduction-to-fetch', externo: true },
    { texto: 'Using Fetch', url: 'https://javascript.info/fetch', externo: true },
    { texto: 'Enviar datos por POST por Ajax con Fetch API', url: 'https://desarrolloweb.com/articulos/fetch-post-ajax-javascript.html', externo: true },
    { texto: 'Understanding Asynchronous JavaScript', url: 'https://blog.bitsrc.io/understanding-asynchronous-javascript-the-event-loop-74cd408419ff', externo: true },
    { texto: 'A Story of JSON', url: 'https://automationstepbystep.com/2020/05/04/a-story-of-json/', externo: true },
    { texto: 'JSON', url: 'https://www.json.org', externo: true }
  ],
  entrega: 'A traves de tu repositorio personal (Bitbucket o GitHub)'
};
