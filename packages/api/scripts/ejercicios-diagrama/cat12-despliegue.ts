import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Despliegue": dónde corre lo que se diseñó.
 *
 * El error dominante en esta vista, y el que atacan los tres niveles, es
 * confundir CONECTAR con DESPLEGAR: dibujar una flecha del artefacto al nodo y
 * creer que eso lo instala. Un artefacto está desplegado si está DENTRO del
 * nodo, y por eso las comprobaciones miran la contención y no las flechas.
 */

const COMPONENTES_RESERVA = `@startuml
component "Aplicacion movil" as App
component "Servicio de reservas" as Servicio
component "Servicio de notificaciones" as Notificaciones
database "Base de datos" as BD
App --> Servicio
Servicio --> BD
Servicio --> Notificaciones
@enduml`;

const ANATOMIA = [
  { elemento: 'Caja tridimensional (`node`)', significado: 'Un nodo: un sitio donde algo se ejecuta. Un servidor, un teléfono, un contenedor.' },
  { elemento: 'Caja con pestaña (`artifact`)', significado: 'Un artefacto: lo que se despliega. Un jar, una imagen, un binario, un paquete.' },
  { elemento: 'Artefacto DENTRO de un nodo', significado: 'Eso, y solo eso, significa «desplegado en». Una flecha no despliega nada.' },
  { elemento: 'Nodo dentro de otro nodo', significado: 'Anidamiento: una máquina dentro de un centro de datos, un contenedor dentro de un servidor.' },
  { elemento: 'Línea entre nodos', significado: 'Una vía de comunicación. Se rotula con el protocolo: `HTTPS`, `JDBC`, `AMQP`.' },
  { elemento: 'Cilindro (`database`)', significado: 'Un nodo especializado en almacenar. Se sigue tratando como un sitio, no como un artefacto.' },
];

const SINTAXIS = [
  { para: 'Un nodo con lo que corre dentro', escribes: 'node "Servidor" as srv {\\n  artifact "app.jar" as app\\n}' },
  { para: 'Un artefacto suelto', escribes: 'artifact "informe.pdf" as doc' },
  { para: 'Una base de datos', escribes: 'database "PostgreSQL" as bd' },
  { para: 'Nodos anidados', escribes: 'cloud "AWS" as aws {\\n  node "EC2" as ec2 {\\n  }\\n}' },
  { para: 'Comunicación con su protocolo', escribes: 'app --> srv : HTTPS' },
];

const PROCEDENCIA =
  'El diagrama de despliegue viene del método Booch, que ya distinguía la vista lógica de la física, y entró ' +
  'en UML 1.1 en 1997. En UML 2.0 se separó con claridad el ARTEFACTO —lo que se despliega— del componente ' +
  '—lo que se diseña—, que es la distinción que sostiene toda esta vista.';

