/**
 * Lab 7 - Manejo de ramas
 * Created by Denisse Maldonado
 */
const LAB = {
  id: 'lab3',
  numero: 3,
  titulo: 'Manejo de ramas',
  descripcion: 'En esta actividad exploraremos el uso de ramas para controlar e integrar diferentes versiones de codigo.',
  modalidad: 'Colaborativa',
  objetivos: [
    'Conocer, explorar y aplicar frameworks de estilos para aplicaciones web.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
    '<li>' +
    'Presta mucha atencion a la demostracion del profesor en la sesion de clase. Es importante que preguntes conforme te van surgiendo dudas.' +
    '</li>' +
    '<li>' +
    'En equipo, creen un repositorio para su proyecto en BitBucket, GitHub o GitLab.' +
    '</li>' +
    '<li>' +
    '<p>Una persona del equipo, debera clonar el repositorio de manera local, y a partir de la rama <code>main</code> o <code>master</code>, debera crear la rama <code>develop</code>, despues creara una rama adicional y debera agregar un archivo <code>index.html</code> y sincronizar la rama local, con la rama remota, para finalmente hacer un merge a traves de un Pull Request con develop.</p>' +
    '<p>A partir de este momento, este sera su espacio de trabajo en su proyecto (a.k.a. Single Repository of Truth). Unicamente el codigo que se encuentre integrado en las ramas <code>main o master</code> y <code>develop</code>, formara oficialmente parte de su proyecto y se considerara como evidencia para evaluacion.</p>' +
    '</li>' +
    '<li>' +
    '<p>Una persona por equipo debe compartir el <strong>enlace</strong> del repositorio de equipo junto con los <strong>nombres y usuarios</strong> de todos sus miembros en el canal de discord del equipo, para que se pueda revisar y retroalimentar su trabajo.</p>' +
    '<p>Tambien deberan agregar a su repositorio a los profesores con usuarios: <strong>black4ninja</strong> y <strong>strike277</strong>.</p>' +
    '<p><strong>Realizar esta accion es indispensable para tener calificacion en los avances de proyecto. No realizarla implica 0 en TODAS las actividades que se entregan por medio del repositorio de equipo.</strong></p>' +
    '<p>En ningun momento deberan existir commits directos a las ramas main, master o develop, solo merges a traves de Pull Request que hayan sido validados por el equipo.</p>' +
    '<p>Deberan eliminar los branches personales o por features que vayan generando, por ejemplo: cuando todos hayan finalizado el trabajo deberan existir solo main o master y develop.</p>' +
    '</li>' +
    '<li>' +
    '<p>Algunos puntos importantes a considerar:</p>' +
    '<ul>' +
    '<li>Las ramas <code>main o master</code> y <code>develop</code> son de integracion, nunca se escribe codigo directamente en ellas.</li>' +
    '<li>Todo el codigo debe escribirse en ramas personales, derivadas siempre de la version mas reciente de <code>develop</code>.</li>' +
    '<li>Idealmente, en cada sesion de trabajo debe crearse una <strong>nueva</strong> rama personal nombrada <code>nombre/feature</code>. Durante la sesion debe terminarse el trabajo y el codigo debe quedar estable para que al final de la sesion, la rama personal se integre a la rama <code>develop</code>.</li>' +
    '<li>Idealmente, en cada sesion de trabajo deben realizarse varios commits, cada uno, con una unidad pequena, logica y completa de trabajo.</li>' +
    '<li>Entre mas tiempo pase entre una integracion y otra, mayor es la probabilidad de conflictos, y mas riesgoso es arreglarlos, por lo que es importante integrar el trabajo frecuentemente para reducir esta posibilidad.</li>' +
    '</ul>' +
    '</li>' +
    '</ol>',
  recursos: [
    { texto: 'Presentacion de la sesion de clase', url: 'https://docs.google.com/presentation/d/1b9MTAOGbKB931l1d7VxxIC9BXx1_YQAdKXhUfKJ9yUE/edit?usp=sharing', externo: true },
    { texto: 'A successful branching model (Driessen)', url: 'http://nvie.com/posts/a-successful-git-branching-model/', externo: true },
    { texto: 'Writing good commit messages', url: 'https://www.freecodecamp.org/news/writing-good-commit-messages-a-practical-guide/', externo: true },
    { texto: 'Learn Git Branching', url: 'https://learngitbranching.js.org', externo: true },
    { texto: 'The Beginner\'s Guide to Understanding Core Version Control Concepts', url: 'https://www.freecodecamp.org/news/git-the-laymans-guide-to-understanding-the-core-concepts/', externo: true },
    { texto: 'How To Remove Committed Files From Git Version Control', url: 'https://medium.com/better-programming/how-to-remove-committed-files-from-git-version-control-b6533b8f9044', externo: true }
  ],
  entrega: 'En el canal de discord del equipo'
};
