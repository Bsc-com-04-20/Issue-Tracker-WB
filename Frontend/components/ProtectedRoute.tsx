import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/report" state={{ from: loc }} replace />;
  }

  return <>{children}</>;
}
