import Parse from 'parse/node';
import { Grupo } from '../src/models/Grupo.js';
import { Semana } from '../src/models/Semana.js';
import { Actividad } from '../src/models/Actividad.js';

interface EnlaceExtra {
  texto: string;
  url: string;
}

interface ActividadData {
  tipo: string;
  titulo?: string;
  descripcion?: string;
  enlace?: string;
  externo?: boolean;
  duracion?: string;
  fechaEntrega?: string;
  enlacesExtra?: EnlaceExtra[];
}

interface DiaData {
  nota?: string;
  previo?: ActividadData[];
  actividades?: ActividadData[];
}

interface SemanaNormalData {
  numero: number;
  fechaInicio: string;
  fechaFin: string;
  tipo: 'normal';
  dias: Record<string, DiaData>;
}

interface SemanaEspecialData {
  numero: number | string;
  fechaInicio: string;
  fechaFin: string;
  tipo: 'especial';
  titulo: string;
  mensaje: string;
  mensajeImportante?: string;
}

type SemanaData = SemanaNormalData | SemanaEspecialData;

interface GrupoData {
  name: string;
  curso: string;
  nombreCurso: string;
  salon: string;
  enlaces: Record<string, string>;
}

const GRUPOS_DATA: GrupoData[] = [
  {
    name: '501',
    curso: 'TC2005B',
    nombreCurso: 'Construcción de Software y Toma de Decisiones',
    salon: '4205',
    enlaces: {
      asesoriaDenisse: 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0glSuRv-Qk1CwD4IJ1nBDWu2LSplGiPrW0Eo0DdEYxakViDvjwVkBsWBgh4U3wYpsD8GP9TRqd',
      asesoriaAlex: 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0glSuRv-Qk1CwD4IJ1nBDWu2LSplGiPrW0Eo0DdEYxakViDvjwVkBsWBgh4U3wYpsD8GP9TRqd',
      politicasEquipo: '/politicas',
      integridadMIT: 'https://integrity.mit.edu/handbook/writing-code',
      mallaEvaluacion: 'https://docs.google.com/spreadsheets/d/1DzGDdW9kCbSaVki8JP3T85q9jfWLOmCUv7tRsYMLYLE/edit?usp=sharing',
      agendaEntrevistas: 'https://docs.google.com/spreadsheets/d/1U1fbfaBWMp4Nje13qi2C3mhjhW0B8NxC-JXD0ff6fNQ/edit?gid=32307462#gid=32307462',
    },
  },
];

