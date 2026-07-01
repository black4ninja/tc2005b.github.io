---
sidebar_position: 4
---
# Intro a Javascript

Para este laboratorio tendrás aparte los archivos HTML y JS correspondientes para poder verlos desde tu navegador y podrás ver cada concepto dentro de este documento.

Javascript es el lenguaje de programación por excelencia para usarse dentro del navegador, cuando hablamos de desarrollo web, tenemos que el código HTML, le da estructura a nuestra página, el CSS le da el estilo y JS nos permite dotar de funcionalidad a nuestro sitio.

Visto de otra forma, JS nos va a ayudar a que en la arquitectura cliente-servidor, sea el cliente el que tenga mayor capacidad de solicitar al servidor de información ya sea a través de la petición de la misma o el guardado.

Comenzaremos desde la base de como declarar el javascript para poder trabajar con él, hasta los conceptos generales que tiene el lenguaje de programación.

> Nota: este curso no está orientado a ser una clase de programación de javascript, solamente se toman las nociones básicas para poder empezar a construir sitios web, se te pide que poco a poco entiendas el lenguaje con práctica e investigando por tu cuenta las peculiaridades y especializaciones del lenguaje.

## Inline Scripting
Cuando hablamos de empezar a trabajar con Javascript vamos a tener varias formas de hacerlo.

La primera de ellas es a través del inline scripting o dentro del mismo archivo HTML donde estemos trabajando. Esta forma nos permite visualizar el código en cualquier parte del archivo.

Por lo general aunque se puede realizar la buena práctica nos dice que debemos separar en archivos diferentes la funcionalidad, pero eso lo veremos poco a poco.

Los programas de Javascript pueden ser insertados en cualquier parte del HTML usando la etiqueta

```    
<script></script>
```

Antes era necesarios añadir el atributo **type** pero en las nuevas versiones esto ya no es necesario pues el navegador lo hace de manera automática.
    
```
<script type="text/javascript">
    ...
</script>
```

Para tener una base de donde comenzar podemos tener el siguiente código:

```
<!DOCTYPE HTML>
<html>

<body>

  <p>Before the script...</p>

  <script>
    alert( 'Hello, world!' );
  </script>

  <p>...After the script.</p>

</body>

</html>
```
En el ejemplo anterior vemos como con el uso de la etiqueta **script** podemos añadir en su interior el código de javascript que queramos ejecutar.

La declaración que usamos es una llamada a la función **alert()**, la cual recibe como parámetro un string, y al momento de ejecutarse en el navegador nos muestra un modal de alerta simple con el texto que hayamos pasado como parámetro.

````
<!-- 
    Los programas de Javascript pueden ser insertados en cualquier 
    parte del HTML usando la etiqueta
    <script></script>

    Antes era necesarios añadir el atributo type pero en las nuevas 
    versiones esto ya no es necesario.
    <script type="text/javascript">
    ...
    </script>
-->
<!DOCTYPE HTML>
<html>

<body>

  <p>Before the script...</p>

  <script>
    alert( 'Hello, world!' );
  </script>

  <p>...After the script.</p>

</body>

</html>
````

## Estructura de Código
También podemos añadir el código de javascript en archivos separados, en general siempre esta es la mejor práctica que debemos seguir.

Una buena práctica es colocarlos en la parte de abajo afuera del body por cuestiones de carga y velocidad de la página.

En el siguiente archivo HTML vamos a hacer uso de un archivo javascript externo, para ello el nombre del archivo será **script** y la extensión del mismo será .js el cual justamente delimita los archivos de javascript.

```
<!DOCTYPE HTML>
<html>

<body>

  <p>Before the script...</p>


  <p>...After the script.</p>

</body>
<script src="./1_separate_file_script.js"></script>

</html>
```
Observa que colocamos la etiqueta del **script** fuera de la etiqueta **body**, esto es una buena práctica recomendada por lo navegadores, y esto se debe a la carga de la página.

Cuando trabajamos con Javascript es muy común que este realice procesamiento, si la página contiene estilos e imágenes su tiempo de carga puede empezar a aumentar entre más cosas tenga, si a eso le añadimos el tiempo de procesamiento de Javascript hay páginas que tardan hasta 1 minuto en cargar. Si hablamos de páginas web optimizadas son segundos los que tarda un usuario en salirse sin haber visto nuestro contenido. Por ello al colocar el script fuera del body hacemos que esta carga se realice de manera paralela a cuando el usuario ya está navegando esto ayuda a recuperar valiosos segundos de navegación.

Debe existir un equilibrio entre cuando cargar de manera paralela y la carga inicial de la página, pero todo esto se refiere a un tema de optimización para posicionamiento de la página en buscadores y es todo un tema de estudio.

Ahora bien dentro del nuevo archivo **script.js** podemos empezar directamente a escribir el código de javascript sin necesidad de escribir alguna directiva o etiqueta adicional como se muestra a continuación.

```
alert( 'Hello, world!' );
```

Observa que estamos usando nuevamente la misma declaración que cuando hicimos el **inline scripting**, solo que ahora lo hacemos desde el archivo separado, el resultado final será el mismo que el anterior pero habremos realizado una buena práctica separando nuestros códigos.

[Ver ejemplo completo](/node/tutorials/intro_web/Lab4JS/2CodeStructure/1SeparateFiles.zip)

Podemos cargar tantos archivos de javascript como necesitemos y pueden o no  estar en la carpeta o utilizar algún CDN.

>Nota: Un CDN es un tipo de servidor especial que esta orientado a servir archivos públicos como HTML, CSS, JS, imágenes, etc. Estos servidores tienen la peculiaridad que al no procesar información como un servidor normal son más baratos y tienen un mayor alcance, la idea es poder generar múltiples al rededor del mundo para dar mayor acceso a las aplicaciones. Un ejemplo es que se recomienda que las aplicaciones en React utilicen estos servidores para servir rápidamente la interfaz de usuario independientemente de como se procese la información tal y como lo hace Facebook.

