/**
 * Lab 25 - Transacciones
 * Created by Denisse Maldonado
 */
const LAB = {
  id: 'lab25',
  numero: 25,
  titulo: 'Manipulacion de datos usando Transacciones',
  descripcion: 'Una transaccion es una secuencia de operaciones realizadas como una sola unidad logica de trabajo. Una unidad logica de trabajo debe exhibir cuatro propiedades, conocidas como propiedades ACID (atomicidad, coherencia, aislamiento y durabilidad), para ser calificada como transaccion.',
  modalidad: 'Individual',
  objetivos: [
    'Comprender las caracteristicas de una transaccion',
    'Aprender a implementar transacciones'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>' +
        '<h5>Introduccion</h5>' +
        '<p>Una transaccion es una secuencia de operaciones realizadas como una sola unidad logica de trabajo. Una unidad logica de trabajo debe exhibir cuatro propiedades, conocidas como propiedades ACID (atomicidad, coherencia, aislamiento y durabilidad), para ser calificada como transaccion.</p>' +
        '<ul>' +
          '<li><strong>Atomicidad: </strong>Una transaccion debe ser una unidad atomica de trabajo, tanto si se realizan todas sus modificaciones en los datos, como si no se realiza ninguna de ellas.</li>' +
          '<li><strong>Coherencia: </strong>Cuando finaliza, una transaccion debe dejar todos los datos en un estado coherente. En una base de datos relacional, se deben aplicar todas las reglas a las modificaciones de la transaccion para mantener la integridad de todos los datos. Todas las estructuras internas de datos, como indices de arbol B o listas doblemente vinculadas, deben estar correctas al final de la transaccion.</li>' +
          '<li><strong>Aislamiento: </strong>Las modificaciones realizadas por transacciones simultaneas se deben aislar de las modificaciones llevadas a cabo por otras transacciones simultaneas. Una transaccion ve los datos en el estado en que estaban antes de que otra transaccion simultanea los modificara o despues de que la segunda transaccion se haya concluido, pero no ve un estado intermedio. Esto se conoce como seriabilidad debido a que su resultado es la capacidad de volver a cargar los datos iniciales y reproducir una serie de transacciones para finalizar con los datos en el mismo estado en que estaban despues de realizar las transacciones originales.</li>' +
          '<li><strong>Durabilidad: </strong>Una vez concluida una transaccion, sus efectos son permanentes en el sistema. Las modificaciones persisten aun en el caso de producirse un error del sistema.</li>' +
        '</ul>' +
      '</li>' +
      '<li>' +
        '<h5>Especificar y exigir transacciones</h5>' +
        '<p>Los programadores de <strong>SQL</strong> son los responsables de <strong>iniciar y finalizar</strong> las transacciones en puntos que exijan la <strong>coherencia logica</strong> de los datos.</p>' +
        '<p>El programador debe <strong>definir la secuencia de modificaciones de datos</strong> que los dejan en un estado <strong>coherente</strong> en relacion con las reglas corporativas de la organizacion.</p>' +
        '<p>A continuacion, el programador incluye estas instrucciones de modificacion en una sola <strong>transaccion</strong> de forma que el DBMS puede exigir la <strong>integridad fisica</strong> de la misma.</p>' +
        '<p>Es responsabilidad de un <strong>manejador de base de datos corporativo</strong> (SQL Server, Oracle, Informix, MariaDB, etc.) proporcionar los mecanismos que aseguren la <strong>integridad fisica de cada transaccion</strong>.</p>' +
      '</li>' +
      '<li>' +
        '<h5>Los manejadores proporcionan:</h5>' +
        '<ul>' +
          '<li><strong>Servicios de bloqueo</strong> que preservan el aislamiento de la transaccion.</li>' +
          '<li><strong>Servicios de registro</strong> que aseguran la durabilidad de la transaccion. Aun en el caso de que falle el hardware del servidor, el sistema operativo o el propio DBMS utiliza registros de transacciones <strong>"bitacoras o log files"</strong>, al reinicio, para deshacer automaticamente las transacciones incompletas en el momento en que se produjo el error en el sistema.</li>' +
          '<li><strong>Caracteristicas de administracion de transacciones</strong> que exigen la atomicidad y coherencia de la transaccion. Una vez iniciada una transaccion, debe concluirse correctamente o el DBMS deshara todas las modificaciones de datos realizadas desde que se inicio la transaccion.</li>' +
        '</ul>' +
      '</li>' +
      '<li>' +
        '<h5>Tipos de transacciones</h5>' +
        '<p>En resumen, una transaccion es una unidad unica de trabajo. Si una transaccion tiene exito, todas las modificaciones de los datos realizadas durante la transaccion se confirman y se convierten en una parte permanente de la base de datos. Si una transaccion encuentra errores y debe cancelarse o deshacerse, se borran todas las modificaciones de los datos.</p>' +
      '</li>' +
      '<li>' +
        '<h5>Los gestores de bases de datos funcionan en tres modos de transaccion:</h5>' +
        '<ul>' +
          '<li><strong>Transacciones de confirmacion automatica: </strong>Cada instruccion individual es una transaccion (lo que ocurre por default al realizar un insert, update, delete, create, etc. en consola en el "analizador de consultas").</li>' +
          '<li><strong>Transacciones explicitas: </strong>Cada transaccion se inicia explicitamente con la instruccion <strong>BEGIN TRANSACTION</strong> y se termina explicitamente con una instruccion <strong>COMMIT</strong> o <strong>ROLLBACK</strong>.</li>' +
          '<li><strong>Transacciones implicitas: </strong>Se inicia implicitamente una nueva transaccion cuando se ha completado la anterior, pero cada transaccion se completa explicitamente con una instruccion <strong>COMMIT</strong> o <strong>ROLLBACK</strong>.</li>' +
        '</ul>' +
        '<p><strong>Nota: </strong>Para que logres una mayor comprension del tema, se te recomienda que complementes lo leido en este laboratorio, con referencias bibliograficas adicionales e incluso revises la ayuda de MariaDB cuyo tema sea "transacciones".</p>' +
      '</li>' +
      '<li>' +
        'Sigue las indicaciones del profesor en la sesion de clase.' +
      '</li>' +
    '</ol>',
  entrega: 'A traves de Bitbucket o Github'
};
