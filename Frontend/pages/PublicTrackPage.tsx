import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { apiFetch, parseJson } from '@/lib/api';
import type { PublicTrackResponse } from '@/lib/types';
import { getRecentComplaints } from '@/lib/publicIssueHistory';

function humanize(text: string) {
  return text.replace(/_/g, ' ');
}

export function PublicTrackPage() {
  const [searchParams] = useSearchParams();
  const [issueRef, setIssueRef] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicTrackResponse | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const recent = useMemo(() => getRecentComplaints(), []);

  useEffect(() => {
    const ref = searchParams.get('issueRef');
    const ph = searchParams.get('phone');
    if (ref) setIssueRef(ref);
    if (ph) setPhone(ph);
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        issueRef: issueRef.trim(),
        phone: phone.trim(),
      });
      const res = await apiFetch(`/issue/public-track?${query.toString()}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) {
          setError('No matching complaint found for this reference and phone.');
        } else {
          setError('Unable to track complaint right now. Please try again.');
        }
        setData(null);
        return;
      }
      setData(await parseJson<PublicTrackResponse>(res));
      setFeedbackMsg(null);
      setFeedbackComment('');
    } catch {
      setError('Network error while loading complaint tracking.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function submitResolutionFeedback(outcome: 'confirmed' | 'disputed') {
    if (!data) return;
    setFeedbackBusy(true);
    setFeedbackMsg(null);
    try {
      const res = await apiFetch('/issue/public/resolution-feedback', {
        method: 'POST',
        body: JSON.stringify({
          issueRef: data.issue.reference,
          phone: phone.trim(),
          outcome,
          comment: feedbackComment.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setFeedbackMsg(
          (j as { message?: string | string[] }).message?.toString() ||
            'Could not save your feedback.',
        );
        return;
      }
      setFeedbackMsg(
        outcome === 'confirmed'
          ? 'Thank you — your issue will be closed and service metrics updated.'
          : 'Thank you — your issue has been reopened and escalated to a supervisor with increased severity.',
      );
      setData((prev) =>
        prev
          ? {
              ...prev,
              issue: {
                ...prev.issue,
                customerResolutionFeedback: outcome,
                customerResolutionComment: feedbackComment.trim() || null,
                customerResolutionAt: new Date().toISOString(),
              },
            }
          : prev,
      );
    } catch {
      setFeedbackMsg('Network error while sending feedback.');
    } finally {
      setFeedbackBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Track Complaint</h1>
            <p className="text-sm text-slate-600">
              Enter your issue reference and phone number to view status timeline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/report"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              Report new issue
            </Link>
            <Link
              to="/login?switch=1"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Staff sign in
            </Link>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Issue reference
              </label>
              <input
                value={issueRef}
                onChange={(e) => setIssueRef(e.target.value)}
                placeholder="ISS-123"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Phone number
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+265991234567"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {loading ? 'Checking...' : 'Track complaint'}
              </button>
            </div>
          </div>
          {error && <p className="mt-3 text-sm font-medium text-rose-700">{error}</p>}
        </form>

        {recent.length > 0 && (
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Recent complaints on this device
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {recent.slice(0, 6).map((item) => (
                <button
                  key={`${item.issueRef}-${item.reporterPhone}`}
                  type="button"
                  onClick={() => {
                    setIssueRef(item.issueRef);
                    setPhone(item.reporterPhone);
                  }}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {item.issueRef}
                </button>
              ))}
            </div>
          </section>
        )}

        {data && (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {data.citizenGuidance && (
              <section className="rounded-xl border border-teal-200 bg-teal-50/60 p-5 shadow-sm lg:col-span-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-900">
                  What to expect next
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-teal-950">
                  {data.citizenGuidance.headline}
                </p>
                <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-teal-900/90">
                  {data.citizenGuidance.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-teal-800/85">
                  {data.citizenGuidance.disclaimer}
                </p>
              </section>
            )}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Complaint details
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Reference</dt>
                  <dd className="font-semibold text-slate-900">{data.issue.reference}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Current status</dt>
                  <dd className="font-semibold capitalize text-indigo-700">
                    {humanize(data.issue.currentStatus)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Category</dt>
                  <dd className="text-right text-slate-800">
                    {humanize(data.issue.issueCategory)}
                  </dd>
                </div>
                {data.issue.issueSubcategory && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Subcategory</dt>
                    <dd className="text-right text-slate-800">
                      {humanize(data.issue.issueSubcategory)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Submitted</dt>
                  <dd className="text-right text-slate-800">
                    {format(new Date(data.issue.dateReported), 'dd MMM yyyy, HH:mm')}
                  </dd>
                </div>
                {data.issue.customerResolutionFeedback && (
                  <div className="flex justify-between gap-3 border-t border-slate-100 pt-2">
                    <dt className="text-slate-500">Your resolution feedback</dt>
                    <dd className="text-right font-medium capitalize text-slate-900">
                      {humanize(data.issue.customerResolutionFeedback)}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {data.issue.premiseSummary?.found && (
              <section className="rounded-xl border border-violet-100 bg-violet-50/50 p-5 shadow-sm lg:col-span-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-900">
                  Premise context (meter registry)
                </h2>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {data.issue.premiseSummary.meterNumber && (
                    <div>
                      <dt className="text-xs text-violet-800/80">Meter</dt>
                      <dd className="font-medium text-violet-950">
                        {data.issue.premiseSummary.meterNumber}
                      </dd>
                    </div>
                  )}
                  {data.issue.premiseSummary.customerName && (
                    <div>
                      <dt className="text-xs text-violet-800/80">Account name</dt>
                      <dd className="font-medium text-violet-950">
                        {data.issue.premiseSummary.customerName}
                      </dd>
                    </div>
                  )}
                  {data.issue.premiseSummary.accountNumber && (
                    <div>
                      <dt className="text-xs text-violet-800/80">Account number</dt>
                      <dd className="font-medium text-violet-950">
                        {data.issue.premiseSummary.accountNumber}
                      </dd>
                    </div>
                  )}
                  {data.issue.premiseSummary.serviceArea && (
                    <div>
                      <dt className="text-xs text-violet-800/80">Service area</dt>
                      <dd className="font-medium text-violet-950">
                        {data.issue.premiseSummary.serviceArea}
                      </dd>
                    </div>
                  )}
                  {data.issue.premiseSummary.supplyZone && (
                    <div>
                      <dt className="text-xs text-violet-800/80">Supply zone</dt>
                      <dd className="font-medium text-violet-950">
                        {data.issue.premiseSummary.supplyZone}
                      </dd>
                    </div>
                  )}
                  {data.issue.premiseSummary.physicalAddress && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-violet-800/80">Registered address</dt>
                      <dd className="text-violet-950">{data.issue.premiseSummary.physicalAddress}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {data.issue.currentStatus === 'resolved' &&
              (data.issue.customerResolutionFeedback == null ||
                data.issue.customerResolutionFeedback === '' ||
                data.issue.customerResolutionFeedback === 'pending') && (
                <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm lg:col-span-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
                    Confirm resolution
                  </h2>
                  <p className="mt-2 text-sm text-amber-950/90">
                    Field work has been marked completed. Has your water supply been restored?
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={feedbackBusy}
                      onClick={() => void submitResolutionFeedback('confirmed')}
                      className="rounded-full border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {feedbackBusy ? 'Saving…' : '1. Yes — supply restored'}
                    </button>
                    <button
                      type="button"
                      disabled={feedbackBusy}
                      onClick={() => void submitResolutionFeedback('disputed')}
                      className="rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-50 disabled:opacity-60"
                    >
                      2. No — still not resolved
                    </button>
                  </div>
                  <label className="mt-4 block text-xs font-semibold text-amber-900/90">
                    Optional comment
                  </label>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900"
                    placeholder="Any detail helps (e.g. which tap is still affected)."
                  />
                  {feedbackMsg && (
                    <p className="mt-3 text-sm font-medium text-amber-900">{feedbackMsg}</p>
                  )}
                </section>
              )}

            {data.issue.customerResolutionFeedback === 'confirmed' && (
              <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950 lg:col-span-2">
                You confirmed that this complaint was resolved satisfactorily. Thank you.
              </section>
            )}

            {data.issue.customerResolutionFeedback === 'disputed' && (
              <section className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-950 lg:col-span-2">
                You indicated the issue is not resolved. Staff may contact you using the phone number
                on this complaint.
                {data.issue.customerResolutionComment && (
                  <span className="mt-2 block text-xs text-rose-900/90">
                    Your note: {data.issue.customerResolutionComment}
                  </span>
                )}
              </section>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Status timeline
              </h2>
              <ul className="mt-3 space-y-2">
                {data.timeline.map((step, idx) => (
                  <li
                    key={`${step.status}-${step.changedAt}-${idx}`}
                    className="rounded-md bg-slate-50 px-3 py-2 text-sm"
                  >
                    <p className="font-semibold capitalize text-slate-900">
                      {humanize(step.status)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(step.changedAt), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Notifications
              </h2>
              <ul className="mt-3 space-y-2">
                {data.notifications.map((n, idx) => (
                  <li key={`${n.title}-${n.at}-${idx}`} className="rounded-md bg-indigo-50 px-3 py-2">
                    <p className="text-sm font-semibold text-indigo-900">{n.title}</p>
                    <p className="text-sm text-indigo-800">{n.message}</p>
                    <p className="mt-1 text-xs text-indigo-700">
                      {format(new Date(n.at), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