```
<!DOCTYPE HTML>
<html>

    <body>

        <p>Before the script...</p>


        <p>...After the script.</p>

    </body>
    <script src="./script2.js"></script>
    <script src="./script3.js"></script>

</html>
```

Aquí el contenido de **script2** es el siguiente

```
alert( 'Hello' );
```

Y para **script3** el contenido es el siguiente

```
alert( 'world!' );
```

El resultado final es que la ejecución de las instrucciones viene dada por el orden en que colocamos los archivos, entonces para el navegador la fila de instrucciones quedaría de la siguiente forma:

```
alert( 'Hello' );
alert( 'world!' );
```

Si cambiamos de orden los archivos, entonces la fila de instrucciones se invertiría dejando un resultado como:

```
alert( 'world!' );
alert( 'Hello' );
```

> Este último punto es importante ya que si en algún momento necesitamos cargar una librería y ejecutar un código en un archivo separado dependiente de esa librería, debemos asegurarnos que el código se ejecuta después de haberla cargado. Es un error muy común al inicio perder esto de vista y por lo mismo podemos perder tiempo validando código funcional cuando que el verdadero problema es que la librería ni siquiera se ha cargado correctamente al momento de ejecutar el código.

[Ver ejemplo completo](/node/tutorials/intro_web/Lab4JS/2CodeStructure/2MultipleScripts.zip)

Como adicional observa lo que pasa cuando intentamos cargar un archivo externo de javascript y adentro de esa misma etiqueta ejecutar código también.

```
<!DOCTYPE HTML>
<html>

  <body>

    <p>Before the script...</p>


    <p>...After the script.</p>

  </body>
  
  <script src="./script.js">
      alert(1);
  </script>

</html>
```

Esta forma nos va a generar conflictos, pues si bien no vamos a ver un error en consola, el código que está dentro de la etiqueta no se va a ejecutar, pues una vez declarada la propiedad src de la etiqueta se da prioridad al archivo externo en este caso **script.js**.

Así bien la forma correcta de hacer lo anterior sería la siguiente

```
<!DOCTYPE HTML>
<html>

  <body>

    <p>Before the script...</p>


    <p>...After the script.</p>

  </body>
  <script src="./script.js"></script>
  <script>
    alert(1);
  </script>

</html>
```

Donde de manera continua separamos el código del archivo y en otra etiqueta el inline scripting que queremos ejecutar.

[Ver ejemplo completo](/node/tutorials/intro_web/Lab4JS/2CodeStructure/3CombinedScripting.zip)

**Nota: Para los siguiente ejemplos seguiremos con el entendido que el archivo HTML no se modifica y solo el contenido del script.js va cambiando**

La base del archivo HTML es la siguiente

```
<!DOCTYPE HTML>
<html>

<body>

  <p>Before the script...</p>


  <p>...After the script.</p>

</body>
<script src="./script.js"></script>

</html>
```

### Declaraciones
Las declaraciones son sintaxis y comandos que ejecutan acciones

Ya vimos la primer declaración alert('Hello World') que muestra el mensaje Hello World.

Podemos tener tantas declaraciones en nuestro código como queramos. Las declaraciones se separan con ;

Por ejemplo podemos separar "Hello World" en 2 alertas

```
alert('Hello'); alert('World');
```

Usualmente las declaraciones se escriben en líneas separadas para hacer el código más legible

```
alert('Hello');
alert('World');
```

### Punto y coma
El punto y coma puede ser omitido en la mayoría de los casos cuando un salto de línea exista.

```
alert('Hello')
alert('World')
```
Aquí Javascript interpreta el salto de línea como un punto y coma "implícito", a esto se le llama inserción automática de punto y coma.

>Nota: La mayoría de los casos una nueva línea implica un punto y coma. Pero en la mayoría de los casos no significa siempre.

Existen casos que una nueva línea no significa un punto y coma. Ejemplo:

```
alert(3 +
1
+ 2);
```

El código tiene una salida de 6 por que javascript no inserta el punto y coma aquí. Es obvio en este caso que si la línea termina con un +
entonces se tiene una expresión incompleta, por lo que un punto y coma sería incorrecto.


Ejemplo de un error, remover el punto y coma del alert para ver el cambio:

```
alert("Hello");

[1, 2].forEach(alert);
```

```
alert("Hello") //Aquí se genera el error

[1, 2].forEach(alert);
```

### Comentarios
Conforme el tiempo pasa los programas se hacen más y más complejos, entonces se vuelve necesario agrega comentarios que describen como funciona el código y por qué.

Los comentarios pueden ser colocados en cualquier lugar del script. Ellos no afectan su ejecución porque el engine simplemente lo ignora.

```
//One-line comments
```

```
/*
    Multiline comments
*/
```

```
//Comentarios anidados no son soportados
/*
  /* nested comment ?!? */
// */
```