const SEMANAS_DATA: SemanaData[] = [
  // SEMANA 1
  {
    numero: 1, fechaInicio: '2026-03-23', fechaFin: '2026-03-27', tipo: 'normal',
    dias: {
      lunes: {
        nota: 'Sesión plenaria en el salón 4205',
        actividades: [
          { tipo: 'info', titulo: 'Introducción al curso', descripcion: 'Intenciones educativas, objetivos, metodología, política de laptops, celulares y apuntes', duracion: '45 min' },
          { tipo: 'info', titulo: 'Malla de evaluación', enlace: 'https://docs.google.com/spreadsheets/d/1DzGDdW9kCbSaVki8JP3T85q9jfWLOmCUv7tRsYMLYLE/edit?usp=sharing', externo: true },
          { tipo: 'lab', titulo: 'Lab 0: Presentación en la plataforma de comunicación', enlace: '/labs/lab0', duracion: '10 min' },
          { tipo: 'lab', titulo: 'Lab 1: Introducción a las aplicaciones web, HTML5 y ciclo de vida de los sistemas de información', enlace: '/labs/lab1', duracion: '55 min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'discusion', titulo: 'Datos en sistemas de software', duracion: '1h 50min' },
          { tipo: 'proyecto', titulo: 'Avance de proyecto 1: Conformación de los equipos', enlace: '/avances/av1', duracion: '10 min', fechaEntrega: 'Viernes 27 de marzo' },
          { tipo: 'trabajo', titulo: 'Presentación socio formador', duracion: '1h' },
        ],
      },
      martes: {
        previo: [
          { tipo: 'lectura', titulo: 'Lectura: Introducción a la gestión de proyectos', enlace: 'documentos/0_bloqueAdmP_introduccion.pptx', externo: true },
        ],
        actividades: [
          { tipo: 'lectura', titulo: 'Diseño de la interacción', enlace: 'https://www.haikudeck.com/p/stJQgEylw2/diseo-de-la-interaccin', duracion: '30 min', externo: true },
          { tipo: 'lab', titulo: 'Lab 4: CSS', enlace: '/labs/lab3', duracion: '55 min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'lectura', titulo: 'Presentación proyecto exitoso', duracion: '30 min' },
          { tipo: 'lectura', titulo: 'Requisitos de software y Casos de uso. Ejemplo de caso de uso: Registrar venta en punto de venta', duracion: '1h', enlacesExtra: [{ texto: 'Requisitos de software', url: 'documentos/Conceptos - Requisitos de Software.pptx' }, { texto: 'Casos de uso', url: 'documentos/Requisitos de Software - Casos de Uso.pptx' }] },
          { tipo: 'ejercicio', titulo: 'Caso de estudio: Requisitos de software', enlace: 'documentos/Caso de Estudio-All-about-pools.pdf', duracion: '10 min' },
        ],
      },
      miercoles: {
        previo: [
          { tipo: 'lectura', titulo: 'Lectura: Sistemas de información en los negocios', enlace: 'documentos/Tema01-Introduccion_SI.pptx', externo: true },
        ],
        actividades: [
          { tipo: 'lab', titulo: 'Lab 2: Control de versiones', enlace: '/labs/lab2', duracion: '1h 55min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'discusion', titulo: 'Resolución de dudas de las lecturas', duracion: '55 min' },
          { tipo: 'lectura', titulo: 'Revisión del caso de estudio', duracion: '55 min' },
        ],
      },
      jueves: {
        actividades: [
          { tipo: 'lab', titulo: 'Lab 3: Manejo de ramas', enlace: '/labs/lab7', duracion: '1h 50min' },
          { tipo: 'proyecto', titulo: 'Validación de avance proyecto, retroalimentación y corrección / trabajo en proyecto', duracion: '1h 50min' },
        ],
      },
    },
  },
  // CAMPUS SIN SERVICIO
  {
    numero: 'Sin servicio', fechaInicio: '2026-03-30', fechaFin: '2026-04-03', tipo: 'especial',
    titulo: 'Campus sin servicio', mensaje: 'Campus sin servicio', mensajeImportante: '',
  },
  // SEMANA 2
  {
    numero: 2, fechaInicio: '2026-04-06', fechaFin: '2026-04-10', tipo: 'normal',
    dias: {
      lunes: {
        previo: [
          { tipo: 'lectura', titulo: 'Lectura: Gestión del alcance', enlace: 'documentos/3_bloqueAdmP_alcance.pptx', externo: true },
          { tipo: 'ejercicio', titulo: 'Nodeschools', enlace: 'documentos/3_bloqueAdmP_alcance.pptx', externo: true },
        ],
        actividades: [
          { tipo: 'lab', titulo: 'Lab 6: Programación Orientada a Eventos y Navegación', enlace: '/labs/lab6', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'proyecto', titulo: 'Avance de proyecto 2: Análisis y diseño de la solución', enlace: '/avances/av3', duracion: '15 min', fechaEntrega: 'Viernes 17 de abril' },
          { tipo: 'discusion', titulo: 'Resolución de dudas de las lecturas', duracion: '55 min' },
          { tipo: 'lectura', titulo: 'Diagrama de contexto aplicado al proyecto', enlace: 'documentos/Diagrama de contexto.pptx', duracion: '40 min', externo: true },
        ],
      },
      martes: {
        previo: [
          { tipo: 'lectura', titulo: 'Lectura: DB vs DBMS', enlace: 'lecturas/lectura1_DBvsDBMS.html' },
          { tipo: 'lectura', titulo: 'Lectura: Notación del modelo entidad relación y Restricciones adicionales', enlace: 'lecturas/lectura2_Mer/lectura2.html' },
        ],
        actividades: [
          { tipo: 'lab', titulo: 'Lab 7: Debugging y CSS Avanzado (Variables de css) / Responsive design', enlace: '/labs/lab7', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'discusion', titulo: 'Resolución de dudas de la lectura', duracion: '30 min' },
          { tipo: 'ejercicio', titulo: 'Casos de estudio 2: Farmacéutica y liga de fútbol', enlace: 'ejercicios/ej1_MER_farmaceutica_futbol.html', duracion: '1h 20min' },
        ],
      },
      miercoles: {
        actividades: [
          { tipo: 'lab', titulo: 'Lab 8: Introducción al back-end', enlace: '/labs/lab8', duracion: '1h 20min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'lectura', titulo: 'Revisión del caso de estudio', duracion: '1h' },
          { tipo: 'lectura', titulo: 'Diagrama de clases y patrones de diseño', enlace: 'documentos/Introduccion al diseno de software - Diagramas de clases.pptx', duracion: '40 min', externo: true },
          { tipo: 'ejercicio', titulo: 'Caso 3: Diagrama de clases para un videojuego', enlace: 'documentos/DiagramaClases_Videojuego.pdf', duracion: '10 min', externo: true },
        ],
      },
      jueves: {
        actividades: [
          { tipo: 'lab', titulo: 'Lab 10: Rutas y formas', enlace: '/labs/lab10', duracion: '1h 5min' },
          { tipo: 'proyecto', titulo: 'Validación de avance proyecto, retroalimentación y corrección / trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
        ],
      },
    },
  },
  // SEMANA 3
  {
    numero: 3, fechaInicio: '2026-04-13', fechaFin: '2026-04-17', tipo: 'normal',
    dias: {
      lunes: {
        previo: [
          { tipo: 'lectura', titulo: 'Lectura: Reglas de traslado MER a MR', enlace: 'lecturas/lectura3_Mr/lectura3.html' },
        ],
        actividades: [
          { tipo: 'lab', titulo: 'Lab 11: Express', enlace: '/labs/lab11', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'discusion', titulo: 'Resolución de dudas de la lectura', duracion: '30 min' },
          { tipo: 'lab', titulo: 'Lab 9: DBMS de escritorio', enlace: '/labs/lab9', duracion: '1h 20min' },
        ],
      },
      martes: {
        previo: [
          { tipo: 'lectura', titulo: 'Lectura: Gestión de la comunicación', enlace: 'documentos/2_bloqueAdmP_comunicacion.pptx', externo: true },
        ],
        actividades: [
          { tipo: 'lab', titulo: 'Lab 12: HTML dinámico', enlace: '/labs/lab12', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'discusion', titulo: 'Resolución de dudas de la lectura', duracion: '30 min' },
          { tipo: 'ejercicio', titulo: 'Casos de estudio 4: MER, DD y MR', enlace: 'ejercicios/ej2_MER_DD_MR.html', duracion: '1h 20min' },
        ],
      },
      miercoles: {
        previo: [
          { tipo: 'lectura', titulo: 'Lectura: Modelo Relacional y Álgebra Relacional', enlace: 'lecturas/lectura4_Mr_Ar/lectura_Mr_Ar.html' },
          { tipo: 'info', titulo: 'Política de trabajo en equipo', enlace: '/politicas', duracion: '15 min' },
        ],
        actividades: [
          { tipo: 'discusion', titulo: 'Code review, Programador tóxico', duracion: '50 min' },
          { tipo: 'discusion', titulo: 'Simulación de entrevista de evaluación', duracion: '1h' },
          { tipo: 'info', titulo: 'Agenda tu evaluación de competencias de esta semana' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'discusion', titulo: 'Resolución de dudas de la lectura', duracion: '50 min' },
        ],
      },
      jueves: {
        actividades: [
          { tipo: 'proyecto', titulo: 'Presentación de avance proyecto 2, retroalimentación y corrección', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 20min' },
        ],
      },
    },
  },
  // SEMANA 4
  {
    numero: 4, fechaInicio: '2026-04-20', fechaFin: '2026-04-24', tipo: 'normal',
    dias: {
      lunes: {
        previo: [
          { tipo: 'lectura', titulo: 'Lectura: Diagramas de secuencia', enlace: 'documentos/Introduccion al diseno de software - Diagramas de secuencia.pptx' },
        ],
        actividades: [
          { tipo: 'lab', titulo: 'Lab 13: MVC', enlace: '/labs/lab13', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'proyecto', titulo: 'Avance de proyecto 3: Creación de la base de datos', enlace: '/avances/av4', duracion: '15 min', fechaEntrega: 'Viernes 24 de abril' },
          { tipo: 'discusion', titulo: 'Solicitar en equipo una asesoría con Enrique sobre su modelo de datos' },
          { tipo: 'ejercicio', titulo: 'Ejercicio: Identificación de Llaves en un MR y expresión de consultas en álgebra relacional', enlace: 'ejercicios/ej3_mr_ar/ej3.html', duracion: '1h 35min' },
        ],
      },
      martes: {
        previo: [
          { tipo: 'lectura', titulo: 'Lectura: Álgebra relacional, SQL básico y funciones agregadas', enlace: 'lecturas/lectura5_sql/index.html' },
          { tipo: 'info', titulo: 'Instalar MariaDB', descripcion: 'Opción 1: Instalar XAMPP | Opción 2: Instalar MySQL Community Server + MySQL Workbench', enlacesExtra: [{ texto: 'XAMPP', url: 'https://www.apachefriends.org/es/index.html' }, { texto: 'MySQL Community Server', url: 'https://dev.mysql.com/downloads/mysql/' }, { texto: 'MySQL Workbench', url: 'https://dev.mysql.com/downloads/workbench/' }] },
        ],
        actividades: [
          { tipo: 'lab', titulo: 'Lab 17: Interacción con la base de datos', enlace: '/labs/lab17', duracion: '50 min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'discusion', titulo: 'Resolución de dudas de la lectura', duracion: '1h' },
          { tipo: 'ejercicio', titulo: 'Ejercicio: Traducción de álgebra relacional a SQL', enlace: 'ejercicios/ej4_ar_sql.html', duracion: '50 min' },
        ],
      },
      miercoles: {
        previo: [],
        actividades: [
          { tipo: 'lab', titulo: 'Lab 24: AJAX y Datatables', enlace: '/labs/lab24', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'lab', titulo: 'Lab 15: Conociendo el Ambiente de MariaDB', enlace: '/labs/lab15', duracion: '20 min' },
          { tipo: 'lab', titulo: 'Lab 16: Creación de constraints para instrumentar integridad referencial en MariaDB', duracion: '30 min' },
        ],
      },
      jueves: {
        actividades: [
          { tipo: 'proyecto', titulo: 'Validación de avance proyecto 3, retroalimentación y corrección', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 20min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
    },
  },
  // SEMANA 5
  {
    numero: 5, fechaInicio: '2026-04-27', fechaFin: '2026-05-01', tipo: 'normal',
    dias: {
      lunes: {
        previo: [
          { tipo: 'lectura', titulo: 'Lectura: Metodología para diseñar casos de pruebas a partir de casos de uso', enlace: 'documentos/GeneratingTestCasesFromUseCasesJune01.pdf', externo: true },
          { tipo: 'info', titulo: 'Agenda tu evaluación de competencias de esta semana' },
        ],
        actividades: [
          { tipo: 'lab', titulo: 'Lab 18: Autentificación', enlace: '/labs/lab18', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'discusion', titulo: 'Resolución de dudas de la lectura', duracion: '45 min' },
          { tipo: 'proyecto', titulo: 'Avance de proyecto 4: Prueba de concepto', enlace: '/avances/av5', duracion: '15 min', fechaEntrega: 'Viernes 15 de mayo' },
          { tipo: 'ejercicio', titulo: 'Ejercicio: Expresión de consultas en SQL usando funciones agregadas', enlace: 'ejercicios/ej5_ar_sql2.html', duracion: '50 min' },
        ],
      },
      martes: {
        previo: [
          { tipo: 'lectura', titulo: 'Lectura: Consultas en SQL usando roles y Sub-consultas', enlace: 'lecturas/lectura6_sql_roles/lectura_sql_roles.html' },
        ],
        actividades: [
          { tipo: 'lab', titulo: 'Lab 14: Manejo de sesiones y cookies', enlace: '/labs/lab14', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'discusion', titulo: 'Resolución de dudas de la lectura', duracion: '40 min' },
          { tipo: 'ejercicio', titulo: 'Ejercicio: Expresión de consultas en SQL usando Sub-consultas', enlace: 'ejercicios/ej6_sql_subconsultas.html', duracion: '1h 10min' },
          { tipo: 'lab', titulo: 'Lab 20: Consultas en SQL', enlace: '/labs/lab20', duracion: '40 min' },
        ],
      },
      miercoles: {
        actividades: [
          { tipo: 'lab', titulo: 'Lab 19: Control de acceso basado en atributos', enlace: '/labs/lab19', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
      jueves: {
        actividades: [
          { tipo: 'proyecto', titulo: 'Presentación de avance proyecto 4, retroalimentación y corrección', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
    },
  },
  // SEMANA TEC
  {
    numero: 'Tec', fechaInicio: '2026-05-04', fechaFin: '2026-05-08', tipo: 'especial',
    titulo: 'Semana Tec', mensaje: 'Semana Tec',
    mensajeImportante: 'Domingo, fecha límite para considerar actividades en la evaluación del periodo 1',
  },
  // SEMANA 6
  {
    numero: 6, fechaInicio: '2026-05-11', fechaFin: '2026-05-15', tipo: 'normal',
    dias: {
      lunes: {
        actividades: [
          { tipo: 'discusion', titulo: 'Pruebas y usabilidad', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'lab', titulo: 'Lab 21: Funciones Agregadas y Sub-consultas', enlace: '/labs/lab21', duracion: '1h 50min' },
        ],
      },
      martes: {
        actividades: [
          { tipo: 'lab', titulo: 'Lab 22: Subir y bajar archivos', enlace: '/labs/lab22', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'info', titulo: 'Agenda tu evaluación de competencias de esta semana' },
          { tipo: 'lab', titulo: 'Lab 23: Stored procedures', enlace: '/labs/lab23', duracion: '1h 50min' },
        ],
      },
      miercoles: {
        actividades: [
          { tipo: 'lab', titulo: 'Lab 26: Servicios web', enlace: '/labs/lab26', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'lab', titulo: 'Lab 25: Transacciones', enlace: '/labs/lab25', duracion: '1h 50min' },
        ],
      },
      jueves: {
        actividades: [
          { tipo: 'proyecto', titulo: 'Presentación de avance proyecto 4, retroalimentación y corrección', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'proyecto', titulo: 'Avance de proyecto 5: Versión Beta del Sistema', enlace: '/avances/av6', duracion: '20 min', fechaEntrega: 'Viernes 29 de mayo' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 30min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
    },
  },
  // SEMANA 7
  {
    numero: 7, fechaInicio: '2026-05-18', fechaFin: '2026-05-22', tipo: 'normal',
    dias: {
      lunes: {
        previo: [
          { tipo: 'lectura', titulo: 'Lectura: Normalización', enlace: 'lecturas/lectura9_normalizacion/normalizacion.html' },
        ],
        actividades: [
          { tipo: 'info', titulo: 'Agenda tu evaluación de competencias de esta semana' },
          { tipo: 'info', titulo: '5 steps to speed up your image heavy website', enlace: 'https://codeburst.io/5-steps-to-speed-up-your-image-heavy-website-65c874a86966', externo: true, duracion: '20 min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'discusion', titulo: 'Resolución de dudas de la lectura', duracion: '50 min' },
          { tipo: 'ejercicio', titulo: 'Ejercicio: Normalización', enlace: 'ejercicios/ej9_normalizacion.html', duracion: '1h' },
        ],
      },
      martes: {
        actividades: [
          { tipo: 'info', titulo: 'The Web Developer Roadmap', enlace: 'https://roadmap.sh/', externo: true, duracion: '30 min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'lectura', titulo: 'Diagramas de estado', enlace: 'documentos/Diagramas de estado.pptx', duracion: '50 min' },
          { tipo: 'ejercicio', titulo: 'Ejercicio: Diagramas de estado', enlace: 'documentos/EjerciciosDiagramaEstado.docx', duracion: '1h' },
        ],
      },
      miercoles: {
        actividades: [
          { tipo: 'lab', titulo: 'Guías de preparación para el despliegue', enlace: '/labs/lab27', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 30min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'lectura', titulo: 'Diagramas de despliegue', enlace: 'documentos/Diagramas de despliegue.pptx', duracion: '50 min' },
          { tipo: 'ejercicio', titulo: 'Ejercicio: Diagramas de despliegue. Elaborar diagramas de despliegue de los entornos de desarrollo y producción del proyecto', enlace: 'documentos/Ejercicio - Diagrama de despliegue.docx', duracion: '1h' },
        ],
      },
      jueves: {
        actividades: [
          { tipo: 'info', titulo: 'Límite para dar de baja el bloque' },
          { tipo: 'proyecto', titulo: 'Taller de despliegue', duracion: '1h 50min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
    },
  },
  // SEMANA 8
  {
    numero: 8, fechaInicio: '2026-05-25', fechaFin: '2026-05-29', tipo: 'normal',
    dias: {
      lunes: {
        actividades: [
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'lab', titulo: 'Lab 28: Triggers', enlace: '/labs/lab28', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
      martes: {
        actividades: [
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
      miercoles: {
        actividades: [
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
      jueves: {
        actividades: [
          { tipo: 'proyecto', titulo: 'Presentación de avance proyecto 5, retroalimentación y corrección', duracion: '1h 30min' },
          { tipo: 'proyecto', titulo: 'Avance de proyecto 6: Versión 1.0', enlace: '/avances/av7', duracion: '20 min', fechaEntrega: 'Viernes 5 de junio' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'info', titulo: 'Agenda tu evaluación de competencias de la semana 10' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
    },
  },
  // SEMANA 9
  {
    numero: 9, fechaInicio: '2026-06-01', fechaFin: '2026-06-05', tipo: 'normal',
    dias: {
      lunes: {
        actividades: [
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
      martes: {
        actividades: [
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 30min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
      miercoles: {
        actividades: [
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 30min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'discusion', titulo: 'Responder ECOA' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
      jueves: {
        actividades: [
          { tipo: 'proyecto', titulo: 'Validación de avance proyecto, retroalimentación y corrección', duracion: '1h 40min' },
          { tipo: 'info', titulo: 'Agenda de presentaciones finales', duracion: '10 min' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
          { tipo: 'info', titulo: 'Domingo, fecha límite para considerar actividades en la evaluación del periodo 2' },
        ],
      },
    },
  },
  // SEMANA 10
  {
    numero: 10, fechaInicio: '2026-06-08', fechaFin: '2026-06-12', tipo: 'normal',
    dias: {
      lunes: {
        actividades: [
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
      martes: {
        actividades: [
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
      miercoles: {
        actividades: [
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
          { tipo: 'break', duracion: '20 min' },
          { tipo: 'trabajo', titulo: 'Trabajo en proyecto', duracion: '1h 50min' },
          { tipo: 'evaluacion', titulo: 'Evaluación de competencias' },
        ],
      },
      jueves: {
        nota: 'Sesión plenaria',
        actividades: [
          { tipo: 'info', titulo: 'Preparar presentaciones finales', duracion: '30 min' },
          { tipo: 'proyecto', titulo: 'Presentaciones finales de proyecto (13:00 - 15:00)', duracion: '2h' },
          { tipo: 'info', titulo: 'Límite para reportar calificaciones' },
        ],
      },
    },
  },
];

async function findOrCreateGrupo(grupoData: GrupoData, dryRun: boolean): Promise<Grupo | null> {
  const grupoQuery = new Parse.Query<Grupo>('Grupo');
  grupoQuery.equalTo('name', grupoData.name);
  let grupo = await grupoQuery.first({ useMasterKey: true });

  if (!grupo) {
    console.log(`  CREATE Grupo: ${grupoData.name}`);
    if (!dryRun) {
      grupo = new Grupo().initDefaults() as Grupo;
      grupo.setName(grupoData.name);
    }
  } else {
    console.log(`  UPDATE Grupo: ${grupoData.name}`);
  }

  if (!dryRun && grupo) {
    grupo.setCurso(grupoData.curso);
    grupo.setNombreCurso(grupoData.nombreCurso);
    grupo.setSalon(grupoData.salon);
    grupo.setEnlaces(grupoData.enlaces);
    await grupo.save(null, { useMasterKey: true });
  }

  return grupo;
}

async function seedCalendarioForGrupo(grupo: Grupo): Promise<number> {
  const grupoName = grupo.getName();
  console.log(`\n  --- Seeding calendario for Grupo ${grupoName} ---`);

  // Clean up existing semanas and actividades for this grupo (idempotent)
  console.log('  Cleaning existing semanas/actividades...');
  const existingSemanaQuery = new Parse.Query<Semana>('Semana');
  existingSemanaQuery.equalTo('grupo', grupo);
  existingSemanaQuery.limit(200);
  const existingSemanas = await existingSemanaQuery.find({ useMasterKey: true });

  if (existingSemanas.length > 0) {
    const existingActQuery = new Parse.Query<Actividad>('Actividad');
    existingActQuery.containedIn('semana', existingSemanas);
    existingActQuery.limit(2000);
    const existingActs = await existingActQuery.find({ useMasterKey: true });
    if (existingActs.length > 0) {
      await Parse.Object.destroyAll(existingActs, { useMasterKey: true });
      console.log(`  Deleted ${existingActs.length} existing actividades`);
    }
    await Parse.Object.destroyAll(existingSemanas, { useMasterKey: true });
    console.log(`  Deleted ${existingSemanas.length} existing semanas`);
  }

  // Create semanas and actividades
  let totalActividades = 0;

  for (let orden = 0; orden < SEMANAS_DATA.length; orden++) {
    const semanaData = SEMANAS_DATA[orden];
    const semana = new Semana().initDefaults() as Semana;
    semana.setGrupo(grupo);
    semana.setNumero(semanaData.numero);
    semana.setFechaInicio(semanaData.fechaInicio);
    semana.setFechaFin(semanaData.fechaFin);
    semana.setTipo(semanaData.tipo);
    semana.setOrden(orden);

    if (semanaData.tipo === 'especial') {
      semana.setTitulo(semanaData.titulo);
      semana.setMensaje(semanaData.mensaje);
      if (semanaData.mensajeImportante !== undefined) {
        semana.setMensajeImportante(semanaData.mensajeImportante);
      }
      await semana.save(null, { useMasterKey: true });
      console.log(`  Semana ${semanaData.numero} (especial) created`);
      continue;
    }

    // Normal week: extract notas from dias
    const notas: Record<string, string> = {};
    const dias = semanaData.dias;
    for (const [dia, diaData] of Object.entries(dias)) {
      if (diaData.nota) {
        notas[dia] = diaData.nota;
      }
    }
    if (Object.keys(notas).length > 0) {
      semana.setNotas(notas);
    }

    await semana.save(null, { useMasterKey: true });
    console.log(`  Semana ${semanaData.numero} created`);

    // Create actividades for each dia
    const actividadesToSave: Actividad[] = [];

    for (const [dia, diaData] of Object.entries(dias)) {
      // Previos
      if (diaData.previo) {
        for (let i = 0; i < diaData.previo.length; i++) {
          const actData = diaData.previo[i];
          const act = new Actividad().initDefaults() as Actividad;
          act.setSemana(semana);
          act.setDia(dia);
          act.setIsPrevio(true);
          act.setOrden(i);
          act.setTipo(actData.tipo);
          if (actData.titulo) act.setTitulo(actData.titulo);
          if (actData.descripcion) act.setDescripcion(actData.descripcion);
          if (actData.enlace) act.setEnlace(actData.enlace);
          if (actData.externo) act.setExterno(true);
          if (actData.duracion) act.setDuracion(actData.duracion);
          if (actData.fechaEntrega) act.setFechaEntrega(actData.fechaEntrega);
          if (actData.enlacesExtra && actData.enlacesExtra.length > 0) {
            act.setEnlacesExtra(actData.enlacesExtra);
          }
          actividadesToSave.push(act);
        }
      }

      // Actividades
      if (diaData.actividades) {
        for (let i = 0; i < diaData.actividades.length; i++) {
          const actData = diaData.actividades[i];
          const act = new Actividad().initDefaults() as Actividad;
          act.setSemana(semana);
          act.setDia(dia);
          act.setIsPrevio(false);
          act.setOrden(i);
          act.setTipo(actData.tipo);
          if (actData.titulo) act.setTitulo(actData.titulo);
          if (actData.descripcion) act.setDescripcion(actData.descripcion);
          if (actData.enlace) act.setEnlace(actData.enlace);
          if (actData.externo) act.setExterno(true);
          if (actData.duracion) act.setDuracion(actData.duracion);
          if (actData.fechaEntrega) act.setFechaEntrega(actData.fechaEntrega);
          if (actData.enlacesExtra && actData.enlacesExtra.length > 0) {
            act.setEnlacesExtra(actData.enlacesExtra);
          }
          actividadesToSave.push(act);
        }
      }
    }

    // Save in batch
    if (actividadesToSave.length > 0) {
      await Parse.Object.saveAll(actividadesToSave, { useMasterKey: true });
      totalActividades += actividadesToSave.length;
    }
  }

  console.log(`  Grupo ${grupoName}: ${SEMANAS_DATA.length} semanas, ${totalActividades} actividades.`);
  return totalActividades;
}

export async function runCalendarioSeed(dryRun: boolean): Promise<void> {
  console.log(`\n--- Seed Calendario ${dryRun ? '(DRY RUN)' : ''} ---\n`);

  // 1. Find or create grupos from GRUPOS_DATA
  const seededNames = new Set<string>();
  const gruposToSeed: Grupo[] = [];

  for (const grupoData of GRUPOS_DATA) {
    const grupo = await findOrCreateGrupo(grupoData, dryRun);
    if (grupo) {
      gruposToSeed.push(grupo);
      seededNames.add(grupoData.name);
    }
  }

  // 2. Also discover any other existing grupos in the DB
  const allGruposQuery = new Parse.Query<Grupo>('Grupo');
  allGruposQuery.equalTo('exists' as any, true as any);
  allGruposQuery.limit(100);
  const allGrupos = await allGruposQuery.find({ useMasterKey: true });

  for (const grupo of allGrupos) {
    if (!seededNames.has(grupo.getName())) {
      console.log(`  DISCOVERED existing Grupo: ${grupo.getName()}`);
      gruposToSeed.push(grupo);
      seededNames.add(grupo.getName());
    }
  }

  if (dryRun) {
    console.log(`\n  Would seed ${SEMANAS_DATA.length} semanas with actividades for ${gruposToSeed.length} grupo(s): ${[...seededNames].join(', ')}`);
    console.log(`\nCalendario seed dry run complete.\n`);
    return;
  }

  // 3. Seed calendario for each grupo
  let grandTotalActividades = 0;
  for (const grupo of gruposToSeed) {
    grandTotalActividades += await seedCalendarioForGrupo(grupo);
  }

  console.log(`\nCalendario seed complete: ${gruposToSeed.length} grupo(s), ${SEMANAS_DATA.length} semanas each, ${grandTotalActividades} total actividades.\n`);
}
