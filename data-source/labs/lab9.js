/**
 * Lab 9 - DBMS de escritorio
 * Created by Denisse Maldonado
 */
const LAB = {
  id: 'lab9',
  numero: 9,
  titulo: 'DBMS de escritorio',
  descripcion: 'En esta actividad se usara el DBMS MariaDB para presentar algunas de las actividades necesarias para administrar bases de datos.',
  modalidad: 'Individual',
  objetivos: [
    'Usar el DBMS (Database Management System) MariaDB, para presentar algunas de las actividades necesarias para administrar bases de datos.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>' +
        '<p><strong>Crear una base de datos</strong></p>' +
        '<p>La primera actividad en el proceso es crear una base de datos. En esta actividad se establece el lugar o espacio en el que fisicamente sera alojada una base de datos. En el caso de MariaDB, el procedimiento es muy sencillo:</p>' +
        '<ol>' +
          '<li>Iniciar IDE DBeaver.</li>' +
          '<li>Crear la conexion con el usuario root y contrasena que usaste en la instalacion de MariaDB.</li>' +
          '<li>Crear la Base de Datos lab09db</li>' +
          '<li>Crear el usuario user_lab09db</li>' +
          '<li>Asignar los permisos necesarios al usuario</li>' +
          '<li>Realizar la conexion a la base de datos lab09db con el usuario user_lab09db</li>' +
        '</ol>' +
        '<p><strong>Crear tablas</strong></p>' +
        '<p>Una definicion operativa simple de base de datos relacional es "coleccion de tablas interrelacionadas". De aqui que una de las tareas basicas en la administracion de bases de datos consista en crear y modificar tablas.</p>' +
        '<p>Crear las tablas "materiales", "proyectos", "proveedores" y "entregan" siguiendo la definicion siguiente:</p>' +
        '<p><strong>Tabla: materiales</strong></p>' +
        '<table>' +
          '<tr><th>Columna</th><th>Tipo</th></tr>' +
          '<tr><td><u>Clave</u></td><td>Numerico (entero largo)</td></tr>' +
          '<tr><td>Descripcion</td><td>Texto (100 caracteres)</td></tr>' +
          '<tr><td>Precio</td><td>Numerico (simple)</td></tr>' +
        '</table>' +
        '<p><strong>Tabla: proyectos</strong></p>' +
        '<table>' +
          '<tr><th>Columna</th><th>Tipo</th></tr>' +
          '<tr><td><u>Numero</u></td><td>Numerico (entero largo)</td></tr>' +
          '<tr><td>Denominacion</td><td>Texto (100 caracteres)</td></tr>' +
        '</table>' +
        '<p><strong>Tabla: proveedores</strong></p>' +
        '<table>' +
          '<tr><th>Columna</th><th>Tipo</th></tr>' +
          '<tr><td><u>RFC</u></td><td>Texto (15 caracteres)</td></tr>' +
          '<tr><td>RazonSocial</td><td>Texto (100 caracteres)</td></tr>' +
        '</table>' +
        '<p><strong>Tabla: entregan</strong></p>' +
        '<table>' +
          '<tr><th>Columna</th><th>Tipo</th></tr>' +
          '<tr><td><u>Clave</u></td><td>Numerico (entero largo)</td></tr>' +
          '<tr><td><u>RFC</u></td><td>Texto (15 caracteres)</td></tr>' +
          '<tr><td><u>Numero</u></td><td>Numerico (entero largo)</td></tr>' +
          '<tr><td><u>Fecha</u></td><td>Fecha/Hora</td></tr>' +
          '<tr><td>Cantidad</td><td>Numerico (entero largo)</td></tr>' +
        '</table>' +
      '</li>' +
      '<li>' +
        '<p>Para la tabla "entregan" asegurate de definir la llave primaria y las llaves foraneas.</p>' +
        '<p><strong>Carga de datos.</strong></p>' +
        '<p>Otra actividad frecuente en la administracion de bases de datos consiste en cargar datos a las tablas, provenientes de otros sistemas o sencillamente de archivos que se han creado para este efecto.</p>' +
        '<p>Carga los datos de las tablas siguiendo las instrucciones del profesor.</p>' +
        '<p>Los archivos csv son archivos de texto que tienen renglones en los que cada renglon corresponde a un registro o renglon de la tabla y en cada uno de estos renglones, los valores correspondientes a cada columna estan separados por comas en estos archivos.</p>' +
        '<p><strong>Cargar datos de archivos .csv que te entrega tu profesor</strong></p>' +
        '<p>Un wizard te ira proponiendo opciones para cargar el archivo correspondiente. Estas son las respuestas a cada paso:</p>' +
        '<p>Define las siguientes consultas y guardalas con el nombre que se indica:</p>' +
        '<p><strong>Consulta Tuberias</strong></p>' +
        '<p>Clave, descripcion y precio unitario de los materiales cuya descripcion contenga el patron "Tub".</p>' +
        '<p><strong>Consulta Caros</strong></p>' +
        '<p>Clave, descripcion y precio unitario de los materiales cuyo precio es mayor que 300 pesos.</p>' +
        '<p><strong>Consulta Proveedores Ladrillos</strong></p>' +
        '<p>Aqui tendras que agregar las tablas: materiales, entregan y proveedores. En la parte de abajo seleccionar las columnas que quieras que aparezcan asi como sus condiciones.</p>' +
        '<p>Clave del material y razon social de los proveedores que entregan productos cuya descripcion contiene el patron "Ladrillos"</p>' +
        '<p><strong>Consulta Pinturas98</strong></p>' +
        '<p>Aqui tendras que agregar todas las tablas. En la parte de abajo seleccionar las columnas que quieras que aparezcan asi como sus condiciones.</p>' +
        '<p>Descripcion del material, razon social del proveedor, denominacion del proyecto, fecha y cantidad de las entregas de pinturas realizadas durante 1998.</p>' +
      '</li>' +
    '</ol>',
  entrega: 'A traves de Bitbucket o GitHub con el nombre matricula.mdb para archivo de Access 2003 o matricula.accdb para archivo de Access 2007.'
};
