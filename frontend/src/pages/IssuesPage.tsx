import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { apiFetch, parseJson } from '@/lib/api';
import {
  canAccessOperationalPulse,
  canCreateIssue,
  canExportStaffIssuesCsv,
  canFilterIssuesByDepartment,
  canListAllIssues,
  defaultDepartmentKeyForSpecialistRole,
  isDepartmentSpecialistRole,
  isIntakeOfficerRole,
  isSupervisorOrManagerRole,
  isTechnician,
} from '@/lib/auth';
import { issueKey } from '@/lib/issueKey';
import {
  hasIntakeCoDepartmentHints,
  intakeDuplicateCandidateCount,
} from '@/lib/issueIntelligence';
import { downloadIssuesCsv } from '@/lib/issuesCsv';
import { priorityUi, statusPillClass } from '@/lib/statusUi';
import type { AssignmentRow, IssueRow, IssuesPageResponse, OperationalPulse } from '@/lib/types';

function dedupeAssignmentsByIssue(rows: AssignmentRow[]): AssignmentRow[] {
  const m = new Map<number, AssignmentRow>();
  for (const a of rows) {
    const cur = m.get(a.issue.id);
    if (
      !cur ||
      new Date(a.assignmentDate).getTime() >
        new Date(cur.assignmentDate).getTime()
    ) {
      m.set(a.issue.id, a);
    }
  }
  return Array.from(m.values()).sort(
    (x, y) =>
      new Date(y.issue.dateReported).getTime() -
      new Date(x.issue.dateReported).getTime(),
  );
}

const PAGE_SIZE = 10;
const STATUSES = [
  '',
  'reported',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
];

