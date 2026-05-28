import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  ListTodo,
  TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { apiFetch, parseJson } from '@/lib/api';
import {
  canAccessReports,
  canListAllIssues,
  canViewAudit,
  isCustomerOperationsRole,
  isSupervisorOrManagerRole,
  isTechnician,
} from '@/lib/auth';
import { issueKey } from '@/lib/issueKey';
import { priorityUi, statusPillClass } from '@/lib/statusUi';
import type {
  AssignmentRow,
  AuditEntry,
  IssueRow,
  IssuesPageResponse,
  ReportSummary,
  ResolutionStats,
} from '@/lib/types';

function countOpenFromSummary(s: ReportSummary | null): number {
  if (!s) return 0;
  const closed = s.byStatus.closed ?? 0;
  const resolved = s.byStatus.resolved ?? 0;
  return Math.max(0, s.totals.issues - closed - resolved);
}

function countHighSeverity(s: ReportSummary | null): number {
  if (!s) return 0;
  let n = 0;
  for (const [k, v] of Object.entries(s.bySeverity)) {
    const low = k.toLowerCase();
    if (low === 'high' || low === 'critical' || low === 'urgent') n += v;
  }
  return n;
}

function countHighSeverityFromRows(rows: IssueRow[]): number {
  return rows.filter((r) => {
    const low = r.severityLevel.toLowerCase();
    return low === 'high' || low === 'critical' || low === 'urgent';
  }).length;
}

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

