import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * MUESTRA del formato de los ejercicios del catálogo adicional.
 *
 * Es deliberadamente el PRIMERO de los treinta y uno que faltan, y se escribe
 * solo para fijar el guion antes de producirlos en serie: si el formato hay que
 * cambiarlo, es mucho más barato descubrirlo ahora que con treinta ya escritos.
 *
 * ---------------------------------------------------------------------------
 * EN QUÉ SE DIFERENCIA DE UN EJERCICIO DEL CURSO UML
 *
 * La estructura es la MISMA (`EjercicioDiagramaDef` no cambia; `pasoAPaso` ya
 * era opcional), y eso es en sí un hallazgo: no hace falta un segundo tipo.
 * Lo que cambia es la dosis, y conviene que quede escrito:
 *
 *  1. **Un solo nivel**, no tres. Estos tipos no son materia de examen: existen
 *     para que el alumno los conozca y los pueda usar, no para evaluarlos con la
 *     profundidad de un diagrama de clases.
 *  2. **Sin ejemplo resuelto aparte.** Con un único ejercicio por tipo, un
 *     ejemplo resuelto duplicaría el contenido y no dejaría nada que resolver.
 *  3. **`procedencia` y `encaje` en una o dos frases.** En UML justifican por qué
 *     existe la notación; aquí basta con situarla.
 *  4. **De tres a cinco aserciones**, y al menos una que ataque el error
 *     dominante del tipo. Menos que eso no comprueba nada; más convierte en
 *     examen lo que es una toma de contacto.
 *  5. **`erroresTipicos` sigue siendo obligatorio.** Es la sección que más
 *     enseña y la que hace que el ejercicio no sea un ejercicio de sintaxis.
 * ---------------------------------------------------------------------------
 */

const ejercicios: EjercicioDiagramaDef[] = [
  {
    slug: 'mapa-mental-modulos-plataforma',
    titulo: 'Ramificar: los módulos de una plataforma',
    categoria: 'Mapas y estructura',
    bloque: 'Catálogo',
    nivel: 'base',
    orden: 10,
    motor: 'mermaid',
    tipoDiagrama: 'mapa-mental',

    problema:
      'Un mapa mental organiza ideas alrededor de un tema central. Su valor no está en la lista de ' +
      'nombres sino en la RAMIFICACIÓN: cada rama se abre en subramas que la concretan. Un mapa de un ' +
      'solo nivel es una lista con otro dibujo, y no ayuda a pensar.',
    procedencia:
      'La técnica se popularizó en los años setenta con Tony Buzan, que la propuso como forma de tomar ' +
      'notas siguiendo la asociación de ideas en vez de la secuencia lineal del texto.',
    encaje:
      'Se usa al principio, cuando todavía se está delimitando el alcance de un sistema y aún no hay ' +
      'decisiones de diseño que representar. No es notación UML y no sustituye a ningún diagrama del ' +
      'temario: sirve para ordenar lo que se sabe antes de modelarlo.',
    anatomia: [
      { elemento: 'Nodo raíz', significado: 'El tema central. Es el único sin padre.' },
      { elemento: 'Rama de primer nivel', significado: 'Una división principal del tema. Debe ser una categoría, no un detalle.' },
      { elemento: 'Subrama', significado: 'Concreta la rama de la que cuelga. Es lo que convierte la lista en jerarquía.' },
      { elemento: 'Sangría', significado: 'La sangría ES la estructura: un nodo cuelga de aquel bajo el que está indentado.' },
    ],
    otrosUsos:
      'La misma estructura de árbol aparece en la descomposición del trabajo de un proyecto, en el índice ' +
      'de un documento, en un árbol de carpetas y en un diagrama de Ishikawa, que es un mapa mental de ' +
      'causas colgando de un efecto.',
    erroresTipicos: [
      'Quedarse en un solo nivel de ramas. Es el error dominante: el resultado es una lista y no una jerarquía, y no dice nada que no dijera una enumeración.',
      'Colgar un detalle directamente de la raíz, en vez de agruparlo bajo la categoría a la que pertenece.',
      'Usar frases largas como etiqueta. Una rama se nombra con un sustantivo o un sintagma corto; si necesita una oración, es que son varias ramas.',
      'Confundir la sangría: en Mermaid la estructura no la marcan las flechas sino la indentación, así que un espacio de más cambia de quién cuelga el nodo.',
    ],
    queDibujas:
      'Un mapa mental de una plataforma de pedidos con la raíz `Plataforma` y al menos tres ramas de ' +
      'primer nivel, una de las cuales —`Catalogo`— debe abrirse a su vez en `Busqueda` y `Filtros`.',
    sintaxis: [
      { para: 'Abrir el diagrama', escribes: 'mindmap' },
      { para: 'La raíz, dibujada como círculo', escribes: 'root((Plataforma))' },
      { para: 'Una rama', escribes: '    Catalogo' },
      { para: 'Una subrama (más sangría que su padre)', escribes: '      Busqueda' },
    ],

    codigoInicial: `mindmap
  root((Plataforma))
    Catalogo
    Pedidos
    Cuentas
%% Tal como está, esto es una lista: ninguna rama se abre en subramas.
%% Abre al menos "Catalogo" en "Busqueda" y "Filtros".`,

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'Plataforma' } },
      { tipo: 'nodo-tiene-hijo', parametros: { padre: 'Catalogo', hijo: 'Busqueda' } },
      { tipo: 'nodo-tiene-hijo', parametros: { padre: 'Catalogo', hijo: 'Filtros' } },
      // El error dominante del tipo, y la razón de ser del ejercicio.
      { tipo: 'profundidad-minima', parametros: { niveles: 3 } },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `mindmap
  root((Plataforma))
    Catalogo
      Busqueda
      Filtros
    Pedidos
      Carrito
    Cuentas`,
      // Otra solución válida: más ramas abiertas y distinto orden.
      `mindmap
  root((Plataforma))
    Cuentas
      Registro
      Acceso
    Catalogo
      Filtros
      Busqueda
    Pedidos
      Carrito
      Pago`,
    ],

    // La lista disfrazada de jerarquía: plausible y exactamente el error que el
    // ejercicio busca evitar.
    diagramaTrampa: `mindmap
  root((Plataforma))
    Catalogo
    Busqueda
    Filtros
    Pedidos
    Cuentas`,
  },
];

export default ejercicios;
