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

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CalendarPage />} />
        <Route path="calendario/:grupoId" element={<CalendarPage />} />
        <Route path="labs/:labId" element={<LabPage />} />
        <Route path="avances/:avanceId" element={<AvancePage />} />
        <Route path="politicas" element={<CodeReviewsPage />} />
      </Route>

      {/* Login */}
      <Route path="login" element={<LoginPage />} />

      {/* Admin dashboard */}
      <Route element={<DashboardLayout role="admin" />}>
        <Route path="admin" element={<AdminDashboard />} />
      </Route>

      {/* Student dashboard */}
      <Route element={<DashboardLayout role="alumno" />}>
        <Route path="alumno" element={<AlumnoDashboard />} />
      </Route>
    </Routes>
  );
}
