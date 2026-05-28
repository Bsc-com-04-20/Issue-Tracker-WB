import {
  BILLING_CUSTOMER_CONTACT_CHANNELS,
  BILLING_PAYMENT_CHANNELS,
  buildSuggestedCustomerSummary,
  type BillingResolutionContextDto,
  type BillingResolutionFormState,
} from '@/lib/billingResolution';
import type { IssueDetail } from '@/lib/types';

type Props = {
  issue: IssueDetail;
  issueAccountNumber?: string | null;
  reportedTransactionId?: string | null;
  form: BillingResolutionFormState;
  onChange: (next: BillingResolutionFormState) => void;
  context: BillingResolutionContextDto | null;
  contextLoading: boolean;
  onRefreshContext: () => void;
  validationError: string | null;
  busy: boolean;
  onSubmit: () => void;
};

export function BillingResolutionForm({
  issue,
  issueAccountNumber,
  reportedTransactionId,
  form,
  onChange,
  context,
  contextLoading,
  onRefreshContext,
  validationError,
  busy,
  onSubmit,
}: Props) {
  const set = <K extends keyof BillingResolutionFormState>(
    key: K,
    value: BillingResolutionFormState[K],
  ) => onChange({ ...form, [key]: value });

  const needsReconNotes =
    form.reconnectionStep === 'scheduled' ||
    form.reconnectionStep === 'pending_payment_clearance';

  const submitBlockedReason = contextLoading
    ? 'Loading billing account data…'
    : !context
      ? 'Billing rules are not loaded yet — use “Refresh billing data” below.'
      : context.balanceSource === 'unavailable'
        ? context.balanceExplanation
        : !form.ledgerAction || !form.balanceAfterMwk.trim()
          ? 'Ledger and balance are not ready — refresh billing data.'
          : null;

  const canSubmit = !busy && submitBlockedReason === null;

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div>
        <h3 className="text-sm font-bold text-emerald-950">Billing resolution</h3>
        <p className="mt-1 text-xs leading-relaxed text-emerald-900/90">
          Confirm the payment, then complete customer contact. Ledger action, balance,
          and reconnection are set automatically from this issue and the billing account.
        </p>
      </div>

      {contextLoading ? (
        <p className="text-sm text-slate-600">Loading billing account data…</p>
      ) : null}

      {!contextLoading && context ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          {context.registryFound
            ? 'Account data loaded from billing registry.'
            : 'Limited registry data — balances may be unavailable.'}
          {context.accountStatus ? (
            <span className="mt-1 block">
              Account status: <strong>{context.accountStatus.replace(/_/g, ' ')}</strong>
              {context.connectionStatus
                ? ` · Connection: ${context.connectionStatus}`
                : ''}
            </span>
          ) : null}
        </p>
      ) : null}

      <ol className="space-y-4 text-sm">
        <li className="rounded-lg border border-white/80 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            1 · Confirm payment
          </p>
          {issueAccountNumber ? (
            <p className="mt-1 text-xs text-slate-600">
              Account: <strong>{issueAccountNumber}</strong>
            </p>
          ) : null}
          {reportedTransactionId ? (
            <p className="mt-1 text-xs text-slate-500">
              Reported at intake: {reportedTransactionId}
            </p>
          ) : null}
          <label className="mt-2 block font-medium text-slate-800">
            Transaction ID (confirmed)
            <input
              value={form.transactionIdConfirmed}
              onChange={(e) => set('transactionIdConfirmed', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. 1234567"
            />
          </label>
          <label className="mt-2 block font-medium text-slate-800">
            Payment channel
            <select
              value={form.paymentChannel}
              onChange={(e) => set('paymentChannel', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select channel…</option>
              {BILLING_PAYMENT_CHANNELS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </li>

        <li className="rounded-lg border border-white/80 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            2 · Ledger (automatic)
          </p>
          {context ? (
            <>
              <p className="mt-2 font-semibold text-slate-900">
                {context.ledgerActionLabel}
              </p>
              <p className="mt-1 text-xs text-slate-600">{context.ledgerActionReason}</p>
              {form.ledgerReference ? (
                <p className="mt-2 text-xs text-slate-600">
                  Reference:{' '}
                  <span className="font-mono font-medium text-slate-800">
                    {form.ledgerReference}
                  </span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Waiting for billing rules…</p>
          )}
        </li>

        <li className="rounded-lg border border-white/80 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            3 · Balance (from billing system)
          </p>
          {context?.balanceBeforeMwk != null ? (
            <p className="mt-2 text-sm text-slate-700">
              Current balance:{' '}
              <strong>MWK {context.balanceBeforeMwk.toLocaleString()}</strong>
            </p>
          ) : null}
          {context?.balanceAfterMwk != null ? (
            <p className="mt-1 text-sm font-semibold text-emerald-900">
              After resolution: MWK {context.balanceAfterMwk.toLocaleString()}
            </p>
          ) : null}
          {context ? (
            <p className="mt-2 text-xs text-slate-600">{context.balanceExplanation}</p>
          ) : null}
          {context?.balanceSource === 'unavailable' ? (
            <button
              type="button"
              onClick={onRefreshContext}
              className="mt-2 text-sm font-medium text-indigo-600 hover:underline"
            >
              Refresh from billing registry
            </button>
          ) : null}
        </li>

        <li className="rounded-lg border border-white/80 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            4 · Reconnection (automatic)
          </p>
          {context ? (
            <>
              <p className="mt-2 font-semibold text-slate-900">
                {context.reconnectionStepLabel}
              </p>
              <p className="mt-1 text-xs text-slate-600">{context.reconnectionReason}</p>
            </>
          ) : null}
          {needsReconNotes ? (
            <label className="mt-2 block font-medium text-slate-800">
              Reconnection notes (required)
              <input
                value={form.reconnectionNotes}
                onChange={(e) => set('reconnectionNotes', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Date, order number, or instructions"
              />
            </label>
          ) : null}
        </li>

        <li className="rounded-lg border border-white/80 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            5 · Customer contact (you complete)
          </p>
          <label className="mt-2 block font-medium text-slate-800">
            How was the customer informed?
            <select
              value={form.customerContactChannel}
              onChange={(e) => set('customerContactChannel', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {BILLING_CUSTOMER_CONTACT_CHANNELS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {BILLING_CUSTOMER_CONTACT_CHANNELS.find(
            (c) => c.value === form.customerContactChannel,
          )?.hint ? (
            <p className="mt-1 text-xs text-slate-600">
              {
                BILLING_CUSTOMER_CONTACT_CHANNELS.find(
                  (c) => c.value === form.customerContactChannel,
                )?.hint
              }
            </p>
          ) : null}
          {form.customerContactChannel === 'system_sms' ? (
            <p className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-xs text-indigo-950">
              On submit, the system sends SMS
              {issue.reporterEmail ? ' and email' : ''} using the message below.
              Phone: {issue.reporterPhone || '—'} · Email:{' '}
              {issue.reporterEmail || '—'}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            onClick={() =>
              set(
                'customerSummary',
                buildSuggestedCustomerSummary(issue, context, form),
              )
            }
          >
            Use suggested message
          </button>
          <label className="mt-2 block font-medium text-slate-800">
            What you told the customer
            <textarea
              value={form.customerSummary}
              onChange={(e) => set('customerSummary', e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={
                context?.balanceAfterMwk != null
                  ? `Your balance is now MWK ${context.balanceAfterMwk.toLocaleString()}. …`
                  : 'Balance, reconnection, next steps…'
              }
            />
          </label>
          <label className="mt-2 block text-sm font-medium text-slate-700">
            Internal notes
            {form.customerContactChannel === 'unreachable'
              ? ' (required)'
              : ' (optional)'}
            <textarea
              value={form.additionalNotes}
              onChange={(e) => set('additionalNotes', e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </li>
      </ol>

      {validationError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {validationError}
        </p>
      ) : null}

      {submitBlockedReason && !validationError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {submitBlockedReason}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onRefreshContext}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh billing data
        </button>
        <button
          type="button"
          disabled={busy || !canSubmit}
          onClick={onSubmit}
          className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Complete billing resolution
        </button>
      </div>
    </div>
  );
}