export function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  if (isSupervisorOrManagerRole(role)) {
    return <Navigate to="/app/dashboard/supervisor" replace />;
  }
  const staffReports = canAccessReports(role);
  const staffList = canListAllIssues(role);
  const tech = isTechnician(role);
  const customerOps = isCustomerOperationsRole(role);

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [resWeek, setResWeek] = useState<ResolutionStats | null>(null);
  const [resAll, setResAll] = useState<ResolutionStats | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [staffIssues, setStaffIssues] = useState<IssueRow[]>([]);
  const [officerTotal, setOfficerTotal] = useState<number | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        if (staffReports) {
          const [sumRes, rwRes, raRes, audRes, issRes] = await Promise.all([
            apiFetch('/report/summary'),
            apiFetch(
              `/report/resolution-stats?from=${encodeURIComponent(
                new Date(Date.now() - 7 * 864e5).toISOString(),
              )}`,
            ),
            apiFetch('/report/resolution-stats'),
            apiFetch('/audit?skip=0&take=8'),
            apiFetch('/issue?skip=0&take=8'),
          ]);
          if (cancelled) return;
          if (sumRes.ok) setSummary(await parseJson<ReportSummary>(sumRes));
          if (rwRes.ok) setResWeek(await parseJson<ResolutionStats>(rwRes));
          if (raRes.ok) setResAll(await parseJson<ResolutionStats>(raRes));
          if (audRes.ok) {
            const p = await parseJson<{ items: AuditEntry[] }>(audRes);
            setAudit(p.items ?? []);
          }
          if (issRes.ok) {
            const p = await parseJson<IssuesPageResponse>(issRes);
            setStaffIssues(p.items ?? []);
          } else {
            setStaffIssues([]);
          }
        } else if (staffList) {
          const issRes = await apiFetch('/issue?skip=0&take=50');
          if (cancelled) return;
          if (issRes.ok) {
            const p = await parseJson<IssuesPageResponse>(issRes);
            setStaffIssues(p.items ?? []);
            setOfficerTotal(p.total);
            setSummary(null);
            setResWeek(null);
            setResAll(null);
            setAudit([]);
          }
        } else if (tech) {
          const mine = await apiFetch('/assignment/mine');
          if (cancelled) return;
          if (mine.ok) {
            const rows = await parseJson<AssignmentRow[]>(mine);
            setAssignments(Array.isArray(rows) ? rows : []);
          }
        }
      } catch {
        if (!cancelled) setErr('Could not load dashboard data.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffReports, staffList, tech]);

  const officerOpenInSample = staffList && !staffReports
    ? staffIssues.filter(
        (i) =>
          !['closed', 'resolved'].includes(
            i.currentStatus.name.toLowerCase(),
          ),
      ).length
    : null;
  const officerHighInSample =
    staffList && !staffReports ? countHighSeverityFromRows(staffIssues) : null;

  const techActiveCount = tech
    ? dedupeAssignmentsByIssue(assignments).filter(
        (a) =>
          !['closed', 'resolved'].includes(
            a.issue.currentStatus.name.toLowerCase(),
          ),
      ).length
    : 0;

  const openCount = tech
    ? techActiveCount
    : staffReports
      ? countOpenFromSummary(summary)
      : officerOpenInSample ?? 0;
  const criticalCount = staffReports
    ? countHighSeverity(summary)
    : officerHighInSample ?? 0;
  const resolvedWeek = resWeek?.resolvedCount ?? 0;
  const avgDays =
    resAll?.avgHoursReportedToResolved != null
      ? (resAll.avgHoursReportedToResolved / 24).toFixed(1)
      : '—';

  const showOfficerSampleNote = staffList && !staffReports;

  const tableRows: IssueRow[] = tech
    ? dedupeAssignmentsByIssue(assignments).map((a) => a.issue)
    : staffIssues;

  const tableTitle = tech
    ? 'Assigned to me'
    : customerOps
      ? 'Incoming complaints'
      : 'Recent issues';

  const dashboardTitle = tech
    ? 'Technician field dashboard'
    : customerOps
      ? 'Customer operations dashboard'
      : 'Dashboard overview';

  const dashboardSubtitle = tech
    ? 'Track assigned tasks, update status, and close field loops quickly.'
    : customerOps
      ? 'Receive, verify, classify, and escalate incoming customer complaints.'
      : "Welcome back. Here's what's happening in your workspace today.";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            {dashboardTitle}
          </h1>
          <p className="mt-1 text-slate-600">
            {dashboardSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={canViewAudit(role) ? '/app/audit' : '/app/issues'}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <History className="h-4 w-4" />
            {canViewAudit(role) ? 'Audit log' : 'Issue list'}
          </Link>
          {canListAllIssues(role) && (
            <Link
              to="/app/issues"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <ListTodo className="h-4 w-4" />
              View all issues
            </Link>
          )}
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {err}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total open issues"
          value={openCount}
          trend={
            showOfficerSampleNote
              ? officerTotal != null
                ? `${officerTotal} issues total in system · sample: 50 newest`
                : 'Among 50 newest in backlog'
              : '+12% vs last week'
          }
          trendUp={showOfficerSampleNote ? undefined : true}
          icon={TrendingUp}
        />
        <StatCard
          title="Critical / high severity"
          value={criticalCount}
          trend={
            showOfficerSampleNote
              ? 'In latest 50 issues'
              : '2% vs last week'
          }
          trendUp={showOfficerSampleNote ? undefined : false}
          icon={AlertTriangle}
        />
        <StatCard
          title="Resolved (7 days)"
          value={staffReports ? resolvedWeek : '—'}
          trend={
            staffReports ? '+18% vs last week' : 'Supervisor / admin reports'
          }
          trendUp={staffReports ? true : undefined}
          icon={CheckCircle2}
        />
        <StatCard
          title="Avg resolution"
          value={
            staffReports && avgDays !== '—' ? `${avgDays}d` : '—'
          }
          trend={
            staffReports ? '+0.5d vs last week' : 'Resolution analytics'
          }
          trendUp={staffReports ? true : undefined}
          icon={Clock}
        />
      </div>

      {(customerOps || tech) && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {customerOps ? 'Customer operations focus' : 'Technician focus'}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
            {customerOps && (
              <>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-slate-500">Intake quality</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    Validate reporter details and geo-tag all new complaints
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-slate-500">Duplicate control</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    Merge repeated complaints before escalation
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-slate-500">Escalation</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    Flag urgent incidents for supervisor prioritization
                  </p>
                </div>
              </>
            )}
            {tech && (
              <>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-slate-500">Field execution</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    Move assigned work into progress as you arrive on site
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-slate-500">Evidence</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    Upload photos and notes for each repair action
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-slate-500">Completion</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    Record resolution details accurately for supervisor review
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {tableTitle}
            </h2>
            <Link
              to="/app/issues"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Go to issue list
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Key</th>
                  <th className="px-5 py-3">Summary</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-slate-500"
                    >
                      No issues to show.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row) => {
                    const pr = priorityUi(row.severityLevel);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-3">
                          <Link
                            to={`/app/issues/${issueKey(row.id)}`}
                            className="font-medium text-indigo-600 hover:underline"
                          >
                            {issueKey(row.id)}
                          </Link>
                        </td>
                        <td className="max-w-xs px-5 py-3">
                          <p className="font-medium text-slate-900 line-clamp-2">
                            {row.description}
                          </p>
                          <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">
                            {row.reportChannel}
                          </span>
                        </td>
                        <td className={`px-5 py-3 font-medium ${pr.className}`}>
                          {pr.label}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPillClass(
                              row.currentStatus.name,
                            )}`}
                          >
                            {row.currentStatus.name.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            to={`/app/issues/${issueKey(row.id)}`}
                            className="text-indigo-600 hover:underline"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent activity
            </h2>
          </div>
          <ul className="divide-y divide-slate-100 px-3 py-2">
            {staffReports && audit.length > 0 ? (
              audit.map((a) => (
                <li key={a.id} className="flex gap-3 px-2 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {a.user.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">{a.user.name}</span>{' '}
                      <span className="text-slate-600">{a.actionPerformed}</span>{' '}
                      {a.entityName === 'Issue' ? (
                        <Link
                          to={`/app/issues/${issueKey(a.entityId)}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          #{issueKey(a.entityId)}
                        </Link>
                      ) : (
                        <span className="text-slate-600">
                          {a.entityName} #{a.entityId}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDistanceToNow(new Date(a.timestamp), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-2 py-6 text-center text-sm text-slate-500">
                {staffReports
                  ? 'No recent audit entries.'
                  : 'Activity feed is available to supervisors and admins.'}
              </li>
            )}
          </ul>
          {staffReports && (
            <div className="border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                + Load more activity
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
