import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, parseJson } from '@/lib/api';
import { isTechnician } from '@/lib/auth';
import type { AssignmentRow } from '@/lib/types';

type TechTab = 'assigned' | 'in_progress' | 'resolved';

export function TechnicianDashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  if (!isTechnician(role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const [tab, setTab] = useState<TechTab>('assigned');
  const [rows, setRows] = useState<AssignmentRow[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch('/assignment/mine');
      if (res.ok) {
        const data = await parseJson<AssignmentRow[]>(res);
        setRows(Array.isArray(data) ? data : []);
      }
    })();
  }, []);

  const assigned = useMemo(
    () => rows.filter((x) => x.issue.currentStatus.name === 'assigned'),
    [rows],
  );
  const inProgress = useMemo(
    () => rows.filter((x) => x.issue.currentStatus.name === 'in_progress'),
    [rows],
  );
  const resolved = useMemo(
    () => rows.filter((x) => x.issue.currentStatus.name === 'resolved'),
    [rows],
  );

  const current =
    tab === 'assigned' ? assigned : tab === 'in_progress' ? inProgress : resolved;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My assignments</h1>
        <p className="mt-1 text-slate-600">
          Billing, metering, ICT, and field tickets each use their own progress steps on
          the issue page — open a ticket to update status.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Assigned to start" value={assigned.length} />
        <Metric title="In progress" value={inProgress.length} />
        <Metric title="Resolved pending closure" value={resolved.length} />
      </div>
      <div className="flex gap-2">
        <Tab active={tab === 'assigned'} onClick={() => setTab('assigned')} label="Assigned" />
        <Tab active={tab === 'in_progress'} onClick={() => setTab('in_progress')} label="In progress / review" />
        <Tab active={tab === 'resolved'} onClick={() => setTab('resolved')} label="Resolved" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">My {tab.replace(/_/g, ' ')} incidents</p>
        <ul className="mt-3 space-y-2">
          {current.map((a) => (
            <li key={a.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              #{a.issue.id} · {a.issue.issueSubcategory ?? a.issue.issueCategory} ·{' '}
              {a.issue.location?.addressDescription ?? 'No address'}
            </li>
          ))}
          {current.length === 0 && <li className="text-sm text-slate-500">No tasks in this state.</li>}
        </ul>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Tab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        active ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700'
      }`}
    >
      {label}
    </button>
  );
}
