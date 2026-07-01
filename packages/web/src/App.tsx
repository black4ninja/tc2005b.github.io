import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router';
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
import EvaluacionEntrevistaPage from './components/dashboard/pages/EvaluacionEntrevistaPage/EvaluacionEntrevistaPage';
import AlumnoCalendarioPage from './components/dashboard/pages/AlumnoCalendarioPage/AlumnoCalendarioPage';
import AlumnoCompetenciasPage from './components/dashboard/pages/AlumnoCompetenciasPage/AlumnoCompetenciasPage';
import PaginaPage from './components/paginas/PaginaPage';
import PaginasPage from './components/dashboard/pages/PaginasPage/PaginasPage';
import { APP_NAME, APP_TAGLINE } from './config/app';

export default function App() {
  // Título del navegador como fuente única de verdad (el <title> de index.html
  // es solo un fallback pre-hidratación).
  useEffect(() => {
    document.title = `${APP_NAME} | ${APP_TAGLINE}`;
  }, []);

  return (
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

      {/* Admin dashboard */}
      <Route element={<DashboardLayout role="admin" />}>
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="admin/grupos" element={<GruposPage />} />
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
        <Route path="admin/competencias" element={<CompetenciasPage />} />
        <Route path="admin/actividades" element={<ActividadesPage />} />
        <Route path="admin/paginas" element={<PaginasPage />} />
      </Route>

      {/* Student dashboard */}
      <Route element={<DashboardLayout role="alumno" />}>
        <Route path="alumno" element={<AlumnoDashboard />} />
        <Route path="alumno/grupos/:id/calendario" element={<AlumnoCalendarioPage />} />
        <Route path="alumno/grupos/:id/malla" element={<MallaEvaluacionPage />} />
        <Route path="alumno/grupos/:id/competencias" element={<AlumnoCompetenciasPage />} />
      </Route>
    </Routes>
  );
}
