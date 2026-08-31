/**
 * Constantes del módulo "Actividad de Scrum".
 *
 * El módulo es de APRENDIZAJE: los alumnos practican el ciclo de Scrum en clase
 * —en la versión de plastilina, modelando figuras— y la herramienta existe para
 * que vean cómo fluyen las iteraciones. Por eso todo está deliberadamente corto
 * y las reglas que se hacen cumplir son las que enseñan algo al romperse.
 */

/** Las cinco columnas del tablero, en orden de izquierda a derecha. */
export const COLUMNAS = ['backlog', 'planned', 'doing', 'review', 'done'] as const;
export type Columna = (typeof COLUMNAS)[number];

/**
 * Las cuatro de `planned` en adelante son el SPRINT BACKLOG: lo que el equipo se
 * comprometió a terminar. `backlog` es el product backlog, que vive fuera del
 * compromiso. La interfaz lo dibuja con un recuadro punteado alrededor de estas
 * cuatro, y aquí está la misma frontera en datos.
 */
export const COLUMNAS_DEL_SPRINT: Columna[] = ['planned', 'doing', 'review', 'done'];

/** Prioridad MoSCoW. `wont` sin apóstrofo: es una clave, no una etiqueta. */
export const PRIORIDADES = ['must', 'should', 'could', 'wont'] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export const PRIORIDAD_POR_DEFECTO: Prioridad = 'should';

/**
 * Estimación. Cuatro cifras y dos que NO son cifras:
 *
 *  - `0` es **?**: todavía no se sabe.
 *  - `-1` es **∞**: demasiado grande, hay que partirla.
 *
 * Ninguna de las dos deja entrar la historia al sprint. Es la regla de la
 * actividad —«solo historias de usuario estimadas podrán trabajarse»— y la
 * herramienta la aplica en vez de repetirla: el ∞ no es un castigo, es la
 * manera de que partir la historia sea el único camino hacia adelante.
 */
export const PUNTOS_DESCONOCIDO = 0;
export const PUNTOS_DEMASIADO = -1;
export const PUNTOS_VALIDOS = [PUNTOS_DEMASIADO, PUNTOS_DESCONOCIDO, 1, 2, 3, 5] as const;

/** Las que sí son una estimación: las únicas que pueden pasar al sprint. */
export function estaEstimada(puntos: number): boolean {
  return puntos > 0;
}

/** Tope de cada campo de la historia. Un post-it que no cabe deja de serlo. */
export const LARGO_CAMPO = 200;

/** Tope de la descripción de una etapa: tres o cuatro frases. */
export const LARGO_DESCRIPCION_ETAPA = 400;

/** Nueve equipos: lo que cabe legible en una rejilla de 3 × 3 proyectada. */
export const MAX_EQUIPOS = 9;

export const LARGO_NOMBRE = 60;
export const LARGO_OBJETIVO = 160;
export const LARGO_TARJETA_RETRO = 200;

/* ------------------------------------------------------------------ */
/*  Política de etapa: qué se puede tocar y cuándo                     */
/* ------------------------------------------------------------------ */

/**
 * Qué deja ver y tocar una etapa de cada mitad del tablero.
 *
 * Es la pieza que convierte el tablero en la explicación del ciclo: en planning
 * el sprint backlog se VE pero no se toca, en grooming se pliega, y en la daily
 * se pliega el backlog para que solo quede lo comprometido. La regla deja de ser
 * algo que el profesor repite y pasa a ser algo que la pantalla hace.
 */
export const VISIBILIDADES = ['editable', 'lectura', 'plegado', 'oculto'] as const;
export type Visibilidad = (typeof VISIBILIDADES)[number];

export const MOVIMIENTOS = [
  'todos',
  'backlog-a-planned',
  'dentro-backlog',
  'dentro-sprint',
  'ninguno',
] as const;
export type Movimiento = (typeof MOVIMIENTOS)[number];

export interface PoliticaEtapa {
  backlog: Visibilidad;
  sprint: Visibilidad;
  movimientos: Movimiento;
  /** Enseña el burndown junto al tablero. */
  burndown: boolean;
  /** Esconde el kanban entero y saca el tablero de retrospectiva. */
  retro: boolean;
  /** Al SALIR de esta etapa se cobra la deuda técnica pendiente. */
  cobraDeuda: boolean;
  /** Cuánto dura, para el cronómetro. `null` = sin tiempo. */
  duracionSegundos: number | null;
}