export function IssuesPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const staff = canListAllIssues(role);
  const tech = isTechnician(role);
  const deptSpecialist = isDepartmentSpecialistRole(role);
  const supervisor = isSupervisorOrManagerRole(role);
  const canNew = canCreateIssue(role);
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const assignedDepartmentFilter = searchParams.get('assignedDepartment') ?? '';
  const duplicateReviewFilter =
    searchParams.get('duplicateReview') === '1' ||
    searchParams.get('duplicateReview') === 'true';
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [data, setData] = useState<IssuesPageResponse | null>(null);
  const [techRows, setTechRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localQ, setLocalQ] = useState(q);
  const [departmentKeys, setDepartmentKeys] = useState<string[]>([]);
  const [opPulse, setOpPulse] = useState<OperationalPulse | null>(null);
  const [exporting, setExporting] = useState(false);

  const canPulse = canAccessOperationalPulse(role);
  const canDeptFilter = canFilterIssuesByDepartment(role);
  const canExportCsv = canExportStaffIssuesCsv(role);

  const loadStaff = useCallback(async () => {
    const sp = new URLSearchParams();
    sp.set('skip', String(skip));
    sp.set('take', String(PAGE_SIZE));
    if (statusFilter) sp.set('status', statusFilter);
    if (assignedDepartmentFilter && canDeptFilter) {
      sp.set('assignedDepartment', assignedDepartmentFilter);
    }
    if (duplicateReviewFilter) {
      sp.set('needsDuplicateReview', 'true');
    }
    const res = await apiFetch(`/issue?${sp.toString()}`);
    if (!res.ok) throw new Error('Failed to load issues');
    return parseJson<IssuesPageResponse>(res);
  }, [skip, statusFilter, assignedDepartmentFilter, duplicateReviewFilter, canDeptFilter]);

  const loadTech = useCallback(async () => {
    const res = await apiFetch('/assignment/mine');
    if (!res.ok) throw new Error('Failed to load assignments');
    const rows = await parseJson<AssignmentRow[]>(res);
    return Array.isArray(rows) ? rows : [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (staff) {
          const d = await loadStaff();
          if (!cancelled) setData(d);
        } else if (tech) {
          const rows = await loadTech();
          if (!cancelled) {
            setTechRows(rows);
            setData(null);
          }
        }
      } catch {
        if (!cancelled) setError('Could not load issues.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staff, tech, loadStaff, loadTech]);

  useEffect(() => {
    if (!canDeptFilter) return;
    let cancelled = false;
    void (async () => {
      const res = await apiFetch('/issue/classification');
      if (!res.ok || cancelled) return;
      const j = await parseJson<{
        categories?: Record<string, { department?: string }>;
      }>(res);
      const cats = j.categories ?? {};
      const uniq = [
        ...new Set(
          Object.values(cats)
            .map((c) => (c?.department ?? '').trim())
            .filter(Boolean),
        ),
      ].sort();
      if (!cancelled) setDepartmentKeys(uniq);
    })();
    return () => {
      cancelled = true;
    };
  }, [canDeptFilter]);

  useEffect(() => {
    if (!staff || !canPulse) {
      setOpPulse(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await apiFetch('/report/operational-pulse');
      if (!res.ok || cancelled) return;
      setOpPulse(await parseJson<OperationalPulse>(res));
    })();
    return () => {
      cancelled = true;
    };
  }, [staff, canPulse]);

  useEffect(() => {
    setLocalQ(q);
  }, [q]);

  const filteredStaffItems = useMemo(() => {
    if (!data?.items) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data.items;
    return data.items.filter(
      (i) =>
        i.description.toLowerCase().includes(needle) ||
        String(i.id).includes(needle) ||
        issueKey(i.id).toLowerCase().includes(needle),
    );
  }, [data, q]);

  const filteredTechRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return techRows;
    return techRows.filter(
      (a) =>
        a.issue.description.toLowerCase().includes(needle) ||
        String(a.issue.id).includes(needle),
    );
  }, [techRows, q]);

  const dedupedTech = useMemo(
    () => dedupeAssignmentsByIssue(filteredTechRows),
    [filteredTechRows],
  );

  const displayRows: IssueRow[] = staff
    ? filteredStaffItems
    : dedupedTech.map((a) => a.issue);

  const totalPages = staff && data
    ? Math.max(1, Math.ceil(data.total / PAGE_SIZE))
    : 1;

  function setPage(p: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  }

  function applySearch() {
    const next = new URLSearchParams(searchParams);
    if (localQ) next.set('q', localQ);
    else next.delete('q');
    next.set('page', '1');
    setSearchParams(next);
  }

  function setStatus(s: string) {
    const next = new URLSearchParams(searchParams);
    if (s) next.set('status', s);
    else next.delete('status');
    next.set('page', '1');
    setSearchParams(next);
  }

  function setAssignedDepartment(d: string) {
    const next = new URLSearchParams(searchParams);
    if (d) next.set('assignedDepartment', d);
    else next.delete('assignedDepartment');
    next.set('page', '1');
    setSearchParams(next);
  }

  function setDuplicateReviewFilter(on: boolean) {
    const next = new URLSearchParams(searchParams);
    if (on) next.set('duplicateReview', '1');
    else next.delete('duplicateReview');
    next.set('page', '1');
    setSearchParams(next);
  }

  const runExport = useCallback(async () => {
    if (!staff || !canExportStaffIssuesCsv(role)) return;
    setExporting(true);
    setError(null);
    try {
      const collected: IssueRow[] = [];
      let off = 0;
      const take = 100;
      for (;;) {
        const sp = new URLSearchParams();
        sp.set('skip', String(off));
        sp.set('take', String(take));
        if (statusFilter) sp.set('status', statusFilter);
        if (assignedDepartmentFilter && canDeptFilter) {
          sp.set('assignedDepartment', assignedDepartmentFilter);
        }
        if (duplicateReviewFilter) {
          sp.set('needsDuplicateReview', 'true');
        }
        const res = await apiFetch(`/issue?${sp.toString()}`);
        if (!res.ok) throw new Error('export');
        const page = await parseJson<IssuesPageResponse>(res);
        collected.push(...page.items);
        if (page.items.length === 0 || collected.length >= page.total) break;
        off += take;
        if (off > 20000) break;
      }
      const needle = q.trim().toLowerCase();
      const filtered =
        needle === ''
          ? collected
          : collected.filter(
              (i) =>
                i.description.toLowerCase().includes(needle) ||
                String(i.id).includes(needle) ||
                issueKey(i.id).toLowerCase().includes(needle),
            );
      downloadIssuesCsv(
        filtered,
        `issues-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`,
      );
    } catch {
      setError('Export failed. Check your connection and try again.');
    } finally {
      setExporting(false);
    }
  }, [staff, role, statusFilter, assignedDepartmentFilter, duplicateReviewFilter, canDeptFilter, q]);

  const unassignedCount = staff && data
    ? data.items.filter((i) => i.currentStatus.name === 'reported').length
    : 0;

  const slaOverdueOpen =
    canPulse && opPulse
      ? opPulse.openIssuesPastResolutionDueNotStamped
      : staff && data
        ? data.items.filter((i) => {
            if (['closed', 'resolved'].includes(i.currentStatus.name)) return false;
            if (!i.slaResolutionDueAt) return false;
            return new Date(i.slaResolutionDueAt).getTime() < Date.now();
          }).length
        : 0;

  const dueSoonWindow =
    staff && data && !canPulse
      ? data.items.filter((i) => {
          if (['closed', 'resolved'].includes(i.currentStatus.name)) return false;
          if (!i.slaResolutionDueAt) return false;
          const t = new Date(i.slaResolutionDueAt).getTime();
          const soon = Date.now() + 72 * 3600000;
          return t >= Date.now() && t <= soon;
        }).length
      : 0;

  const slaStatValue = canPulse && opPulse ? slaOverdueOpen : dueSoonWindow;
  const slaStatTitle =
    canPulse && opPulse ? 'SLA overdue (open)' : 'SLA due ≤72h (page)';

  const resolvedTodayValue =
    canPulse && opPulse ? opPulse.resolvedTodayCount ?? 0 : '—';

  if (!staff && !tech) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
        Your role does not include the issue backlog. Contact an administrator
        if you need access.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {staff && deptSpecialist && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-950">
          <p className="font-semibold">Your department queue</p>
          <p className="mt-1 text-violet-900/90">
            This list is limited to issues with{' '}
            <strong>assigned department</strong>{' '}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">
              {user?.department?.trim() ||
                defaultDepartmentKeyForSpecialistRole(role) ||
                '—'}
            </code>
            . Admins set this on your user profile; sign out and back in after it
            changes.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            {tech
              ? 'My assignments'
              : deptSpecialist
                ? 'My department issues'
                : supervisor
                  ? 'All issues'
                  : isIntakeOfficerRole(role)
                    ? 'Intake queue'
                    : 'Issue backlog'}
          </h1>
          <p className="mt-1 text-slate-600">
            {tech
              ? 'View and update issues assigned to you: progress status, resolve, and attachments.'
              : deptSpecialist
                ? 'Tickets routed to your unit from customer categories that map to your department.'
                : supervisor
                  ? 'Full-network queue: filter by status and assigned department, export CSV, open a ticket to assign technicians or close after verification. Your home overview is the supervisor workspace.'
                  : isIntakeOfficerRole(role)
                    ? 'Triage new registrations, duplicate checks, first-line dispatch to technicians, and supervisor escalation when needed. Fraud investigations are handled by the compliance unit.'
                    : 'Monitor and manage the backlog: filter by status, assign from issue detail, then close when resolved.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExportCsv && (
            <button
              type="button"
              disabled={exporting || !staff}
              onClick={() => void runExport()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          )}
          {canNew && (
            <Link
              to="/app/issues/new"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Create issue
            </Link>
          )}
        </div>
      </div>

      {staff && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total issues"
            value={data?.total ?? '—'}
            icon={Activity}
          />
          <StatCard
            title="Unassigned (page)"
            value={unassignedCount}
            accent="danger"
            icon={Activity}
          />
          <StatCard
            title={slaStatTitle}
            value={slaStatValue}
            accent="warning"
            icon={Activity}
          />
          <StatCard
            title="Resolved today (UTC)"
            value={resolvedTodayValue}
            accent="success"
            icon={Activity}
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-lg border border-slate-200 p-2 text-slate-500">
              <Filter className="h-4 w-4" />
            </span>
            {staff && (
              <select
                value={statusFilter}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
              >
                <option value="">Status: all</option>
                {STATUSES.filter(Boolean).map((s) => (
                  <option key={s} value={s}>
                    Status: {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            )}
            {staff && canDeptFilter && (
              <select
                value={assignedDepartmentFilter}
                onChange={(e) => setAssignedDepartment(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
              >
                <option value="">Department: all</option>
                {departmentKeys.map((d) => (
                  <option key={d} value={d}>
                    Department: {d.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            )}
            {staff && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100">
                <input
                  type="checkbox"
                  className="rounded border-amber-400 text-amber-700 focus:ring-amber-500"
                  checked={duplicateReviewFilter}
                  onChange={(e) => setDuplicateReviewFilter(e.target.checked)}
                />
                Duplicate review only
              </label>
            )}
            <span className="hidden text-sm text-slate-500 sm:inline">
              {duplicateReviewFilter
                ? 'Server filter: tickets with system duplicate score above threshold'
                : canDeptFilter && assignedDepartmentFilter
                  ? `Routed unit filter active`
                  : canExportCsv
                    ? 'Filters apply to list and export'
                    : 'Filters apply to this list'}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Search titles or IDs…"
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 lg:max-w-xs"
            />
            <button
              type="button"
              onClick={applySearch}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                {staff && (
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </th>
                )}
                <th className="px-4 py-3">Issue ID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Severity / Urgency</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={staff ? 9 : 8}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Loading…
                  </td>
                </tr>
              ) : displayRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={staff ? 9 : 8}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No issues match your filters.
                  </td>
                </tr>
              ) : (
                displayRows.map((row) => {
                  const pr = priorityUi(row.severityLevel);
                  const assigneeName = tech
                    ? user?.email?.split('@')[0] ?? 'You'
                    : '—';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      {staff && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Link
                          to={`/app/issues/${issueKey(row.id)}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {issueKey(row.id)}
                        </Link>
                        {staff && intakeDuplicateCandidateCount(row.issueAttributes) > 0 ? (
                          <div className="mt-1">
                            <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
                              System: possible duplicates ·{' '}
                              {intakeDuplicateCandidateCount(row.issueAttributes)}
                            </span>
                          </div>
                        ) : null}
                        {staff && hasIntakeCoDepartmentHints(row.issueAttributes) ? (
                          <div className="mt-1">
                            <span className="inline-flex rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-950">
                              System: co-unit hints
                            </span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div>{row.issueCategory.replace(/_/g, ' ')}</div>
                        {row.issueSubcategory ? (
                          <div className="text-xs text-slate-500">
                            {row.issueSubcategory.replace(/_/g, ' ')}
                          </div>
                        ) : null}
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <p className="font-medium text-slate-900 line-clamp-2">
                          {row.description}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.assignedDepartment.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusPillClass(
                            row.currentStatus.name,
                          )}`}
                        >
                          {row.currentStatus.name.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-medium ${pr.className}`}>
                        {pr.label} / {row.urgencyLevel}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {assigneeName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-slate-700">{assigneeName}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {format(new Date(row.dateReported), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {staff && data && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
            <p className="text-sm text-slate-500">
              Showing {skip + 1}-{Math.min(skip + PAGE_SIZE, data.total)} of{' '}
              {data.total} issues
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`min-w-[2rem] rounded-lg px-2 py-1 text-sm font-medium ${
                      page === p
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <span className="px-1 text-slate-400">…</span>
              )}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-2 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} IssueTracker. All rights reserved.</span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            System operational
          </span>
          <a href="#" className="hover:text-slate-800">
            Privacy
          </a>
          <a href="#" className="hover:text-slate-800">
            Terms
          </a>
        </div>
      </footer>
    </div>
  );
}
