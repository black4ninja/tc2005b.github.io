/**
 * Lab 23 - Stored Procedures
 * Created by Denisse Maldonado
 */
const LAB = {
  id: 'lab23',
  numero: 23,
  titulo: 'Manipulacion de datos usando Stored Procedures',
  descripcion: 'En esta actividad aprenderemos a crear y utilizar procedimientos almacenados (Stored Procedures) en bases de datos.',
  modalidad: 'La que indique el profesor',
  objetivos: [
    'Comprender la definicion y uso de Stored Procedures'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>' +
        '<strong>Fundamento teorico.</strong>' +
      '</li>' +
      '<li>' +
        'Un procedimiento almacenado son sentencias SQL encapsuladas dentro de la sentencia CREATE PROCEDURE. El procedimiento almacenado puede contener una declaracion condicional como IF o CASE o ciclos. El procedimiento almacenado tambien puede ejecutar otro procedimiento almacenado o una funcion que modulariza el codigo.' +
        '<br><br>' +
        'Los siguientes son los beneficios de un procedimiento almacenado:' +
        '<br><br>' +
        'Reducir el trafico de red: se encapsulan varias sentencias SQL en un procedimiento almacenado. Cuando se ejecuta, en lugar de enviar multiples consultas (Comandos SQL), estamos enviando solo el nombre y los parametros del procedimiento almacenado' +
        '<br><br>' +
        'Facil de mantener: el procedimiento almacenado es reutilizable. Podemos implementar la logica de negocios dentro de un store procedure, y las aplicaciones pueden usarla varias veces, o diferentes modulos de una aplicacion pueden usar el mismo procedimiento. De esta forma, un procedimiento almacenado hace que la base de datos sea mas consistente. Si se requiere algun cambio, solo debe realizar un cambio en el procedimiento almacenado' +
        '<br><br>' +
        'Seguro: los procedimientos almacenados son mas seguros que las consultas AdHoc (A la medida). El permiso se puede otorgar al usuario para ejecutar el procedimiento almacenado sin otorgar permiso a las tablas utilizadas por el procedimiento almacenado. El procedimiento almacenado ayuda a evitar la inyeccion de SQL en la base de datos.' +
        '<br><br>' +
        '\u00bfQue desventajas identificas en la utilizacion de store procedures?' +
      '</li>' +
      '<li>' +
        'Por analogia a lo descrito en la sesion de clase, crea 3 procedimientos almacenados para alguno de tus laboratorios anteriores o para tu proyecto.' +
      '</li>' +
    '</ol>',
  recursos: [
    { texto: 'Store procedures en MariaDB', url: 'https://www.sqlshack.com/learn-mysql-the-basics-of-mysql-stored-procedures/#:~:text=The%20stored%20procedure%20is%20SQL,function%20that%20modularizes%20the%20code.', externo: true }
  ],
  entrega: 'A traves de tu repositorio personal (Bitbucket o GitHub)'
};