/**
 * La base sobre la que se monta la política de cada etapa: lo que no diga la
 * etapa, se puede. Es un punto de partida permisivo A PROPÓSITO, para que una
 * etapa que solo toca el sprint backlog no tenga que repetir lo demás.
 */
export const POLITICA_POR_DEFECTO: PoliticaEtapa = {
  backlog: 'editable',
  sprint: 'editable',
  movimientos: 'todos',
  burndown: false,
  retro: false,
  cobraDeuda: false,
  duracionSegundos: null,
};

/**
 * Lo que rige cuando el profesor NO ha abierto ninguna etapa: nada.
 *
 * El tablero se ve entero y no se toca. La actividad la marca el profesor —cada
 * etapa se abre cuando toca y con lo que toca—, así que mientras no haya
 * ninguna, un equipo que se adelanta a escribir historias está trabajando fuera
 * del ciclo, que es justo lo que el módulo enseña a no hacer.
 */
export const POLITICA_SIN_ETAPA: PoliticaEtapa = {
  backlog: 'lectura',
  sprint: 'lectura',
  movimientos: 'ninguno',
  burndown: false,
  retro: false,
  cobraDeuda: false,
  duracionSegundos: null,
};

/**
 * Las etapas con las que nace cada grupo, con la política que pide la dinámica.
 * Son una SEMILLA: el profesor renombra, recolorea, reordena y cambia lo que
 * cada una deja hacer.
 */
