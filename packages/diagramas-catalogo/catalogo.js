/**
 * Las definiciones de todos los tipos de diagrama que el proyecto conoce.
 *
 * Hasta ahora la lista vivía TRIPLICADA —la unión de la API, la unión del
 * cliente y la tabla de rótulos— y se sostenía porque eran ocho. Con más de
 * cuarenta deja de sostenerse: cualquier alta obligaba a tocar tres ficheros de
 * dos paquetes y el fallo de olvidarse de uno es silencioso (un tipo que el
 * servidor sirve y el cliente pinta como su clave cruda).
 *
 * ## `motoresJuez` y `plantillas` son cosas DISTINTAS
 *
 * `plantillas` dice en qué motores el tipo se DIBUJA; `motoresJuez`, en cuáles
 * el juez sabe EVALUARLO. La diferencia no es un detalle de implementación: hay
 * tipos que se dibujan y no se evalúan (casi todo el catálogo adicional) y tipos
 * que se dibujan en dos motores pero solo se evalúan en uno (clases, hoy solo en
 * Mermaid). Fusionarlas llevaría a ofrecer al alumno un motor en el que su envío
 * será rechazado, que es justo el defecto que este catálogo existe para evitar.
 *
 * `motoresJuez: []` es un estado legítimo y frecuente: el tipo está disponible
 * en modo libre y todavía no tiene normalizador.
 *
 * ## Las claves NO se renombran
 *
 * `clases`, `secuencia`, `estados`, `er`, `flujo`, `casos-de-uso`,
 * `componentes` y `paquetes` están escritas en la BD (`EjercicioDiagrama.
 * tipoDiagrama`, `DiagramaTaller.tipoDiagrama`). Cambiar una de esas cadenas
 * obliga a migrar datos; el rótulo visible sí se puede cambiar libremente.
 */

/**
 * Bloques del curso. El orden es el de la secuencia docente, no alfabético, y
 * coincide con el que ya usan los ejercicios sembrados (`bloque` en
 * `scripts/ejercicios-diagrama/`), así que renombrarlos rompería el agrupado del
 * listado.
 */
export const BLOQUES_CURSO = ['Estructura', 'Interacción', 'Comportamiento', 'Arquitectura'];

/** Grupos del catálogo adicional, en el orden en que se listan. */
export const GRUPOS_CATALOGO = [
  'Modelado adicional',
  'Datos y gráficos',
  'Planificación',
  'Mapas y estructura',
  'Texto y formatos',
  'Estrategia',
];

/**
 * @typedef {'mermaid' | 'plantuml'} Motor
 * @typedef {'curso' | 'catalogo'} Ambito
 */

/**
 * @typedef {object} TipoDiagramaDef
 * @property {string} key           Identificador estable. Se guarda en la BD.
 * @property {string} label         Rótulo visible.
 * @property {string} descripcion   Una línea; es lo que se pinta bajo el rótulo.
 * @property {string} familia       Qué normalizador lo lee. Ver `DIAGRAMAS.md`.
 * @property {Ambito} ambito        'curso' (UML del temario) o 'catalogo' (adicional).
 * @property {boolean} uml          Si la notación es UML. `er` y `flujo` NO lo son.
 * @property {string} agrupacion    Bloque del curso o grupo del catálogo.
 * @property {Motor[]} motoresJuez  Motores en los que el juez sabe evaluarlo. Puede ir vacío.
 */

