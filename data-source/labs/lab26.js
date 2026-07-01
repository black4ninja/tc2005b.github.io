/**
 * Lab 26 - Servicios web
 * Created by Denisse Maldonado
 */
const LAB = {
  id: 'lab26',
  numero: 26,
  titulo: 'Servicios web',
  descripcion: 'En esta actividad exploraremos algunos APIs de aplicaciones web, con el objetivo de que aprendas a integrar funcionalidad en tus propias aplicaciones.',
  modalidad: 'Individual',
  objetivos: [
    'Entender que son los servicios web y su evolucion'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>' +
        '<p>Revisa junto con tu profesor, la <a href="https://docs.google.com/presentation/d/177NpbWXSFpHePxPvshN6L8gSbMNYXCOlrEPBw4jNcQI/edit?usp=sharing" target="_blank">presentacion de Servicios Web</a>.</p>' +
        '<p>Resuelve la siguiente implementacion:</p>' +
      '</li>' +
    '</ol>' +
    '<div class="lab-card">' +
      '<h4>Descripcion General</h4>' +
      '<p>Desarrollaras un servicio web RESTful que funcionara como backend para el juego Batalla Naval. Este servicio permitira a dos jugadores colocar sus barcos y realizar ataques por turnos a traves de peticiones HTTP.</p>' +
    '</div>' +
    '<div class="lab-card">' +
      '<h4>Reglas del Juego</h4>' +
      '<h5>Tablero de Juego</h5>' +
      '<ul>' +
        '<li>Cada jugador tiene su propio tablero/mapa de 10x10 cuadrantes</li>' +
        '<li>Las coordenadas se manejan como (x,y) donde ambas van de 0 a 9</li>' +
      '</ul>' +
      '<h5>Estados del Juego</h5>' +
      '<p>El juego puede estar en uno de estos estados:</p>' +
      '<ul>' +
        '<li><strong>SETEANDO</strong>: Fase inicial donde los jugadores colocan sus barcos</li>' +
        '<li><strong>JUGANDO</strong>: Fase donde los jugadores realizan ataques por turnos</li>' +
        '<li><strong>FINALIZADO</strong>: El juego ha terminado porque un jugador perdio todas sus naves</li>' +
      '</ul>' +
      '<h5>Flota de Barcos</h5>' +
      '<p>Cada jugador debe colocar exactamente 10 barcos distribuidos asi:</p>' +
      '<ul>' +
        '<li>1 Portaaviones (ocupa 5 celdas consecutivas)</li>' +
        '<li>2 Cruceros (cada uno ocupa 4 celdas consecutivas)</li>' +
        '<li>3 Destructores (cada uno ocupa 3 celdas consecutivas)</li>' +
        '<li>4 Submarinos (cada uno ocupa 2 celdas consecutivas)</li>' +
      '</ul>' +
      '<h5>Reglas para Colocar Barcos</h5>' +
      '<ul>' +
        '<li>Los barcos deben formarse en linea recta (horizontal o vertical), con celdas conectadas</li>' +
        '<li>Ningun barco puede tocar a otro barco (ni siquiera en diagonal)</li>' +
        '<li>Todos los barcos deben estar dentro del tablero 10x10</li>' +
      '</ul>' +
      '<h5>Mecanica de Juego</h5>' +
      '<ol>' +
        '<li>Se lanza una "moneda virtual" para determinar que jugador inicia</li>' +
        '<li>Los jugadores se alternan para atacar, siguiendo estas reglas:' +
          '<ul>' +
            '<li>Si un jugador ataca y acierta (golpea un barco enemigo), ese jugador puede atacar nuevamente</li>' +
            '<li>Si un jugador ataca y falla (no golpea ningun barco), el turno pasa al oponente</li>' +
          '</ul>' +
        '</li>' +
        '<li>El juego termina cuando un jugador pierde todos sus barcos</li>' +
      '</ol>' +
    '</div>' +
    '<div class="lab-card">' +
      '<h4>API RESTful a Implementar</h4>' +
      '<h5>Endpoints Requeridos</h5>' +
      '<div>' +
        '<h6>Gestion del Juego</h6>' +
        '<ul>' +
          '<li>' +
            '<strong>GET /game/create</strong>' +
            '<p>Crea un nuevo juego, eliminando cualquier juego en progreso</p>' +
            '<p>Cambia el estado a SETEANDO</p>' +
            '<p>Respuesta: Confirmacion de creacion exitosa</p>' +
          '</li>' +
          '<li>' +
            '<strong>GET /game/status</strong>' +
            '<p>Devuelve informacion sobre el estado actual del juego</p>' +
            '<p>Incluye: estado del juego, turno actual, resumen de golpes y barcos restantes</p>' +
            '<p>Respuesta: Objeto JSON con la informacion del estado</p>' +
          '</li>' +
        '</ul>' +
      '</div>' +
      '<div>' +
        '<h6>Fase Inicial</h6>' +
        '<ul>' +
          '<li>' +
            '<strong>GET /dice</strong>' +
            '<p>Determina aleatoriamente que jugador inicia el juego</p>' +
            '<p>Solo valido en estado SETEANDO</p>' +
            '<p>Respuesta: Numero del jugador que inicia (1 o 2)</p>' +
          '</li>' +
          '<li>' +
            '<strong>POST /game/create/:player</strong>' +
            '<p>Recibe y configura las posiciones de los barcos del jugador especificado</p>' +
            '<p>Parametro: player (1 o 2)</p>' +
            '<p>Cuerpo: JSON con las posiciones de los 10 barcos del jugador</p>' +
            '<p>Solo valido en estado SETEANDO</p>' +
            '<p>Cuando ambos jugadores hayan colocado sus barcos, cambia el estado a JUGANDO</p>' +
            '<p>Respuesta: Confirmacion de que las posiciones fueron aceptadas</p>' +
          '</li>' +
        '</ul>' +
      '</div>' +
      '<div>' +
        '<h6>Fase de Juego</h6>' +
        '<ul>' +
          '<li>' +
            '<strong>POST /game/turn</strong>' +
            '<p>Recibe la coordenada de ataque del jugador actual</p>' +
            '<p>Solo valido en estado JUGANDO</p>' +
            '<p>Cuerpo: JSON con coordenadas {x: numero, y: numero}</p>' +
            '<p>Valida que sea el turno correcto del jugador</p>' +
            '<p>Registra el resultado del ataque (golpe o fallo)</p>' +
            '<p>Actualiza el turno segun resultado</p>' +
            '<p>Si todos los barcos de un jugador son destruidos, cambia estado a FINALIZADO</p>' +
            '<p>Respuesta: Resultado del ataque (golpe/fallo) y actualizacion del turno</p>' +
          '</li>' +
        '</ul>' +
      '</div>' +
      '<div>' +
        '<h6>Informacion de Jugador</h6>' +
        '<ul>' +
          '<li>' +
            '<strong>GET /player/:playerNumber</strong>' +
            '<p>Devuelve informacion resumida del jugador especificado</p>' +
            '<p>Parametro: playerNumber (1 o 2)</p>' +
            '<p>Respuesta: JSON con informacion como barcos restantes, disparos realizados, etc.</p>' +
          '</li>' +
        '</ul>' +
      '</div>' +
      '<h5>Requerimientos Adicionales</h5>' +
      '<ul>' +
        '<li>Cada endpoint debe validar el estado actual del juego</li>' +
        '<li>Si una peticion no es valida para el estado actual, debe devolver un error apropiado</li>' +
        '<li>Toda respuesta debe incluir codigos HTTP adecuados (200 para exito, 400 para errores de cliente, etc.)</li>' +
        '<li>Las estructuras de datos para las peticiones y respuestas deben ser consistentes</li>' +
      '</ul>' +
    '</div>' +
    '<div class="lab-card">' +
      '<h4>Formato Sugerido para Envio de Datos</h4>' +
      '<h5>Ejemplo para colocar barcos (POST /game/create/:player)</h5>' +
      '<pre><code>{\n' +
      '  "ships": [\n' +
      '    {\n' +
      '      "type": "carrier",\n' +
      '      "positions": [[0,0], [0,1], [0,2], [0,3], [0,4]]\n' +
      '    },\n' +
      '    {\n' +
      '      "type": "cruiser",\n' +
      '      "positions": [[2,0], [2,1], [2,2], [2,3]]\n' +
      '    },\n' +
      '    // Resto de barcos...\n' +
      '  ]\n' +
      '}</code></pre>' +
      '<h5>Ejemplo para realizar un ataque (POST /game/turn)</h5>' +
      '<pre><code>{\n' +
      '  "player": 1,\n' +
      '  "attack": {\n' +
      '    "x": 5,\n' +
      '    "y": 7\n' +
      '  }\n' +
      '}</code></pre>' +
    '</div>' +
    '<p><strong>Notas adicionales:</strong> No es necesario que sigas tal cual el formato sugerido JSON para el envio de solicitudes, la actividad es libre y solo se calificara que la mecanica de juego funcione correctamente independientemente de como funcione internamente siempre y cuando siga los principios de los servicios web.</p>',
  recursos: [
    { texto: 'Public APIs', url: 'https://github.com/abhishekbanthia/Public-APIs?utm_source=SitePoint&utm_medium=email&utm_campaign=Versioning', externo: true },
    { texto: 'My Top 5 APIs For New Developers', url: 'https://medium.com/swlh/my-top-5-apis-for-new-developers-5191031da102', externo: true },
    { texto: 'What is an API and how to test it', url: 'https://www.freecodecamp.org/news/what-is-an-api-and-how-to-test-it/', externo: true }
  ],
  entrega: 'A traves de tu repositorio personal (Bitbucket o GitHub)'
};
