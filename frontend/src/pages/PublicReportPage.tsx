import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { NewIssuePage } from './NewIssuePage';
import { getRecentComplaints } from '@/lib/publicIssueHistory';

export function PublicReportPage() {
  const recent = useMemo(() => getRecentComplaints(), []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Malawi Water Board
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Report a service issue
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
              Use the guided assistant below — no account required. You can track progress
              anytime with your reference number.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              to="/track"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:border-indigo-200 hover:bg-indigo-50"
            >
              Track complaint
            </Link>
            <Link
              to="/login?switch=1"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Staff sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {recent.length > 0 && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Your recent complaints</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {recent.slice(0, 5).map((item) => (
                <li key={`${item.issueRef}-${item.reporterPhone}`} className="py-2.5 first:pt-0">
                  <Link
                    to={`/track?issueRef=${encodeURIComponent(item.issueRef)}&phone=${encodeURIComponent(item.reporterPhone)}`}
                    className="font-medium text-indigo-700 hover:underline"
                  >
                    {item.issueRef}
                  </Link>
                  <span className="ml-2 text-sm text-slate-500">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <NewIssuePage mode="public" />
      </main>
    </div>
  );
}
