export { BaseModel } from './BaseModel.js';
export { AppUser } from './AppUser.js';
export { Policy } from './Policy.js';
export type { PolicyConditions } from './Policy.js';
export { MagicToken } from './MagicToken.js';
export { AppSession } from './AppSession.js';
export { Grupo } from './Grupo.js';
export { CategoriaGrupo, COLOR_POR_DEFECTO, PALETA_CATEGORIAS, normalizarColor } from './CategoriaGrupo.js';
export { Semana } from './Semana.js';
export { Actividad } from './Actividad.js';
export { IndicacionMalla } from './IndicacionMalla.js';
export { Competencia } from './Competencia.js';
export { ActividadEvaluacion } from './ActividadEvaluacion.js';
export { ActividadEvaluacionGrupo } from './ActividadEvaluacionGrupo.js';
export { PlanEvaluacion } from './PlanEvaluacion.js';
export type { PeriodoConfig } from './PlanEvaluacion.js';
export { ActividadEvaluacionAlumno } from './ActividadEvaluacionAlumno.js';
export { Equipo } from './Equipo.js';
export { GrupoAlumno } from './GrupoAlumno.js';
export { AccesoWikiAlumno } from './AccesoWikiAlumno.js';
export { Entrevista } from './Entrevista.js';
export { EvaluacionEntrevista } from './EvaluacionEntrevista.js';
export { CompetenciaAlumno } from './CompetenciaAlumno.js';
export { Pagina } from './Pagina.js';
export type { ContentBlock } from './Pagina.js';
export { Etiqueta } from './Etiqueta.js';
// CMS "Contenidos" (design/cms-contenidos.html)
export { Coleccion } from './Coleccion.js';
export { Documento, DOCUMENTO_TIPOS, DOCUMENTO_PLANTILLAS } from './Documento.js';
export type { DocumentoTipo, DocumentoPlantilla } from './Documento.js';
export { DocumentoVersion } from './DocumentoVersion.js';
export { Recurso } from './Recurso.js';
// Módulo "Ejercicios" (mini-juez Kotlin/Swift)
export { EjercicioProgramacion, MODOS_EVALUACION, MARCADOR_SOLUCION } from './EjercicioProgramacion.js';
export type { CasoPrueba, CodigoInicial, CodigoPorLenguaje, ModoEvaluacion } from './EjercicioProgramacion.js';
export { EnvioEjercicio } from './EnvioEjercicio.js';
export type { DetalleCasoEnvio, EstadoEnvio } from './EnvioEjercicio.js';
export { CategoriaEjercicio } from './CategoriaEjercicio.js';
export { BloqueEjercicios } from './BloqueEjercicios.js';
// Módulo "Diagramas" (juez de diseño UML). Reutiliza CategoriaEjercicio y
// BloqueEjercicios: agrupan la colección, no el juez.
export { EjercicioDiagrama } from './EjercicioDiagrama.js';
export type { DiagramaContextoEjercicio } from './EjercicioDiagrama.js';
export { EnvioDiagrama } from './EnvioDiagrama.js';
// Taller: diagramas libres del alumno, sin colección ni ejercicio detrás.
export { DiagramaTaller } from './DiagramaTaller.js';
// Módulo "Preguntas": banco de preguntas de entrevista de una Coleccion y su
// asignación por alumno. La categoría de una pregunta es una Competencia.
export { Pregunta } from './Pregunta.js';
export { PreguntaAsignacion } from './PreguntaAsignacion.js';
// Qué se proyecta AHORA en un grupo: el mando (panel) y la pantalla (proyector)
// son dos aparatos distintos y se sincronizan por aquí.
export { ProyeccionPregunta, ESTADOS_PROYECCION } from './ProyeccionPregunta.js';
export type { EstadoProyeccion } from './ProyeccionPregunta.js';
// Agenda de entrevistas: los días que el profesor abre y las citas que los
// alumnos reservan. De ahí sale el ORDEN en que se proyecta.
export { DiaEntrevistas } from './DiaEntrevistas.js';
export { CitaEntrevista } from './CitaEntrevista.js';
