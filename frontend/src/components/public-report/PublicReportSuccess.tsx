import { Link } from 'react-router-dom';
import { CircleCheck, UserRound } from 'lucide-react';
import type { PublicAssignmentSummary } from '@/lib/types';
import { issueKey } from '@/lib/issueKey';

type Props = {
  issueId: number;
  displayRef: string;
  trackPhone: string;
  assignment: PublicAssignmentSummary | null;
  priorityLabel: string;
};

export function PublicReportSuccess({
  issueId,
  displayRef,
  trackPhone,
  assignment,
  priorityLabel,
}: Props) {
  const createdRef = issueKey(issueId);
  const assigned = assignment?.assigned === true;

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-center text-lg font-semibold text-slate-900">
        Your issue has been reported
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-800">
        <p>
          <span className="font-semibold text-slate-900">Issue ID:</span> {displayRef}
        </p>
        <p className="mt-1">
          <span className="font-semibold text-slate-900">Priority:</span> {priorityLabel}
        </p>
        <p className="mt-1">
          <span className="font-semibold text-slate-900">Status:</span>{' '}
          {assigned ? 'Assigned' : 'Pending Assignment'}
        </p>
      </div>

      {assigned && assignment && (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-left text-sm text-indigo-950">
          <p className="flex items-center gap-2 font-semibold text-indigo-900">
            <UserRound className="h-4 w-4" aria-hidden />
            Assignment update
          </p>
          <p className="mt-2">
            Your issue <span className="font-mono font-semibold">{displayRef}</span> has been
            assigned to <span className="font-semibold">{assignment.assigneeName}</span>.
          </p>
          <p className="mt-1 text-xs text-indigo-800/90">
            {assignment.departmentLabel} · Estimated response:{' '}
            {assignment.estimatedResponseHours} hours
          </p>
          {assignment.assigneePhone && (
            <p className="mt-1 text-xs text-indigo-800/90">
              Field contact: {assignment.assigneePhone}
            </p>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-800">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden />
            You will receive SMS updates when work starts and completes.
          </p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-4">
        <Link
          to={`/track?issueRef=${encodeURIComponent(createdRef)}&phone=${encodeURIComponent(trackPhone)}`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          Track this complaint
        </Link>
        <Link
          to="/report"
          className="text-sm font-medium text-slate-600 hover:underline"
        >
          Report another issue
        </Link>
      </div>
    </div>
  );
}
