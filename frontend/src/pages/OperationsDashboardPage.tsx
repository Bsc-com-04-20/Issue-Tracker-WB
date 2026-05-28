import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ExternalLink, GitMerge, Plus, RefreshCw } from 'lucide-react';
import { apiFetch, parseJson } from '@/lib/api';
import { issueHasSupervisorRequest, isCustomerOperationsRole } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { issueKey } from '@/lib/issueKey';
import {
  hasIntakeCoDepartmentHints,
  intakeDuplicateCandidateCount,
} from '@/lib/issueIntelligence';
import { DuplicateMergeWorkflow } from '@/components/intake/DuplicateMergeWorkflow';
import type { IssuesPageResponse, OperationalPulse } from '@/lib/types';

type OpsTab = 'intake' | 'verification' | 'escalation';

export function OperationsDashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  if (!isCustomerOperationsRole(role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab: OpsTab =
    tabFromUrl === 'verification' || tabFromUrl === 'escalation' || tabFromUrl === 'intake'
      ? tabFromUrl
      : 'intake';
  const [tab, setTab] = useState<OpsTab>(initialTab);
  const [items, setItems] = useState<IssuesPageResponse | null>(null);
  const [mergeForId, setMergeForId] = useState<number | null>(null);
  const [pulse, setPulse] = useState<OperationalPulse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'verification' || t === 'escalation' || t === 'intake') {
      setTab(t);
    }
  }, [searchParams]);

  const setTabAndUrl = useCallback(
    (next: OpsTab) => {
      setTab(next);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', next);
      if (next !== 'intake') {
        nextParams.delete('dup');
      }
      setSearchParams(nextParams, { replace: true });
    },
    [setSearchParams, searchParams],
  );

  const dupIntakeOnly = searchParams.get('dup') === '1';
  const applyDupServerFilter = dupIntakeOnly && tab === 'intake';

  const load = useCallback(async () => {
    const sp = new URLSearchParams();
    sp.set('skip', '0');
    sp.set('take', '60');
    if (applyDupServerFilter) {
      sp.set('status', 'reported');
      sp.set('needsDuplicateReview', 'true');
    }
    const res = await apiFetch(`/issue?${sp.toString()}`);
    if (res.ok) setItems(await parseJson<IssuesPageResponse>(res));
  }, [applyDupServerFilter]);

  const loadPulse = useCallback(async () => {
    const res = await apiFetch('/report/operational-pulse');
    if (res.ok) setPulse(await parseJson<OperationalPulse>(res));
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(), loadPulse()]);
    } finally {
      setRefreshing(false);
    }
  }, [load, loadPulse]);

  useEffect(() => {
    void load();
    void loadPulse();
  }, [load, loadPulse]);

  const pendingReview = useMemo(
    () => (items?.items ?? []).filter((x) => x.currentStatus.name === 'reported'),
    [items],
  );
  const verifiedRecords = useMemo(
    () =>
      (items?.items ?? []).filter(
        (x) =>
          x.currentStatus.name === 'reported' &&
          Boolean(x.reporterPhone?.trim()) &&
          Boolean(x.location),
      ),
    [items],
  );
  const urgentIntake = useMemo(
    () =>
      (items?.items ?? []).filter(
        (x) => x.urgencyLevel === 'urgent' || x.urgencyLevel === 'critical',
      ),
    [items],
  );
  const csSupervisorQueue = useMemo(
    () =>
      (items?.items ?? []).filter(
        (x) =>
          x.currentStatus.name === 'reported' &&
          issueHasSupervisorRequest(x.issueAttributes),
      ),
    [items],
  );

  const list =
    tab === 'intake'
      ? pendingReview
      : tab === 'verification'
        ? verifiedRecords
        : urgentIntake;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations dashboard</h1>
          <p className="mt-1 text-slate-600">
            Intake, verification, duplicate merge, first-line dispatch, and supervisor
            escalation. Open any row for full detail, attachments, and technician
            assignment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void refreshAll()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/app/issues/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Log new issue
          </Link>
          <Link
            to="/app/issues?status=reported&duplicateReview=1"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100"
          >
            Duplicate review queue
          </Link>
          <Link
            to="/app/issues?status=reported"
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100"
          >
            Full intake queue
          </Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card title="Pending review" value={pendingReview.length} />
        <Card title="Verified (phone + location)" value={verifiedRecords.length} />
        <Card title="Urgent / critical" value={urgentIntake.length} />
        <Card
          title="SLA overdue (open)"
          value={pulse?.openIssuesPastResolutionDueNotStamped ?? '—'}
        />
        <Card title="SLA breached (open)" value={pulse?.openIssuesSlaBreached ?? '—'} />
        <Card title="Resolved today" value={pulse?.resolvedTodayCount ?? '—'} />
      </div>
      {csSupervisorQueue.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
          <p className="font-semibold">
            {csSupervisorQueue.length} ticket
            {csSupervisorQueue.length === 1 ? '' : 's'} flagged for supervisor
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {csSupervisorQueue.slice(0, 8).map((i) => (
              <li key={i.id}>
                <Link
                  to={`/app/issues/${i.id}`}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-mono text-xs font-semibold text-rose-900 shadow-sm hover:bg-rose-100"
                >
                  {issueKey(i.id)}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <TabBtn
          active={tab === 'intake'}
          onClick={() => setTabAndUrl('intake')}
          label="Intake queue"
        />
        {tab === 'intake' && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
            <input
              type="checkbox"
              className="rounded border-amber-400 text-amber-700 focus:ring-amber-500"
              checked={dupIntakeOnly}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams);
                next.set('tab', 'intake');
                if (e.target.checked) next.set('dup', '1');
                else next.delete('dup');
                setSearchParams(next, { replace: true });
              }}
            />
            Duplicate review (server)
          </label>
        )}
        <TabBtn
          active={tab === 'verification'}
          onClick={() => setTabAndUrl('verification')}
          label="Verification"
        />
        <TabBtn
          active={tab === 'escalation'}
          onClick={() => setTabAndUrl('escalation')}
          label="Escalation"
        />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">
          {tab === 'intake'
            ? dupIntakeOnly
              ? 'Duplicate review — reported tickets the system scored as likely related (newest first)'
              : 'Pending review — newest first'
            : tab === 'verification'
              ? 'Reported issues with phone and map location on file'
              : 'Urgent and critical (all open statuses in sample)'}
        </p>
        <ul className="mt-3 divide-y divide-slate-100">
          {list.slice(0, 25).map((i) => (
            <li
              key={i.id}
              className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <Link
                  to={`/app/issues/${i.id}`}
                  className="font-mono text-sm font-semibold text-indigo-600 hover:underline"
                >
                  {issueKey(i.id)}
                </Link>
                {intakeDuplicateCandidateCount(i.issueAttributes) > 0 ? (
                  <span className="ml-2 inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
                    Dup? {intakeDuplicateCandidateCount(i.issueAttributes)}
                  </span>
                ) : null}
                {hasIntakeCoDepartmentHints(i.issueAttributes) ? (
                  <span className="ml-2 inline-flex rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-950">
                    Co-units
                  </span>
                ) : null}
                <span className="text-slate-400"> · </span>
                <span className="capitalize text-slate-700">
                  {i.issueCategory.replace(/_/g, ' ')}
                </span>
                {issueHasSupervisorRequest(i.issueAttributes) && (
                  <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-800">
                    Supervisor
                  </span>
                )}
                <p className="mt-1 truncate text-slate-600">{i.description}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {i.currentStatus.name === 'reported' && (
                  <button
                    type="button"
                    onClick={() => setMergeForId(i.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <GitMerge className="h-3.5 w-3.5" />
                    Merge dup
                  </button>
                )}
                <Link
                  to={`/app/issues/${i.id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Open
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>
          ))}
          {list.length === 0 && (
            <li className="py-6 text-center text-sm text-slate-500">No records in this queue.</li>
          )}
        </ul>
      </div>

      {mergeForId != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="merge-dup-title"
          onClick={() => setMergeForId(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="merge-dup-title" className="text-lg font-bold text-slate-900">
              Merge duplicate
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Closing <span className="font-mono font-semibold">{issueKey(mergeForId)}</span>
            </p>
            <div className="mt-4">
              <DuplicateMergeWorkflow
                duplicateIssueId={mergeForId}
                onCancel={() => setMergeForId(null)}
                onMerged={() => {
                  setMergeForId(null);
                  void refreshAll();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
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
