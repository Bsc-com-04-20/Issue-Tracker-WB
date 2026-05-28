import { getCategoryTechnicianWorkflow } from '@/lib/categoryTechnicianWorkflow';
import type { StatusHistoryStep } from '@/lib/types';

const PIPELINE = [
  'reported',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
] as const;

type PipelineStep = (typeof PIPELINE)[number];
type StepVisual = 'done' | 'current' | 'pending' | 'skipped';

function normalizeStatus(s: string): string {
  return s.trim().toLowerCase();
}

function pipelineStepStates(
  currentStatus: string,
  history: StatusHistoryStep[],
): StepVisual[] {
  const cur = normalizeStatus(currentStatus);
  const curIdx = PIPELINE.indexOf(cur as PipelineStep);
  const visited = new Set<number>();
  for (const h of history) {
    const ix = PIPELINE.indexOf(normalizeStatus(h.status) as PipelineStep);
    if (ix >= 0) visited.add(ix);
  }

  if (curIdx < 0) {
    return PIPELINE.map(() => 'pending' as const);
  }

  return PIPELINE.map((_, i) => {
    if (i < curIdx) {
      return visited.has(i) ? 'done' : 'skipped';
    }
    if (i === curIdx) {
      return 'current';
    }
    return 'pending';
  });
}

function firstHistoryRowForStatus(
  history: StatusHistoryStep[],
  step: string,
): StatusHistoryStep | undefined {
  const t = normalizeStatus(step);
  return history.find((h) => normalizeStatus(h.status) === t);
}

function actorCaption(
  step: PipelineStep,
  row: StatusHistoryStep | undefined,
  reporterName: string,
  createdBy: { name: string } | null | undefined,
  wf: ReturnType<typeof getCategoryTechnicianWorkflow>,
): string {
  if (row?.changedBy) {
    const who = row.changedBy.name;
    const role = row.changedBy.role.replace(/_/g, ' ');
    switch (step) {
      case 'reported':
        return `${who} · ${role}`;
      case 'assigned':
        return wf.lane === 'billing'
          ? `Billing dispatch · ${who} (${role})`
          : `Supervisor / dispatch · ${who} (${role})`;
      case 'in_progress':
      case 'resolved':
        return wf.lane === 'billing'
          ? `Billing staff · ${who}`
          : `Assigned staff · ${who}`;
      case 'closed':
        return `Office closure · ${who} (${role})`;
      default:
        return `${who} (${role})`;
    }
  }
  if (step === 'reported') {
    if (createdBy?.name) return `Staff registration · ${createdBy.name}`;
    if (reporterName.trim()) return `Reporter · ${reporterName.trim()}`;
    return 'Public / channel intake';
  }
  return '—';
}

type IssueProgressStripProps = {
  currentStatus: string;
  history: StatusHistoryStep[];
  reporterName: string;
  createdBy?: { name: string; email: string } | null;
  issueCategory?: string;
};

export function IssueProgressStrip({
  currentStatus,
  history,
  reporterName,
  createdBy,
  issueCategory = 'water_supply',
}: IssueProgressStripProps) {
  const wf = getCategoryTechnicianWorkflow(issueCategory);
  const stepHelp: Record<PipelineStep, string> = {
    reported: 'Complaint received and logged.',
    assigned: wf.progressStripAssigned,
    in_progress: wf.progressStripInProgress,
    resolved: wf.progressStripResolved,
    closed: 'Supervisor or administrator archived the file.',
  };
  const states = pipelineStepStates(currentStatus, history);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Issue progress
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        {wf.progressStripIntro} Steps skipped on this ticket (e.g. duplicate merge)
        are shown in grey.
      </p>
      <ol className="mt-4 flex flex-wrap items-stretch gap-x-1 gap-y-3">
        {PIPELINE.map((step, i) => {
          const visual = states[i];
          const row = firstHistoryRowForStatus(history, step);
          const actor =
            visual === 'skipped'
              ? 'Not part of this ticket’s path'
              : actorCaption(step, row, reporterName, createdBy, wf);
          const when =
            row && (visual === 'done' || visual === 'current')
              ? formatShortDate(row.changedAt)
              : '';

          return (
            <li key={step} className="flex min-w-[5.5rem] max-w-[9.5rem] flex-1 flex-col">
              <div className="flex items-center">
                {i > 0 && (
                  <span className="mx-0.5 shrink-0 text-slate-300" aria-hidden>
                    →
                  </span>
                )}
                <span
                  title={stepHelp[step]}
                  className={`inline-flex min-h-[1.75rem] flex-1 items-center justify-center rounded-full px-2 py-1 text-center text-[11px] font-semibold capitalize leading-tight ${
                    visual === 'current'
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-200'
                      : visual === 'done'
                        ? 'bg-emerald-100 text-emerald-900'
                        : visual === 'skipped'
                          ? 'border border-dashed border-slate-200 bg-slate-50 text-slate-400'
                          : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step.replace(/_/g, ' ')}
                </span>
              </div>
              <span
                className={`mt-1.5 pl-1 text-[10px] leading-snug ${
                  visual === 'skipped' ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {actor}
              </span>
              {when ? (
                <span className="pl-1 text-[10px] text-slate-400">{when}</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
