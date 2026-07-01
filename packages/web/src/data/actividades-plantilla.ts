import type { ActividadTipo } from '@/types/calendario';

export interface ActividadPlantilla {
  nombre: string;
  tipo: ActividadTipo;
  aprendizajePlaneado: number;
  semanaPlaneada: number;
  esPersonalizada?: boolean;
}

export const actividadesPlantilla: ActividadPlantilla[] = [
  // ==================== SEMANA 1 ====================
  { nombre: 'Datos en sistemas de software', tipo: 'discusion', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Resolución de dudas de las lecturas', tipo: 'discusion', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Caso de estudio: Requisitos de software', tipo: 'ejercicio', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Introducción al curso', tipo: 'info', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Malla de evaluación', tipo: 'info', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Lab 0: Presentación en la plataforma de comunicación', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Lab 1: Introducción a las aplicaciones web, HTML5 y ciclo de vida de los sistemas de información', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Lab 2: Control de versiones', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Lab 3: Manejo de ramas', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Lab 4: CSS', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Diseño de la interacción', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Lectura: Introducción a la gestión de proyectos', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Lectura: Sistemas de información en los negocios', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Presentación proyecto exitoso', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Requisitos de software y Casos de uso. Ejemplo de caso de uso: Registrar venta en punto de venta', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Revisión del caso de estudio', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Avance de proyecto 1: Conformación de los equipos', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Validación de avance proyecto, retroalimentación y corrección / trabajo en proyecto', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 1 },
  { nombre: 'Presentación socio formador', tipo: 'trabajo', aprendizajePlaneado: 0, semanaPlaneada: 1 },

  // ==================== SEMANA 2 ====================
  { nombre: 'Resolución de dudas de la lectura', tipo: 'discusion', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Caso 3: Diagrama de clases para un videojuego', tipo: 'ejercicio', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Casos de estudio 2: Farmacéutica y liga de fútbol', tipo: 'ejercicio', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Nodeschools', tipo: 'ejercicio', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Lab 6: Programación Orientada a Eventos y Navegación', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Lab 7: Debugging y CSS Avanzado (Variables de css) / Responsive design', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Lab 8: Introducción al back-end', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Lab 10: Rutas y formas', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Diagrama de clases y patrones de diseño', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Diagrama de contexto aplicado al proyecto', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Lectura: DB vs DBMS', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Lectura: Gestión del alcance', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Lectura: Notación del modelo entidad relación y Restricciones adicionales', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Avance de proyecto 2: Análisis y diseño de la solución', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 2 },
  { nombre: 'Trabajo en proyecto', tipo: 'trabajo', aprendizajePlaneado: 0, semanaPlaneada: 2 },

  // ==================== SEMANA 3 ====================
  { nombre: 'Code review, Programador tóxico', tipo: 'discusion', aprendizajePlaneado: 0, semanaPlaneada: 3 },
  { nombre: 'Simulación de entrevista de evaluación', tipo: 'discusion', aprendizajePlaneado: 0, semanaPlaneada: 3 },
  { nombre: 'Casos de estudio 4: MER, DD y MR', tipo: 'ejercicio', aprendizajePlaneado: 0, semanaPlaneada: 3 },
  { nombre: 'Agenda tu evaluación de competencias de esta semana', tipo: 'info', aprendizajePlaneado: 0, semanaPlaneada: 3 },
  { nombre: 'Política de trabajo en equipo', tipo: 'info', aprendizajePlaneado: 0, semanaPlaneada: 3 },
  { nombre: 'Lab 9: DBMS de escritorio', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 3 },
  { nombre: 'Lab 11: Express', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 3 },
  { nombre: 'Lab 12: HTML dinámico', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 3 },
  { nombre: 'Lectura: Gestión de la comunicación', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 3 },
  { nombre: 'Lectura: Modelo Relacional y Álgebra Relacional', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 3 },
  { nombre: 'Lectura: Reglas de traslado MER a MR', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 3 },
  { nombre: 'Presentación de avance proyecto 2, retroalimentación y corrección', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 3 },

  // ==================== SEMANA 4 ====================
  { nombre: 'Solicitar en equipo una asesoría con Enrique sobre su modelo de datos', tipo: 'discusion', aprendizajePlaneado: 0, semanaPlaneada: 4 },
  { nombre: 'Ejercicio: Identificación de Llaves en un MR y expresión de consultas en álgebra relacional', tipo: 'ejercicio', aprendizajePlaneado: 0, semanaPlaneada: 4 },
  { nombre: 'Ejercicio: Traducción de álgebra relacional a SQL', tipo: 'ejercicio', aprendizajePlaneado: 0, semanaPlaneada: 4 },
  { nombre: 'Evaluación de competencias', tipo: 'evaluacion', aprendizajePlaneado: 0, semanaPlaneada: 4 },
  { nombre: 'Instalar MariaDB', tipo: 'info', aprendizajePlaneado: 0, semanaPlaneada: 4 },
  { nombre: 'Lab 13: MVC', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 4 },
  { nombre: 'Lab 15: Conociendo el Ambiente de MariaDB', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 4 },
  { nombre: 'Lab 16: Creación de constraints para instrumentar integridad referencial en MariaDB', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 4 },
  { nombre: 'Lab 17: Interacción con la base de datos', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 4 },
  { nombre: 'Lab 24: AJAX y Datatables', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 4 },
  { nombre: 'Lectura: Álgebra relacional, SQL básico y funciones agregadas', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 4 },
  { nombre: 'Lectura: Diagramas de secuencia', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 4 },
  { nombre: 'Avance de proyecto 3: Creación de la base de datos', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 4 },
  { nombre: 'Validación de avance proyecto 3, retroalimentación y corrección', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 4 },

  // ==================== SEMANA 5 ====================
  { nombre: 'Ejercicio: Expresión de consultas en SQL usando funciones agregadas', tipo: 'ejercicio', aprendizajePlaneado: 0, semanaPlaneada: 5 },
  { nombre: 'Ejercicio: Expresión de consultas en SQL usando Sub-consultas', tipo: 'ejercicio', aprendizajePlaneado: 0, semanaPlaneada: 5 },
  { nombre: 'Lab 14: Manejo de sesiones y cookies', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 5 },
  { nombre: 'Lab 18: Autentificación', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 5 },
  { nombre: 'Lab 19: Control de acceso basado en atributos', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 5 },
  { nombre: 'Lab 20: Consultas en SQL', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 5 },
  { nombre: 'Lectura: Consultas en SQL usando roles y Sub-consultas', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 5 },
  { nombre: 'Lectura: Metodología para diseñar casos de pruebas a partir de casos de uso', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 5 },
  { nombre: 'Avance de proyecto 4: Prueba de concepto', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 5 },
  { nombre: 'Presentación de avance proyecto 4, retroalimentación y corrección', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 5 },

  // ==================== SEMANA 6 ====================
  { nombre: 'Pruebas y usabilidad', tipo: 'discusion', aprendizajePlaneado: 0, semanaPlaneada: 6 },
  { nombre: 'Lab 21: Funciones Agregadas y Sub-consultas', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 6 },
  { nombre: 'Lab 22: Subir y bajar archivos', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 6 },
  { nombre: 'Lab 23: Stored procedures', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 6 },
  { nombre: 'Lab 25: Transacciones', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 6 },
  { nombre: 'Lab 26: Servicios web', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 6 },
  { nombre: 'Avance de proyecto 5: Versión Beta del Sistema', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 6 },

  // ==================== SEMANA 7 ====================
  { nombre: 'Ejercicio: Diagramas de despliegue. Elaborar diagramas de despliegue de los entornos de desarrollo y producción del proyecto', tipo: 'ejercicio', aprendizajePlaneado: 0, semanaPlaneada: 7 },
  { nombre: 'Ejercicio: Diagramas de estado', tipo: 'ejercicio', aprendizajePlaneado: 0, semanaPlaneada: 7 },
  { nombre: 'Ejercicio: Normalización', tipo: 'ejercicio', aprendizajePlaneado: 0, semanaPlaneada: 7 },
  { nombre: '5 steps to speed up your image heavy website', tipo: 'info', aprendizajePlaneado: 0, semanaPlaneada: 7 },
  { nombre: 'Límite para dar de baja el bloque', tipo: 'info', aprendizajePlaneado: 0, semanaPlaneada: 7 },
  { nombre: 'The Web Developer Roadmap', tipo: 'info', aprendizajePlaneado: 0, semanaPlaneada: 7 },
  { nombre: 'Guías de preparación para el despliegue', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 7 },
  { nombre: 'Diagramas de despliegue', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 7 },
  { nombre: 'Diagramas de estado', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 7 },
  { nombre: 'Lectura: Normalización', tipo: 'lectura', aprendizajePlaneado: 0, semanaPlaneada: 7 },
  { nombre: 'Taller de despliegue', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 7 },

  // ==================== SEMANA 8 ====================
  { nombre: 'Agenda tu evaluación de competencias de la semana 10', tipo: 'info', aprendizajePlaneado: 0, semanaPlaneada: 8 },
  { nombre: 'Lab 28: Triggers', tipo: 'lab', aprendizajePlaneado: 0, semanaPlaneada: 8 },
  { nombre: 'Avance de proyecto 6: Versión 1.0', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 8 },
  { nombre: 'Presentación de avance proyecto 5, retroalimentación y corrección', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 8 },

  // ==================== SEMANA 9 ====================
  { nombre: 'Responder ECOA', tipo: 'discusion', aprendizajePlaneado: 0, semanaPlaneada: 9 },
  { nombre: 'Agenda de presentaciones finales', tipo: 'info', aprendizajePlaneado: 0, semanaPlaneada: 9 },
  { nombre: 'Domingo, fecha límite para considerar actividades en la evaluación del periodo 2', tipo: 'info', aprendizajePlaneado: 0, semanaPlaneada: 9 },
  { nombre: 'Validación de avance proyecto, retroalimentación y corrección', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 9 },

  // ==================== SEMANA 10 ====================
  { nombre: 'Límite para reportar calificaciones', tipo: 'info', aprendizajePlaneado: 0, semanaPlaneada: 10 },
  { nombre: 'Preparar presentaciones finales', tipo: 'info', aprendizajePlaneado: 0, semanaPlaneada: 10 },
  { nombre: 'Presentaciones finales de proyecto (13:00 - 15:00)', tipo: 'proyecto', aprendizajePlaneado: 0, semanaPlaneada: 10 },

  // ==================== EXTRAS (sin semana en calendario) ====================
  { nombre: 'Descargar Microsoft Access', tipo: 'actividad', aprendizajePlaneado: 0, semanaPlaneada: 0 },
  { nombre: 'Asesoría modelo de datos', tipo: 'actividad', aprendizajePlaneado: 0, semanaPlaneada: 0 },
  { nombre: 'Entrevista de evaluación de STC0203 y SEG0303', tipo: 'actividad', aprendizajePlaneado: 0, semanaPlaneada: 0 },
  { nombre: 'Actividad Evaluación heurística de usabilidad', tipo: 'actividad', aprendizajePlaneado: 0, semanaPlaneada: 0 },
  { nombre: 'Pruebas de pensamiento en voz alta', tipo: 'actividad', aprendizajePlaneado: 0, semanaPlaneada: 0 },
  { nombre: 'Arreglar aspectos de usabilidad en el proyecto', tipo: 'actividad', aprendizajePlaneado: 0, semanaPlaneada: 0 },
  { nombre: 'Apuntes con resúmenes de lecturas, preguntas y notas de clase', tipo: 'actividad', aprendizajePlaneado: 0, semanaPlaneada: 0 },
  { nombre: 'Plática de videojuegos', tipo: 'actividad', aprendizajePlaneado: 0, semanaPlaneada: 0 },
  { nombre: 'Responder ECOA', tipo: 'actividad', aprendizajePlaneado: 0, semanaPlaneada: 0 },
];
