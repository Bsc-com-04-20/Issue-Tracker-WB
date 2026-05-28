import { format } from 'date-fns';
import {
  BILLING_CUSTOMER_CONTACT_CHANNELS,
  BILLING_LEDGER_ACTIONS,
  BILLING_PAYMENT_CHANNELS,
  BILLING_RECONNECTION_STEPS,
  labelOption,
  type BillingResolutionRecord,
} from '@/lib/billingResolution';

type Props = {
  record: BillingResolutionRecord;
  resolutionDetails?: string | null;
  resolvedAt?: string;
  resolvedByName?: string;
};

export function BillingResolutionSummary({
  record,
  resolutionDetails,
  resolvedAt,
  resolvedByName,
}: Props) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
      <h3 className="text-sm font-bold text-emerald-950">Billing resolution</h3>
      {resolvedAt && resolvedByName ? (
        <p className="mt-1 text-xs text-emerald-800/90">
          Completed {format(new Date(resolvedAt), 'MMM d, yyyy · h:mm a')} by{' '}
          {resolvedByName}
        </p>
      ) : null}
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Transaction ID
          </dt>
          <dd className="font-medium text-slate-900">
            {record.transactionIdConfirmed}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Payment channel
          </dt>
          <dd className="text-slate-800">
            {labelOption(BILLING_PAYMENT_CHANNELS, record.paymentChannel)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Ledger action
          </dt>
          <dd className="text-slate-800">
            {labelOption(BILLING_LEDGER_ACTIONS, record.ledgerAction)}
            {record.ledgerReference ? (
              <span className="block text-xs text-slate-600">
                Ref: {record.ledgerReference}
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Balance after (MWK)
          </dt>
          <dd className="font-semibold text-slate-900">{record.balanceAfterMwk}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Reconnection
          </dt>
          <dd className="text-slate-800">
            {labelOption(BILLING_RECONNECTION_STEPS, record.reconnectionStep)}
            {record.reconnectionNotes ? (
              <span className="block text-xs text-slate-600">
                {record.reconnectionNotes}
              </span>
            ) : null}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Customer contact
          </dt>
          <dd className="text-slate-800">
            {record.customerContactChannel
              ? labelOption(
                  BILLING_CUSTOMER_CONTACT_CHANNELS,
                  record.customerContactChannel,
                )
              : record.customerNotified === 'yes'
                ? 'Yes'
                : 'No'}
            {record.notificationSms || record.notificationEmail ? (
              <span className="mt-1 block text-xs text-slate-600">
                {record.notificationSms ? 'SMS sent' : 'SMS not sent'}
                {' · '}
                {record.notificationEmail ? 'Email sent' : 'Email not sent'}
                {record.notificationDetail ? ` — ${record.notificationDetail}` : ''}
              </span>
            ) : null}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Told customer
          </dt>
          <dd className="text-slate-800">{record.customerSummary}</dd>
        </div>
      </dl>
      {resolutionDetails ? (
        <details className="mt-3 text-xs text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">
            Full resolution record
          </summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-white/80 p-2 text-[11px] leading-relaxed">
            {resolutionDetails}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