/** @type {TipoDiagramaDef[]} */
export const TIPOS = [
  // --- Curso: Estructura -----------------------------------------------------
  {
    key: 'clases',
    label: 'Clases',
    descripcion: 'Clases, atributos, operaciones y las relaciones entre ellas.',
    familia: 'clases',
    ambito: 'curso',
    uml: true,
    agrupacion: 'Estructura',
    motoresJuez: ['mermaid', 'plantuml'],
  },
  {
    key: 'objeto',
    label: 'Objetos',
    descripcion: 'Instancias concretas con sus valores y sus enlaces.',
    familia: 'objeto',
    ambito: 'curso',
    uml: true,
    agrupacion: 'Estructura',
    motoresJuez: [],
  },
  {
    key: 'er',
    label: 'Entidad-relación',
    descripcion: 'Entidades, atributos y cardinalidades de un modelo de datos.',
    familia: 'er',
    ambito: 'curso',
    // Chen, 1976. Es anterior a UML y no forma parte del lenguaje; se enseña en
    // el curso por su uso en el modelado de bases de datos.
    uml: false,
    agrupacion: 'Estructura',
    motoresJuez: ['mermaid', 'plantuml'],
  },
  {
    key: 'paquetes',
    label: 'Paquetes',
    descripcion: 'Agrupación del sistema y dependencias entre paquetes.',
    familia: 'paquetes',
    ambito: 'curso',
    uml: true,
    agrupacion: 'Arquitectura',
    motoresJuez: ['plantuml'],
  },
  {
    key: 'componentes',
    label: 'Componentes',
    descripcion: 'Módulos del sistema y las interfaces que ofrecen y requieren.',
    familia: 'componentes',
    ambito: 'curso',
    uml: true,
    agrupacion: 'Arquitectura',
    motoresJuez: ['plantuml'],
  },
  {
    key: 'despliegue',
    label: 'Despliegue',
    descripcion: 'Nodos físicos y artefactos desplegados en cada uno.',
    familia: 'despliegue',
    ambito: 'curso',
    uml: true,
    agrupacion: 'Arquitectura',
    motoresJuez: [],
  },
  {
    key: 'casos-de-uso',
    label: 'Casos de uso',
    descripcion: 'Actores, objetivos del sistema y el límite entre ambos.',
    familia: 'casos-de-uso',
    ambito: 'curso',
    uml: true,
    agrupacion: 'Arquitectura',
    motoresJuez: ['plantuml'],
  },

  // --- Curso: Interacción ----------------------------------------------------
  {
    key: 'secuencia',
    label: 'Secuencia',
    descripcion: 'Mensajes entre objetos ordenados en el tiempo.',
    familia: 'secuencia',
    ambito: 'curso',
    uml: true,
    agrupacion: 'Interacción',
    motoresJuez: ['mermaid'],
  },
  {
    key: 'comunicacion',
    label: 'Comunicación',
    descripcion: 'Los mismos mensajes que la secuencia, con énfasis en los enlaces.',
    familia: 'comunicacion',
    ambito: 'curso',
    uml: true,
    agrupacion: 'Interacción',
    motoresJuez: [],
  },
  {
    key: 'timing',
    label: 'Tiempos',
    descripcion: 'Cambios de estado de uno o varios elementos sobre un eje temporal.',
    familia: 'timing',
    ambito: 'curso',
    uml: true,
    agrupacion: 'Interacción',
    motoresJuez: [],
  },

  // --- Curso: Comportamiento -------------------------------------------------
  {
    key: 'estados',
    label: 'Estados',
    descripcion: 'Estados de un objeto y las transiciones que los conectan.',
    familia: 'estados',
    ambito: 'curso',
    uml: true,
    agrupacion: 'Comportamiento',
    motoresJuez: ['mermaid'],
  },
  {
    key: 'actividad',
    label: 'Actividad',
    descripcion: 'Acciones de un proceso con calles de responsabilidad y paralelismo.',
    familia: 'actividad',
    ambito: 'curso',
    uml: true,
    agrupacion: 'Comportamiento',
    motoresJuez: [],
  },
  {
    key: 'flujo',
    label: 'Diagrama de flujo',
    descripcion: 'Pasos y decisiones de un proceso, sin la notación de actividad.',
    familia: 'flujo',
    ambito: 'curso',
    // Un flowchart no es un diagrama UML: no tiene calles ni fork/join. El
    // equivalente UML es `actividad`, que se ofrece aparte.
    uml: false,
    agrupacion: 'Comportamiento',
    motoresJuez: ['mermaid'],
  },

  // --- Catálogo: modelado adicional ------------------------------------------
  {
    key: 'c4',
    label: 'C4',
    descripcion: 'Contexto, contenedores y componentes del sistema.',
    familia: 'red',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Modelado adicional',
    motoresJuez: [],
  },
  {
    key: 'requisitos',
    label: 'Requisitos',
    descripcion: 'Requisitos y sus relaciones de trazabilidad.',
    familia: 'estrategia',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Modelado adicional',
    motoresJuez: [],
  },
  {
    key: 'archimate',
    label: 'ArchiMate',
    descripcion: 'Arquitectura empresarial por capas de negocio, aplicación y tecnología.',
    familia: 'red',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Modelado adicional',
    motoresJuez: [],
  },
  {
    key: 'eventmodeling',
    label: 'Modelado de eventos',
    descripcion: 'Pantallas, comandos, eventos y proyecciones a lo largo del tiempo.',
    familia: 'planificacion',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Modelado adicional',
    motoresJuez: [],
  },

  // --- Catálogo: datos y gráficos --------------------------------------------
  {
    key: 'pastel',
    label: 'Pastel',
    descripcion: 'Proporciones de un total repartidas en sectores.',
    familia: 'series',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Datos y gráficos',
    motoresJuez: [],
  },
  {
    key: 'xy',
    label: 'Ejes X/Y',
    descripcion: 'Series de datos en barras o líneas sobre dos ejes.',
    familia: 'series',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Datos y gráficos',
    motoresJuez: [],
  },
  {
    key: 'cuadrantes',
    label: 'Cuadrantes',
    descripcion: 'Clasificación de elementos en una matriz de dos ejes.',
    familia: 'series',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Datos y gráficos',
    motoresJuez: [],
  },
  {
    key: 'sankey',
    label: 'Sankey',
    descripcion: 'Flujos entre nodos, con el grosor proporcional a la magnitud.',
    familia: 'series',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Datos y gráficos',
    motoresJuez: [],
  },
  {
    key: 'radar',
    label: 'Radar',
    descripcion: 'Comparación de varias dimensiones sobre un polígono.',
    familia: 'series',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Datos y gráficos',
    motoresJuez: [],
  },
  {
    key: 'treemap',
    label: 'Mapa de árbol',
    descripcion: 'Jerarquía en la que el área de cada caja representa su valor.',
    familia: 'jerarquia',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Datos y gráficos',
    motoresJuez: [],
  },
  {
    key: 'venn',
    label: 'Venn',
    descripcion: 'Conjuntos y sus intersecciones.',
    familia: 'series',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Datos y gráficos',
    motoresJuez: [],
  },

  // --- Catálogo: planificación -----------------------------------------------
  {
    key: 'gantt',
    label: 'Gantt',
    descripcion: 'Tareas de un proyecto con su duración y sus dependencias.',
    familia: 'planificacion',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Planificación',
    motoresJuez: [],
  },
  {
    key: 'kanban',
    label: 'Kanban',
    descripcion: 'Tareas repartidas en columnas según su estado.',
    familia: 'planificacion',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Planificación',
    motoresJuez: [],
  },
  {
    key: 'timeline',
    label: 'Línea de tiempo',
    descripcion: 'Hitos en orden cronológico.',
    familia: 'planificacion',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Planificación',
    motoresJuez: [],
  },
  {
    key: 'recorrido',
    label: 'Recorrido de usuario',
    descripcion: 'Etapas que atraviesa el usuario y su valoración en cada una.',
    familia: 'planificacion',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Planificación',
    motoresJuez: [],
  },
  {
    key: 'wbs',
    label: 'Descomposición del trabajo',
    descripcion: 'Desglose jerárquico del alcance de un proyecto.',
    familia: 'jerarquia',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Planificación',
    motoresJuez: [],
  },

  // --- Catálogo: mapas y estructura ------------------------------------------
  {
    key: 'mapa-mental',
    label: 'Mapa mental',
    descripcion: 'Ideas que se ramifican desde un tema central.',
    familia: 'jerarquia',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Mapas y estructura',
    motoresJuez: [],
  },
  {
    key: 'git',
    label: 'Ramas de Git',
    descripcion: 'Ramas, commits y fusiones de un repositorio.',
    familia: 'versionado',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Mapas y estructura',
    motoresJuez: [],
  },
  {
    key: 'bloques',
    label: 'Bloques',
    descripcion: 'Cajas colocadas en una rejilla, con conexiones libres.',
    familia: 'red',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Mapas y estructura',
    motoresJuez: [],
  },
  {
    key: 'arquitectura-nube',
    label: 'Arquitectura en la nube',
    descripcion: 'Servicios de infraestructura y las conexiones entre ellos.',
    familia: 'red',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Mapas y estructura',
    motoresJuez: [],
  },
  {
    key: 'red',
    label: 'Topología de red',
    descripcion: 'Redes, equipos y sus direcciones.',
    familia: 'red',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Mapas y estructura',
    motoresJuez: [],
  },
  {
    key: 'paquete-red',
    label: 'Paquete de red',
    descripcion: 'Reparto de los bits de un paquete en sus campos.',
    familia: 'red',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Mapas y estructura',
    motoresJuez: [],
  },
  {
    key: 'arbol',
    label: 'Árbol',
    descripcion: 'Estructura de carpetas o cualquier jerarquía de nombres.',
    familia: 'jerarquia',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Mapas y estructura',
    motoresJuez: [],
  },
  {
    key: 'ishikawa',
    label: 'Ishikawa',
    descripcion: 'Causas agrupadas por categoría que conducen a un efecto.',
    familia: 'jerarquia',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Mapas y estructura',
    motoresJuez: [],
  },

  // --- Catálogo: texto y formatos --------------------------------------------
  {
    key: 'ebnf',
    label: 'EBNF',
    descripcion: 'Gramáticas en notación EBNF, dibujadas como vías de tren.',
    familia: 'gramatica',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Texto y formatos',
    motoresJuez: [],
  },
  {
    key: 'regex',
    label: 'Expresión regular',
    descripcion: 'Una expresión regular representada como diagrama.',
    familia: 'gramatica',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Texto y formatos',
    motoresJuez: [],
  },
  {
    key: 'json',
    label: 'JSON',
    descripcion: 'Estructura de un documento JSON.',
    familia: 'gramatica',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Texto y formatos',
    motoresJuez: [],
  },
  {
    key: 'yaml',
    label: 'YAML',
    descripcion: 'Estructura de un documento YAML.',
    familia: 'gramatica',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Texto y formatos',
    motoresJuez: [],
  },
  {
    key: 'wireframe',
    label: 'Boceto de interfaz',
    descripcion: 'Maqueta de baja fidelidad de una pantalla.',
    familia: 'maqueta',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Texto y formatos',
    motoresJuez: [],
  },

  // --- Catálogo: estrategia --------------------------------------------------
  {
    key: 'wardley',
    label: 'Mapa de Wardley',
    descripcion: 'Cadena de valor situada sobre un eje de evolución.',
    familia: 'estrategia',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Estrategia',
    motoresJuez: [],
  },
  {
    key: 'cynefin',
    label: 'Cynefin',
    descripcion: 'Clasificación de una decisión según cuán conocido es su contexto.',
    familia: 'estrategia',
    ambito: 'catalogo',
    uml: false,
    agrupacion: 'Estrategia',
    motoresJuez: [],
  },
];

