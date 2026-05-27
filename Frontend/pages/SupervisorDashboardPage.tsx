import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ExternalLink, Info } from 'lucide-react';
import { apiFetch, parseJson } from '@/lib/api';
import {
  canViewAudit,
  canRunSlaBreachScan,
  canViewSlaPolicy,
  issueHasSupervisorRequest,
  isSupervisorOrManagerRole,
  supervisorRoleSummary,
} from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { issueKey } from '@/lib/issueKey';
import type {
  DepartmentSlaBySubcategory,
  IssuesPageResponse,
  IssueRow,
  TopFailingSubcategories,
} from '@/lib/types';

const ISSUE_PAGE_SIZE = 100;

type SupTab = 'dispatch' | 'sla' | 'verification';

export function SupervisorDashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  if (!isSupervisorOrManagerRole(role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const [tab, setTab] = useState<SupTab>('dispatch');
  const [reportedPage, setReportedPage] = useState<IssuesPageResponse | null>(null);
  const [resolvedPage, setResolvedPage] = useState<IssuesPageResponse | null>(null);
  const [top, setTop] = useState<TopFailingSubcategories | null>(null);
  const [sla, setSla] = useState<DepartmentSlaBySubcategory | null>(null);
  const [slaJobMsg, setSlaJobMsg] = useState<string | null>(null);
  const [slaJobBusy, setSlaJobBusy] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyText, setPolicyText] = useState<string | null>(null);
  const [policyErr, setPolicyErr] = useState<string | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const reportedQ = `/issue?skip=0&take=${ISSUE_PAGE_SIZE}&status=reported`;
      const resolvedQ = `/issue?skip=0&take=${ISSUE_PAGE_SIZE}&status=resolved`;
      const [rep, res, t, s] = await Promise.all([
        apiFetch(reportedQ),
        apiFetch(resolvedQ),
        apiFetch('/report/top-failing-subcategories?limit=5'),
        apiFetch('/report/department-sla-by-subcategory?slaHours=72'),
      ]);
      if (rep.ok) setReportedPage(await parseJson<IssuesPageResponse>(rep));
      if (res.ok) setResolvedPage(await parseJson<IssuesPageResponse>(res));
      if (t.ok) setTop(await parseJson<TopFailingSubcategories>(t));
      if (s.ok) setSla(await parseJson<DepartmentSlaBySubcategory>(s));
    })();
  }, []);

  const dispatchQueue = reportedPage?.items ?? [];
  const reportedTotal = reportedPage?.total ?? 0;

  const csSupervisorQueue = useMemo(
    () => dispatchQueue.filter((x) => issueHasSupervisorRequest(x.issueAttributes)),
    [dispatchQueue],
  );

  const verifyQueue = resolvedPage?.items ?? [];
  const resolvedTotal = resolvedPage?.total ?? 0;

  const showAudit = canViewAudit(role);
  const showSlaTools = canRunSlaBreachScan(role);
  const showPolicy = canViewSlaPolicy(role);

  async function runSlaBreaches() {
    if (!showSlaTools) return;
    setSlaJobBusy(true);
    setSlaJobMsg(null);
    try {
      const res = await apiFetch('/issue/admin/process-sla-breaches', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (j as { message?: string | string[] }).message?.toString() || 'Request failed',
        );
      }
      const body = j as { scanned?: number; newlyBreached?: number };
      setSlaJobMsg(
        `Scanned ${body.scanned ?? 0} issues · ${body.newlyBreached ?? 0} newly marked breached.`,
      );
    } catch (e) {
      setSlaJobMsg(e instanceof Error ? e.message : 'SLA job failed');
    } finally {
      setSlaJobBusy(false);
    }
  }

  async function loadSlaPolicy() {
    if (!showPolicy) return;
    setPolicyOpen(true);
    setPolicyErr(null);
    setPolicyText(null);
    setPolicyLoading(true);
    try {
      const res = await apiFetch('/issue/admin/sla-policy');
      if (!res.ok) {
        setPolicyErr('Could not load SLA policy.');
        return;
      }
      const raw: unknown = await res.json();
      setPolicyText(JSON.stringify(raw, null, 2));
    } finally {
      setPolicyLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Supervisor workspace</h1>
        <p className="mt-1 text-slate-600">
          Dispatch, escalations from intake, SLA oversight, closure verification, and
          analytics — across all departments.
        </p>
      </div>

      <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 shadow-sm">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
          <div className="min-w-0 space-y-2 text-sm text-indigo-950">
            <p className="font-semibold text-indigo-900">What a supervisor does here</p>
            <p className="leading-relaxed text-indigo-950/90">{supervisorRoleSummary()}</p>
            <p className="text-xs text-indigo-900/80">
              Intake and unit officers use <strong>Request supervisor</strong> on the
              ticket; you respond here, on the issue record (assign, merge duplicate if
              needed, mark handled), and in reports.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/app/issues?status=reported"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          All reported (list)
        </Link>
        <Link
          to="/app/issues?status=assigned"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Assigned
        </Link>
        <Link
          to="/app/issues?status=in_progress"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          In progress
        </Link>
        <Link
          to="/app/issues?status=resolved"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Resolved (closure queue)
        </Link>
        <Link
          to="/app/reports"
          className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          Reports & analytics
        </Link>
        {showAudit && (
          <Link
            to="/app/audit"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Audit log
          </Link>
        )}
        {showSlaTools && (
          <button
            type="button"
            disabled={slaJobBusy}
            onClick={() => void runSlaBreaches()}
            className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100 disabled:opacity-50"
          >
            {slaJobBusy ? 'Running SLA job…' : 'Run SLA breach scan'}
          </button>
        )}
        {showPolicy && (
          <button
            type="button"
            onClick={() => void loadSlaPolicy()}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            View SLA policy (read-only)
          </button>
        )}
      </div>

      {slaJobMsg ? (
        <p className="text-sm text-slate-600">{slaJobMsg}</p>
      ) : null}

      {policyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="font-semibold text-slate-900">SLA policy (merged JSON)</p>
              <button
                type="button"
                onClick={() => setPolicyOpen(false)}
                className="rounded-lg px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <div className="max-h-[calc(85vh-3.5rem)] overflow-auto p-4">
              {policyLoading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : policyErr ? (
                <p className="text-sm text-red-700">{policyErr}</p>
              ) : (
                <pre className="whitespace-pre-wrap break-words text-xs text-slate-800">
                  {policyText ?? '—'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Pending dispatch (reported)" value={reportedTotal} />
        <Metric
          title="Intake → supervisor"
          value={csSupervisorQueue.length}
          hint={
            reportedTotal > ISSUE_PAGE_SIZE
              ? `Escalations counted in latest ${ISSUE_PAGE_SIZE} reported`
              : 'Flagged in current reported queue'
          }
        />
        <Metric
          title="Top failing type"
          value={top?.items?.[0]?.subcategory?.replace(/_/g, ' ') ?? '—'}
        />
        <Metric title="Awaiting closure review (resolved)" value={resolvedTotal} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Tab active={tab === 'dispatch'} onClick={() => setTab('dispatch')} label="Dispatch board" />
        <Tab active={tab === 'sla'} onClick={() => setTab('sla')} label="SLA control" />
        <Tab
          active={tab === 'verification'}
          onClick={() => setTab('verification')}
          label="Verification"
        />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {tab === 'dispatch' && (
          <div className="space-y-8">
            {csSupervisorQueue.length > 0 && (
              <section>
                <p className="text-sm font-semibold text-rose-900">
                  Intake flagged for supervisor ({csSupervisorQueue.length})
                </p>
                <p className="mt-1 text-xs text-rose-800/90">
                  Intake or a department officer used “Request supervisor” on the record.
                  Open the ticket to read the note and decide next steps.
                </p>
                <ul className="mt-3 divide-y divide-rose-100 rounded-lg border border-rose-200 bg-rose-50/50">
                  {csSupervisorQueue.slice(0, 12).map((i) => (
                    <DispatchRow key={i.id} issue={i} highlight />
                  ))}
                </ul>
              </section>
            )}
            <section>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  Reported issues (newest {Math.min(dispatchQueue.length, ISSUE_PAGE_SIZE)} shown)
                </p>
                {reportedTotal > dispatchQueue.length && (
                  <Link
                    to="/app/issues?status=reported"
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Open full list ({reportedTotal} total)
                  </Link>
                )}
              </div>
              <ul className="mt-3 divide-y divide-slate-100">
                {dispatchQueue.slice(0, 20).map((i) => (
                  <DispatchRow key={i.id} issue={i} highlight={false} />
                ))}
              </ul>
              {dispatchQueue.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">No reported issues right now.</p>
              )}
            </section>
          </div>
        )}
        {tab === 'verification' && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                Resolved — review before close (newest{' '}
                {Math.min(verifyQueue.length, ISSUE_PAGE_SIZE)} shown)
              </p>
              {resolvedTotal > verifyQueue.length && (
                <Link
                  to="/app/issues?status=resolved"
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Open full list ({resolvedTotal} total)
                </Link>
              )}
            </div>
            <List
              title=""
              rows={[]}
              issues={verifyQueue}
            />
          </div>
        )}
        {tab === 'sla' && (
          <List
            title={`Department SLA by subcategory (${sla?.slaHours ?? 72}h target)`}
            rows={(sla?.items ?? [])
              .slice(0, 10)
              .map(
                (r) =>
                  `${r.department.replace(/_/g, ' ')} · ${r.subcategory.replace(/_/g, ' ')} · ${r.slaRatePercent}%`,
              )}
          />
        )}
      </div>
    </div>
  );
}

function DispatchRow({ issue, highlight }: { issue: IssueRow; highlight: boolean }) {
  const note = issue.issueAttributes?.cs_supervisor_note;
  return (
    <li
      className={`flex flex-col gap-2 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
        highlight ? 'bg-rose-50/30' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <Link
          to={`/app/issues/${issue.id}`}
          className="inline-flex items-center gap-1 font-mono font-semibold text-indigo-600 hover:underline"
        >
          {issueKey(issue.id)}
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <span className="text-slate-400"> · </span>
        <span className="text-slate-700">
          {(issue.issueSubcategory ?? issue.issueCategory).replace(/_/g, ' ')}
        </span>
        {note ? (
          <p className="mt-1 line-clamp-2 text-slate-600">{String(note)}</p>
        ) : (
          <p className="mt-1 truncate text-slate-600">{issue.description}</p>
        )}
      </div>
    </li>
  );
}

function Metric({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
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

function List({
  title,
  rows,
  issues,
}: {
  title: string;
  rows: string[];
  issues?: IssueRow[];
}) {
  return (
    <div>
      {title ? <p className="text-sm font-semibold text-slate-800">{title}</p> : null}
      <ul className={`${title ? 'mt-3' : 'mt-0'} space-y-2`}>
        {issues && issues.length > 0
          ? issues.slice(0, 10).map((i) => (
              <li key={i.id}>
                <Link
                  to={`/app/issues/${i.id}`}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-indigo-700 hover:bg-slate-100"
                >
                  <span className="font-mono font-semibold">{issueKey(i.id)}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-700">
                    {i.description.slice(0, 90)}
                    {i.description.length > 90 ? '…' : ''}
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))
          : rows.slice(0, 10).map((r, idx) => (
              <li key={`${r}-${idx}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {r}
              </li>
            ))}
        {rows.length === 0 && !issues?.length && (
          <li className="text-sm text-slate-500">No items currently.</li>
        )}
      </ul>
    </div>
  );
}
