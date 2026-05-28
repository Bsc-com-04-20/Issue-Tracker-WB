import { Link, useNavigate } from 'react-router-dom';
import { Bell, Plus, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  canCreateIssue,
  isCustomerOperationsRole,
  isSupervisorOrManagerRole,
  isTechnician,
} from '@/lib/auth';

type TopBarProps = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
};

export function TopBar({ searchQuery, onSearchChange }: TopBarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canNew = user && canCreateIssue(user.role);
  const role = user?.role ?? '';
  const supervisor = isSupervisorOrManagerRole(role);
  const operations = isCustomerOperationsRole(role);
  const technician = isTechnician(role);

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6">
      <div className="relative max-w-2xl flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search issues, documentation..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              navigate(`/app/issues?q=${encodeURIComponent(searchQuery)}`);
            }
          }}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none ring-indigo-500 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2"
        />
      </div>
      <div className="flex items-center gap-3">
        {supervisor && (
          <button
            type="button"
            onClick={() => navigate('/app/dashboard/supervisor')}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
          >
            Supervisor workspace
          </button>
        )}
        {operations && (
          <>
            <button
              type="button"
              onClick={() => navigate('/app/dashboard/operations')}
              className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100"
            >
              Operations intake
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/dashboard/operations?tab=escalation')}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
            >
              Escalate urgent
            </button>
          </>
        )}
        {technician && (
          <button
            type="button"
            onClick={() => navigate('/app/dashboard/technician')}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            Start work
          </button>
        )}
        {canNew && (
          <Link
            to="/app/issues/new"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:border-indigo-200 hover:bg-indigo-50"
          >
            <Plus className="h-4 w-4" />
            New Issue
          </Link>
        )}
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white"
          title={user?.email}
        >
          {(user?.email ?? '?').slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