// ---------------------------------------------------------------------------
// Consultas
//
// Viven aquí, junto a las definiciones, y NO en el barrel: quien solo necesita
// un rótulo —el listado del alumno, el solver, la tabla de autoría— importa
// `@tc2005b/diagramas-catalogo/catalogo` y no arrastra la tabla de plantillas,
// que son varias decenas de kilobytes de esqueletos que esas pantallas no
// pintan nunca.
// ---------------------------------------------------------------------------

export const MOTORES = [
  { key: 'mermaid', label: 'Mermaid' },
  { key: 'plantuml', label: 'PlantUML' },
];

const POR_KEY = new Map(TIPOS.map((t) => [t.key, t]));

/** Todas las claves, en el orden canónico del catálogo. */
export const KEYS = TIPOS.map((t) => t.key);

/**
 * Claves que el JUEZ sabe evaluar en al menos un motor.
 *
 * Es lo que valida el controlador al dar de alta un ejercicio: un ejercicio de
 * un tipo sin normalizador no se puede corregir, así que no debe poder crearse.
 * El modo libre NO usa esta lista —ahí vale cualquier tipo con plantilla—.
 */
export const KEYS_JUZGABLES = TIPOS.filter((t) => t.motoresJuez.length > 0).map((t) => t.key);

/** La definición de un tipo, o `undefined` si la clave no existe. */
export function tipoDiagrama(key) {
  return POR_KEY.get(key);
}

