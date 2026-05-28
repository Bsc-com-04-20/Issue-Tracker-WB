import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { apiFetch, parseJson } from '@/lib/api';
import type { IssueRow } from '@/lib/types';

type DuplicateMergeWorkflowProps = {
  /** Issue treated as the duplicate row to close (must still be `reported`). */
  duplicateIssueId: number;
  onMerged?: () => void;
  onCancel?: () => void;
};

export function DuplicateMergeWorkflow({
  duplicateIssueId,
  onMerged,
  onCancel,
}: DuplicateMergeWorkflowProps) {
  const [hints, setHints] = useState<IssueRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [keepIssueId, setKeepIssueId] = useState<number | null>(null);
  const [manualId, setManualId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch(`/issue/${duplicateIssueId}/duplicate-hints`);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Could not load duplicate hints');
      }
      const data = await parseJson<IssueRow[]>(res);
      setHints(Array.isArray(data) ? data : []);
      setKeepIssueId(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Load failed');
      setHints([]);
    } finally {
      setLoading(false);
    }
  }, [duplicateIssueId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitMerge() {
    const fromManual = Number(manualId.trim());
    const keep =
      keepIssueId ??
      (Number.isFinite(fromManual) && fromManual > 0 ? fromManual : null);
    if (keep == null || keep === duplicateIssueId) {
      setErr('Choose a primary issue to keep (different from this one).');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch(`/issue/${duplicateIssueId}/merge-as-duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepIssueId: keep }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { message?: string | string[] }).message?.toString() ||
            'Merge failed',
        );
      }
      onMerged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Merge failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-sm text-slate-700">
      <p className="text-slate-600">
        This <strong>administratively closes</strong>{' '}
        <span className="font-mono font-semibold">ISS-{duplicateIssueId}</span> (it is
        not a technician “field resolved” closure). You choose the <strong>primary</strong>{' '}
        ISS to keep below; that ticket stays open, keeps the master story, and receives a
        short consolidated note from this registration. The duplicate’s reporter is told
        to use the primary reference. Only tickets still in <strong>reported</strong>{' '}
        can be merged here.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading possible duplicates…
        </div>
      ) : (
        <>
          {hints && hints.length > 0 ? (
            <div>
              <p className="mb-2 font-medium text-slate-800">Same phone or nearby</p>
              <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                {hints.map((h) => (
                  <li key={h.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1 hover:bg-white">
                      <input
                        type="radio"
                        name="keepPrimary"
                        className="mt-1"
                        checked={keepIssueId === h.id}
                        onChange={() => {
                          setKeepIssueId(h.id);
                          setManualId('');
                        }}
                      />
                      <span>
                        <span className="font-mono font-semibold">ISS-{h.id}</span>
                        {' · '}
                        {h.issueCategory.replace(/_/g, ' ')}
                        {' · '}
                        <span className="text-slate-600">
                          {(h.description ?? '').slice(0, 72)}
                          {(h.description ?? '').length > 72 ? '…' : ''}
                        </span>
                        <Link
                          to={`/app/issues/${h.id}`}
                          className="ml-2 text-indigo-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open
                        </Link>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
              No automatic matches in the last 30 days. Enter the primary issue id
              manually if you already verified the duplicate.
            </p>
          )}

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Or primary issue id (ISS number)
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 42"
              value={manualId}
              onChange={(e) => {
                setManualId(e.target.value);
                setKeepIssueId(null);
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none ring-indigo-500 focus:border-indigo-300 focus:ring-2"
            />
          </div>
        </>
      )}

      {err && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
          {err}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submitMerge()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Merging…' : 'Merge into primary & close duplicate'}
        </button>
        {onCancel && (
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => void load()}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Refresh hints
        </button>
      </div>
    </div>
  );
}
