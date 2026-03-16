// Created by Denisse Maldonado
const LAB = {
  id: 'lab21',
  numero: 21,
  titulo: 'Funciones agregadas y sub-consultas',
  descripcion: 'En este laboratorio reforzar\u00e1s el manejo del lenguaje SQL para consultas en tablas utilizando funciones agregadas y sub-consultas.',
  modalidad: 'Individual',
  objetivos: [
    'Reforzar el manejo del lenguaje SQL para la consultas en tablas utilizando funciones agregadas y sub-consultas.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>' +
        'A modo de referencia, incluimos los esquemas de las tablas que creaste en la pr\u00e1ctica anterior y que ser\u00e1n con las que trabajaremos en esta pr\u00e1ctica:' +
        '<br>' +
        '<strong>' +
          '<br>Materiales(Clave, Descripci\u00f3n, Costo, PorcentajeImpuesto)' +
          '<br>Proveedores(RFC, RazonSocial)' +
          '<br>Proyectos(Numero, Denominacion)' +
          '<br>Entregan(Clave, RFC, Numero, Fecha, Cantidad)' +
        '</strong>' +
        '<br>' +
        '<br>Nota: De ser necesario crea los registros adecuados para probar que las consultas funcionan correctamente.' +
      '</li>' +
      '<li>' +
        'Con base en lo que se explica en la <strong>lectura sobre funciones agregadas</strong>, plantea y ejecuta las siguientes consultas, agregando los <strong>alias</strong> de columna necesarios para que los resultados resulten <strong>legibles</strong>:' +
        '<br>' +
        '<br>La suma de las cantidades e importe total de todas las entregas realizadas durante el 97.' +
        '<br>Para cada proveedor, obtener la raz\u00f3n social del proveedor, n\u00famero de entregas e importe total de las entregas realizadas.' +
        '<br>Por cada material obtener la clave y descripci\u00f3n del material, la cantidad total entregada, la m\u00ednima cantidad entregada, la m\u00e1xima cantidad entregada, el importe total de las entregas de aquellos materiales en los que la cantidad promedio entregada sea mayor a 400.' +
        '<br>Para cada proveedor, indicar su raz\u00f3n social y mostrar la cantidad promedio de cada material entregado, detallando la clave y descripci\u00f3n del material, excluyendo aquellos proveedores para los que la cantidad promedio sea menor a 500.' +
        '<br>Mostrar en una solo consulta los mismos datos que en la consulta anterior pero para dos grupos de proveedores: aquellos para los que la cantidad promedio entregada es menor a 370 y aquellos para los que la cantidad promedio entregada sea mayor a 450.' +
      '</li>' +
      '<li>' +
        'Utilizando la sentencia' +
        '<br>' +
        '<br><strong>INSERT INTO tabla VALUES (valorcolumna1, valorcolumna2, [...] , valorcolumnan) ;</strong>' +
        '<br>' +
        '<br>Considerando que los valores de tipos CHAR y VARCHAR deben ir encerrados entre ap\u00f3strofes, los valores num\u00e9ricos se escriben directamente y los de fecha, como \'1-JAN-00\' para 1o. de enero del 2000, inserta <strong>cinco</strong> nuevos materiales.' +
      '</li>' +
      '<li>' +
        'Con base en lo que se explica en la lectura sobre consultas con roles y subconsultas, plantea y ejecuta las siguientes consultas:' +
        '<br>' +
        '<br>Clave y descripci\u00f3n de los materiales que nunca han sido entregados.' +
        '<br>Raz\u00f3n social de los proveedores que han realizado entregas tanto al proyecto \'Vamos M\u00e9xico\' como al proyecto \'Quer\u00e9taro Limpio\'.' +
        '<br>Descripci\u00f3n de los materiales que nunca han sido entregados al proyecto \'CIT Yucat\u00e1n\'.' +
        '<br>Raz\u00f3n social y promedio de cantidad entregada de los proveedores cuyo promedio de cantidad entregada es mayor al promedio de la cantidad entregada por el proveedor con el RFC \'VAGO780901\'.' +
        '<br>RFC, raz\u00f3n social de los proveedores que participaron en el proyecto \'Infonavit Durango\' y cuyas cantidades totales entregadas en el 2000 fueron mayores a las cantidades totales entregadas en el 2001.' +
      '</li>' +
    '</ol>',
  entrega: 'Sube el laboratorio por Bitbucket o GitHub como: archivo lab9 + matricula.sql'
};