export const ETAPAS_SEMILLA: {
  nombre: string;
  color: string;
  pista: string;
  politica: PoliticaEtapa;
}[] = [
  {
    nombre: 'Planning',
    color: '#2563eb',
    pista:
      'El Product Owner prioriza el backlog. El equipo elige qué historias entran al sprint '
      + 'y las estima entre todos. Solo se puede mover del backlog a Planned, y solo lo estimado.',
    politica: {
      backlog: 'editable', sprint: 'lectura', movimientos: 'backlog-a-planned',
      burndown: false, retro: false, cobraDeuda: true, duracionSegundos: 120,
    },
  },
  {
    nombre: 'Grooming',
    color: '#9333ea',
    pista:
      'Se depuran las historias que todavía no entran al sprint: se aclaran, se parten las '
      + 'demasiado grandes y se estiman. No se toca lo que ya está en curso.',
    politica: {
      backlog: 'editable', sprint: 'plegado', movimientos: 'dentro-backlog',
      burndown: false, retro: false, cobraDeuda: false, duracionSegundos: 120,
    },
  },
  {
    nombre: 'Desarrollo',
    color: '#4f46e5',
    pista:
      'Se trabajan las historias del sprint backlog y se van moviendo conforme avanzan: '
      + 'diseño, desarrollo y revisión. Si terminan todo, no se toma nada nuevo.',
    politica: {
      backlog: 'editable', sprint: 'editable', movimientos: 'todos',
      burndown: false, retro: false, cobraDeuda: false, duracionSegundos: 180,
    },
  },
  {
    nombre: 'Daily',
    color: '#16a34a',
    pista:
      'Cada quien dice en qué va, qué sigue y qué lo bloquea. Se mira el sprint backlog y los '
      + 'burndown para decidir qué hay que priorizar para terminarlo.',
    politica: {
      backlog: 'plegado', sprint: 'editable', movimientos: 'dentro-sprint',
      burndown: true, retro: false, cobraDeuda: false, duracionSegundos: 30,
    },
  },
  {
    nombre: 'Review',
    color: '#ea580c',
    pista:
      'Se enseña lo terminado y se valida contra la definición de terminado. Se cuenta qué '
      + 'historias no se cerraron y qué restricciones no se cumplieron.',
    politica: {
      backlog: 'lectura', sprint: 'lectura', movimientos: 'ninguno',
      burndown: true, retro: false, cobraDeuda: false, duracionSegundos: 120,
    },
  },
  {
    nombre: 'Retrospectiva',
    color: '#0891b2',
    pista:
      'Se habla de cómo trabajó el equipo, no de lo que construyó. Lo que se decida mejorar '
      + 'queda como compromiso y se revisa en la siguiente retrospectiva.',
    politica: {
      backlog: 'oculto', sprint: 'oculto', movimientos: 'ninguno',
      burndown: true, retro: true, cobraDeuda: false, duracionSegundos: 60,
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Sprints, definición de terminado y restricciones                   */
/* ------------------------------------------------------------------ */

/** Los objetivos de la dinámica tal cual vienen en la presentación. */
export const OBJETIVOS_SPRINT_SEMILLA = [
  'Entender el proceso de SCRUM',
  'Trabajar contra tiempo',
  'Mejorar su forma de trabajo',
  'Todos bajo un mismo objetivo',
];

export const DEFINICION_DONE_SEMILLA = [
  'Análisis completado',
  'Diseño aprobado',
  'Desarrollo terminado',
  'Visto bueno del Product Owner',
  'Cumple TODAS las restricciones',
];

export const RESTRICCIONES_SEMILLA = [
  'Solo se puede trabajar en 1 modelo a la vez',
  'Para que el modelo sea válido debe cumplir toda la definición de terminado',
  'Cada modelo lleva un solo color específico',
  'Entre 3 y 10 cm de alto y de ancho',
  'Se debe cubrir cada detalle del modelo',
  'El diseño es un dibujo de cómo debería quedar el modelo',
  'El desarrollo es el modelo hecho con el material proporcionado',
  'Debe existir un burndown chart de cada sprint',
  'Una sola computadora por equipo',
];

/**
 * Cuánto suma al bloqueo cada restricción incumplida.
 *
 * Un punto, igual que la historia más pequeña. Que la unidad sea la misma es lo
 * que hace comparable «no terminamos una historia» con «nos saltamos una
 * restricción», que es justo la comparación que la actividad quiere provocar.
 */
export const PUNTOS_POR_PENALIZACION = 1;

/* ------------------------------------------------------------------ */
/*  Retrospectiva                                                      */
/* ------------------------------------------------------------------ */

export const COLUMNAS_RETRO = ['bien', 'mal', 'mejorar'] as const;
export type ColumnaRetro = (typeof COLUMNAS_RETRO)[number];

export const ESTADOS_COMPROMISO = ['cumplido', 'fallado'] as const;
export type EstadoCompromiso = (typeof ESTADOS_COMPROMISO)[number];

/** Colores con los que se van creando los equipos y las épicas. */
export const COLORES_EQUIPO = [
  '#2563eb', '#9333ea', '#16a34a', '#ea580c', '#0891b2',
  '#db2777', '#ca8a04', '#dc2626', '#6366f1',
] as const;

/**
 * Colores de épica. NO se solapan con los de MoSCoW (rojo, naranja, cian, gris):
 * el borde de la tarjeta dice de qué épica es y la insignia dice su prioridad;
 * si compartieran tinte, una cosa se leería como la otra.
 */
export const COLORES_EPICA = [
  '#7c3aed', '#0d9488', '#c026d3', '#4f46e5', '#65a30d', '#0369a1',
] as const;

export const PALETA_ETAPAS = [
  '#2563eb', '#9333ea', '#db2777', '#dc2626',
  '#ea580c', '#ca8a04', '#16a34a', '#0891b2',
] as const;

export function esColumna(v: unknown): v is Columna {
  return typeof v === 'string' && (COLUMNAS as readonly string[]).includes(v);
}

export function esPrioridad(v: unknown): v is Prioridad {
  return typeof v === 'string' && (PRIORIDADES as readonly string[]).includes(v);
}

export function esPuntos(v: unknown): v is number {
  return typeof v === 'number' && (PUNTOS_VALIDOS as readonly number[]).includes(v);
}

export function esColumnaRetro(v: unknown): v is ColumnaRetro {
  return typeof v === 'string' && (COLUMNAS_RETRO as readonly string[]).includes(v);
}

/**
 * ¿La etapa permite ESTE movimiento? Función pura porque es la regla que más se
 * ejecuta —cada tarjeta que alguien arrastra pasa por aquí— y la que peor se
 * nota si falla: dejar mover algo en planning rompe la lección de la etapa.
 */
export function permiteMover(
  movimientos: Movimiento,
  desde: Columna,
  hasta: Columna,
): boolean {
  if (desde === hasta) return true;
  switch (movimientos) {
    case 'todos':
      return true;
    case 'ninguno':
      return false;
    case 'backlog-a-planned':
      return desde === 'backlog' && hasta === 'planned';
    case 'dentro-backlog':
      return desde === 'backlog' && hasta === 'backlog';
    case 'dentro-sprint':
      return desde !== 'backlog' && hasta !== 'backlog';
    default:
      return false;
  }
}
