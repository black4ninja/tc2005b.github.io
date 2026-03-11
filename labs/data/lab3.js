// Created by Denisse Maldonado
const LAB = {
  id: 'lab4',
  numero: 4,
  titulo: 'CSS',
  descripcion: 'En esta actividad se har\u00e1 un repaso sobre CSS.',
  modalidad: 'Individual',
  objetivos: [
    'Comprender el funcionamiento de las hojas de estilo en cascada',
    'Aplicar los 3 niveles de estilos (en l\u00ednea, documento y externo)',
    'Aplicar los diferentes tipos de selectores (gen\u00e9ricos, de clase, id, universales y pseudo clases)',
    'Explorar las propiedades de fuentes, listas y texto',
    'Comprender el modelo de caja (The Box Model)',
    'Aprender a separar la presentaci\u00f3n del contenido en documentos HTML'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
    '<li>Revisa la presentaci\u00f3n <a target="_blank" href="../documentos/CSS.ppt">CSS.</a></li>' +
    '<li>Crea un CSS externo y agr\u00e9galo al documento(s) que elaboraste en el laboratorio de html para agregarle una buena presentaci\u00f3n a tu sitio.</li>' +
    '<li>El CSS debe contener al menos un estilo definido con cada uno de los selectores y el estilo debe ser aplicado al documento. Puedes utilizar como gu\u00eda o ayudarte de algunos de los sitios web que se enlistan en la secci\u00f3n de Recursos, o en alg\u00fan otro sitio.' +
    '<ul>' +
    '<li>Aseg\u00farate que tus documentos HTML no tengan estilos en l\u00ednea.</li>' +
    '</ul>' +
    '</li>' +
    '<li>Para un mejor rendimiento de tu sitio, crea una versi\u00f3n minimizada de tu CSS y enl\u00e1zala a tu sitio en lugar del CSS que acabas de crear. Puedes apoyarte de herramientas como <a href="http://cssminifier.com/" target="_blank">http://cssminifier.com/</a></li>' +
    '<li>Agrega las preguntas con sus respectivas respuestas en el documento HTML</li>' +
    '</ol>',
  preguntas: [
    'Como ingeniero de software \u00bfcu\u00e1l es tu recomendaci\u00f3n sobre el uso de !important en un CSS?',
    'Si se pone una imagen de fondo en una p\u00e1gina HTML, \u00bfpor qu\u00e9 debe escogerse con cuidado?',
    'Como ingeniero de software, \u00bfcu\u00e1l es tu recomendaci\u00f3n al elegir las unidades de un propiedad de estilo entre %, px y pt?',
    '\u00bfPor qu\u00e9 el uso de una versi\u00f3n minimizada del CSS mejora el rendimiento del sitio?'
  ],
  recursos: [
    { texto: 'The box model', url: '../imagenes/boxmodel.png', externo: false },
    { texto: 'Web Design in 4 minutes', url: 'http://jgthms.com/web-design-in-4-minutes', externo: true },
    { texto: 'How to Use CSS Selectors to Style Your Web Page', url: 'https://www.freecodecamp.org/news/use-css-selectors-to-style-webpage/', externo: true },
    { texto: 'The CSS Handbook: a handy guide to CSS for developers', url: 'https://www.freecodecamp.org/news/the-css-handbook-a-handy-guide-to-css-for-developers-b56695917d11/', externo: true },
    { texto: 'The Ultimate Guide to CSS + Cheat Sheets', url: 'https://medium.com/level-up-web/the-ultimate-guide-to-css-103b0f883de3', externo: true },
    { texto: 'CSS Cheat Sheet – 10 Tricks to Improve Your Next Coding Project', url: 'https://www.freecodecamp.org/news/10-css-tricks-for-your-next-coding-project/', externo: true },
    { texto: 'How to Center a Div with CSS – 10 Different Ways', url: 'https://www.freecodecamp.org/news/how-to-center-a-div-with-css-10-different-ways/', externo: true },
    { texto: 'http://css-tricks.com/', url: 'http://css-tricks.com/', externo: true },
    { texto: 'http://css-tricks.com/examples/ButtonMaker/', url: 'http://css-tricks.com/examples/ButtonMaker/', externo: true },
    { texto: 'Pure CSS Loaders', url: 'https://loading.io/css', externo: true },
    { texto: 'http://cssglobe.com/', url: 'http://cssglobe.com/', externo: true },
    { texto: 'http://www.alistapart.com/topics/code/css/', url: 'http://www.alistapart.com/topics/code/css/', externo: true },
    { texto: 'http://sixrevisions.com/category/css/', url: 'http://sixrevisions.com/category/css/', externo: true },
    { texto: 'How the CSS Position Property Works - Explained with Code Examples', url: 'https://www.freecodecamp.org/news/css-position-property-explained/', externo: true },
    { texto: 'CSS Positioning Explained By Building An Ice Cream Sundae', url: 'https://www.freecodecamp.org/news/css-positioning-explained-by-building-an-ice-cream-sundae-831cb884bfa9/', externo: true },
    { texto: 'CSS Selectors Explained By Going Car Shopping', url: 'https://www.freecodecamp.org/news/css-selectors-explained-by-going-car-shopping-51a383f6eb4b/', externo: true },
    { texto: 'Responsive Web Design - How to Make a Website Look Good on Phones and Tablets', url: 'https://www.freecodecamp.org/news/responsive-web-design-how-to-make-a-website-look-good-on-phones-and-tablets/', externo: true },
    { texto: 'Enjoy CSS', url: 'https://enjoycss.com/', externo: true },
    { texto: 'The super fast color palettes generator', url: 'https://coolors.co/', externo: true },
    { texto: 'BEM -- Block Element Modifier', url: 'http://getbem.com/', externo: true }
  ],
  entrega: 'A trav\u00e9s de tu repositorio personal (Bitbucket o GitHub)'
};
