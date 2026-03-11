// Created by Denisse Maldonado
const LAB = {
  id: 'lab5',
  numero: 5,
  titulo: 'Frameworks de estilo',
  descripcion: 'En esta actividad exploraremos algunos de los frameworks de estilo para aplicaciones web, y aprender\u00e1s a usar uno de estos frameworks para mejorar la experiencia del usuario.',
  modalidad: 'Individual',
  objetivos: [
    'Conocer, explorar y aplicar frameworks de estilos para aplicaciones web.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>' +
        '<p>Revisa los siguientes enlaces a frameworks de Front-end actualizados para 2026:</p>' +
        '<ul>' +
          '<li><a href="https://getbootstrap.com/" target="_blank">Bootstrap</a> <span class="badge green white-text">Recomendado para principiantes</span></li>' +
          '<li><a href="https://bulma.io/" target="_blank">Bulma</a> <span class="badge">Solo CSS</span></li>' +
          '<li><a href="https://tailwindcss.com/" target="_blank">Tailwind CSS</a> <span class="badge blue white-text">Muy popular</span></li>' +
          '<li><a href="https://picocss.com/" target="_blank">Pico CSS</a> <span class="badge">Minimalista</span></li>' +
          '<li><a href="https://daisyui.com/" target="_blank">DaisyUI</a> <span class="badge">Requiere Tailwind</span></li>' +
          '<li><a href="https://github.com/troxler/awesome-css-frameworks" target="_blank">Awesome CSS Frameworks</a> <span class="badge grey">Lista completa</span></li>' +
        '</ul>' +
        '<p><strong>Nota:</strong> Se removi\u00f3 Foundation (en declive) y Materialize (descontinuado en 2021) de esta lista actualizada.</p>' +
      '</li>' +
      '<li>' +
        '<div class="card" style="padding: 15px; margin: 10px 0;">' +
          '<span style="font-size: 1.2em;"><strong>Recomendaci\u00f3n para Principiantes</strong></span>' +
          '<p>Si es tu primera vez trabajando con frameworks de CSS y a\u00fan est\u00e1s aprendiendo HTML, CSS y JavaScript, te recomendamos comenzar con <strong>Bootstrap</strong>.</p>' +
          '<p><strong>Por qu\u00e9 Bootstrap para empezar?</strong></p>' +
          '<ul>' +
            '<li>Documentaci\u00f3n excelente con ejemplos interactivos</li>' +
            '<li>Funciona inmediatamente sin configuraci\u00f3n compleja</li>' +
            '<li>Incluye componentes JavaScript listos para usar</li>' +
            '<li>Gran comunidad y abundantes tutoriales</li>' +
            '<li>Grid system intuitivo para layouts responsivos</li>' +
          '</ul>' +
          '<p><em>Una vez que te sientas c\u00f3modo con los fundamentos de CSS, puedes explorar Tailwind CSS para mayor control y personalizaci\u00f3n.</em></p>' +
        '</div>' +
      '</li>' +
      '<li>' +
        '<div class="card" style="padding: 15px; margin: 10px 0;">' +
          '<span style="font-size: 1.2em;"><strong>CDN o Instalaci\u00f3n Local?</strong></span>' +
          '<p>Cuando uses un framework CSS, tienes dos opciones principales para incluirlo en tu proyecto:</p>' +
          '<div style="margin: 15px 0;">' +
            '<h6><strong>Opci\u00f3n 1: CDN (Content Delivery Network)</strong></h6>' +
            '<p>Un CDN es un servidor externo que aloja los archivos del framework. Solo necesitas agregar un link en tu HTML:</p>' +
            '<pre><code>&lt;!-- Ejemplo con Bootstrap desde CDN --&gt;\n' +
'&lt;link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"\n' +
'      rel="stylesheet"&gt;\n' +
'&lt;script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"&gt;\n' +
'&lt;/script&gt;</code></pre>' +
            '<div>' +
              '<div>' +
                '<strong style="color: green;">Ventajas del CDN:</strong>' +
                '<ul>' +
                  '<li>Setup instant\u00e1neo (solo copiar y pegar)</li>' +
                  '<li>No ocupas espacio en tu servidor</li>' +
                  '<li>Los archivos pueden cargarse m\u00e1s r\u00e1pido (cach\u00e9 del navegador)</li>' +
                  '<li>Perfecto para prototipos y aprendizaje</li>' +
                  '<li>Actualizaciones f\u00e1ciles (cambias la versi\u00f3n en el URL)</li>' +
                '</ul>' +
              '</div>' +
              '<div>' +
                '<strong style="color: red;">Desventajas del CDN:</strong>' +
                '<ul>' +
                  '<li>Requiere conexi\u00f3n a internet</li>' +
                  '<li>Dependes de que el servicio CDN est\u00e9 disponible</li>' +
                  '<li>Menos control sobre los archivos</li>' +
                  '<li>No puedes modificar el framework f\u00e1cilmente</li>' +
                '</ul>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<hr>' +
          '<div style="margin: 15px 0;">' +
            '<h6><strong>Opci\u00f3n 2: Instalaci\u00f3n Local</strong></h6>' +
            '<p>Descargas los archivos del framework y los guardas en tu proyecto:</p>' +
            '<pre><code>&lt;!-- Ejemplo con archivos locales --&gt;\n' +
'&lt;link href="css/bootstrap.min.css" rel="stylesheet"&gt;\n' +
'&lt;script src="js/bootstrap.bundle.min.js"&gt;&lt;/script&gt;</code></pre>' +
            '<div>' +
              '<div>' +
                '<strong style="color: green;">Ventajas de Instalaci\u00f3n Local:</strong>' +
                '<ul>' +
                  '<li>Funciona sin internet</li>' +
                  '<li>Control total sobre los archivos</li>' +
                  '<li>Puedes personalizar el framework</li>' +
                  '<li>Mejor para proyectos en producci\u00f3n</li>' +
                  '<li>Puedes optimizar y minimizar seg\u00fan necesites</li>' +
                '</ul>' +
              '</div>' +
              '<div>' +
                '<strong style="color: red;">Desventajas de Instalaci\u00f3n Local:</strong>' +
                '<ul>' +
                  '<li>Requiere descargar y organizar archivos</li>' +
                  '<li>Ocupas espacio en tu servidor</li>' +
                  '<li>Actualizaciones manuales</li>' +
                  '<li>M\u00e1s complejo para principiantes</li>' +
                '</ul>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<hr>' +
          '<div style="margin: 15px 0; background-color: #fff3cd; padding: 10px; border-radius: 4px;">' +
            '<strong>Recomendaci\u00f3n:</strong>' +
            '<p><strong>Para este laboratorio y para aprender:</strong> Usa <strong>CDN</strong>. Es m\u00e1s simple y te permite concentrarte en aprender el framework sin preocuparte por configuraciones.</p>' +
            '<p><strong>Para proyectos reales en el futuro:</strong> Considera instalaci\u00f3n local con herramientas como npm (Node Package Manager) para mejor control y optimizaci\u00f3n.</p>' +
          '</div>' +
          '<div style="margin: 15px 0;">' +
            '<h6><strong>Ejemplo Completo: Bootstrap con CDN</strong></h6>' +
            '<pre><code>&lt;!DOCTYPE html&gt;\n' +
'&lt;html lang="es"&gt;\n' +
'&lt;head&gt;\n' +
'    &lt;meta charset="UTF-8"&gt;\n' +
'    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0"&gt;\n' +
'    &lt;title&gt;Mi Primera P\u00e1gina con Bootstrap&lt;/title&gt;\n' +
'    &lt;!-- Bootstrap CSS desde CDN --&gt;\n' +
'    &lt;link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"\n' +
'          rel="stylesheet"&gt;\n' +
'&lt;/head&gt;\n' +
'&lt;body&gt;\n' +
'    &lt;div class="container"&gt;\n' +
'        &lt;h1 class="text-primary"&gt;Hola Bootstrap!&lt;/h1&gt;\n' +
'        &lt;button class="btn btn-success"&gt;Bot\u00f3n Verde&lt;/button&gt;\n' +
'    &lt;/div&gt;\n' +
'    &lt;!-- Bootstrap JS desde CDN (al final del body) --&gt;\n' +
'    &lt;script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"&gt;\n' +
'    &lt;/script&gt;\n' +
'&lt;/body&gt;\n' +
'&lt;/html&gt;</code></pre>' +
          '</div>' +
          '<div style="margin: 15px 0;">' +
            '<h6><strong>D\u00f3nde encontrar los links de CDN?</strong></h6>' +
            '<ul>' +
              '<li><strong>Bootstrap:</strong> <a href="https://getbootstrap.com/docs/5.3/getting-started/download/#cdn-via-jsdelivr" target="_blank">Bootstrap CDN</a></li>' +
              '<li><strong>Bulma:</strong> <a href="https://bulma.io/documentation/overview/start/" target="_blank">Bulma CDN</a></li>' +
              '<li><strong>Tailwind:</strong> <a href="https://tailwindcss.com/docs/installation/play-cdn" target="_blank">Tailwind Play CDN</a> (solo para pruebas, no para producci\u00f3n)</li>' +
              '<li><strong>Pico CSS:</strong> <a href="https://picocss.com/docs" target="_blank">Pico CSS CDN</a></li>' +
              '<li><strong>CDN Universal:</strong> <a href="https://www.jsdelivr.com/" target="_blank">jsDelivr</a> y <a href="https://cdnjs.com/" target="_blank">cdnjs</a> (albergan m\u00faltiples frameworks)</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
      '</li>' +
      '<li>' +
        '<p>Selecciona uno de los frameworks de la lista actualizada. Coord\u00ednate con tu equipo para que cada miembro seleccione un framework diferente y puedan compartir su experiencia.</p>' +
        '<p><strong>Sugerencia:</strong> Si es tu primera vez, elige Bootstrap. Si ya tienes experiencia con CSS, explora Tailwind o Bulma para aprender enfoques diferentes.</p>' +
      '</li>' +
      '<li>' +
        '<p><strong>Tabla Comparativa de Frameworks CSS</strong></p>' +
        '<p>Esta tabla te ayudar\u00e1 a decidir qu\u00e9 framework se ajusta mejor a tu nivel de experiencia y necesidades:</p>' +
        '<table class="striped responsive-table">' +
          '<thead>' +
            '<tr>' +
              '<th>Framework</th>' +
              '<th>Nivel</th>' +
              '<th>Curva de Aprendizaje</th>' +
              '<th>Tama\u00f1o</th>' +
              '<th>JavaScript</th>' +
              '<th>Estado 2026</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            '<tr style="background-color: #e8f5e9;">' +
              '<td><strong>Bootstrap</strong></td>' +
              '<td>Principiante</td>' +
              '<td>Suave</td>' +
              '<td>Grande</td>' +
              '<td>Incluido</td>' +
              '<td>Muy Activo</td>' +
            '</tr>' +
            '<tr>' +
              '<td><strong>Bulma</strong></td>' +
              '<td>Principiante-Intermedio</td>' +
              '<td>Suave</td>' +
              '<td>Medio</td>' +
              '<td>No incluido</td>' +
              '<td>Activo</td>' +
            '</tr>' +
            '<tr>' +
              '<td><strong>Tailwind CSS</strong></td>' +
              '<td>Intermedio</td>' +
              '<td>Pronunciada</td>' +
              '<td>Peque\u00f1o*</td>' +
              '<td>No incluido</td>' +
              '<td>Muy Activo</td>' +
            '</tr>' +
            '<tr>' +
              '<td><strong>Pico CSS</strong></td>' +
              '<td>Principiante</td>' +
              '<td>Muy Suave</td>' +
              '<td>Muy Peque\u00f1o</td>' +
              '<td>No incluido</td>' +
              '<td>Activo</td>' +
            '</tr>' +
            '<tr>' +
              '<td><strong>DaisyUI</strong></td>' +
              '<td>Intermedio</td>' +
              '<td>Media</td>' +
              '<td>Peque\u00f1o*</td>' +
              '<td>No incluido</td>' +
              '<td>Activo</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
        '<p style="font-size: 0.9em;"><em>*Con purge/tree-shaking configurado</em></p>' +
      '</li>' +
      '<li>' +
        '<p><strong>Pros y Contras Detallados</strong></p>' +
        '<div style="margin: 15px 0;">' +
          '<h6><strong>Bootstrap</strong> (Recomendado para principiantes)</h6>' +
          '<div>' +
            '<strong style="color: green;">Pros:</strong>' +
            '<ul>' +
              '<li>Documentaci\u00f3n excelente con ejemplos interactivos</li>' +
              '<li>Componentes completos (modals, tooltips, carousels, etc.)</li>' +
              '<li>Funciona inmediatamente sin configuraci\u00f3n</li>' +
              '<li>Gran ecosistema y comunidad</li>' +
              '<li>Grid system responsive intuitivo</li>' +
            '</ul>' +
            '<strong style="color: red;">Contras:</strong>' +
            '<ul>' +
              '<li>Archivos grandes si no se optimiza</li>' +
              '<li>Sitios pueden verse "gen\u00e9ricos"</li>' +
              '<li>Puede ser dif\u00edcil sobreescribir estilos personalizados</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<hr>' +
        '<div style="margin: 15px 0;">' +
          '<h6><strong>Bulma</strong></h6>' +
          '<div>' +
            '<strong style="color: green;">Pros:</strong>' +
            '<ul>' +
              '<li>Solo CSS (m\u00e1s ligero, sin JavaScript obligatorio)</li>' +
              '<li>Sintaxis limpia basada en Flexbox</li>' +
              '<li>F\u00e1cil de aprender y modular</li>' +
              '<li>Buena documentaci\u00f3n</li>' +
            '</ul>' +
            '<strong style="color: red;">Contras:</strong>' +
            '<ul>' +
              '<li>No incluye JavaScript (necesitas a\u00f1adir interactividad manualmente)</li>' +
              '<li>Comunidad m\u00e1s peque\u00f1a que Bootstrap</li>' +
              '<li>Menos componentes interactivos predefinidos</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<hr>' +
        '<div style="margin: 15px 0;">' +
          '<h6><strong>Tailwind CSS</strong></h6>' +
          '<div>' +
            '<strong style="color: green;">Pros:</strong>' +
            '<ul>' +
              '<li>Altamente personalizable</li>' +
              '<li>Archivos finales muy peque\u00f1os con purge</li>' +
              '<li>Dise\u00f1o consistente con utility classes</li>' +
              '<li>Muy popular en la industria (2026)</li>' +
              '<li>Excelente para desarrollo r\u00e1pido una vez dominado</li>' +
            '</ul>' +
            '<strong style="color: red;">Contras:</strong>' +
            '<ul>' +
              '<li>HTML muy verbose (muchas clases)</li>' +
              '<li>Requiere entender CSS bien</li>' +
              '<li>Necesita configuraci\u00f3n de build process</li>' +
              '<li>Curva de aprendizaje pronunciada para principiantes</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<hr>' +
        '<div style="margin: 15px 0;">' +
          '<h6><strong>Pico CSS</strong></h6>' +
          '<div>' +
            '<strong style="color: green;">Pros:</strong>' +
            '<ul>' +
              '<li>Muy ligero (~10KB)</li>' +
              '<li>Sem\u00e1ntico (menos clases)</li>' +
              '<li>Setup instant\u00e1neo</li>' +
              '<li>Perfecto para prototipos r\u00e1pidos</li>' +
            '</ul>' +
            '<strong style="color: red;">Contras:</strong>' +
            '<ul>' +
              '<li>Menos componentes disponibles</li>' +
              '<li>Personalizaci\u00f3n m\u00e1s limitada</li>' +
              '<li>Comunidad peque\u00f1a</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<hr>' +
        '<div style="margin: 15px 0;">' +
          '<h6><strong>DaisyUI</strong></h6>' +
          '<div>' +
            '<strong style="color: green;">Pros:</strong>' +
            '<ul>' +
              '<li>Componentes predefinidos para Tailwind</li>' +
              '<li>F\u00e1cil cambio de temas</li>' +
              '<li>Sintaxis m\u00e1s simple que Tailwind puro</li>' +
              '<li>Creciente popularidad</li>' +
            '</ul>' +
            '<strong style="color: red;">Contras:</strong>' +
            '<ul>' +
              '<li>Requiere Tailwind CSS instalado</li>' +
              '<li>A\u00fan requiere conocimiento de CSS</li>' +
              '<li>Documentaci\u00f3n no tan extensa como Bootstrap</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
      '</li>' +
      '<li>' +
        '<p>Aplica el framework y sus componentes a alguno de tus laboratorios o proyectos anteriores, a alg\u00fan prototipo que elabores de tu proyecto, o bien elabora una peque\u00f1a aplicaci\u00f3n.</p>' +
      '</li>' +
      '<li>' +
        '<p>Responde a las preguntas dentro de tu aplicaci\u00f3n.</p>' +
      '</li>' +
    '</ol>',
  preguntas: [
    'Describe Material design'
  ],
  recursos: [
    { texto: 'Material Design Palette', url: 'https://www.materialpalette.com/', externo: true },
    { texto: 'Bootstrap Documentation', url: 'https://getbootstrap.com/docs/', externo: true },
    { texto: 'Tailwind CSS Documentation', url: 'https://tailwindcss.com/docs', externo: true },
    { texto: 'Bulma Documentation', url: 'https://bulma.io/documentation/', externo: true },
    { texto: 'Pico CSS Documentation', url: 'https://picocss.com/docs', externo: true },
    { texto: 'DaisyUI Components', url: 'https://daisyui.com/components/', externo: true },
    { texto: 'Bootstrap Video Tutorials', url: 'https://www.youtube.com/results?search_query=bootstrap+tutorial+2026', externo: true }
  ],
  entrega: 'A trav\u00e9s de tu repositorio personal.'
};