const OTROS_USOS =
  'La misma idea aparece en un fichero `docker-compose.yml`, en un manifiesto de Kubernetes y en un diagrama ' +
  'de arquitectura de nube: en los tres se dice qué imagen corre en qué sitio y cómo se comunican entre sí.';

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'ejemplo-resuelto-despliegue-reservas',
    titulo: 'Ejemplo resuelto: dónde corre el sistema de reservas',
    categoria: 'Despliegue',
    bloque: 'Arquitectura',
    nivel: 'guiado',
    orden: 1,
    esEjemplo: true,
    motor: 'plantuml',
    tipoDiagrama: 'despliegue',

    problema:
      'El diagrama de componentes dice qué módulos existen y cómo se llaman entre sí. No dice dónde corre ' +
      'ninguno. Este ejemplo muestra el mismo sistema desde la vista física: qué artefacto vive en qué nodo ' +
      'y con qué protocolo se hablan.',
    procedencia: PROCEDENCIA,
    encaje:
      'Se dibuja al final del diseño arquitectónico, cuando ya se sabe qué componentes hay y hace falta ' +
      'decidir la infraestructura. Responde a "dónde corre cada cosa y qué necesita hablar con qué".',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dibujar una flecha del artefacto al nodo en vez de meterlo dentro. La flecha es comunicación; la contención es despliegue.',
      'Confundir componente con artefacto. El componente es una unidad de DISEÑO; el artefacto es el fichero que se instala.',
      'Desplegar algo que no existe en el diagrama de componentes. Si hace falta desplegarlo, primero hay que diseñarlo.',
      'Dejar las comunicaciones sin protocolo: el diagrama pierde la información que justifica dibujarlo.',
    ],
    queDibujas:
      'Nada: este ejercicio ya viene resuelto. Léelo, envíalo para ver cómo se comprueba y úsalo como ' +
      'referencia en los tres siguientes.',
    pasoAPaso: [
      'Fíjate en que cada artefacto está DENTRO de las llaves de un nodo: eso es lo que significa desplegado.',
      'Observa que los nombres de los artefactos coinciden con componentes del diagrama de arriba.',
      'Las flechas van entre nodos y llevan protocolo; no sustituyen a la contención.',
      'La base de datos es un nodo, no un artefacto: es un sitio donde algo corre.',
    ],
    sintaxis: SINTAXIS,

    diagramasContexto: [
      { nombre: 'componentes', titulo: 'Diagrama de componentes del sistema de reservas', tipo: 'componentes', motor: 'plantuml', codigo: COMPONENTES_RESERVA },
    ],

    codigoInicial: `@startuml
node "Telefono del usuario" as movil {
  artifact "Aplicacion movil" as app
}
node "Servidor de aplicaciones" as srv {
  artifact "Servicio de reservas" as reservas
  artifact "Servicio de notificaciones" as notif
}
database "Base de datos" as bd
app --> srv : HTTPS
srv --> bd : JDBC
@enduml`,

    aserciones: [
      { tipo: 'artefacto-desplegado-en', parametros: { artefacto: 'Aplicacion movil', nodo: 'Telefono del usuario' } },
      { tipo: 'artefacto-desplegado-en', parametros: { artefacto: 'Servicio de reservas', nodo: 'Servidor de aplicaciones' } },
      { tipo: 'artefacto-corresponde-a-componente', parametros: { contexto: 'componentes' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Base de datos' } },
      { tipo: 'conteo-nodos', parametros: { min: 5 } },
    ],

    diagramasReferencia: [
      `@startuml
node "Telefono del usuario" as movil {
  artifact "Aplicacion movil" as app
}
node "Servidor de aplicaciones" as srv {
  artifact "Servicio de reservas" as reservas
  artifact "Servicio de notificaciones" as notif
}
database "Base de datos" as bd
app --> srv : HTTPS
srv --> bd : JDBC
@enduml`,
      `@startuml
node "Servidor de aplicaciones" as srv {
  artifact "Servicio de notificaciones" as notif
  artifact "Servicio de reservas" as reservas
}
node "Telefono del usuario" as movil {
  artifact "Aplicacion movil" as app
}
database "Base de datos" as bd
app --> srv : HTTPS
srv --> bd : JDBC
@enduml`,
    ],

    diagramaTrampa: `@startuml
node "Telefono del usuario" as movil
artifact "Aplicacion movil" as app
node "Servidor de aplicaciones" as srv
artifact "Servicio de reservas" as reservas
database "Base de datos" as bd
app --> movil
reservas --> srv
srv --> bd : JDBC
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'despliegue-dentro-no-al-lado',
    titulo: 'Dentro, no al lado: instalar el servicio',
    categoria: 'Despliegue',
    bloque: 'Arquitectura',
    nivel: 'guiado',
    orden: 10,
    motor: 'plantuml',
    tipoDiagrama: 'despliegue',

    problema:
      'El diagrama de abajo dibuja el artefacto y el nodo y los une con una flecha. Se ve razonable y dice ' +
      'algo distinto de lo que se pretende: que el artefacto se COMUNICA con el servidor, no que corre en él. ' +
      'Un artefacto está desplegado si está dentro del nodo.',
    procedencia: PROCEDENCIA,
    encaje:
      'Es el primer uso de la vista, y también el primer malentendido. Distinguir contención de comunicación ' +
      'es lo que hay que tener claro antes de dibujar cualquier otra cosa aquí.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Unir artefacto y nodo con una flecha. Es la lectura contraria: dice que el artefacto habla con el nodo desde fuera.',
      'Meter el nodo dentro del artefacto. La contención va en un solo sentido: los artefactos van dentro de los nodos.',
      'Declarar el artefacto fuera y creer que la flecha lo coloca. El motor lo dibuja igual y el diagrama afirma algo falso.',
      'Dejar el nodo vacío: un servidor sin nada dentro no despliega nada.',
    ],
    queDibujas:
      'El mismo caso, con `servicio-reservas.jar` **dentro** del nodo `Servidor de aplicaciones`, y una ' +
      'comunicación rotulada `JDBC` entre ese servidor y la base de datos.',
    pasoAPaso: [
      'Abre el nodo con llaves: `node "Servidor de aplicaciones" as srv {`.',
      'Mueve la declaración del artefacto dentro de esas llaves.',
      'Cierra el bloque con `}` y borra la flecha que unía el artefacto con el nodo.',
      'Añade `srv --> bd : JDBC` para la comunicación con la base de datos.',
    ],
    sintaxis: SINTAXIS,

    codigoInicial: `@startuml
node "Servidor de aplicaciones" as srv
artifact "servicio-reservas.jar" as jar
database "Base de datos" as bd
jar --> srv
srv --> bd
@enduml
' La flecha dice que el jar se comunica con el servidor, no que corre en él.
' Métetelo dentro y rotula la comunicación con la base de datos.`,

    aserciones: [
      { tipo: 'artefacto-desplegado-en', parametros: { artefacto: 'servicio-reservas.jar', nodo: 'Servidor de aplicaciones' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Base de datos' } },
      {
        tipo: 'relacion-entre',
        parametros: { origen: 'Servidor de aplicaciones', destino: 'Base de datos', tipo: 'dependencia' },
        rotulo: 'Hay una vía de comunicación del servidor a la base de datos',
      },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
node "Servidor de aplicaciones" as srv {
  artifact "servicio-reservas.jar" as jar
}
database "Base de datos" as bd
srv --> bd : JDBC
@enduml`,
      `@startuml
database "Base de datos" as bd
node "Servidor de aplicaciones" as srv {
  artifact "servicio-reservas.jar" as jar
  artifact "config.yml" as cfg
}
srv --> bd : JDBC
@enduml`,
    ],

    // El artefacto sigue fuera, aunque ahora la flecha apunte al revés.
    diagramaTrampa: `@startuml
node "Servidor de aplicaciones" as srv
artifact "servicio-reservas.jar" as jar
database "Base de datos" as bd
srv --> jar
srv --> bd : JDBC
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'despliegue-anidado-nube',
    titulo: 'Anidar sitios: el servicio en la nube',
    categoria: 'Despliegue',
    bloque: 'Arquitectura',
    nivel: 'base',
    orden: 20,
    motor: 'plantuml',
    tipoDiagrama: 'despliegue',

    problema:
      'Decir que un servicio corre «en la nube» no informa de nada: la nube no es una máquina. Lo que hay es ' +
      'una máquina dentro de un proveedor, y el artefacto dentro de la máquina. El anidamiento de nodos es lo ' +
      'que permite decir las dos cosas a la vez sin mentir en ninguna.',
    procedencia: PROCEDENCIA,
    encaje:
      'Aparece en cuanto el despliegue deja de ser un servidor físico. Es la forma de representar contenedores, ' +
      'máquinas virtuales y regiones sin inventar notación.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Poner el artefacto directamente dentro del proveedor, saltándose la máquina. El diagrama entonces no dice en qué corre.',
      'Dibujar el proveedor como un artefacto. Un proveedor es un sitio, no algo que se instale.',
      'Anidar al revés: la máquina dentro del contenedor de aplicación en vez de al contrario.',
      'Usar dos nodos hermanos —«AWS» y «EC2»— unidos por una flecha, en vez de anidarlos. Vuelve a ser el error de confundir comunicación con contención.',
    ],
    queDibujas:
      'Un diagrama de despliegue con `AWS` conteniendo a `EC2`, y `servicio-reservas.jar` dentro de `EC2`. ' +
      'Añade fuera un `Telefono del usuario` con `Aplicacion movil` dentro, comunicado con `EC2` por `HTTPS`.',
    sintaxis: SINTAXIS,

    diagramasContexto: [
      { nombre: 'componentes', titulo: 'Diagrama de componentes del sistema de reservas', tipo: 'componentes', motor: 'plantuml', codigo: COMPONENTES_RESERVA },
    ],

    codigoInicial: `@startuml
cloud "AWS" as aws {
  artifact "servicio-reservas.jar" as jar
}
node "Telefono del usuario" as movil {
  artifact "Aplicacion movil" as app
}
movil --> aws : HTTPS
@enduml
' El jar cuelga del proveedor, así que el diagrama no dice en qué máquina corre.
' Mete un nodo EC2 dentro de AWS y el artefacto dentro de EC2.`,

    aserciones: [
      { tipo: 'artefacto-desplegado-en', parametros: { artefacto: 'servicio-reservas.jar', nodo: 'EC2' } },
      // La contención es transitiva: lo que está en EC2 está en AWS.
      { tipo: 'artefacto-desplegado-en', parametros: { artefacto: 'servicio-reservas.jar', nodo: 'AWS' } },
      { tipo: 'artefacto-desplegado-en', parametros: { artefacto: 'Aplicacion movil', nodo: 'Telefono del usuario' } },
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'EC2', paquete: 'AWS' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'EC2' } },
    ],

    diagramasReferencia: [
      `@startuml
cloud "AWS" as aws {
  node "EC2" as ec2 {
    artifact "servicio-reservas.jar" as jar
  }
}
node "Telefono del usuario" as movil {
  artifact "Aplicacion movil" as app
}
movil --> ec2 : HTTPS
@enduml`,
      `@startuml
node "Telefono del usuario" as movil {
  artifact "Aplicacion movil" as app
}
cloud "AWS" as aws {
  node "EC2" as ec2 {
    artifact "servicio-reservas.jar" as jar
    artifact "config.yml" as cfg
  }
  database "RDS" as rds
}
movil --> ec2 : HTTPS
ec2 --> rds : JDBC
@enduml`,
    ],

    // EC2 existe pero como hermano de AWS, no dentro: el error de confundir
    // comunicación con contención, otra vez.
    diagramaTrampa: `@startuml
cloud "AWS" as aws
node "EC2" as ec2 {
  artifact "servicio-reservas.jar" as jar
}
node "Telefono del usuario" as movil {
  artifact "Aplicacion movil" as app
}
aws --> ec2
movil --> ec2 : HTTPS
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'despliegue-artefacto-sin-componente',
    titulo: 'Desplegar algo que nadie diseñó',
    categoria: 'Despliegue',
    bloque: 'Arquitectura',
    nivel: 'reto',
    orden: 30,
    motor: 'plantuml',
    tipoDiagrama: 'despliegue',

    problema:
      'El diagrama de abajo despliega cuatro artefactos, y uno de ellos —`Servicio de pagos`— no aparece en ' +
      'el diagrama de componentes. Puede significar dos cosas: que sobra en el despliegue, o que falta en el ' +
      'diseño. En ambos casos hay una incoherencia entre las dos vistas, y es la clase de defecto que solo ' +
      'se ve cruzándolas.',
    procedencia: PROCEDENCIA,
    encaje:
      'Es la comprobación que se hace en una revisión de arquitectura: contrastar lo que se va a instalar ' +
      'contra lo que se diseñó. Desplegar algo que no está en el diseño es el error clásico de esta vista.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Desplegar un artefacto que no corresponde a ningún componente. Si de verdad hace falta, el diagrama de componentes está incompleto y hay que arreglarlo ahí.',
      'Resolverlo borrando el artefacto sin preguntarse si el diseño era el que estaba mal.',
      'Renombrar el artefacto para que «cuadre» con un componente que hace otra cosa.',
      'Dejar un artefacto fuera de todo nodo al reorganizar el diagrama: deja de estar desplegado aunque siga dibujado.',
    ],
    queDibujas:
      'El despliegue corregido: **todos** los artefactos tienen que corresponder a un componente del diagrama ' +
      'de contexto, cada uno dentro de un nodo, y el servidor comunicado con la base de datos por `JDBC`. ' +
      'Conserva la aplicación móvil en el teléfono.',
    sintaxis: SINTAXIS,

    diagramasContexto: [
      { nombre: 'componentes', titulo: 'Diagrama de componentes del sistema de reservas', tipo: 'componentes', motor: 'plantuml', codigo: COMPONENTES_RESERVA },
    ],

    codigoInicial: `@startuml
node "Telefono del usuario" as movil {
  artifact "Aplicacion movil" as app
}
node "Servidor de aplicaciones" as srv {
  artifact "Servicio de reservas" as reservas
  artifact "Servicio de pagos" as pagos
  artifact "Servicio de notificaciones" as notif
}
database "Base de datos" as bd
app --> srv : HTTPS
srv --> bd : JDBC
@enduml
' Uno de los artefactos no corresponde a ningún componente del diseño.
' Compáralo con el diagrama de arriba y decide qué hacer con él.`,

    aserciones: [
      { tipo: 'artefacto-corresponde-a-componente', parametros: { contexto: 'componentes' } },
      { tipo: 'artefacto-desplegado-en', parametros: { artefacto: 'Servicio de reservas', nodo: 'Servidor de aplicaciones' } },
      { tipo: 'artefacto-desplegado-en', parametros: { artefacto: 'Servicio de notificaciones', nodo: 'Servidor de aplicaciones' } },
      { tipo: 'artefacto-desplegado-en', parametros: { artefacto: 'Aplicacion movil', nodo: 'Telefono del usuario' } },
      {
        tipo: 'relacion-entre',
        parametros: { origen: 'Servidor de aplicaciones', destino: 'Base de datos', tipo: 'dependencia' },
        rotulo: 'Hay una vía de comunicación del servidor a la base de datos',
      },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
node "Telefono del usuario" as movil {
  artifact "Aplicacion movil" as app
}
node "Servidor de aplicaciones" as srv {
  artifact "Servicio de reservas" as reservas
  artifact "Servicio de notificaciones" as notif
}
database "Base de datos" as bd
app --> srv : HTTPS
srv --> bd : JDBC
@enduml`,
      `@startuml
node "Telefono del usuario" as movil {
  artifact "Aplicacion movil" as app
}
cloud "Proveedor" as nube {
  node "Servidor de aplicaciones" as srv {
    artifact "Servicio de notificaciones" as notif
    artifact "Servicio de reservas" as reservas
  }
}
database "Base de datos" as bd
app --> srv : HTTPS
srv --> bd : JDBC
@enduml`,
    ],

    // Quita el artefacto sobrante pero deja el de notificaciones fuera de todo
    // nodo: ya no está desplegado en ninguna parte.
    diagramaTrampa: `@startuml
node "Telefono del usuario" as movil {
  artifact "Aplicacion movil" as app
}
node "Servidor de aplicaciones" as srv {
  artifact "Servicio de reservas" as reservas
}
artifact "Servicio de notificaciones" as notif
database "Base de datos" as bd
app --> srv : HTTPS
srv --> bd : JDBC
notif --> srv
@enduml`,
  },
];

export default ejercicios;
