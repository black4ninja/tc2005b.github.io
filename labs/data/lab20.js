// Created by Denisse Maldonado
const LAB = {
  id: 'lab20',
  numero: 20,
  titulo: 'Consultas en SQL',
  descripcion: 'En este laboratorio reforzar\u00e1s el manejo del lenguaje SQL para la manipulaci\u00f3n y consultas en tablas, explorando la equivalencia entre \u00e1lgebra relacional y SQL.',
  modalidad: 'Individual',
  objetivos: [
    'Reforzar el manejo del lenguaje SQL para la manipulaci\u00f3n y consultas en tablas.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>' +
        '<h5>Consultas b\u00e1sicas en SQL</h5>' +
        '<br>' +
        'Como recordar\u00e1s, todas las consultas que pueden plantearse con \u00e1lgebra relacional, pueden expresarse con SQL. En esta lectura se ilustra la equivalencia entre la notaci\u00f3n del \u00e1lgebra relacional y la de SQL, por medio de ejemplos basados en un esquema de referencia.' +
        '<br><br>' +
        'Al dise\u00f1ar consultas en SQL es importante considerar los siguientes puntos: <br><br>' +
        'La lista de columnas de la cl\u00e1usula SELECT es la lista de la proyecci\u00f3n final (m\u00e1s externa). ' +
        'La lista de tablas de la cl\u00e1usula FROM incluye a todas las tablas participantes. ' +
        'Las condiciones se expresan en la cl\u00e1usula WHERE, combin\u00e1ndolas con AND (o con OR seg\u00fan el significado espec\u00edfico).' +
        '<br><br>' +
        'A modo de referencia, incluimos los esquemas de las tablas que creaste en la pr\u00e1ctica anterior y que ser\u00e1n con las que trabajaremos en esta pr\u00e1ctica:' +
        '<br><br>' +
        'Materiales(Clave, Descripci\u00f3n, Costo)<br>' +
        'Proveedores(RFC, RazonSocial)<br>' +
        'Proyectos(Numero, Denominacion)<br>' +
        'Entregan(Clave, RFC, Numero, Fecha, Cantidad)' +
        '<br><br>' +
        'Convenio: para evitar las letras griegas originales del \u00e1lgebra relacional, en esta lectura se utiliza la siguiente notaci\u00f3n:' +
        '<br><br>' +
        'SL{condici\u00f3n} : selecci\u00f3n con el criterio condici\u00f3n.<br>' +
        'PR{lista de columnas}: proyecci\u00f3n de lista de columnas.<br>' +
        'JN: reuni\u00f3n natural (natural join).<br>' +
        'JN{condici\u00f3n}: reuni\u00f3n con el criterio condici\u00f3n (teta join).<br>' +
        'UN: uni\u00f3n.<br>' +
        'IN: intersecci\u00f3n.<br>' +
        '- : diferencia<br>' +
        'X: producto cartesiano.' +
        '<br><br>' +
        'Abre una sesi\u00f3n de Analizador de Consultas y ejecuta cada una de las sentencias SQL. En el reporte incluye la sentencia, una muestra de la salida (dos o tres renglones) y el n\u00famero de renglones que SQL Server reporta al final de la consulta.' +
        '<br><br>' +
        'A continuaci\u00f3n se presenta la equivalencia entre los operadores y SQL:' +
        '<br><br>' +
        '<strong>Consulta de un tabla completa</strong><br><br>' +
        'Algebra relacional.<br>' +
        'materiales<br><br>' +
        'SQL<br>' +
        'select * from materiales' +
        '<br><br>' +
        '<strong>Selecci\u00f3n</strong><br><br>' +
        'Algebra relacional.<br>' +
        'SL{clave=1000}(materiales)<br><br>' +
        'SQL<br>' +
        'select * from materiales<br>' +
        'where clave=1000' +
        '<br><br>' +
        '<strong>Proyecci\u00f3n</strong><br><br>' +
        'Algebra relacional.<br>' +
        'PR{clave,rfc,fecha} (entregan)<br><br>' +
        'SQL<br>' +
        'select clave,rfc,fecha from entregan' +
        '<br><br>' +
        '<strong>Reuni\u00f3n Natural</strong><br><br>' +
        'Algebra relacional.<br>' +
        'entregan JN materiales<br><br>' +
        'SQL<br>' +
        'select * from materiales,entregan<br>' +
        'where materiales.clave = entregan.clave' +
        '<br><br>' +
        'Si alg\u00fan material no ha se ha entregado \u00bfAparec\u00eder\u00eda en el resultado de esta consulta?' +
        '<br><br>' +
        '<strong>Reuni\u00f3n con criterio espec\u00edfico</strong><br><br>' +
        'Algebra relacional.<br>' +
        'entregan JN{entregan.numero &lt;= proyectos.numero} proyectos<br><br>' +
        'SQL<br>' +
        'select * from entregan,proyectos<br>' +
        'where entregan.numero &lt;= proyectos.numero' +
        '<br><br>' +
        '<strong>Uni\u00f3n (se ilustra junto con selecci\u00f3n)</strong><br><br>' +
        'Algebra relacional.<br>' +
        'SL{clave=1450}(entregan) UN SL{clave=1300}(entregan)<br><br>' +
        'SQL<br>' +
        '(select * from entregan where clave=1450)<br>' +
        'union<br>' +
        '(select * from entregan where clave=1300)' +
        '<br><br>' +
        '\u00bfCu\u00e1l ser\u00eda una consulta que obtuviera el mismo resultado sin usar el operador Uni\u00f3n? Compru\u00e9balo.' +
        '<br><br>' +
        '<strong>Intersecci\u00f3n (se ilustra junto con selecci\u00f3n y proyecci\u00f3n)</strong><br><br>' +
        'Algebra relacional.<br>' +
        'PR{clave}(SL{numero=5001}(entregan)) IN PR{clave}(SL{numero=5018}(entregan))<br><br>' +
        'SQL<br>' +
        'Nota: Debido a que en SQL server no tiene definida alguna palabra reservada que nos permita hacer esto de una manera entendible, veremos esta secci\u00f3n en el siguiente laboratorio con el uso de Subconsultas. Un ejemplo de un DBMS que si tiene la implementaci\u00f3n de una palabra reservada para esta funci\u00f3n es Oracle, en \u00e9l si se podr\u00eda generar la consulta con una sintaxis como la siguiente:' +
        '<br><br>' +
        '(select clave from entregan where numero=5001)<br>' +
        'intersect<br>' +
        '(select clave from entregan where numero=5018)' +
        '<br><br>' +
        '<strong>Diferencia (se ilustra con selecci\u00f3n)</strong><br><br>' +
        'Algebra relacional.<br>' +
        'entregan - SL{clave=1000}(entregan)<br><br>' +
        'SQL<br>' +
        '(select * from entregan)<br>' +
        'minus<br>' +
        '(select * from entregan where clave=1000)' +
        '<br><br>' +
        'Nuevamente, "minus" es una palabra reservada que no est\u00e1 definida en SQL Server, define una consulta que regrese el mismo resultado.' +
        '<br><br>' +
        '<strong>Producto cartesiano</strong><br><br>' +
        'Algebra relacional.<br>' +
        'entregan X materiales<br><br>' +
        'SQL<br>' +
        'select * from entregan,materiales' +
        '<br><br>' +
        '\u00bfC\u00f3mo est\u00e1 definido el n\u00famero de tuplas de este resultado en t\u00e9rminos del n\u00famero de tuplas de entregan y de materiales?' +
        '<br><br>' +
        '<strong>Construcci\u00f3n de consultas a partir de una especificaci\u00f3n</strong><br><br>' +
        'Plantea ahora una consulta para obtener las descripciones de los materiales entregados en el a\u00f1o 2000.' +
        '<br><br>' +
        'Recuerda que la fecha puede indicarse como \'1-JAN-2000\' o \'01/01/00\'.' +
        '<br><br>' +
        '<strong>Importante:</strong> Recuerda que cuando vayas a trabajar con fechas, antes de que realices tus consultas debes ejecutar la instrucci\u00f3n "set dateformat dmy". Basta con que la ejecutes una sola vez para que el manejador sepa que vas a trabajar con ese formato de fechas.' +
        '<br><br>' +
        '\u00bfPor qu\u00e9 aparecen varias veces algunas descripciones de material?' +
        '<br><br>' +
        '<strong>Uso del calificador distinct</strong><br><br>' +
        'En el resultado anterior, observamos que una misma descripci\u00f3n de material aparece varias veces.' +
        '<br><br>' +
        'Agrega la palabra distinct inmediatamente despu\u00e9s de la palabra select a la consulta que planteaste antes.' +
        '<br><br>' +
        '\u00bfQu\u00e9 resultado obtienes en esta ocasi\u00f3n?' +
        '<br><br>' +
        '<strong>Ordenamientos.</strong><br><br>' +
        'Si al final de una sentencia select se agrega la cl\u00e1usula<br><br>' +
        'order by campo [desc] [,campo [desc] ...]<br><br>' +
        'donde las partes encerradas entre corchetes son opcionales (los corchetes no forman parte de la sintaxis), los puntos suspensivos indican que pueden incluirse varios campos y la palabra desc se refiere a descendente. Esta cl\u00e1usula permite presentar los resultados en un orden espec\u00edfico.' +
        '<br><br>' +
        'Obt\u00e9n los n\u00fameros y denominaciones de los proyectos con las fechas y cantidades de sus entregas, ordenadas por n\u00famero de proyecto, presentando las fechas de la m\u00e1s reciente a la m\u00e1s antigua.' +
        '<br><br>' +
        '<strong>Uso de expresiones.</strong><br><br>' +
        'En \u00e1lgebra relacional los argumentos de una proyecci\u00f3n deben ser columnas. Sin embargo en una sentencia SELECT es posible incluir expresiones aritm\u00e9ticas o funciones que usen como argumentos de las columnas de las tablas involucradas o bien constantes. Los operadores son:' +
        '<br><br>' +
        '+ Suma<br>' +
        '- Resta<br>' +
        '* Producto<br>' +
        '/ Divisi\u00f3n' +
        '<br><br>' +
        'Las columnas con expresiones pueden renombrarse escribiendo despu\u00e9s de la expresi\u00f3n un alias que puede ser un nombre arbitrario; si el alias contiene caracteres que no sean n\u00fameros o letras (espacios, puntos etc.) debe encerrarse entre comillas dobles (" nuevo nombre"). Para SQL Server tambi\u00e9n pueden utilizarse comillas simples.' +
        '<br><br>' +
        '<strong>Operadores de cadena</strong><br><br>' +
        'El operador LIKE se aplica a datos de tipo cadena y se usa para buscar registros, es capaz de hallar coincidencias dentro de una cadena bajo un patr\u00f3n dado.' +
        '<br><br>' +
        'Tambi\u00e9n contamos con el operador comod\u00edn (%), que coincide con cualquier cadena que tenga cero o m\u00e1s caracteres. Este puede usarse tanto de prefijo como sufijo.' +
        '<br><br>' +
        'SELECT * FROM productos where Descripcion LIKE \'Si%\'' +
        '<br><br>' +
        '\u00bfQu\u00e9 resultado obtienes?<br>' +
        'Explica que hace el s\u00edmbolo \'%\'.<br>' +
        '\u00bfQu\u00e9 sucede si la consulta fuera : LIKE \'Si\' ?<br>' +
        '\u00bfQu\u00e9 resultado obtienes?<br>' +
        'Explica a qu\u00e9 se debe este comportamiento.' +
        '<br><br>' +
        'Otro operador de cadenas es el de concatenaci\u00f3n, (+, +=) este operador concatena dos o m\u00e1s cadenas de caracteres.<br>' +
        'Su sintaxis es : Expresi\u00f3n + Expresi\u00f3n.<br>' +
        'Un ejemplo de su uso, puede ser:<br>' +
        'SELECT (Apellido + \', \' + Nombre) as Nombre FROM Personas;' +
        '<br><br>' +
        'DECLARE @foo varchar(40);<br>' +
        'DECLARE @bar varchar(40);<br>' +
        'SET @foo = \'\u00bfQue resultado\';<br>' +
        'SET @bar = \' \u00bf\u00bf\u00bf??? \'<br>' +
        'SET @foo += \' obtienes?\';<br>' +
        'PRINT @foo + @bar;' +
        '<br><br>' +
        '<strong>' +
        '\u00bfQu\u00e9 resultado obtienes de ejecutar el siguiente c\u00f3digo?<br>' +
        '\u00bfPara qu\u00e9 sirve DECLARE?<br>' +
        '\u00bfCu\u00e1l es la funci\u00f3n de @foo?<br>' +
        '\u00bfQue realiza el operador SET?' +
        '</strong>' +
        '<br><br>' +
        'Sin embargo, tenemos otros operadores como [ ] , [^] y _.' +
        '<br><br>' +
        '[ ] - Busca coincidencia dentro de un intervalo o conjunto dado. Estos caracteres se pueden utilizar para buscar coincidencias de patrones como sucede con LIKE.' +
        '<br><br>' +
        '[^] - En contra parte, este operador coincide con cualquier caracter que no se encuentre dentro del intervalo o del conjunto especificado.' +
        '<br><br>' +
        '_ - El operador _ o guion bajo, se utiliza para coincidir con un caracter de una comparaci\u00f3n de cadenas.' +
        '<br><br>' +
        'Ahora explica el comportamiento, funci\u00f3n y resultado de cada una de las siguientes consultas:' +
        '<br><br>' +
        'SELECT RFC FROM Entregan WHERE RFC LIKE \'[A-D]%\';<br>' +
        'SELECT RFC FROM Entregan WHERE RFC LIKE \'[^A]%\';<br>' +
        'SELECT Numero FROM Entregan WHERE Numero LIKE \'___6\';' +
        '<br><br>' +
        '<strong>Operadores compuestos.</strong><br><br>' +
        'Los operadores compuestos ejecutan una operaci\u00f3n y establecen un valor.<br>' +
        '+ = (Suma igual)<br>' +
        '- = (Restar igual)<br>' +
        '* = (Multiplicar igual)<br>' +
        '/ = (Dividir igual)<br>' +
        '% = (M\u00f3dulo igual)' +
        '<br><br>' +
        '<strong>Operadores L\u00f3gicos.</strong><br><br>' +
        'Los operadores l\u00f3gicos comprueban la verdad de una condici\u00f3n, al igual que los operadores de comparaci\u00f3n, devuelven un tipo de dato booleano (True, false o unknown).' +
        '<br><br>' +
        '<strong>ALL</strong> Es un operador que compara un valor num\u00e9rico con un conjunto de valores representados por un subquery. La condici\u00f3n es verdadera cuando todo el conjunto cumple la condici\u00f3n.' +
        '<br><br>' +
        '<strong>ANY o SOME</strong> Es un operador que compara un valor num\u00e9rico con un conjunto de valores. La condici\u00f3n es verdadera cuando al menos un dato del conjunto cumple la condici\u00f3n.' +
        '<br><br>' +
        'La sintaxis para ambos es: valor_numerico {operador de comparaci\u00f3n} subquery' +
        '<br><br>' +
        '<strong>BETWEEN</strong> Es un operador para especificar intervalos. Una aplicaci\u00f3n muy com\u00fan de dicho operador son intervalos de fechas.' +
        '<br><br>' +
        'SELECT Clave,RFC,Numero,Fecha,Cantidad<br>' +
        'FROM Entregan<br>' +
        'WHERE Numero Between 5000 and 5010;' +
        '<br><br>' +
        '\u00bfC\u00f3mo filtrar\u00edas rangos de fechas?' +
        '<br><br>' +
        '<strong>EXISTS</strong> Se utiliza para especificar dentro de una subconsulta la existencia de ciertas filas.' +
        '<br><br>' +
        'SELECT RFC,Cantidad, Fecha,Numero<br>' +
        'FROM [Entregan]<br>' +
        'WHERE [Numero] Between 5000 and 5010 AND<br>' +
        'Exists ( SELECT [RFC]<br>' +
        'FROM [Proveedores]<br>' +
        'WHERE RazonSocial LIKE \'La%\' and [Entregan].[RFC] = [Proveedores].[RFC] )' +
        '<br><br>' +
        '\u00bfQu\u00e9 hace la consulta?<br>' +
        '\u00bfQu\u00e9 funci\u00f3n tiene el par\u00e9ntesis ( ) despu\u00e9s de EXISTS?' +
        '<br><br>' +
        'IN Especifica si un valor dado tiene coincidencias con alg\u00fan valor de una subconsulta. ' +
        'NOTA: Se utiliza dentro del WHERE pero debe contener un parametro. ' +
        'Ejemplo: Where proyecto.id IN Lista_de_Proyectos_Subquery' +
        '<br><br>' +
        '<strong>Tomando de base la consulta anterior del EXISTS, realiza el query que devuelva el mismo resultado, pero usando el operador IN</strong>' +
        '<br><br>' +
        'NOT Simplemente niega la entrada de un valor booleano.' +
        '<br><br>' +
        'Tomando de base la consulta anterior del EXISTS, realiza el query que devuelva el mismo resultado, pero usando el operador NOT IN. ' +
        'Realiza un ejemplo donde apliques alg\u00fan operador : ALL, SOME o ANY.' +
        '<br><br>' +
        'El Operador TOP, es un operador que recorre la entrada, un query, y s\u00f3lo devuelve el primer n\u00famero o porcentaje especifico de filas basado en un criterio de ordenaci\u00f3n si es posible.' +
        '<br><br>' +
        '\u00bfQu\u00e9 hace la siguiente sentencia? Explica por qu\u00e9.<br>' +
        'SELECT TOP 2 * FROM Proyectos' +
        '<br><br>' +
        '\u00bfQu\u00e9 sucede con la siguiente consulta? Explica por qu\u00e9.<br>' +
        'SELECT TOP Numero FROM Proyectos' +
        '<br><br>' +
        '<strong>Modificando la estructura de un tabla existente.</strong><br><br>' +
        'Agrega a la tabla materiales la columna PorcentajeImpuesto con la instrucci\u00f3n:<br>' +
        'ALTER TABLE materiales ADD PorcentajeImpuesto NUMERIC(6,2);<br>' +
        'A fin de que los materiales tengan un impuesto, les asignaremos impuestos ficticios basados en sus claves con la instrucci\u00f3n:<br>' +
        'UPDATE materiales SET PorcentajeImpuesto = 2*clave/1000;<br>' +
        'esto es, a cada material se le asignar\u00e1 un impuesto igual al doble de su clave dividida entre diez.' +
        '<br><br>' +
        'Revisa la tabla de materiales para que compruebes lo que hicimos anteriormente.' +
        '<br><br>' +
        '\u00bfQu\u00e9 consulta usar\u00edas para obtener el importe de las entregas es decir, el total en dinero de lo entregado, basado en la cantidad de la entrega y el precio del material y el impuesto asignado?' +
        '<br><br>' +
        '<strong>Creaci\u00f3n de vistas</strong><br><br>' +
        'La sentencia:<br><br>' +
        'Create view nombrevista (nombrecolumna1 , nombrecolumna2 ,..., nombrecolumna3 )<br>' +
        'as select...' +
        '<br><br>' +
        'Permite definir una vista. Una vista puede pensarse como una consulta etiquetada con un nombre, ya que en realidad al referirnos a una vista el DBMS realmente ejecuta la consulta asociada a ella, pero por la cerradura del \u00e1lgebra relacional, una consulta puede ser vista como una nueva relaci\u00f3n o tabla, por lo que es perfectamente v\u00e1lido emitir la sentencia:' +
        '<br><br>' +
        'select * from nombrevista' +
        '<br><br>' +
        '\u00a1Como si nombrevista fuera una tabla!' +
        '<br><br>' +
        'Comprueba lo anterior, creando vistas para cinco de las consultas que planteaste anteriormente en la pr\u00e1ctica. Posteriormente revisa cada vista creada para comprobar que devuelve el mismo resultado.' +
        '<br><br>' +
        'La parte (nombrecolumna1,nombrecolumna2,.de la sentencia create view puede ser omitida si no hay ambig\u00fcedad en los nombres de las columnas de la sentencia select asociada.' +
        '<br><br>' +
        'Importante: Las vistas no pueden incluir la cl\u00e1usula order by.' +
        '<br><br>' +
        'A continuaci\u00f3n se te dan muchos enunciados de los cuales deber\u00e1s generar su correspondiente consulta.' +
        '<br><br>' +
        'En el reporte incluye la sentencia, una muestra de la salida (dos o tres renglones) y el n\u00famero de renglones que SQL Server reporta al final de la consulta.' +
        '<br><br>' +
        'Los materiales (clave y descripci\u00f3n) entregados al proyecto "M\u00e9xico sin ti no estamos completos".' +
        '<br><br>' +
        'Los materiales (clave y descripci\u00f3n) que han sido proporcionados por el proveedor "Acme tools".' +
        '<br><br>' +
        'El RFC de los proveedores que durante el 2000 entregaron en promedio cuando menos 300 materiales.' +
        '<br><br>' +
        'El Total entregado por cada material en el a\u00f1o 2000.' +
        '<br><br>' +
        'La Clave del material m\u00e1s vendido durante el 2001. (se recomienda usar una vista intermedia para su soluci\u00f3n)' +
        '<br><br>' +
        'Productos que contienen el patr\u00f3n \'ub\' en su nombre.' +
        '<br><br>' +
        'Denominaci\u00f3n y suma del total a pagar para todos los proyectos.' +
        '<br><br>' +
        'Denominaci\u00f3n, RFC y RazonSocial de los proveedores que se suministran materiales al proyecto Televisa en acci\u00f3n que no se encuentran apoyando al proyecto Educando en Coahuila (Solo usando vistas).' +
        '<br><br>' +
        'Denominaci\u00f3n, RFC y RazonSocial de los proveedores que se suministran materiales al proyecto Televisa en acci\u00f3n que no se encuentran apoyando al proyecto Educando en Coahuila (Sin usar vistas, utiliza not in, in o exists).' +
        '<br><br>' +
        'Costo de los materiales y los Materiales que son entregados al proyecto Televisa en acci\u00f3n cuyos proveedores tambi\u00e9n suministran materiales al proyecto Educando en Coahuila.' +
        '<br><br>' +
        '<strong>Reto: Usa solo el operador NOT IN en la consulta anterior (No es parte de la entrega).</strong>' +
        '<br><br>' +
        'Nombre del material, cantidad de veces entregados y total del costo de dichas entregas por material de todos los proyectos.' +
        '<br><br>' +
        '<strong>Muchas de estas consultas requieren la utilizaci\u00f3n de funciones agregadas...<br><br>' +
        'Se recomienda que revises nuevamente la lectura.</strong>' +
      '</li>' +
    '</ol>',
  entrega: 'El laboratorio se entrega por medio de tu repositorio de BitBucket o GitHub. Puedes entregar la investigaci\u00f3n en un pdf o presentarla como una p\u00e1gina web. Incl\u00fayela dentro de la carpeta del laboratorio.'
};
