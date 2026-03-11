// Created by Denisse Maldonado
const LAB = {
  id: 'lab19',
  numero: 19,
  titulo: 'Control de acceso RBAC',
  descripcion: 'En esta actividad exploraremos el modelo usado como est\u00e1ndar internacional para el control de acceso basado en roles (RBAC), y lo aplicar\u00e1s en aplicaciones web.',
  modalidad: 'En Equipo',
  objetivos: [
    'Entender el modelo RBAC.',
    'Implementar el modelo RBAC.'
  ],
  instruccionesHtml:
    '<ol class="lab-steps">' +
      '<li>Revisa junto con el profesor el modelo <a target="_blank" href="https://csrc.nist.gov/CSRC/media/Publications/conference-paper/1992/10/13/role-based-access-controls/documents/ferraiolo-kuhn-92.pdf">RBAC</a></li>' +
      '<li>Analiza junto con el profesor el siguiente MER que aplica el modelo RBAC.' +
        '<p><img src="RBAC R/RBAC.png" class="responsive-img center"></p>' +
        '\u00bfQu\u00e9 capacidades le puede dar a una aplicaci\u00f3n la implementaci\u00f3n de este modelo de datos con respecto al control de acceso?' +
      '</li>' +
      '<li>' +
        'Implementen en equipo el modelo RBAC en una aplicaci\u00f3n. La recomendaci\u00f3n es que sea en su proyecto, pero si prefieren hacerlo en otra aplicaci\u00f3n, no hay inconveniente. <br>' +
        'Algunos aspectos a considerar en la implementaci\u00f3n:' +
        '<ol>' +
          '<li>1. Primero deben soportar el modelo a nivel de la base de datos, y poblar la BD con suficientes registros para que puedan verificar la correcta aplicaci\u00f3n del modelo.</li>' +
          '<li>2. A nivel de la aplicaci\u00f3n web, es necesario obtener los permisos del usuario en el momento en el que se autentifica, esto lo pueden realizar obteniendo los roles del usuario, y luego los permisos asignados a cada rol.</li>' +
          '<li>3. Posteriormente pueden generar la interfaz gr\u00e1fica de manera din\u00e1mica de acuerdo a los permisos del usuario.</li>' +
          '<li>4. Es importante, validar el permiso requerido en cada ruta.</li>' +
          '<li>5. El nivel m\u00e1s avanzado de la implementaci\u00f3n del modelo RBAC, implica la creaci\u00f3n de una interface de usuario con la capacidad para gestionar las asignaciones de roles y permisos. Considerando las restricciones de su aplicaci\u00f3n, eval\u00faen e implementen lo que consideren necesario de esta interface.</li>' +
        '</ol>' +
      '</li>' +
    '</ol>',
  preguntas: [
    '\u00bfEn qu\u00e9 consiste el control de acceso basado en roles?',
    'Investiguen y describan 2 sistemas, uno que aplique RBAC y uno que no. Realicen un an\u00e1lisis de las ventajas y desventajas de cada uno con respecto al control de acceso.'
  ],
  recursos: [
    { texto: 'A Story of Authentication vs Authorisation', url: 'https://automationstepbystep.com/2020/04/29/4414/', externo: true },
    { texto: 'Authentication vs Authorization \u2013 What\\\'s the Difference?', url: 'https://www.freecodecamp.org/news/whats-the-difference-between-authentication-and-authorisation', externo: true },
    { texto: 'Role Base Access Introduction Video', url: 'https://www.youtube.com/watch?v=C4NP8Eon3cA', externo: true },
    { texto: 'Lectura: Consultas en SQL usando roles y Sub-consultas.', url: 'lectura6_sql_roles/lectura_sql_roles.html', externo: false },
    { texto: 'RBAC NIST Standard.', url: 'https://csrc.nist.gov/Projects/Role-Based-Access-Control', externo: true }
  ],
  entrega: 'A trav\u00e9s de Bitbucket o GitHub (Repositorio de Equipo).'
};