export function esTipoConocido(key) {
  return POR_KEY.has(key);
}

/**
 * Rótulo visible de un tipo. Cae a la clave cruda si no se conoce, para que un
 * dato más nuevo que este cliente se lea raro pero no rompa la pantalla.
 */
export function etiquetaTipo(key) {
  return POR_KEY.get(key)?.label ?? key;
}

export function etiquetaMotor(key) {
  return MOTORES.find((m) => m.key === key)?.label ?? key;
}

/** Si el juez sabe evaluar ese tipo en ese motor. */
export function esJuzgable(key, motor) {
  return POR_KEY.get(key)?.motoresJuez.includes(motor) ?? false;
}

const POSICION = new Map(TIPOS.map((t, i) => [t.key, i]));

/**
 * Posición de un tipo en el orden del catálogo, para ordenar listas que vienen
 * del servidor. Los tipos que este cliente aún no conozca van al final en vez
 * de desaparecer.
 */
export function posicionDeTipo(key) {
  return POSICION.get(key) ?? TIPOS.length;
}

/**
 * El catálogo agrupado tal y como se navega: primero los bloques del curso, en
 * el orden del temario, y después los grupos del catálogo adicional.
 *
 * Se construye aquí y no en la pantalla porque el listado de ejercicios, el
 * selector del modo libre y el editor de autoría tienen que ofrecer el MISMO
 * agrupado; tres derivaciones independientes acabarían divergiendo.
 *
 * Se calcula UNA vez: el catálogo es estático y el taller lo consulta en cada
 * render de su `<select>`.
 */
const AGRUPADO = (() => {
  const grupo = (ambito, nombres) =>
    nombres
      .map((nombre) => ({
        ambito,
        nombre,
        tipos: TIPOS.filter((t) => t.ambito === ambito && t.agrupacion === nombre),
      }))
      .filter((g) => g.tipos.length > 0);

  return [...grupo('curso', BLOQUES_CURSO), ...grupo('catalogo', GRUPOS_CATALOGO)];
})();

export function agrupado() {
  return AGRUPADO;
}
