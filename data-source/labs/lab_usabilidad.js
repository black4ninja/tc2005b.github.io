// Created by Denisse Maldonado
const LAB = {
  id: 'lab_usabilidad',
  numero: null,
  titulo: 'Atomic Design — Construcción de Interfaces Modulares',
  descripcion: 'Aprende a construir interfaces web desde sus componentes más pequeños hasta páginas completas usando la metodología Atomic Design. Construirás un catálogo de videojuegos paso a paso.',
  modalidad: 'Colaborativa',
  objetivos: [
    'Entender los 5 niveles de Atomic Design: Átomos, Moléculas, Organismos, Plantillas y Páginas',
    'Aprender a identificar y separar componentes en diferentes niveles de complejidad',
    'Crear CSS modular y reutilizable siguiendo los principios de Atomic Design',
    'Construir una página web completa aplicando la metodología desde cero'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>Accede al tutorial interactivo completo de Atomic Design: <a target="_blank" href="/docs/node/tutorials/intro_web/Lab3CSS/AtomicDesign.html">🎮 Tutorial GameVault - Atomic Design</a></li>' +
      '<li>Sigue el tutorial paso a paso para construir el proyecto GameVault:' +
        '<ul>' +
          '<li><strong>Paso 0:</strong> Preparación del proyecto y estructura de archivos</li>' +
          '<li><strong>Nivel 1 - Átomos:</strong> Crea los elementos más pequeños (botones, badges, ratings)</li>' +
          '<li><strong>Nivel 2 - Moléculas:</strong> Combina átomos para formar componentes funcionales</li>' +
          '<li><strong>Nivel 3 - Organismos:</strong> Construye secciones completas de la interfaz</li>' +
          '<li><strong>Nivel 4 - Plantilla:</strong> Define la estructura de la página</li>' +
          '<li><strong>Nivel 5 - Página:</strong> Agrega el contenido real</li>' +
        '</ul>' +
      '</li>' +
      '<li>Cada nivel incluye:' +
        '<ul>' +
          '<li>Explicación conceptual del nivel</li>' +
          '<li>Código CSS y HTML con comentarios explicativos</li>' +
          '<li>Previsualizaciones interactivas en vivo</li>' +
          '<li>Checkpoints para validar tu progreso</li>' +
        '</ul>' +
      '</li>' +
      '<li>Al finalizar, tendrás un proyecto completo organizado con Atomic Design que podrás usar como referencia para futuros proyectos.</li>' +
    '</ol>',
  recursos: [
    { texto: '🎮 Tutorial Completo: GameVault con Atomic Design', url: '/docs/node/tutorials/intro_web/Lab3CSS/AtomicDesign.html', externo: false },
    { texto: 'Atomic Design Methodology', url: 'https://atomicdesign.bradfrost.com/', externo: true },
    { texto: 'Pattern Lab - Tool for Atomic Design', url: 'https://patternlab.io/', externo: true },
    { texto: 'BEM Naming Convention', url: 'https://getbem.com/', externo: true },
    { texto: 'CSS Variables (Custom Properties)', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties', externo: true }
  ],
  entrega: 'A través de tu repositorio personal (Bitbucket o GitHub) con la estructura completa del proyecto GameVault.'
};