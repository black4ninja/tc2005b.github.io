// Created by Denisse Maldonado
const LAB = {
  id: 'lab15',
  numero: 15,
  titulo: 'Conociendo el ambiente de MariaDB',
  descripcion: 'En esta pr\u00e1ctica conoceremos el ambiente en el que utilizaremos un DBMS (Database Management System) con alcance empresarial.',
  modalidad: 'La que indique el profesor.',
  objetivos: [
    'En esta pr\u00e1ctica conoceremos el ambiente en el que utilizaremos un DBMS (Database Management System) con alcance empresarial.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li><strong>Arquitectura.</strong><br><br>' +
        'Un DBMS empresarial en general ofrece servicio a muchos usuarios y maneja grandes vol\u00famenes de informaci\u00f3n por lo que t\u00edpicamente reside en un servidor, es decir una computadora con suficientes recursos en t\u00e9rminos de almacenamiento, capacidad de procesamiento y un sistema operativo que sea eficiente para trabajar con m\u00faltiples procesos concurrentemente.' +
      '</li>' +
      '<li><strong>SQL es el lenguaje que se utiliza para:</strong><br><br>' +
        '<strong>Consultas</strong> (Seleccionar determinadas secciones de una o varias tablas)<br>' +
        '<strong>Manipulaci\u00f3n</strong> (insertar, modificar, eliminar registros o tuplas)<br>' +
        '<strong>Definici\u00f3n</strong> (Crear base de datos, tablas, etc. mediante la utilizaci\u00f3n de c\u00f3digo)<br>' +
        '<strong>Programaci\u00f3n</strong> (Crear procedimientos o rutinas que nos permitan automatizar alg\u00fan proceso)' +
      '</li>' +
      '<li><strong>Creaci\u00f3n de las tablas de una base de datos en SQL</strong><br><br>' +
        'En esta practica crearemos las tablas que nos servir\u00e1n para llevar a cabo las pr\u00e1cticas de laboratorio subsecuentes.<br><br>' +
        'Se tiene el siguiente modelo entidad-relaci\u00f3n:<br><br>' +
        '<div align="center"><img src="../imagenes/lab10-4.jpg"><br></div><br>' +
        '<strong>IMPORTANTE:</strong> La <strong>fecha</strong> y la <strong>cantidad</strong> son atributos de la relaci\u00f3n <strong>Entregan</strong>, adicionalmente la fecha debe formar parte de la <strong>llave</strong> de la tabla que represente a la relaci\u00f3n <strong>Entregan</strong> ya que un proveedor puede hacer m\u00e1s de una entrega de un mismo material a un mismo proyecto, pero con fecha distinta. Esto es equivalente a tener una "entidad virtual" que es el tiempo, cuya llave es la fecha en la que ocurre la entrega. Dicho de otra forma, el atributo Fecha nos est\u00e1 sirviendo para asegurarnos que cada relaci\u00f3n en la tabla <strong>Entregan</strong> ser\u00e1 <strong>\u00fanica.</strong><br><br>' +
        'A partir de dicho modelo, el <strong>esquema relacional</strong> que se deriva es el siguiente:' +
        '<blockquote>' +
          '<strong>Materiales(<u>Clave</u>,Descripci\u00f3n,Costo)</strong><br>' +
          '<strong>Proveedores(<u>RFC</u>,RazonSocial)</strong><br>' +
          '<strong>Proyectos(<u>Numero</u>,Denominacion)</strong><br>' +
          '<strong>Entregan(<u>Clave,RFC,Numero,Fecha</u>,Cantidad)</strong>' +
        '</blockquote>' +
      '</li>' +
    '</ol>',
  recursos: [
    { texto: 'Script de creaci\u00f3n de tablas y carga de datos', url: '../documentos/bd_laboratorio6_crearTablas_cargarTablas.sql', externo: true },
    { texto: 'Script de carga de datos', url: '../documentos/bd_laboratorio6 _cargarTablas.sql', externo: true }
  ],
  entrega: 'Presta atenci\u00f3n a la sesi\u00f3n de clase en el uso de la herramienta, ya que se dar\u00e1n las instrucciones a detalle de la actividad. Esta actividad es de car\u00e1cter individual y se espera que al final de la misma, tengas la base de datos creada con las tablas creadas.'
};
