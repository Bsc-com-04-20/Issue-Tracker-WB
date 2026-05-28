import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DashboardLandingPage } from '@/pages/DashboardLandingPage';
import { OperationsDashboardPage } from '@/pages/OperationsDashboardPage';
import { SupervisorDashboardPage } from '@/pages/SupervisorDashboardPage';
import { TechnicianDashboardPage } from '@/pages/TechnicianDashboardPage';
import { DepartmentDashboardPage } from '@/pages/DepartmentDashboardPage';
import { IssuesPage } from '@/pages/IssuesPage';
import { IssueDetailPage } from '@/pages/IssueDetailPage';
import { NewIssuePage } from '@/pages/NewIssuePage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UsersPage } from '@/pages/UsersPage';
import { AuditPage } from '@/pages/AuditPage';
import { PublicReportPage } from '@/pages/PublicReportPage';
import { PublicTrackPage } from '@/pages/PublicTrackPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/report" element={<PublicReportPage />} />
      <Route path="/track" element={<PublicTrackPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardLandingPage />} />
        <Route path="dashboard/general" element={<DashboardPage />} />
        <Route path="dashboard/operations" element={<OperationsDashboardPage />} />
        <Route path="dashboard/supervisor" element={<SupervisorDashboardPage />} />
        <Route path="dashboard/technician" element={<TechnicianDashboardPage />} />
        <Route path="dashboard/department" element={<DepartmentDashboardPage />} />
        <Route path="issues" element={<IssuesPage />} />
        <Route path="issues/new" element={<NewIssuePage />} />
        <Route path="issues/:id" element={<IssueDetailPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/report" replace />} />
      <Route path="*" element={<Navigate to="/report" replace />} />
    </Routes>
  );
}
