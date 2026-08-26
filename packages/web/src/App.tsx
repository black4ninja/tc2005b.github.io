import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import Layout from './components/layout/Layout';
import CalendarPage from './components/calendar/CalendarPage';
import LabPage from './components/labs/LabPage';
import AvancePage from './components/avances/AvancePage';
import CodeReviewsPage from './components/policies/CodeReviewsPage';
import DashboardLayout from './components/dashboard/templates/DashboardLayout/DashboardLayout';
import AdminDashboard from './components/dashboard/pages/AdminDashboard/AdminDashboard';
import AlumnoDashboard from './components/dashboard/pages/AlumnoDashboard/AlumnoDashboard';
import LoginPage from './components/dashboard/pages/LoginPage/LoginPage';
import VerifyPage from './components/dashboard/pages/VerifyPage/VerifyPage';
import GruposPage from './components/dashboard/pages/GruposPage/GruposPage';
import AdministradoresPage from './components/dashboard/pages/AdministradoresPage/AdministradoresPage';
import AlumnosPage from './components/dashboard/pages/AlumnosPage/AlumnosPage';
import GrupoDetailPage from './components/dashboard/pages/GrupoDetailPage/GrupoDetailPage';
import AdminCalendarioPage from './components/dashboard/pages/AdminCalendarioPage/AdminCalendarioPage';
import CompetenciasPage from './components/dashboard/pages/CompetenciasPage/CompetenciasPage';
import ActividadesPage from './components/dashboard/pages/ActividadesPage/ActividadesPage';
import ActividadesGrupoPage from './components/dashboard/pages/ActividadesGrupoPage/ActividadesGrupoPage';
import PlanEvaluacionPage from './components/dashboard/pages/PlanEvaluacionPage/PlanEvaluacionPage';
import MallaEvaluacionPage from './components/dashboard/pages/MallaEvaluacionPage/MallaEvaluacionPage';
import EquiposPage from './components/dashboard/pages/EquiposPage/EquiposPage';
import AvancesEquipoPage from './components/dashboard/pages/AvancesEquipoPage/AvancesEquipoPage';
import EntrevistasPage from './components/dashboard/pages/EntrevistasPage/EntrevistasPage';
import PreguntasBancoPage from './components/dashboard/pages/PreguntasBancoPage/PreguntasBancoPage';
import PreguntasGrupoPage from './components/dashboard/pages/PreguntasGrupoPage/PreguntasGrupoPage';
import EvaluacionEntrevistaPage from './components/dashboard/pages/EvaluacionEntrevistaPage/EvaluacionEntrevistaPage';
import AlumnoCalendarioPage from './components/dashboard/pages/AlumnoCalendarioPage/AlumnoCalendarioPage';
import HubPage from './components/dashboard/pages/HubPage/HubPage';
import AlumnoCompetenciasPage from './components/dashboard/pages/AlumnoCompetenciasPage/AlumnoCompetenciasPage';
import PaginaPage from './components/paginas/PaginaPage';
import PaginasPage from './components/dashboard/pages/PaginasPage/PaginasPage';
import ContenidosPage from './components/dashboard/pages/ContenidosPage/ContenidosPage';
import ColeccionDetailPage from './components/dashboard/pages/ColeccionDetailPage/ColeccionDetailPage';
import EjerciciosColeccionPage from './components/dashboard/pages/EjerciciosColeccionPage/EjerciciosColeccionPage';
import { APP_NAME, APP_TAGLINE } from './config/app';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';

// El editor carga CodeMirror + el pipeline de render: se divide del bundle
// principal y solo se descarga al entrar a editar.
const EditorContenidoPage = lazy(
  () => import('./components/dashboard/pages/EditorContenidoPage/EditorContenidoPage'),
);

// El editor de ejercicios también usa CodeMirror: se carga bajo demanda.
const EditorEjercicioPage = lazy(
  () => import('./components/dashboard/pages/EditorEjercicioPage/EditorEjercicioPage'),
);

// Módulo "Diagramas". El editor arrastra CodeMirror Y el motor de diagramas para
// la vista previa, así que pesa aún más que el de ejercicios: bajo demanda los
// dos, listado incluido.
const EjerciciosDiagramaColeccionPage = lazy(
  () => import('./components/dashboard/pages/EjerciciosDiagramaColeccionPage/EjerciciosDiagramaColeccionPage'),
);
const EditorEjercicioDiagramaPage = lazy(
  () => import('./components/dashboard/pages/EditorEjercicioDiagramaPage/EditorEjercicioDiagramaPage'),
);

