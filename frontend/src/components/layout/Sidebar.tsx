import { NavLink } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  ListTodo,
  BarChart3,
  Settings,
  LogOut,
  Users,
  ScrollText,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  canAccessReports,
  canManageUsers,
  canNavigateIssues,
  canViewAudit,
  dashboardRouteForRole,
  isCustomerOperationsRole,
  isDepartmentSpecialistRole,
  isSupervisorOrManagerRole,
  isTechnician,
} from '@/lib/auth';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`;

export function Sidebar() {
  const { user, logout } = useAuth();
  const role = user?.role ?? '';
  const showReports = canAccessReports(role);
  const showIssues = canNavigateIssues(role);
  const showUsers = canManageUsers(role);
  const showAudit = canViewAudit(role);
  const tech = isTechnician(role);
  const operations = isCustomerOperationsRole(role);
  const supervisor = isSupervisorOrManagerRole(role);
  const deptSpecialist = isDepartmentSpecialistRole(role);
  const dashboardHref = dashboardRouteForRole(role);
  const showIssueList = showIssues && !operations;

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
        <Activity className="h-7 w-7 text-indigo-600" strokeWidth={2} />
        <span className="text-lg font-bold tracking-tight text-indigo-600">
          IssueTracker
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <NavLink to={dashboardHref} className={navClass} end>
          <LayoutDashboard className="h-5 w-5 text-indigo-600" />
          {tech
            ? 'Field dashboard'
            : operations
              ? 'Operations dashboard'
              : supervisor
                ? 'Supervisor dashboard'
                : deptSpecialist
                  ? 'My department home'
                  : 'Dashboard'}
        </NavLink>
        {showIssueList && (
          <NavLink to="/app/issues" className={navClass}>
            <ListTodo className="h-5 w-5" />
            {tech ? 'My assigned tasks' : deptSpecialist ? 'My department issues' : 'Issues'}
          </NavLink>
        )}
        {operations && (
          <NavLink to="/app/issues?status=reported" className={navClass}>
            <ListTodo className="h-5 w-5" />
            Intake queue
          </NavLink>
        )}
        {operations && (
          <NavLink
            to="/app/issues?status=reported&duplicateReview=1"
            className={navClass}
          >
            <ListTodo className="h-5 w-5" />
            Duplicate review
          </NavLink>
        )}
        {showReports && (
          <NavLink to="/app/reports" className={navClass}>
            <BarChart3 className="h-5 w-5" />
            Reports
          </NavLink>
        )}
        {showAudit && (
          <NavLink to="/app/audit" className={navClass}>
            <ScrollText className="h-5 w-5" />
            Audit log
          </NavLink>
        )}
        {showUsers && (
          <NavLink to="/app/users" className={navClass}>
            <Users className="h-5 w-5" />
            Users
          </NavLink>
        )}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 ${
              isActive ? 'bg-slate-50' : ''
            }`
          }
        >
          <Settings className="h-5 w-5" />
          Settings
        </NavLink>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
