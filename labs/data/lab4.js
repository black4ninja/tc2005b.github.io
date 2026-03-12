// Created by Denisse Maldonado
const LAB = {
  id: 'lab4',
  numero: 4,
  titulo: 'Fundamentos de JavaScript',
  descripcion: 'En esta actividad se har\u00e1 una introducci\u00f3n a JavaScript.',
  modalidad: 'Individual',
  objetivos: [
    'Conocer el prop\u00f3sito y las caracter\u00edsticas principales de JavaScript',
    'Conocer las reglas b\u00e1sicas de sintaxis de JavaScript',
    'Elaborar programas b\u00e1sicos con JavaScript'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>Revisa la presentaci\u00f3n <a target="_blank" href="../documentos/IntroJavaScript.pptx">Fundamentos de JavaScript</a></li>' +
      '<li>' +
        '<p>Escribe, prueba y corrige scripts de JavaScript para los siguientes problemas:</p>' +
        '<ul>' +
          '<li><strong>Funciones:</strong> Cuando se requiera escribir funciones, incluye un conjunto adecuado de casos de prueba.</li>' +
          '<li><strong>Pruebas automatizadas:</strong> Utiliza <code>console.assert()</code> para automatizar las pruebas.</li>' +
          '<li><strong>Resultados visibles:</strong> Permite al usuario ver los resultados en el documento HTML usando <code>document.write()</code>, modificando el DOM, o mostrando resultados en la consola.</li>' +
        '</ul>' +
        '<div class="card" style="margin: 20px 0;">' +
          '<div class="card-content">' +
            '<span class="card-title"><strong>Qu\u00e9 es console.assert()?</strong></span>' +
            '<p><code>console.assert()</code> es una funci\u00f3n de depuraci\u00f3n que verifica si una condici\u00f3n es verdadera. Si la condici\u00f3n es <strong>falsa</strong>, imprime un mensaje de error en la consola del navegador. Si es <strong>verdadera</strong>, no hace nada.</p>' +
            '<p><strong>Sintaxis:</strong></p>' +
            '<pre><code>console.assert(condici\u00f3n, mensaje);</code></pre>' +
            '<p><strong>Ejemplo de uso para pruebas:</strong></p>' +
            '<pre><code>// Probar una funci\u00f3n suma\n' +
'function suma(a, b) {\n' +
'    return a + b;\n' +
'}\n' +
'\n' +
'console.assert(suma(2, 3) === 5, "Error: suma(2,3) deber\u00eda ser 5");\n' +
'console.assert(suma(-1, 1) === 0, "Error: suma(-1,1) deber\u00eda ser 0");\n' +
'console.assert(suma(0, 0) === 0, "Error: suma(0,0) deber\u00eda ser 0");\n' +
'\n' +
'// Si todas las condiciones son verdaderas, no ver\u00e1s nada en la consola\n' +
'// Si alguna es falsa, ver\u00e1s el mensaje de error correspondiente</code></pre>' +
            '<p><strong>Consejo:</strong> Abre la consola del navegador (F12 o Ctrl+Shift+I) para ver los resultados de las pruebas.</p>' +
          '</div>' +
        '</div>' +
        '<ol>' +
          '<li>' +
            '<strong>Ejercicio 1: Tabla de cuadrados y cubos</strong>' +
            '<br><span style="font-style: italic;">Entrada:</span> Un n\u00famero pedido con <code>prompt</code> (por ejemplo: 5).' +
            '<br><span style="font-style: italic;">Salida:</span> Una tabla con los n\u00fameros del 1 al n\u00famero dado con sus cuadrados y cubos. Utiliza <code>document.write</code> para producir la salida.' +
            '<br><span style="font-style: italic;">Ejemplo:</span> Si el usuario ingresa 3, la salida debe mostrar una tabla con columnas: N\u00famero | Cuadrado | Cubo, con los valores 1-3.' +
          '</li>' +
          '<li>' +
            '<strong>Ejercicio 2: Quiz de suma con tiempo</strong>' +
            '<br><span style="font-style: italic;">Entrada:</span> Usando un <code>prompt</code> se pide el resultado de la suma de 2 n\u00fameros generados de manera aleatoria.' +
            '<br><span style="font-style: italic;">Salida:</span> La p\u00e1gina debe indicar si el resultado fue correcto o incorrecto, y el tiempo que tard\u00f3 el usuario en responder (en segundos).' +
            '<br><span style="font-style: italic;">Sugerencia:</span> Usa <code>Date.now()</code> para medir el tiempo al inicio y al final.' +
          '</li>' +
          '<li>' +
            '<strong>Ejercicio 3: Contador de n\u00fameros</strong>' +
            '<br><span style="font-style: italic;">Funci\u00f3n:</span> <code>contador</code>' +
            '<br><span style="font-style: italic;">Par\u00e1metros:</span> Un arreglo de n\u00fameros.' +
            '<br><span style="font-style: italic;">Regresa:</span> Un objeto con tres propiedades: <code>negativos</code>, <code>ceros</code>, y <code>positivos</code>.' +
            '<br><span style="font-style: italic;">Ejemplo:</span> <code>contador([1, -2, 0, 5, -3, 0, 7])</code> debe regresar <code>{negativos: 2, ceros: 2, positivos: 3}</code>' +
          '</li>' +
          '<li>' +
            '<strong>Ejercicio 4: Promedios de matriz</strong>' +
            '<br><span style="font-style: italic;">Funci\u00f3n:</span> <code>promedios</code>' +
            '<br><span style="font-style: italic;">Par\u00e1metros:</span> Un arreglo de arreglos de n\u00fameros (matriz).' +
            '<br><span style="font-style: italic;">Regresa:</span> Un arreglo con los promedios de cada uno de los renglones de la matriz.' +
            '<br><span style="font-style: italic;">Ejemplo:</span> <code>promedios([[10, 20, 30], [5, 15, 25]])</code> debe regresar <code>[20, 15]</code>' +
          '</li>' +
          '<li>' +
            '<strong>Ejercicio 5: N\u00famero inverso</strong>' +
            '<br><span style="font-style: italic;">Funci\u00f3n:</span> <code>inverso</code>' +
            '<br><span style="font-style: italic;">Par\u00e1metros:</span> Un n\u00famero.' +
            '<br><span style="font-style: italic;">Regresa:</span> El n\u00famero con sus d\u00edgitos en orden inverso.' +
            '<br><span style="font-style: italic;">Ejemplo:</span> <code>inverso(12345)</code> debe regresar <code>54321</code>, <code>inverso(1000)</code> debe regresar <code>1</code>' +
          '</li>' +
          '<li>' +
            '<strong>Ejercicio 6: Problema personalizado con Programaci\u00f3n Orientada a Objetos</strong>' +
            '<br>Crea una soluci\u00f3n para un problema de tu elecci\u00f3n. El problema debe estar descrito en un documento HTML, y la soluci\u00f3n implementada en JavaScript usando Programaci\u00f3n Orientada a Objetos.' +
            '<br><span style="font-style: italic;">Requisitos:</span>' +
            '<ul>' +
              '<li>Crear al menos una clase/objeto con constructor</li>' +
              '<li>El objeto debe tener al menos 2 m\u00e9todos adem\u00e1s del constructor</li>' +
              '<li>Mostrar los resultados en el documento HTML</li>' +
            '</ul>' +
            '<br><span style="font-style: italic;">Ideas de problemas:</span> Sistema de gesti\u00f3n de tareas, calculadora de propinas, conversor de unidades, juego simple (piedra-papel-tijera), registro de gastos personales, etc.' +
          '</li>' +
        '</ol>' +
      '</li>' +
    '</ol>',
  preguntas: [
    '\u00bfQu\u00e9 diferencias y semejanzas hay entre Java y JavaScript?',
    '\u00bfQu\u00e9 m\u00e9todos tiene el objeto Date? (Menciona al menos 5)',
    '\u00bfQu\u00e9 m\u00e9todos tienen los arreglos? (Menciona al menos 5)',
    '\u00bfC\u00f3mo se declara una variable con alcance local dentro de una funci\u00f3n?',
    '\u00bfQu\u00e9 implicaciones tiene utilizar variables globales dentro de funciones?'
  ],
  recursos: [
    { texto: 'The JavaScript Beginner\'s Handbook (2020 Edition)', url: 'https://www.freecodecamp.org/news/the-complete-javascript-handbook-f26b2c71719c/', externo: true },
    { texto: 'Learn these JavaScript fundamentals and become a better developer', url: 'https://www.freecodecamp.org/news/learn-these-javascript-fundamentals-and-become-a-better-developer-2a031a0dc9cf/', externo: true },
    { texto: 'When to use var vs let vs const in JavaScript', url: 'https://medium.com/free-code-camp/var-vs-let-vs-const-in-javascript-2954ae48c037', externo: true },
    { texto: '"Double Quotes" vs \'Single Quotes\' vs `Backticks` in JavaScript', url: 'https://blog.bitsrc.io/double-quotes-vs-single-quotes-vs-backticks-in-javascript-3cab5aaea55', externo: true },
    { texto: 'The JavaScript String Handbook – How to Work with Strings in JS', url: 'https://www.freecodecamp.org/news/javascript-string-handbook/', externo: true },
    { texto: 'JavaScript — Dynamic client-side scripting', url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript', externo: true },
    { texto: 'How JavaScript Works', url: 'https://medium.com/better-programming/how-javascript-works-1706b9b66c4d', externo: true },
    { texto: 'JavaScript Data Types Explained', url: 'https://codeburst.io/javascript-data-types-explained-347555cd2d4d', externo: true },
    { texto: 'JavaScript Showdown: == vs ===', url: 'https://codeburst.io/javascript-showdown-vs-7be792be15b5', externo: true },
    { texto: 'JavaScript: Why does 3 + true = 4? (and 7 other tricky equations)', url: 'https://codeburst.io/javascript-why-does-3-true-4-and-7-other-tricky-equations-9dd13cb2a92a', externo: true },
    { texto: 'Let\'s clear up the confusion around the slice( ), splice( ), & split( ) methods in JavaScript', url: 'https://www.freecodecamp.org/news/lets-clear-up-the-confusion-around-the-slice-splice-split-methods-in-javascript-8ba3266c29ae/', externo: true },
    { texto: 'The Complete JavaScript Handbook', url: 'https://www.freecodecamp.org/news/the-complete-javascript-handbook-f26b2c71719c/', externo: true },
    { texto: 'The Best JavaScript Meme I\'ve Ever Seen, Explained in detail', url: 'https://www.freecodecamp.org/news/explaining-the-best-javascript-meme-i-have-ever-seen/', externo: true },
    { texto: 'Little known features of JavaScript', url: 'https://blog.usejournal.com/little-known-features-of-javascript-901665291387', externo: true }
  ],
  entrega: 'A trav\u00e9s de tu repositorio personal'
};
