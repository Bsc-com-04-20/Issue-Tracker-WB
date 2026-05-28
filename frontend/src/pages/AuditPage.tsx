import { useCallback, useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, parseJson } from '@/lib/api';
import { canViewAudit } from '@/lib/auth';
import { issueKey } from '@/lib/issueKey';
import type { AuditEntry } from '@/lib/types';

const PAGE = 25;

export function AuditPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  if (!canViewAudit(role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const skip = page * PAGE;
      const res = await apiFetch(`/audit?skip=${skip}&take=${PAGE}`);
      if (!res.ok) throw new Error('Failed to load audit');
      const data = await parseJson<{ items: AuditEntry[]; total: number }>(
        res,
      );
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError('Could not load audit trail.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit trail</h1>
        <p className="mt-1 text-slate-600">
          Governance log: user actions on issues and assignments (newest first).
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No entries.
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDistanceToNow(new Date(a.timestamp), {
                        addSuffix: true,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">
                        {a.user.name}
                      </span>
                      <br />
                      <span className="text-xs text-slate-500">
                        {a.user.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800">
                      {a.actionPerformed}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {a.entityName}{' '}
                      {a.entityName === 'Issue' ? (
                        <Link
                          to={`/app/issues/${issueKey(a.entityId)}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          #{issueKey(a.entityId)}
                        </Link>
                      ) : (
                        <span className="text-slate-500">#{a.entityId}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span>
            {total} events · page {page + 1} / {pages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
