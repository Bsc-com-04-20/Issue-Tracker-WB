import { BillingResolutionForm } from '@/components/issue/BillingResolutionForm';
import type {
  BillingResolutionContextDto,
  BillingResolutionFormState,
} from '@/lib/billingResolution';
import type { IssueDetail } from '@/lib/types';
import {
  getCategoryTechnicianWorkflow,
  resolutionHintForIssue,
} from '@/lib/categoryTechnicianWorkflow';

type Props = {
  issue: IssueDetail;
  issueCategory: string;
  issueSubcategory?: string | null;
  issueAccountNumber?: string | null;
  reportedTransactionId?: string | null;
  status: string;
  busy: boolean;
  progressPick: string;
  onProgressPickChange: (v: string) => void;
  onSaveProgress: () => void;
  resolutionText: string;
  onResolutionTextChange: (v: string) => void;
  onStartWork: () => void;
  onResolve: () => void;
  billingForm?: BillingResolutionFormState;
  onBillingFormChange?: (next: BillingResolutionFormState) => void;
  billingContext?: BillingResolutionContextDto | null;
  billingContextLoading?: boolean;
  onRefreshBillingContext?: () => void;
  billingValidationError?: string | null;
  onBillingResolve?: () => void;
};

export function TechnicianIssueActions({
  issue,
  issueCategory,
  issueSubcategory,
  issueAccountNumber,
  reportedTransactionId,
  status,
  busy,
  progressPick,
  onProgressPickChange,
  onSaveProgress,
  resolutionText,
  onResolutionTextChange,
  onStartWork,
  onResolve,
  billingForm,
  onBillingFormChange,
  billingContext,
  billingContextLoading,
  onRefreshBillingContext,
  billingValidationError,
  onBillingResolve,
}: Props) {
  const wf = getCategoryTechnicianWorkflow(issueCategory);
  const subHint = resolutionHintForIssue(issueCategory, issueSubcategory);
  const isBilling = wf.lane === 'billing';

  if (status !== 'assigned' && status !== 'in_progress') {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Update status</h2>
      <p className="mt-1 text-xs text-slate-500">
        {isBilling
          ? 'Billing & account issues use desk reconciliation steps — not field crew labels.'
          : wf.lane === 'field'
            ? 'Field repair and network issues use crew dispatch steps.'
            : `Handled as ${wf.lane} work — use the progress list below for this category.`}
      </p>

      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {wf.progressSectionTitle}
        </p>
        <p className="mt-1 text-xs text-slate-600">{wf.progressSectionHint}</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={progressPick}
            onChange={(e) => onProgressPickChange(e.target.value)}
            className="w-full flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:max-w-md"
          >
            <option value="">Select progress…</option>
            {wf.progressOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !progressPick}
            onClick={onSaveProgress}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
          >
            Save progress
          </button>
        </div>
      </div>

      {status === 'assigned' && (
        <button
          type="button"
          disabled={busy}
          onClick={onStartWork}
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {wf.startWorkLabel}
        </button>
      )}

      {status === 'in_progress' && isBilling && billingForm && onBillingFormChange && onBillingResolve ? (
        <div className="mt-3">
          <BillingResolutionForm
            issue={issue}
            issueAccountNumber={issueAccountNumber}
            reportedTransactionId={reportedTransactionId}
            form={billingForm}
            onChange={onBillingFormChange!}
            context={billingContext ?? null}
            contextLoading={billingContextLoading ?? false}
            onRefreshContext={onRefreshBillingContext ?? (() => {})}
            validationError={billingValidationError ?? null}
            busy={busy}
            onSubmit={onBillingResolve}
          />
        </div>
      ) : null}

      {status === 'in_progress' && !isBilling && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {wf.resolveSectionTitle}
          </p>
          {subHint ? (
            <p className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-xs text-indigo-950">
              {subHint}
            </p>
          ) : null}
          <textarea
            value={resolutionText}
            onChange={(e) => onResolutionTextChange(e.target.value)}
            placeholder={wf.resolutionPlaceholder}
            rows={4}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
          />
          <button
            type="button"
            disabled={busy}
            onClick={onResolve}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {wf.resolveButtonLabel}
          </button>
        </div>
      )}
    </div>
  );
}