// Visor del CMS (US-3): página completa con su propio chrome, fuera de los
// layouts; todo su contenido llega por API autorizada por request.
const VisorContenidoPage = lazy(
  () => import('./components/contenidos/VisorContenidoPage'),
);

// Módulo "Ejercicios": lista y solver (el solver carga CodeMirror). Se monta
// DENTRO del shell del dashboard, una vez por rol — ver `config/rutasEjercicios`.
const EjerciciosAlumnoPage = lazy(
  () => import('./components/contenidos/EjerciciosAlumnoPage'),
);
const EjercicioSolverPage = lazy(
  () => import('./components/contenidos/EjercicioSolverPage'),
);
// Módulo "Diagramas": lista y solver del alumno. Mismo montaje que Ejercicios,
// una vez por rol — ver `config/rutasDiagramas`.
const DiagramasAlumnoPage = lazy(
  () => import('./components/contenidos/DiagramasAlumnoPage'),
);
const DiagramaSolverPage = lazy(
  () => import('./components/contenidos/DiagramaSolverPage'),
);
// Taller libre: arrastra CodeMirror y el motor de diagramas, igual que el
// solver, así que también se carga bajo demanda.
const TallerDiagramasPage = lazy(
  () => import('./components/contenidos/TallerDiagramasPage'),
);
const RedirEjerciciosLegacy = lazy(
  () => import('./components/contenidos/RedirEjerciciosLegacy'),
);

