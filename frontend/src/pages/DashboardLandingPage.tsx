import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { dashboardRouteForRole } from '@/lib/auth';

export function DashboardLandingPage() {
  const { user } = useAuth();
  return <Navigate to={dashboardRouteForRole(user?.role ?? '')} replace />;
}
