import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DepartmentPlaybookDto, IssueRow } from '@/lib/types';

const deptLabel = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

type Props = {
  playbook: DepartmentPlaybookDto;
  issue: Pick<IssueRow, 'assignedDepartment' | 'issueAttributes'>;
  /** When false, show a one-line summary + button to open the full playbook */
  defaultExpanded?: boolean;
};

export function DepartmentHandlingCard({
  playbook,
  issue,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const stamped = issue.issueAttributes?.intake_co_department_suggestions
    ? String(issue.issueAttributes.intake_co_department_suggestions)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const summaryParts = [
    `Primary: ${playbook.primaryDepartmentLabel}`,
    `Routed: ${deptLabel(issue.assignedDepartment)}`,
  ];
  if (stamped.length > 0) {
    summaryParts.push(
      `System co-units (auto): ${stamped.map(deptLabel).join(', ')}`,
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-950">
            Department handling
          </h2>
          <p className="mt-1 text-xs text-violet-800/75">
            Which internal unit owns this ticket — normal routing hint, not a problem flag.
            {stamped.length > 0
              ? ' Co-unit line(s) below were auto-suggested from category rules when the ticket was saved.'
              : ''}
          </p>
          {!expanded && (
            <p className="mt-2 text-sm leading-snug text-violet-900/95">
              {summaryParts.join(' · ')}
            </p>
          )}
          {expanded && (
            <p className="mt-1 text-xs text-violet-900/75">
              Dispatch reference — who owns the ticket and when to loop in other units.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 shadow-sm hover:bg-violet-50"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              Hide playbook <ChevronDown className="h-3.5 w-3.5 rotate-180" aria-hidden />
            </>
          ) : (
            <>
              Show playbook <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-violet-200/80 pt-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-white px-3 py-1 font-medium text-violet-900 shadow-sm ring-1 ring-violet-200">
              Primary: {playbook.primaryDepartmentLabel}
            </span>
            <span className="rounded-full bg-white/90 px-3 py-1 text-violet-800 shadow-sm ring-1 ring-violet-100">
              Routed: {deptLabel(issue.assignedDepartment)}
            </span>
          </div>

          {stamped.length > 0 && (
            <div className="mt-3 rounded-lg border border-violet-100 bg-white/80 px-3 py-2 text-sm text-violet-950">
              <p className="font-medium text-violet-900">System co-department snapshot</p>
              <p className="mt-1 text-violet-800/90">
                {stamped.map(deptLabel).join(' · ')}
              </p>
            </div>
          )}

          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-violet-950/90">
            {playbook.mission}
          </p>

          {playbook.coDepartments.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-900/80">
                When to involve others
              </p>
              <ul className="mt-2 space-y-2 text-sm text-violet-950/90">
                {playbook.coDepartments.map((c) => (
                  <li
                    key={c.departmentKey}
                    className="rounded-lg border border-violet-100 bg-white/70 px-3 py-2"
                  >
                    <span className="font-semibold text-violet-900">{c.label}</span>
                    <span className="text-violet-800/85"> — {c.when}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {playbook.typicalIssues.length > 0 && (
            <details className="mt-4 group">
              <summary className="cursor-pointer text-sm font-medium text-violet-900 hover:underline">
                Typical issue patterns ({playbook.typicalIssues.length})
              </summary>
              <ul className="mt-2 list-inside list-disc space-y-1 pl-1 text-sm text-violet-900/85">
                {playbook.typicalIssues.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </details>
          )}

          {playbook.resolutionActors.length > 0 && (
            <details className="mt-3 group">
              <summary className="cursor-pointer text-sm font-medium text-violet-900 hover:underline">
                Resolution actors
              </summary>
              <ol className="mt-2 list-inside list-decimal space-y-1 pl-1 text-sm text-violet-900/85">
                {playbook.resolutionActors.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