export default function App() {
  const { pathname } = useLocation();

  // Título del navegador como fuente única de verdad (el <title> de index.html
  // es solo un fallback pre-hidratación).
  useEffect(() => {
    document.title = `${APP_NAME} | ${APP_TAGLINE}`;
  }, []);

  return (
    // Última red. Los layouts ya llevan el suyo por dentro —así un fallo de una
    // sección conserva el menú—; este cubre lo que quede fuera: el propio
    // layout, el login, el visor.
    <ErrorBoundary resetKey={pathname}>
      <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="calendario/:grupoId" element={<CalendarPage />} />
        <Route path="labs/:labId" element={<LabPage />} />
        <Route path="avances/:avanceId" element={<AvancePage />} />
        <Route path="politicas" element={<CodeReviewsPage />} />
        <Route path="paginas/:slug" element={<PaginaPage />} />
      </Route>

      {/* Auth */}
      <Route path="login" element={<LoginPage />} />
      <Route path="auth/verify" element={<VerifyPage />} />

      {/* URLs previas del mini-juez, cuando era una pantalla suelta: redirigen al
          árbol del rol. ANTES del catch-all :slug/* para que "ejercicios" no lo
          capture el visor. */}
      <Route
        path="contenidos/:slug/ejercicios"
        element={
          <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
            <RedirEjerciciosLegacy />
          </Suspense>
        }
      />
      <Route
        path="contenidos/:slug/ejercicios/:ejSlug"
        element={
          <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
            <RedirEjerciciosLegacy />
          </Suspense>
        }
      />

      {/* Visor de Contenidos (CMS) */}
      <Route
        path="contenidos/:slug/*"
        element={
          <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
            <VisorContenidoPage />
          </Suspense>
        }
      />

      {/* Admin dashboard */}
      <Route element={<DashboardLayout role="admin" />}>
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="admin/grupos" element={<GruposPage />} />
        <Route path="admin/alumnos" element={<AlumnosPage />} />
        <Route path="admin/administradores" element={<AdministradoresPage />} />
        <Route path="admin/grupos/:id" element={<GrupoDetailPage />} />
        <Route path="admin/grupos/:id/alumnos/:alumnoId/malla" element={<MallaEvaluacionPage />} />
        <Route path="admin/grupos/:id/actividades-evaluacion" element={<ActividadesGrupoPage />} />
        <Route path="admin/grupos/:id/actividades-evaluacion/:actividadId/malla" element={<MallaEvaluacionPage />} />
        <Route path="admin/grupos/:id/plan-evaluacion" element={<PlanEvaluacionPage />} />
        <Route path="admin/grupos/:id/equipos" element={<EquiposPage />} />
        <Route path="admin/grupos/:id/equipos/:equipoId/avances" element={<AvancesEquipoPage />} />
        <Route path="admin/grupos/:id/entrevistas" element={<EntrevistasPage />} />
        <Route path="admin/grupos/:id/entrevistas/:entrevistaId/evaluacion" element={<EvaluacionEntrevistaPage />} />
        <Route path="admin/grupos/:id/calendario" element={<AdminCalendarioPage />} />
        {/* Misma vista que la del alumno: el profesor comprueba lo que ellos ven. */}
        <Route path="admin/grupos/:id/hub" element={<HubPage />} />
        {/* Ejercicios como los ve el alumno, colgando del grupo para conservar su
            sidebar. `:slug` es la colección. */}
        <Route
          path="admin/grupos/:id/ejercicios/:slug"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
              <EjerciciosAlumnoPage />
            </Suspense>
          }
        />
        <Route
          path="admin/grupos/:id/ejercicios/:slug/:ejSlug"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando ejercicio…</p>}>
              <EjercicioSolverPage />
            </Suspense>
          }
        />
        {/* Diagramas como los ve el alumno, con el mismo montaje colgado del grupo. */}
        <Route
          path="admin/grupos/:id/diagramas/:slug"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
              <DiagramasAlumnoPage />
            </Suspense>
          }
        />
        <Route
          path="admin/grupos/:id/diagramas/:slug/:ejSlug"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando ejercicio…</p>}>
              <DiagramaSolverPage />
            </Suspense>
          }
        />
        <Route
          path="admin/grupos/:id/taller-diagramas"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando taller…</p>}>
              <TallerDiagramasPage />
            </Suspense>
          }
        />
        {/* Módulo "Preguntas": el banco cuelga de la colección (admin) y la
            asignación, del grupo (profesor de ese grupo). */}
        <Route path="admin/contenidos/:id/preguntas" element={<PreguntasBancoPage />} />
        <Route path="admin/grupos/:id/preguntas" element={<PreguntasGrupoPage />} />
        <Route path="admin/competencias" element={<CompetenciasPage />} />
        <Route path="admin/actividades" element={<ActividadesPage />} />
        <Route path="admin/paginas" element={<PaginasPage />} />
        <Route path="admin/contenidos" element={<ContenidosPage />} />
        <Route path="admin/contenidos/:id" element={<ColeccionDetailPage />} />
        <Route path="admin/contenidos/:id/ejercicios" element={<EjerciciosColeccionPage />} />
        <Route
          path="admin/contenidos/:id/ejercicios/:ejercicioId"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando editor…</p>}>
              <EditorEjercicioPage />
            </Suspense>
          }
        />
        <Route
          path="admin/contenidos/:id/diagramas"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
              <EjerciciosDiagramaColeccionPage />
            </Suspense>
          }
        />
        <Route
          path="admin/contenidos/:id/diagramas/:ejercicioId"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando editor…</p>}>
              <EditorEjercicioDiagramaPage />
            </Suspense>
          }
        />
        <Route
          path="admin/contenidos/:id/editar/:docId"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando editor…</p>}>
              <EditorContenidoPage />
            </Suspense>
          }
        />
      </Route>

      {/* Student dashboard */}
      <Route element={<DashboardLayout role="alumno" />}>
        <Route path="alumno" element={<AlumnoDashboard />} />
        <Route path="alumno/grupos/:id/calendario" element={<AlumnoCalendarioPage />} />
        <Route path="alumno/grupos/:id/hub" element={<HubPage />} />
        <Route path="alumno/grupos/:id/malla" element={<MallaEvaluacionPage />} />
        <Route path="alumno/grupos/:id/competencias" element={<AlumnoCompetenciasPage />} />
        {/* Ejercicios es sección de primer nivel del alumno: no cuelga de un grupo
            sino de la colección (`:slug`), que es lo que agrupa los ejercicios. */}
        <Route
          path="alumno/ejercicios/:slug"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
              <EjerciciosAlumnoPage />
            </Suspense>
          }
        />
        <Route
          path="alumno/ejercicios/:slug/:ejSlug"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando ejercicio…</p>}>
              <EjercicioSolverPage />
            </Suspense>
          }
        />
        {/* Diagramas, con el mismo criterio: sección de primer nivel colgada de
            la colección, no del grupo. */}
        <Route
          path="alumno/diagramas/:slug"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando…</p>}>
              <DiagramasAlumnoPage />
            </Suspense>
          }
        />
        <Route
          path="alumno/diagramas/:slug/:ejSlug"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando ejercicio…</p>}>
              <DiagramaSolverPage />
            </Suspense>
          }
        />
        {/* Taller libre: fuera del árbol de :slug porque no pertenece a ninguna
            colección. Colgarlo de una haría creer que lo guardado es del curso. */}
        <Route
          path="alumno/taller-diagramas"
          element={
            <Suspense fallback={<p style={{ padding: 24 }}>Cargando taller…</p>}>
              <TallerDiagramasPage />
            </Suspense>
          }
        />
      </Route>
      </Routes>
    </ErrorBoundary>
  );
}
