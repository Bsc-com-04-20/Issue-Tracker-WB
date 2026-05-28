import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { NewIssuePage } from './NewIssuePage';
import { getRecentComplaints } from '@/lib/publicIssueHistory';

export function PublicReportPage() {
  const recent = useMemo(() => getRecentComplaints(), []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto mb-4 flex w-full max-w-7xl items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Malawi Water Board Public Reporting
          </h1>
          <p className="text-sm text-slate-600">
            Report service issues without signing in.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/track"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Track complaint
          </Link>
          <Link
            to="/login?switch=1"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Staff sign in
          </Link>
        </div>
      </div>
      {recent.length > 0 && (
        <div className="mx-auto mb-4 w-full max-w-7xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your recent complaints
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {recent.slice(0, 5).map((item) => (
              <li key={`${item.issueRef}-${item.reporterPhone}`}>
                <Link
                  to={`/track?issueRef=${encodeURIComponent(item.issueRef)}&phone=${encodeURIComponent(item.reporterPhone)}`}
                  className="text-indigo-700 hover:underline"
                >
                  {item.issueRef}
                </Link>{' '}
                <span className="text-slate-500">
                  ({formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <NewIssuePage mode="public" />
    </div>
  );
}
