/**
 * Calendario TC2005B - Grupo 501
 * Created by Denisse Maldonado
 *
 * INSTRUCCIONES PARA ACTUALIZAR:
 * - Modifica las fechas, títulos, enlaces y duraciones directamente en este archivo.
 * - Los tipos de actividad válidos son: lab, lectura, ejercicio, proyecto, evaluacion, break, asueto, trabajo, discusion, info
 * - Para agregar una actividad, agrega un objeto al array "actividades" del día correspondiente.
 * - Para agregar una semana, agrega un objeto al array "semanas".
 * - Para duplicar el calendario para otro grupo, copia este archivo y cambia el nombre y los datos.
 */

const CALENDARIO = {
  curso: "TC2005B",
  nombreCurso: "Construcción de Software y Toma de Decisiones",
  grupo: "501",
  salon: "4205",
  enlaces: {
    asesoriaDenisse: "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0glSuRv-Qk1CwD4IJ1nBDWu2LSplGiPrW0Eo0DdEYxakViDvjwVkBsWBgh4U3wYpsD8GP9TRqd",
    asesoriaAlex: "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0glSuRv-Qk1CwD4IJ1nBDWu2LSplGiPrW0Eo0DdEYxakViDvjwVkBsWBgh4U3wYpsD8GP9TRqd",
    politicasEquipo: "code_reviews.html",
    integridadMIT: "https://integrity.mit.edu/handbook/writing-code",
    mallaEvaluacion: "https://docs.google.com/spreadsheets/d/1DzGDdW9kCbSaVki8JP3T85q9jfWLOmCUv7tRsYMLYLE/edit?usp=sharing",
    agendaEntrevistas: "https://docs.google.com/spreadsheets/d/1U1fbfaBWMp4Nje13qi2C3mhjhW0B8NxC-JXD0ff6fNQ/edit?gid=32307462#gid=32307462"
  },
  semanas: [
    // ==================== SEMANA 1 ====================
    {
      numero: 1,
      fechaInicio: "2026-03-23",
      fechaFin: "2026-03-27",
      tipo: "normal",
      dias: {
        lunes: {
          nota: "Sesión plenaria en el salón 4205",
          actividades: [
            { tipo: "info", titulo: "Introducción al curso", descripcion: "Intenciones educativas, objetivos, metodología, política de laptops, celulares y apuntes", duracion: "45 min" },
            { tipo: "info", titulo: "Malla de evaluación", enlace: "https://docs.google.com/spreadsheets/d/1DzGDdW9kCbSaVki8JP3T85q9jfWLOmCUv7tRsYMLYLE/edit?usp=sharing", externo: true },
            { tipo: "lab", titulo: "Lab 0: Presentación en la plataforma de comunicación", enlace: "labs/lab.html?id=lab0", duracion: "10 min", enlacesExtra: [{ texto: "Discord", url: "https://discord.gg/NpxyAytj2g" }] },
            { tipo: "lab", titulo: "Lab 1: Introducción a las aplicaciones web, HTML5 y ciclo de vida de los sistemas de información", enlace: "labs/lab.html?id=lab1", duracion: "55 min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "discusion", titulo: "Expectativas y proceso de aprendizaje", duracion: "1h 50min" }
          ]
        },
        martes: {
          previo: [
            { tipo: "lectura", titulo: "Lectura: Introducción a la gestión de proyectos", enlace: "documentos/0_bloqueAdmP_introduccion.pptx", externo: true }
          ],
          actividades: [
            { tipo: "lab", titulo: "Lab 2: Control de versiones", enlace: "labs/lab.html?id=lab2", duracion: "1h 55min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "lectura", titulo: "Presentación proyecto exitoso", duracion: "30 min" },
            { tipo: "lectura", titulo: "Requisitos de software y Casos de uso. Ejemplo de caso de uso: Registrar venta en punto de venta", duracion: "1h", enlacesExtra: [{ texto: "Requisitos de software", url: "documentos/Conceptos - Requisitos de Software.pptx" }, { texto: "Casos de uso", url: "documentos/Requisitos de Software - Casos de Uso.pptx" }] },
            { tipo: "ejercicio", titulo: "Caso de estudio: Requisitos de software", enlace: "documentos/Caso de Estudio-All-about-pools.pdf", duracion: "10 min" },
            { tipo: "proyecto", titulo: "Avance de proyecto 1: Conformación de los equipos", enlace: "avances/avance.html?id=av1", duracion: "10 min" }
          ]
        },
        miercoles: {
          previo: [
            { tipo: "lectura", titulo: "Lectura: Sistemas de información en los negocios", enlace: "documentos/Tema01-Introduccion_SI.pptx", externo: true }
          ],
          actividades: [
            { tipo: "lab", titulo: "Lab 3: Manejo de ramas", enlace: "labs/lab.html?id=lab7", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "discusion", titulo: "Resolución de dudas de las lecturas", duracion: "55 min" },
            { tipo: "lectura", titulo: "Revisión del caso de estudio", duracion: "55 min" }
          ]
        },
        jueves: {
          actividades: [
            { tipo: "lectura", titulo: "Diseño de la interacción", enlace: "https://www.haikudeck.com/p/stJQgEylw2/diseo-de-la-interaccin", duracion: "30 min", externo: true },
            { tipo: "lab", titulo: "Lab 4: CSS", enlace: "labs/lab.html?id=lab3", duracion: "55 min" },
            { tipo: "trabajo", titulo: "Presentación socio formador", duracion: "1h" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto e interacción con socio formador", duracion: "75 min" }
          ]
        }
      }
    },

    // ==================== CAMPUS SIN SERVICIO ====================
    {
      numero: "Sin servicio",
      fechaInicio: "2026-03-30",
      fechaFin: "2026-04-03",
      tipo: "especial",
      titulo: "Campus sin servicio",
      mensaje: "Campus sin servicio",
      mensajeImportante: ""
    },

    // ==================== SEMANA 2 ====================
    {
      numero: 2,
      fechaInicio: "2026-04-06",
      fechaFin: "2026-04-10",
      tipo: "normal",
      dias: {
        lunes: {
          previo: [
            { tipo: "lectura", titulo: "Lectura: Gestión del alcance", enlace: "documentos/3_bloqueAdmP_alcance.pptx", externo: true }
          ],
          actividades: [
            { tipo: "lab", titulo: "Lab 6: Programación Orientada a Eventos", enlace: "labs/lab.html?id=lab6", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "proyecto", titulo: "Avance de proyecto 2: Análisis y diseño de la solución", enlace: "avances/avance.html?id=av3", duracion: "15 min" },
            { tipo: "discusion", titulo: "Resolución de dudas de las lecturas", duracion: "55 min" },
            { tipo: "lectura", titulo: "Diagrama de contexto aplicado al proyecto", enlace: "documentos/Diagrama de contexto.pptx", duracion: "40 min", externo: true }
          ]
        },
        martes: {
          previo: [
            { tipo: "lectura", titulo: "Lectura: DB vs DBMS", enlace: "lecturas/lectura1_DBvsDBMS.html" },
            { tipo: "lectura", titulo: "Lectura: Notación del modelo entidad relación y Restricciones adicionales", enlace: "lecturas/lectura2_Mer/lectura2.html" }
          ],
          actividades: [
            { tipo: "lab", titulo: "Lab 7: Manejo de ramas", enlace: "labs/lab.html?id=lab7", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "discusion", titulo: "Resolución de dudas de la lectura", duracion: "30 min" },
            { tipo: "ejercicio", titulo: "Casos de estudio 2: Farmacéutica y liga de fútbol", enlace: "ejercicios/ej1_MER_farmaceutica_futbol.html", duracion: "1h 20min" }
          ]
        },
        miercoles: {
          actividades: [
            { tipo: "lab", titulo: "Lab 8: Introducción al back-end", enlace: "labs/lab.html?id=lab8", duracion: "1h 20min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "lectura", titulo: "Revisión del caso de estudio", duracion: "1h" },
            { tipo: "lectura", titulo: "Diagrama de clases y patrones de diseño", enlace: "documentos/Introduccion al diseno de software - Diagramas de clases.pptx", duracion: "40 min", externo: true },
            { tipo: "ejercicio", titulo: "Caso 3: Diagrama de clases para un videojuego", enlace: "documentos/DiagramaClases_Videojuego.pdf", duracion: "10 min", externo: true }
          ]
        },
        jueves: {
          actividades: [
            { tipo: "proyecto", titulo: "Validación de avance proyecto, retroalimentación y corrección / trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" }
          ]
        }
      }
    },

    // ==================== SEMANA 3 ====================
    {
      numero: 3,
      fechaInicio: "2026-04-13",
      fechaFin: "2026-04-17",
      tipo: "normal",
      dias: {
        lunes: {
          previo: [
            { tipo: "lectura", titulo: "Lectura: Reglas de traslado MER a MR", enlace: "lecturas/lectura3_Mr/lectura3.html" }
          ],
          actividades: [
            { tipo: "info", titulo: "Política de trabajo en equipo", enlace: "code_reviews.html", duracion: "15 min" },
            { tipo: "lab", titulo: "Lab 10: Rutas y formas", enlace: "labs/lab.html?id=lab10", duracion: "1h 5min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "discusion", titulo: "Resolución de dudas de la lectura", duracion: "30 min" },
            { tipo: "lab", titulo: "Lab 9: DBMS de escritorio", enlace: "labs/lab.html?id=lab9", duracion: "1h 20min" }
          ]
        },
        martes: {
          previo: [
            { tipo: "lectura", titulo: "Lectura: Gestión de la comunicación", enlace: "documentos/2_bloqueAdmP_comunicacion.pptx", externo: true }
          ],
          actividades: [
            { tipo: "lab", titulo: "Lab 11: Express", enlace: "labs/lab.html?id=lab11", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "discusion", titulo: "Resolución de dudas de la lectura", duracion: "30 min" },
            { tipo: "ejercicio", titulo: "Casos de estudio 4: MER, DD y MR", enlace: "ejercicios/ej2_MER_DD_MR.html", duracion: "1h 20min" }
          ]
        },
        miercoles: {
          previo: [
            { tipo: "lectura", titulo: "Lectura: Modelo Relacional y Álgebra Relacional", enlace: "lecturas/lectura4_Mr_Ar/lectura_Mr_Ar.html" }
          ],
          actividades: [
            { tipo: "lab", titulo: "Lab 12: HTML dinámico", enlace: "labs/lab.html?id=lab12", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "discusion", titulo: "Simulación de entrevista de evaluación", duracion: "1h" },
            { tipo: "discusion", titulo: "Resolución de dudas de la lectura", duracion: "50 min" }
          ]
        },
        jueves: {
          actividades: [
            { tipo: "proyecto", titulo: "Presentación de avance proyecto 2, retroalimentación y corrección", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 20min" }
          ]
        }
      }
    },

    // ==================== SEMANA 4 ====================
    {
      numero: 4,
      fechaInicio: "2026-04-20",
      fechaFin: "2026-04-24",
      tipo: "normal",
      dias: {
        lunes: {
          previo: [
            { tipo: "lectura", titulo: "Lectura: Diagramas de secuencia", enlace: "documentos/Introduccion al diseno de software - Diagramas de secuencia.pptx" }
          ],
          actividades: [
            { tipo: "lab", titulo: "Lab 13: MVC", enlace: "labs/lab.html?id=lab13", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "proyecto", titulo: "Avance de proyecto 3: Creación de la base de datos", enlace: "avances/avance.html?id=av4", duracion: "15 min" },
            { tipo: "discusion", titulo: "Solicitar en equipo una asesoría con Ricardo sobre su modelo de datos" },
            { tipo: "ejercicio", titulo: "Ejercicio: Identificación de Llaves en un MR y expresión de consultas en álgebra relacional", enlace: "ejercicios/ej3_mr_ar/ej3.html", duracion: "1h 35min" }
          ]
        },
        martes: {
          previo: [
            { tipo: "lectura", titulo: "Lectura: Álgebra relacional, SQL básico y funciones agregadas", enlace: "lecturas/lectura5_sql/index.html" }
          ],
          actividades: [
            { tipo: "lab", titulo: "Lab 14: Manejo de sesiones y cookies", enlace: "labs/lab.html?id=lab14", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "info", titulo: "Agenda tu evaluación de competencias de esta semana" },
            { tipo: "discusion", titulo: "Resolución de dudas de la lectura", duracion: "1h" },
            { tipo: "ejercicio", titulo: "Ejercicio: Traducción de álgebra relacional a SQL", enlace: "ejercicios/ej4_ar_sql.html", duracion: "50 min" }
          ]
        },
        miercoles: {
          previo: [
            { tipo: "info", titulo: "Instalar MariaDB", descripcion: "Opción 1: Instalar XAMPP | Opción 2: Instalar MySQL Community Server + MySQL Workbench", enlacesExtra: [{ texto: "XAMPP", url: "https://www.apachefriends.org/es/index.html" }, { texto: "MySQL Community Server", url: "https://dev.mysql.com/downloads/mysql/" }, { texto: "MySQL Workbench", url: "https://dev.mysql.com/downloads/workbench/" }] }
          ],
          actividades: [
            { tipo: "lab", titulo: "Lab 17: Interacción con la base de datos", enlace: "labs/lab.html?id=lab17", duracion: "50 min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "lab", titulo: "Lab 15: Conociendo el Ambiente de MariaDB", enlace: "labs/lab.html?id=lab15", duracion: "20 min" },
            { tipo: "lab", titulo: "Lab 16: Creación de constraints para instrumentar integridad referencial en MariaDB", duracion: "30 min" }
          ]
        },
        jueves: {
          actividades: [
            { tipo: "proyecto", titulo: "Entrega y validación de avance proyecto 3, retroalimentación y corrección", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "proyecto", titulo: "Retroalimentación de la UF", duracion: "30 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 20min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        }
      }
    },

    // ==================== SEMANA 5 ====================
    {
      numero: 5,
      fechaInicio: "2026-04-27",
      fechaFin: "2026-05-01",
      tipo: "normal",
      dias: {
        lunes: {
          previo: [
            { tipo: "lectura", titulo: "Lectura: Metodología para diseñar casos de pruebas a partir de casos de uso", enlace: "documentos/GeneratingTestCasesFromUseCasesJune01.pdf", externo: true }
          ],
          actividades: [
            { tipo: "lab", titulo: "Lab 18: Autentificación", enlace: "labs/lab.html?id=lab18", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "discusion", titulo: "Resolución de dudas de la lectura", duracion: "45 min" },
            { tipo: "proyecto", titulo: "Avance de proyecto 4: Prueba de concepto", enlace: "avances/avance.html?id=av5", duracion: "15 min" },
            { tipo: "ejercicio", titulo: "Ejercicio: Expresión de consultas en SQL usando funciones agregadas", enlace: "ejercicios/ej5_ar_sql2.html", duracion: "50 min" }
          ]
        },
        martes: {
          previo: [
            { tipo: "lectura", titulo: "Lectura: Consultas en SQL usando roles y Sub-consultas", enlace: "lecturas/lectura6_sql_roles/lectura_sql_roles.html" }
          ],
          actividades: [
            { tipo: "lab", titulo: "Lab 19: Control de acceso basado en roles", enlace: "labs/lab.html?id=lab19", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "info", titulo: "Agenda tu evaluación de competencias de esta semana" },
            { tipo: "discusion", titulo: "Resolución de dudas de la lectura", duracion: "40 min" },
            { tipo: "ejercicio", titulo: "Ejercicio: Expresión de consultas en SQL usando Sub-consultas", enlace: "ejercicios/ej6_sql_subconsultas.html", duracion: "1h 10min" }
          ]
        },
        miercoles: {
          actividades: [
            { tipo: "lab", titulo: "Lab 20: Consultas en SQL", enlace: "labs/lab.html?id=lab20", duracion: "40 min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        },
        jueves: {
          actividades: [
            { tipo: "proyecto", titulo: "Presentación de avance proyecto 4, retroalimentación y corrección", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        }
      }
    },

    // ==================== SEMANA TEC ====================
    {
      numero: "Tec",
      fechaInicio: "2026-05-04",
      fechaFin: "2026-05-08",
      tipo: "especial",
      titulo: "Semana Tec",
      mensaje: "Semana Tec",
      mensajeImportante: "Domingo, fecha límite para considerar actividades en la evaluación del periodo 1"
    },

    // ==================== SEMANA 6 ====================
    {
      numero: 6,
      fechaInicio: "2026-05-11",
      fechaFin: "2026-05-15",
      tipo: "normal",
      dias: {
        lunes: {
          actividades: [
            { tipo: "lab", titulo: "Lab 22: Subir y bajar archivos", enlace: "labs/lab.html?id=lab22", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "lab", titulo: "Lab 21: Funciones Agregadas y Sub-consultas", enlace: "labs/lab.html?id=lab21", duracion: "1h 50min" }
          ]
        },
        martes: {
          actividades: [
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 30min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "info", titulo: "Agenda tu evaluación de competencias de esta semana" },
            { tipo: "lab", titulo: "Lab 23: Stored procedures", enlace: "labs/lab.html?id=lab23", duracion: "1h 50min" }
          ]
        },
        miercoles: {
          actividades: [
            { tipo: "lab", titulo: "Lab 24: AJAX", enlace: "labs/lab.html?id=lab24", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "lab", titulo: "Lab 25: Transacciones", enlace: "labs/lab.html?id=lab25", duracion: "1h 50min" }
          ]
        },
        jueves: {
          actividades: [
            { tipo: "proyecto", titulo: "Presentación de avance proyecto 4, retroalimentación y corrección", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "proyecto", titulo: "Avance de proyecto 5: Versión Beta del Sistema", enlace: "avances/avance.html?id=av6", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 30min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        }
      }
    },

    // ==================== SEMANA 7 ====================
    {
      numero: 7,
      fechaInicio: "2026-05-18",
      fechaFin: "2026-05-22",
      tipo: "normal",
      dias: {
        lunes: {
          previo: [
            { tipo: "lectura", titulo: "Lectura: Normalización", enlace: "lecturas/lectura9_normalizacion/normalizacion.html" }
          ],
          actividades: [
            { tipo: "lab", titulo: "Lab 26: Servicios web", enlace: "labs/lab.html?id=lab26", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "discusion", titulo: "Resolución de dudas de la lectura", duracion: "50 min" },
            { tipo: "ejercicio", titulo: "Ejercicio: Normalización", enlace: "ejercicios/ej9_normalizacion.html", duracion: "1h" }
          ]
        },
        martes: {
          actividades: [
            { tipo: "trabajo", titulo: "Servicios web / Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "info", titulo: "Agenda tu evaluación de competencias de esta semana" },
            { tipo: "lectura", titulo: "Diagramas de estado", enlace: "documentos/Diagramas de estado.pptx", duracion: "50 min" },
            { tipo: "ejercicio", titulo: "Ejercicio: Diagramas de estado", enlace: "documentos/EjerciciosDiagramaEstado.docx", duracion: "1h" }
          ]
        },
        miercoles: {
          actividades: [
            { tipo: "lab", titulo: "Guías de preparación para el despliegue", enlace: "labs/lab.html?id=lab27", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 30min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "lectura", titulo: "Diagramas de despliegue", enlace: "documentos/Diagramas de despliegue.pptx", duracion: "50 min" },
            { tipo: "ejercicio", titulo: "Ejercicio: Diagramas de despliegue. Elaborar diagramas de despliegue de los entornos de desarrollo y producción del proyecto", enlace: "documentos/Ejercicio - Diagrama de despliegue.docx", duracion: "1h" }
          ]
        },
        jueves: {
          actividades: [
            { tipo: "info", titulo: "Límite para dar de baja el bloque" },
            { tipo: "proyecto", titulo: "Taller de despliegue", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        }
      }
    },

    // ==================== SEMANA 8 ====================
    {
      numero: 8,
      fechaInicio: "2026-05-25",
      fechaFin: "2026-05-29",
      tipo: "normal",
      dias: {
        lunes: {
          actividades: [
            { tipo: "proyecto", titulo: "Taller de despliegue", duracion: "50 min" },
            { tipo: "lab", titulo: "Evaluación heurística de usabilidad", enlace: "labs/lab.html?id=lab_usabilidad", duracion: "50 min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "lab", titulo: "Lab 28: Triggers", enlace: "labs/lab.html?id=lab28", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        },
        martes: {
          actividades: [
            { tipo: "trabajo", titulo: "Evaluación heurística de usabilidad en el proyecto", enlace: "labs/lab.html?id=lab_usabilidad", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        },
        miercoles: {
          actividades: [
            { tipo: "lectura", titulo: "Pruebas de pensamiento en voz alta", enlace: "labs/lab.html?id=lab_thinkaloud", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        },
        jueves: {
          actividades: [
            { tipo: "proyecto", titulo: "Presentación de avance proyecto 5, retroalimentación y corrección", duracion: "1h 30min" },
            { tipo: "proyecto", titulo: "Avance de proyecto 6: Versión 1.0", enlace: "avances/avance.html?id=av7", duracion: "20 min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "info", titulo: "Agenda tu evaluación de competencias de la semana 10" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        }
      }
    },

    // ==================== SEMANA 9 ====================
    {
      numero: 9,
      fechaInicio: "2026-06-01",
      fechaFin: "2026-06-05",
      tipo: "normal",
      dias: {
        lunes: {
          actividades: [
            { tipo: "evaluacion", titulo: "Entrega de apuntes" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        },
        martes: {
          actividades: [
            { tipo: "info", titulo: "5 steps to speed up your image heavy website", enlace: "https://codeburst.io/5-steps-to-speed-up-your-image-heavy-website-65c874a86966", externo: true, duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 30min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        },
        miercoles: {
          actividades: [
            { tipo: "lectura", titulo: "The front-end checklist", enlace: "https://codeburst.io/the-front-end-checklist-8b2292fdda44", externo: true, duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 30min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "discusion", titulo: "Responder ECOA" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        },
        jueves: {
          actividades: [
            { tipo: "proyecto", titulo: "Validación de avance proyecto, retroalimentación y corrección", duracion: "1h 40min" },
            { tipo: "info", titulo: "Agenda de presentaciones finales", duracion: "10 min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" },
            { tipo: "info", titulo: "Agenda tu evaluación final de competencias" },
            { tipo: "info", titulo: "Domingo, fecha límite para considerar actividades en la evaluación del periodo 2" }
          ]
        }
      }
    },

    // ==================== SEMANA 10 ====================
    {
      numero: 10,
      fechaInicio: "2026-06-08",
      fechaFin: "2026-06-12",
      tipo: "normal",
      dias: {
        lunes: {
          actividades: [
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        },
        martes: {
          actividades: [
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        },
        miercoles: {
          actividades: [
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" },
            { tipo: "break", duracion: "20 min" },
            { tipo: "trabajo", titulo: "Trabajo en proyecto", duracion: "1h 50min" },
            { tipo: "evaluacion", titulo: "Evaluación de competencias" }
          ]
        },
        jueves: {
          nota: "Sesión plenaria",
          actividades: [
            { tipo: "info", titulo: "The Web Developer Roadmap", enlace: "https://roadmap.sh/", externo: true, duracion: "30 min" },
            { tipo: "info", titulo: "Preparar presentaciones finales", duracion: "30 min" },
            { tipo: "proyecto", titulo: "Presentaciones finales de proyecto (13:00 - 15:00)", duracion: "2h" },
            { tipo: "info", titulo: "Límite para reportar calificaciones" }
          ]
        }
      }
    }
  ]
};
