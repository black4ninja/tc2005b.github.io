import type { Lab } from '@/types/lab';

const lab_seguridad: Lab = {
  id: 'lab_seguridad',
  numero: null,
  titulo: 'Taller de seguridad',
  descripcion: 'En esta actividad ...',
  modalidad: 'Individual',
  objetivos: [
    'Obj 1',
    'Obj 2'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>Haz esto...</li>' +
      '<li>Luego esto...</li>' +
    '</ol>',
  preguntas: [
    'Pregunta 1',
    'Pregunta 2'
  ],
  recursos: [
    { texto: 'XXS game', url: 'https://xss-game.appspot.com/', externo: true }
  ],
  entrega: 'A trav\u00e9s de tu repositorio personal (Bitbucket o GitHub).'
};

export default lab_seguridad;