Se recomienda el uso de estándares para la documentación del código para Javascript se utiliza [JSDoc](https://jsdoc.app/)

[Ver ejemplo completo](/node/tutorials/intro_web/Lab4JS/2CodeStructure/4CodeStructure.zip)

## UseStrict

Por un largo tiempo, Javascript evolucionó sin problemas de compatibilidad. Nuevas funcionalidades fueron añadidas al lenguaje
mientras mientras que funcionalidad antigua no cambió.

Eso tuvo el beneficio de nunca romper el código. Sin embargo, un problema de ello es que el lenguaje se quedó atrapado en el tiempo.

Esto cambio en 2009 con la llegada de ECMAScript5 (ES5) apareció. Agregó nuevas funcionalidades al lenguaje y modificar algunas de las existentes.
Para poder mantener el código viejo funcionando esas modificaciones fueron apagadas por default.

Para ello debes habilitar estas directivas usando: "use strict"

La directiva debe colocarse al inicio de un script, para que todo el script funcione de la forma "moderna".


```
"use strict";
```

Este código va a trabajar de la forma moderna
 
Asegúrate que "use strict" este hasta arriba, de otra forma no se habilitarán las funciones.

```
alert("some code");
// "use strict" below is ignored--it must be at the top

"use strict";
// strict mode is not activated
```

No existe directiva como "no use strict" que regrese el engine a su conducta anterior.
Una vez usado el strict mode no hay vuelta atrás.


¿QUÉ DEBO USAR?

El Javascript moderno soporta "clases" y "módulos" que veremos más adelante. Lo interesante es que no necesitamos de "use strict" para usarlos.

Por ahora "use strict;" es bienvenido como invitado al inicio de tus scripts.

Después, cuando tu código este todo en clases y módulos podrías omitirlo.

[Ver ejemplo completo](/node/tutorials/intro_web/Lab4JS/3UseStrict.zip)

## Variables

### Uso de let
Una variable es información guardada a través de un nombre.

Podemos usar las variables para guardar productos, visitantes y otro tipo de información.


Para crear una variable en Javascript usaremos la palabra reservada **let**

```
let message;
```

Ahora podemos asignar información a nuestra variable usando el operador **=**

```
message = 'Hello'; //Almacena el string 'Hello' en la variable message
```

El string ahora guardado en memoria se asocia con esa variable. Podemos acceder a la variable usando el nombre de la misma.

```
alert(message);
```

Para se concisos, podemos combinar la declaración de la variable y su asignación en una sola línea.

```
let message2 = 'Hello!';
alert(message2);
```

También podemos declarar múltiples variables en una sola línea

```
let user = 'John', age = 25, message = 'Hello';
```

Esta forma anterior puede ser corta pero no es recomendada. Por legibilidad es mejor usar una línea por variable

```
let user = 'John';
let age = 25;
let message = 'Hello';
```

Algunas personas definen múltiples variables en este estilo multi línea

```
let user = 'John',
  age = 25,
  message = 'Hello';
```

Incluso este estilo "comma-first"

```
let user = 'John'
  , age = 25
  , message = 'Hello';
```

Técnicamente todas estas variantes hacen lo mismo, entonces en más un estilo personal y de estética.

### Var en lugar de let

En scripts "antiguos", también puedes encontrar el uso de la palabra reservada **var** en lugar de **let**

```
var message3 = 'Hello';
```

La palabra reservada **var** es casi igual a **let**. Este tipo de declaración es la forma **old-school**.

Hay unas sutiles diferencias entre **let** y **var**"**, pero esas diferencias todavía no nos van a interesar.

### Declaraciones dobles

La declaraciones dobles generan error
```
let message4 = "This";
let message4 = "That"; // SyntaxError: 
```
**let** repetido puede llevar a un error
message' has already been declared

### Nombrado de variables

Existen 2 limitaciones al nombrado de variables
1. El nombre contiene solo letras, dígitos o símbolos $ y _.
2. El primer carácter no debe ser un dígito.

```
let userName;
let test123;
```

Cuando el nombre contiene múltiples palabras se utiliza el estilo camelCase.

Esto significa: Las palabras van seguidas, cada palabra excepto excepto la primera inician con mayúscula: myVeryLongName.

Lo que es interesante es que el signo de dólar **$** y el guión bajo **_** también pueden usarse en nombre.

Estos son símbolos regulares, justo como letras, sin ningún significado especial.

```
let $ = 1; // declarar la variable con el nombre "$"
let _ = 2; // y ahora la variable con el nombre "_"

alert($ + _); // 3
```
Si bien el ejemplo anterior funciona, al momento de leer el código este no es descriptivo en el contenido de las variables por lo que la recomendación es siempre declarar variables que den noción al programador de que es lo que contienen para tener un código más legible.

Ejemplos de variables con nombre incorrectos

```
let 1a; // No puede iniciar con un dígito
let my-name; // hyphens '-' no son permitidos
```

Las mayúsculas y minúsculas importan
Las variables nombradas apple y APPLE son 2 variables diferentes.

```
let apple;
let APPLE;
```

Caracteres no latinos son permitidos, pero no recomendados.
Es posible usar cualquier lenguaje, incluyendo letras Cirílicas, logogramas Chinos

```
let имя = '...';
let 我 = '...';
```

Técnicamente no existe un error. Pero la convención internacional usa Inglés para el nombre de variables.

Una asignación sin usar use strict

``` 
// Nota: No se usa "use strict" en este ejemplo

num = 5; // La variable "num" es creada si no existe.
alert(num); // 5
```

Esta es una mala práctica y es causa de error con el strict mode

```
"use strict";

num = 5; // error: num is not defined
```

### Constantes
Para declarar constantes, valores que no cambian, se usa la palabra reservada **const** en lugar de **let**.

```
const myBirthday = '18.04.1982';
```

Las variables declaradas usando 'const' son llamadas "constantes". Estas no pueden ser reasignadas. Un intento para hacerlo causará un error

``` 
const myBirthday2 = '18.04.1982';
myBirthday2 = '01.01.2001'; // error, can't reassign the constant!
```

#### Constantes en mayúsculas

La buena práctica para el uso de constantes difíciles de recordad es usar valores conocidos antes de su ejecución.

Tales constantes son nombrados usando mayúsculas y guiones bajos. 

```
const COLOR_RED = "#F00";
const COLOR_GREEN = "#0F0";
const COLOR_BLUE = "#00F";
const COLOR_ORANGE = "#FF7F00";

// ...when we need to pick a color
let color = COLOR_ORANGE;
alert(color); // #FF7F00
```

Beneficios:
- COLOR_ORANGE es más fácil de recordar que #FF7F00
- Es más fácil equivocarse escribiendo "#FF7F00" que COLOR_ORANGE
- Cuando leemos el código, COLOR_ORANGE es mas significativo que #FF7F00

### ¿Reusar o crear variables?
Algunos programadores tienden a re usar las variables en lugar re declarar nuevas.

Como resultado, sus variables son como cajas donde avientan cosas sin cambiar sus nombres. Como resultado, ¿qué hay dentro de la caja?¿quién sabe?
Necesitamos ir a detalle y verificar, esto consume mucho tiempo.

Una variable extra es buena, no mala. Pregúntate lo siguiente: ¿Cuánto te cobran por una nueva variable? NADA, SON GRATIS.

Los sistemas modernos de Javascript optimizan muy bien el código, entonces no habrá problemas de rendimiento.
Usar diferentes nombre de variables ayuda incluso al motor de Javascript a optimizar más tu código.

[Ver ejemplo completo](/node/tutorials/intro_web/Lab4JS/4Variables.zip)

## Tipos de datos

Un valor en Javascript siempre es de cierto tipo. Por ejemplo, un string o un número

Existen 8 TIPOS BÁSICOS de datos en Javascript.

Podemos colocar cualquier tipo en una variable. Por ejemplo. una variable puede ser un string y después almacenar un número.

```
let message = "hello";
message = 123456;
```
Los lenguajes de programación que permiten esto tales como Javascript son conocidos como dinámicamente tipados, esto significa que existen tipos de datos, pero las variables
no están ligados a ninguno de ellos.

### Number
```
let n = 123;
n = 12.345;
```

El tipo number representa tanto enteros como flotantes.

Existen muchos tipos de operación para los números. ej. multiplicación *, división /, suma +, resta -, etc.

Además de los números regulares, también tenemos valores especiales que son: Infinity, -Infinity y NaN.

- Infinity: Representa el ∞ infinito matemático. Es un valor especial que es mayor a cualquier número.

```
alert( 1 / 0 ); // Infinity
alert( Infinity ); // Infinity
```

- NaN: representa un error computacional. Es el resultado de una operación matemática incorrecta o no definida.
```
alert( "not a number" / 2 ); // NaN, tal división es errónea

//NaN es continua. Cualquier operación matemática en NaN regresa NaN
alert( NaN + 1 ); // NaN
alert( 3 * NaN ); // NaN
alert( "not a number" / 2 - 1 ); // NaN
```
Así que si una operación matemática devuelve NaN, se propaga el resultado.

Realizar operaciones matemáticas en Javascript es "seguro", podemos hacer lo que sea: dividir por 0, tratar valores no numéricos como números, etc.

El script no fallará con un error fatal. Lo más que puede suceder es obtener un NaN como resultado.

### BigInt
En Javascript los números se representan por valores enteros (253-1) (eso es 9007199254740991), o menores que -(253-1) para negativos.

Para ser precisos los números puede soportar hasta 1.7976931348623157 ^ 10308, pero fuera de ese rango existirá un error de precisión, porque no todos los dígitos
caben en 64-bits. Por lo que un valor aproximado será guardado.

```
console.log(9007199254740991 + 1); // 9007199254740992
console.log(9007199254740991 + 2); // 9007199254740992
```

Para ello el BigInt fue agregado recientemente y se usan agregando una n al final del número.

La n al final representa el BigInt

```
const bigInt = 1234567890123456789012345678901234567890n;
```

> Nota: No es muy común utilizar este tipo de números pero es bueno conocerlos en caso de necesitarlos.

### String
Un string en Javascript se rodea por comillas

```
let str = "Hello";
let str2 = 'Single quotes are ok too';
let phrase = `can embed another ${str}`;
```
En Javascript existen 3 tipos de comillas:

1. Dobles: "Hello".
2. Simples: 'Hello'.
3. Backticks: \`Hello\`.

Dobles y simples son comillas "sencillas". Prácticamente no existe diferencia en Javascript.

Backticks son comillas de "funcionalidad extendida". Estas nos permiten meter variables y expresiones dentro de un string usando
la simbología \$\{...\}, por ejemplo

```
let name = "John";

// embed a variable
alert( `Hello, ${name}!` ); // Hello, John!

// embed an expression
alert( `the result is ${1 + 2}` ); // the result is 3
```


### Boolean

El tipo boolean tiene los valores true y false
let nameFieldChecked = true; // yes, name field is checked
let ageFieldChecked = false; // no, age field is not checked

Los valores booleanos son resultado de comparaciones

```
let isGreater = 4 > 1;
alert( isGreater ); // true
```
### Null

El valor especial null no pertenece a ninguno de los tipos descritos previamente

Forma parte de un tipo separado de tipos que contienen el valor null

```
let age = null;
```

En Javascript, null es una referencia a un objeto no existente, o un apuntador nulo como en otros lenguajes.

Es un valor especial el cual representa "nada", "vacío" o "desconocido"

El código de arriba indica que age es desconocido.

### Undefined

El valor especial undefined también es un tipo aparte. Es un tipo en sí mismo, como null.

El significado de undefined es "valor no asignado"

Si una variable es declarada, pero no asignada, entonces su valor es undefined

```
let age;
alert(age); // shows "undefined"
```

Técnicamente es posible asignar undefined a una variable

```
let age = 100;

// change the value to undefined
age = undefined;

alert(age); // "undefined"
```

Pero no te recomiendo realizar esta acción. Normalmente, uno utiliza null para asignar "vacío" o "desconocido" a una variable, mientras que undefined está reservado al valor inicial default para quitar la asignación cosas.

### Objetos y símbolos

El tipo especial Object:
Todos los otros tipos son llamados "primitive" por que sus valores pueden contener solo una cosa (un string o un número). En contraste, los objetos son usados para almacenar colecciones de datos y entidades más complejas.

Por lo mismo, los objetos merecen un tratamiento especial.

El tipo symbol:
Se usa para crear identificadores únicos para objetos. Tenemos que mencionarlos pero vamos a posponer sus detalles para más adelante.

### El operador typeof

El operador typeof regresa un tipo de operando. Es útil cuando queremos procesar valores de diferens tipos o solo verificar.

La llamada a typeof x regresa un string con el nombre del tipo de valor de la variable

```
typeof undefined // "undefined"
typeof 0 // "number"
typeof 10n // "bigint"
typeof true // "boolean"
typeof "foo" // "string"
typeof Symbol("id") // "symbol"
typeof Math // "object"  (1)
typeof null // "object"  (2)
typeof alert // "function"  (3)
```

Los últimos 3 necesitan una explicación adicional
1. Math - provee operaciones matemáticas, de momento nos sirve como ejemplo de un objeto.
2. El resultado del typeof null es "object". Ese es un error oficial reconocido que viene desde las versiones antiguas de Javascript.
3. El resultado de typeof alert es "function", por que la alerta es una función. Las funciones son un tipo especial.

[Ver ejemplo completo](/node/tutorials/intro_web/Lab4JS/5DataTypes.zip)

## Interacción: Alert, prompt, confirm
Como vamos a estar utilizando el navegador para visualizar nuestro ambiente de demostración, vamos a ver algunas funciones para interactuar con el usuario.

### Alert

Este lo hemos estado utilizando  previamente. Aquí se muestra un mensaje que espera a que el usuario presione "OK".

```
alert("Hello");
```

### Prompt

La función prompt acepta 2 argumentos. Es una ventana de texto y un campo de texto para el visitante, el resultado contiene los botones OK/Cancel.

result = prompt(title, [default]);

title - Es el texto que se muestra al visitante.
default - Como opcional es el segundo parámetro, el valor inicial para el campo de entrada de texto

Las llaves cuadrada en la sintaxis[...]

Las llaves cuadradas al rededor de default en la sintaxis denotan que el parámetro es opcional, no requerido.

```
let age = prompt('How old are you?', 100);

alert(`You are ${age} years old!`); // You are 100 years old!
```

Para IE siempre coloca un default
```
let test = prompt("Test", ''); // <-- for IE
```

### Confirm
La función confirm muestra una ventana modal con una pregunta y dos botones de OK y Cancel.

```
let isBoss = confirm("Are you the boss?");
alert( isBoss ); // true if OK is pressed
```

[Ver ejemplo completo](/node/tutorials/intro_web/Lab4JS/6Interaction.zip)

## Conversiones de Tipos

### Conversión de Strings

Conversiones de string suceden cuando necesitamos convertir un valor en un string.

```
let value = true;
alert(typeof value); // boolean

value = String(value); // now value is a string "true"
alert(typeof value); // string
```

Las conversiones de string son las más obvias. Un false se convierte en "false", null se convierte en "null", etc.

### Conversión Numérica
La conversión numérica es una función matemática y las expresiones se dan de manera automática.

```
//alert( "6" / "2" ); // 3, strings are converted to numbers
```

Podemos usar la función Number(value) para convertir explícitamente un valor a número

```
let str = "123";
alert(typeof str); // string

let num = Number(str); // becomes a number 123
alert(typeof num); // number
```

La conversión explícita es requerida  cuando se lee un valor desde string como texto pero se espera un número para ser guardado.

Si el string no es un número válido, el resultado de la conversión es un NaN.

```
let age = Number("an arbitrary string instead of a number");
alert(age); // NaN, conversion failed
```

```
alert( Number("   123   ") ); // 123
alert( Number("123z") );      // NaN (error reading a number at "z")
alert( Number(true) );        // 1
alert( Number(false) );       // 0
```

### Conversión Booleana

Esta es la más sencilla
```
alert( Boolean(1) ); // true
alert( Boolean(0) ); // false

alert( Boolean("hello") ); // true
alert( Boolean("") ); // false
```

[Ver ejemplo completo](/node/tutorials/intro_web/Lab4JS/7TypeConversions.zip)

## Operadores Básicos Matemáticos

Términos unarios y binarios

```
let x = 1;

x = -x;
console.log( x ); // -1

let x = 1, y = 3;
console.log( y - x ); // 2
```

### Operaciones Matemáticas
Las siguientes operaciones matemáticas son soportadas:
- Suma +,
- Resta -,
- Multiplicación *,
- División /,
- Resto o Modular %,
- Exponenciación **.

### Resto %
```
console.log( 5 % 2 ); // 1
console.log( 8 % 3 ); // 2
console.log( 8 % 4 ); // 0
```

### Exponenciación **
```
console.log( 2 ** 2 ); // 2² = 4
console.log( 2 ** 3 ); // 2³ = 8
console.log( 2 ** 4 ); // 2⁴ = 16
```

### Concatenación de string binaria con + 
```
    let s = "my" + "string";
    console.log(s); // mystring
```

```
console.log( '1' + 2 ); // "12"
console.log( 2 + '1' ); // "21"

console.log(2 + 2 + '1' ); // "41" y no "221"
console.log('1' + 2 + 2); // "122" y no "14"

console.log( 6 - '2' ); // 4, convierte '2' a número
console.log( '6' / '2' ); // 3, convierte ambos operandos en número
```

### Conversión numérica, unaria +

```
// No effect on numbers
let x = 1;
console.log( +x ); // 1

let y = -2;
console.log( +y ); // -2

// Converts non-numbers
console.log( +true ); // 1
console.log( +"" );   // 0
```

### Encadenar asignaciones
```
let a, b, c;

a = b = c = 2 + 2;

console.log( a ); // 4
console.log( b ); // 4
console.log( c ); // 4
```

### Modificar al momento
```
let n = 2;
n = n + 5;
n = n * 2;

let n = 2;
n += 5; // now n = 7 (same as n = n + 5)
n *= 2; // now n = 14 (same as n = n * 2)

console.log( n ); // 14
```

### Incrementar
```
let counter = 2;
counter++;        
alert( counter ); // 3
```

### Decrementar
```
let counter = 2;
counter--;       
alert( counter ); // 1
```

### Operadores Bitwise
Funcionan en operaciones de bajo nivel, y son poco utilizadas pero existen:

- AND ( & )
- OR ( | )
- XOR ( ^ )
- NOT ( ~ )
- LEFT SHIFT ( \<\< )
- RIGHT SHIFT ( >> )
- ZERO-FILL RIGHT SHIFT ( >>> )

[Ver ejemplo completo](/node/tutorials/intro_web/Lab4JS/8BasicOperators.zip)

## Comparaciones
```
console.log( 2 > 1 );  // true (correct)
console.log( 2 == 1 ); // false (wrong)
console.log( 2 != 1 ); // true (correct)
```

```
console.log( 'Z' > 'A' ); // true
console.log( 'Glow' > 'Glee' ); // true
console.log( 'Bee' > 'Be' ); // true
```

```
console.log( '2' > 1 ); // true, string '2' becomes a number 2
console.log( '01' == 1 ); // true, string '01' becomes a number 1
```

### Igualdad estricta
```
console.log( 0 == false ); // true
//String vacío
console.log( '' == false ); // true
```

### Comparación entre null y undefined
```
console.log( null === undefined ); // false
```

### Null vs 0
```
console.log( null > 0 );  // (1) false
console.log( null == 0 ); // (2) false
console.log( null >= 0 ); // (3) true
```

### No comparar undefined
```
console.log( undefined > 0 ); // false (1)
console.log( undefined < 0 ); // false (2)
console.log( undefined == 0 ); // false (3)
```
[Ver ejemplo completo](/node/tutorials/intro_web/Lab4JS/9Comparisons.zip)

## Condicionales

### Declaraciones IF

```
let year = prompt('In which year was ECMAScript-2015 specification published?', '');

if (year == 2015) console.log( 'You are right!' );
```

```
if (year == 2015) {
    console.log( "That's correct!" );
    console.log( "You're so smart!" );
}
```

### Conversión booleana
```
if (0) { // 0 es falso
  //...
}
```

```
if (1) { // 0 es verdadero
  //...
}
```

```
let cond = (year == 2015); // evalúa para verdadero o false

if (cond) {
  //...
}
```

### El ELSE
```
let year = prompt('In which year was the ECMAScript-2015 specification published?', '');

if (year == 2015) {
    console.log( 'You guessed it right!' );
} else {
    console.log( 'How can you be so wrong?' ); // any value except 2015
}
```

### Operador condicional ?
```
let accessAllowed;
let age = prompt('How old are you?', '');

if (age > 18) {
    accessAllowed = true;
} else {
    accessAllowed = false;
}

console.log(accessAllowed);
```

```
let result = condition ? value1 : value2;
let accessAllowed = (age > 18) ? true : false;
```


#### Múltiple ?
```
let age = prompt('age?', 18);

let message = (age < 3) ? 'Hi, baby!' :
(age < 18) ? 'Hello!' :
(age < 100) ? 'Greetings!' :
'What an unusual age!';

console.log( message );
```

```
if (age < 3) {
    message = 'Hi, baby!';
} else if (age < 18) {
    message = 'Hello!';
} else if (age < 100) {
    message = 'Greetings!';
} else {
    message = 'What an unusual age!';
}
```

### La declaración switch
```
switch(x) {
    case 'value1':  // if (x === 'value1')
        ...
        [break]

    case 'value2':  // if (x === 'value2')
        ...
        [break]

    default:
        ...
        [break]
}
```

```
let a = 2 + 2;

switch (a) {
case 3:
    console.log( 'Too small' );
    break;
case 4:
    console.log( 'Exactly!' );
    break;
case 5:
    console.log( 'Too big' );
    break;
default:
    console.log( "I don't know such values" );
}
```


#### Agrupando case
```
let a = 3;

switch (a) {
case 4:
    console.log('Right!');
    break;

case 3: // (*) grouped two cases
case 5:
    console.log('Wrong!');
    console.log("Why don't you take a math class?");
    break;

default:
    console.log('The result is strange. Really.');
}
```

[Ver ejemplo completo](/node/tutorials/intro_web/Lab4JS/10Conditionals.zip)

## Ciclos

### Ciclo while

```
while (condición) {
  // código
}
```

```
let i = 0;
while (i < 3) { 
  console.log( i );
  i++;
}

let i = 3;
while (i) { 
  console.log( i );
  i--;
}

let i = 3;
while (i) alert(i--);
```

### Ciclo Do..while

```
do {
    // código
} while (condition);
```

```
let i = 0;
do {
  alert( i );
  i++;
} while (i < 3);
```

### Ciclo for
```
for (begin; condition; step) {
    //code
}
```

```
for (let i = 0; i < 3; i++) { // shows 0, then 1, then 2
    console.log(i);
}
```

### Break o rompiendo el ciclo
```
let sum = 0;

while (true) {
  let value = +prompt("Enter a number", '');

  if (!value) break; // (*)
  sum += value;
}
console.log( 'Sum: ' + sum );
```

### Continuar la siguiente iteración
```
for (let i = 0; i < 10; i++) {
    // si es verdadero, saltar lo que queda del cuerpo
    if (i % 2 == 0) continue;

    console.log(i); // 1, luego 3, 5, 7, 9
}
```

[Ver ejemplo completo](/node/tutorials/intro_web/Lab4JS/11Loops.zip)

## Funciones

### Declaración de funciones
```
function showMessage() {
  console.log( 'Hello everyone!' );
}
showMessage();
showMessage();
```  

```
function name(parameter1, parameter2, ... parameterN) {
    // código
}
```

### Variables locales
```
function showMessage() {
    let message = "Hello, I'm JavaScript!"; // local variable

    console.log( message );
}

showMessage(); // Hello, I'm JavaScript!

console.log( message ); // <-- Error! The variable is local to the function
```

### Variables externas
```
let userName = 'John';

function showMessage() {
  let message = 'Hello, ' + userName;
  alert(message);
}

showMessage(); // Hello, John
```

``` 
let userName = 'John';

function showMessage() {
    userName = "Bob";

    let message = 'Hello, ' + userName;
    console.log(message);
}

console.log( userName );
showMessage();
console.log( userName );
```

### Parámetros
``` 
function showMessage(from, text) { // parameters: from, text
    console.log(from + ': ' + text);
}

showMessage('Ann', 'Hello!'); // Ann: Hello! (*)
showMessage('Ann', "What's up?"); // Ann: What's up? (**)
```

### Valores default
```
function showMessage(from, text = "no text given") {
    console.log( from + ": " + text );
}

showMessage("Ann"); // Ann: no text given
showMessage("Ann", undefined);
```

### Regresando valores
```
function sum(a, b) {
    return a + b;
}

let result = sum(1, 2);
console.log( result ); // 3
```

### Nombrado de funciones
Las funciones son acciones. Su nombre por lo general es un verbo. Este debe ser breve, tan preciso como sea posible y describir lo que la función hace, para que quien lea el código entienda que hace.

Por ejemplo, las funciones que empiezan con "show" por lo general muestran algo.

Otros ejemplos serían:
- "get..." - regresa un valor
- "calc..." - calcula algo
- "create..." - crea algo
- "check..." - checa algo y regresa un boolean, etc.


El resultado final sería algo como:
- showMessage(..)     // shows a message
- getAge(..)          // returns the age (gets it somehow)
- calcSum(..)         // calculates a sum and returns the - result
- createForm(..)      // creates a form (and usually returns it)
- checkPermission(..) // checks a permission, returns true/false

### Expresiones con funciones

En Javascript, una función no es una "estructura mágica del lenguaje", más bien es un tipo especial de valores.

La sintaxis que usamos anteriormente se le conoce como **Function Declaration**.

```
function sayHi() {
  console.log( "Hello" );
}
```

Existe otra sintaxis que es llamada **Function Expression**. Esta forma nos permite crear una función en medio de cualquier expresión. Esto es algo muy importante pues es lo que hace diferente a Javascript de muchos lenguajes de programación, ya que podemos hacer muchas operaciones como almacenar la función en una variable.

```
let sayHi = function() {
  console.log( "Hello" );
};
```

Aquí podemos ver que la variable **sayHi** obtiene el valor, la nueva función, creada como **function() \{ alert("Hello"); \}**.

Como la creación de la función sucede en el contexto de la expresión de asignación (a la derecha del operador =), esta es una **Function Expression.**

Por favor observa que no hay un nombre después de la palabra reservada **function**. Omitiendo el nombre es permitido por las **Function Expressions**.

Aquí inmediatamente se asigna el valor a la variable, por lo que el significado de este código es "crear una función y ponerla en la variable **sayHi**.

Cuando trabajamos con **Function Expressions** el formato de función sin nombre es conocido también como **función anónima.**

### Las funciones son un valor

Para reiterar, no importa como una función es creada, esta es un valor.

```
function sayHi() {
  console.log( "Hello" );
}

console.log( sayHi ); // shows the function code
```

Nota que en el ejemplo anterior la última línea no ejecuta la función, por que no hay paréntesis después de **sayHi**. Existen lenguajes de programación donde cualquier mención al nombre de una función causa su ejecución, pero en Javascript esto no sucede.

Ahora bien, como en Javascript una función es un valor, podemos lidiar con ella como un valor. Por ello podemos hacer acciones como la siguiente:

```
function sayHi() {   // (1) crear
  alert( "Hello" );
}

let func = sayHi;    // (2) copiar

func(); // Hello     // (3) ejecutar la copia (funciona)!
sayHi(); // Hello    //     esto aún funciona
```

### Funciones Callback

Veamos más ejemplos de pasar funciones como valores y usar **function expressions**.

Vamos a escribir la función **ask(question, yes, no)** con 3 parámetros.

- question - Texto de la pregunta
- yes - Función que regresa en caso de contestar sí
- no - Función que regresa en caso de contestar no

La función debe realizar la pregunta y dependiendo de la respuesta llamar a yes() o no()

```
function ask(question, yes, no) {
  if (confirm(question)) yes()
  else no();
}

function showOk() {
  console.log( "You agreed." );
}

function showCancel() {
  console.log( "You canceled the execution." );
}

// usage: functions showOk, showCancel are passed as arguments to ask
ask("Do you agree?", showOk, showCancel);
```

En la práctica estas funciones son muy útiles. La mayor diferencia entre una pregunta del mundo real y el ejemplo anterior es que una pregunta real tiene formas más complejas de interactuar con un usuario que un simple **confirm**. En el navegador tales funciones por lo general dibujan una bonita venta de pregunta , pero eso es otro tema.

Los argumentos **showOk** y **showCancel** de **ask** son llamadas **funciones callback** o solamente **callbacks**.

La idea es que pasemos una función y esperemos a que sea **llamada después** si es necesario. En nuestro caso, **showOk** se convierte en el callback para **yes** y **showCancel** se convierte en el callback para **no**.

Podemos usar **Function Expressions** para escribir una equivalente función más corta.

```
function ask(question, yes, no) {
  if (confirm(question)) yes()
  else no();
}

ask(
  "Do you agree?",
  function() { console.log("You agreed."); },
  function() { console.log("You canceled the execution."); }
);

```

### Funciones flecha

Existe otra simple forma de crear funciones, que a menudo es mejor que las **Function Expressions** y se llama **Arrow Functions**, por que se ven de la siguiente manera.

```
let func = (arg1, arg2, ..., argN) => expression;
```

Esto crea una función que agrega n argumentos, luego evalúa la **expression** a la derecha y devuelve su resultado.

En otras palabras, sería la versión corta de:

```
let func = function(arg1, arg2, ..., argN) {
  return expression;
};
```

Un ejemplo concreto sería el siguiente:

```
let sum = (a, b) => a + b;

/* This arrow function is a shorter form of:

let sum = function(a, b) {
  return a + b;
};
*/

alert( sum(1, 2) ); // 3
```

Como puedes ver **(a, b) => a + b**, significa una función que acepta 2 parámetros **a** y **b**. Al ejecutarse, se evalúa la expresión a + b y regresa el resultado.

- Si solo tenemos un argumento, el paréntesis al rededor de los parámetros puede ser omitido, haciendo la versión todavía más corta.

```
let double = n => n * 2;
// roughly the same as: let double = function(n) { return n * 2 }

alert( double(3) ); // 6
```

- Si no hay argumentos, los paréntesis quedan vacíos, pero ellos deben estar presentes:

```
let sayHi = () => alert("Hello!");
sayHi();
```

Las **Arrow Functions** pueden ser usadas de la misma manera como **Function Expressions**

Para poder crear dinámicamente una función.

```
let age = prompt("What is your age?", 18);

let welcome = (age < 18) ?
  () => console.log('Hello!') :
  () => console.log("Greetings!");

welcome();
```

**Arrow Functions** pueden parecer muy diferentes y difíciles de leer al inicio, pero esto cambia rápidamente una vez que la estructura se adapta a los ojos.

Son muy convenientes para acciones simple de una sola línea, donde solo somos flojos para leer muchas palabras.

## Debugging en el navegador

Dentro del código que hemos estado usando en los ejemplos anteriores puedes darte cuenta que utiliza el

```
console.log("Hello World");
```

El console.log sirve para mostrar algo en la consola de nuestro navegador, es muy común imprimir diferentes tipos de mensajes y la función **log** también lo es. Pero existen algunas funciones adicionales que también pueden ayudarnos como son **info**, **warn** y **error**.

Las funciones **log** e **info** son muy similares en que solo proveen información básica, y depende del navegador pueden distinguirse entre ellas al momento de ver el resultado.

Las que sí son diferentes son **warn** que además de marcar la advertencia en la consola también muestra un contador de las advertencias que se tienen para facilidad. En programación un warning es algo que requiere atender más no es urgente o necesario de modificar en el momento.

Por su parte **error** sirve para marcar en rojo y en un contador aparte la cantidad de errores reportados por esta salida. En programación un error es algo que requiere atención inmediata pues puede hacer que la funcionalidad no funcione como se espera o en un peor caso no funcione del todo

```
console.log("Hello World");
console.info("Clash of clans");
console.warn("This is a warning");
console.error("This is an error");
```

Por último y no menos importante está el **assert**, esta salida de consola simple, puede ayudarnos a realizar pruebas en nuestro código cuando esperamos un valor en particular. Esto nos permite tener una primera aproximación a automatizar las pruebas del navegador ya que lo que se recibe como valor es el resultado de una expresión, en caso de que la expresión verdadera no sucede nada, sin embargo en caso de ser false la consola lanza un error para que el desarrollador pueda ver el error.

```
console.assert(1 == "1");
console.assert(1 == true);
```

Las dos impresiones en consola anteriores, no van a desplegar nada puesto que el resultado de las expresiones es verdadero en ambos casos.

Si queremos ver el error necesitamos realizar algo como lo siguiente, en donde la expresión sea falsa.

```
console.assert(2 == "1");
```

Ahora que conocemos las impresiones básicas, es probable que estar escribiéndolas a cada momento sea algo tedioso, pero podemos aplicar los conocimientos que ya tenemos y simplificar esto de la siguiente manera.

```
let cLog = console.log;
let cInfo = console.info;
let cWarn = console.warn;
let cError = console.error;
let cAssert = console.assert;

cLog("Hello World);
```

Al usar la asignación de funciones por valor, podemos asignar cada tipo de salida a la consola en una variable más corta para escribir menos y poder depurar nuestro código de una manera más rápida.

No olvides utilizar los conceptos vistos como en el último ejemplo para hacer que tu código sea más limpio, legible y sobre todo funcional.

## Arreglos y Objetos

### Arreglos

Los arreglos en javascript son iguales a otros lenguajes de programación, con la diferencia que aquí al momento de declarar un arreglo podemos también considerarlo como una lista. A diferencia de lenguajes de programación más estrictos esto significa que una vez definido el arreglo su tamaño podrá no ser fijo y podremos seguir agregando elementos. Esto es una función muy poderosa de los arrays en Javascript ya que nos permite trabajar directamente con estructuras de datos que al final hoy en día es lo que se necesita para manipular información.

```
const arreglo = ["Elemento"];
const arreglo2 = new Array();
arreglo.push("Otro elemento");
arreglo.push(5);
const elemento = 8;
arreglo.push(elemento);
arreglo[10] = "Uno más";
//arreglos asociativos
arreglo["dos"] = 2;

console.log(arreglo);
```

### Iteraciones sobre arreglos

Igualmente como en otros lenguajes de programación podemos iterar sobre los arreglos que hayamos declarado usando un ciclo for.

```
for (let i = 0; i < arreglo.length; i++) {
    console.log(arreglo[i]);
}
```

Otra forma de iterar sobre los arreglos es con un tipo especial de ciclo for, pero este puede ser de 2 tipos, utilizando las palabras reservadas **of** e **in**, para el primero nos devuelve el elemento tal cual del arreglo que queremos revisar, y para el segundo nos devuelve el índice del elemento del arreglo.

```
for(let valor of arreglo) {
    console.log(valor);
}
for(let indice in arreglo) {
    console.log(indice);
}
```

Aquí va a depender el caso que se quiera manejar pero en la industria ambos son ampliamente utilizados.

### Objetos

Los objetos parecerían un tema completamente aparte, pero si recuerdas en el lab1 de introducción al HTML, te hable sobre los medios actuales de información y como se utilizan el HTML, el XML, y el JSON.

Si has puesto atención hasta el momento te tengo una buena noticia, los objetos en Javascript son objetos JSON por default, por lo que para declararlos basta con realizar lo siguiente:

```
const objeto = { atributo1: "Valor 1", atributo2: "valor 2" };
objeto.atributo3 = 3;
console.log(objeto);
```

La forma estándar de JSON nos dice que la llave debe ser un string, pero observa que en el caso del ejemplo **atributo1** esta más formado como una especie de variable, es importante destacar esto ya que si intentas copiar un objeto de javascript directamente sobre un JSON puedes llevarte una sorpresa en que no son compatibles y esto se debe al formato. Más adelante veremos como lidiar con esta situación, pero de momento observa como el objeto nos permite guardar información que queramos.