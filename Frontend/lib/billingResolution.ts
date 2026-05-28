import type { IssueDetail } from '@/lib/types';

export const BILLING_PAYMENT_CHANNELS = [
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash_office', label: 'Cash at office' },
  { value: 'pay_agent', label: 'Pay agent / vendor' },
  { value: 'customer_portal', label: 'Customer portal' },
  { value: 'other', label: 'Other' },
] as const;

export const BILLING_LEDGER_ACTIONS = [
  { value: 'payment_posted', label: 'Payment posted to ledger' },
  { value: 'credit_applied', label: 'Credit / adjustment applied' },
  { value: 'reversal_posted', label: 'Reversal posted' },
  { value: 'no_ledger_change', label: 'No ledger change (already correct)' },
  { value: 'pending_ict_sync', label: 'Pending ICT / channel sync' },
] as const;

export const BILLING_CUSTOMER_CONTACT_CHANNELS = [
  {
    value: 'system_sms',
    label: 'Send SMS / email now (system)',
    hint: 'Uses the message below — requires phone or email on the ticket.',
  },
  { value: 'phone_call', label: 'I called the customer', hint: 'No automatic message.' },
  { value: 'in_person', label: 'Told them in person', hint: 'No automatic message.' },
  {
    value: 'office_visit',
    label: 'They will be told at the office',
    hint: 'No automatic message.',
  },
  {
    value: 'unreachable',
    label: 'Could not reach customer',
    hint: 'Supervisor follow-up — internal note required.',
  },
] as const;

export const BILLING_RECONNECTION_STEPS = [
  { value: 'not_required', label: 'Reconnection not required' },
  { value: 'completed', label: 'Reconnection completed' },
  { value: 'scheduled', label: 'Reconnection scheduled' },
  { value: 'pending_payment_clearance', label: 'After payment clears' },
  { value: 'customer_must_visit_office', label: 'Customer must visit office' },
] as const;

export type BillingResolutionFormState = {
  transactionIdConfirmed: string;
  paymentChannel: string;
  ledgerAction: string;
  ledgerReference: string;
  balanceAfterMwk: string;
  reconnectionStep: string;
  reconnectionNotes: string;
  customerContactChannel: string;
  customerSummary: string;
  additionalNotes: string;
};

export type BillingCustomerNotificationDelivery = {
  channel: string;
  smsSent: boolean;
  emailSent: boolean;
  attemptedAt: string;
  detail: string;
};

export type BillingResolutionContextDto = {
  accountNumber: string | null;
  ledgerAction: string;
  ledgerActionLabel: string;
  ledgerActionReason: string;
  balanceBeforeMwk: number | null;
  balanceAfterMwk: number | null;
  balanceSource: 'billing_registry' | 'unavailable';
  balanceExplanation: string;
  reconnectionStep: string;
  reconnectionStepLabel: string;
  reconnectionReason: string;
  suggestedLedgerReference: string | null;
  registryFound: boolean;
  customerName: string | null;
  accountStatus: string | null;
  connectionStatus: string | null;
};

export type BillingResolutionPayload = {
  transactionIdConfirmed: string;
  paymentChannel: string;
  ledgerAction: string;
  ledgerReference?: string;
  balanceAfterMwk: string;
  reconnectionStep: string;
  reconnectionNotes?: string;
  customerContactChannel: string;
  customerNotified: 'yes' | 'no';
  customerSummary: string;
  additionalNotes?: string;
};

const BILLING_RES_PREFIX = 'billing_res_';

export function defaultBillingResolutionForm(
  issue: IssueDetail,
): BillingResolutionFormState {
  const attrs = issue.issueAttributes ?? {};
  const reportedTx = attrs.transactionId != null ? String(attrs.transactionId) : '';
  const reportedMethod =
    attrs.paymentMethod != null ? String(attrs.paymentMethod) : '';
  const channelGuess = mapPaymentMethodToChannel(reportedMethod);

  return {
    transactionIdConfirmed: reportedTx,
    paymentChannel: channelGuess,
    ledgerAction: '',
    ledgerReference: '',
    balanceAfterMwk: '',
    reconnectionStep: '',
    reconnectionNotes: '',
    customerContactChannel: 'system_sms',
    customerSummary: '',
    additionalNotes: '',
  };
}

export function buildSuggestedCustomerSummary(
  issue: IssueDetail,
  context: BillingResolutionContextDto | null,
  form: Pick<
    BillingResolutionFormState,
    'transactionIdConfirmed' | 'balanceAfterMwk' | 'reconnectionStep'
  >,
): string {
  const name = issue.reporterName?.trim() || 'Customer';
  const account =
    context?.accountNumber ?? issue.accountNumber ?? 'your account';
  const bal = form.balanceAfterMwk || String(context?.balanceAfterMwk ?? '');
  const tx = form.transactionIdConfirmed.trim() || '—';
  const reconLabel =
    BILLING_RECONNECTION_STEPS.find((r) => r.value === form.reconnectionStep)
      ?.label ??
    context?.reconnectionStepLabel ??
    'See reconnection notes';
  return (
    `Dear ${name}, your billing issue on account ${account} is resolved. ` +
    `Transaction ${tx} is on record. Your balance is now MWK ${bal}. ` +
    `${reconLabel}. Reference ISS-${issue.id}.`
  );
}

function mapPaymentMethodToChannel(method: string): string {
  const m = method.toLowerCase();
  if (m.includes('mobile') || m.includes('momo') || m.includes('airtel') || m.includes('tnm')) {
    return 'mobile_money';
  }
  if (m.includes('bank')) return 'bank_transfer';
  if (m.includes('cash')) return 'cash_office';
  if (m.includes('agent') || m.includes('vendor')) return 'pay_agent';
  if (m.includes('portal') || m.includes('online')) return 'customer_portal';
  return '';
}

export function applyBillingContextToForm(
  ctx: BillingResolutionContextDto,
  issue: IssueDetail,
  base?: BillingResolutionFormState,
): BillingResolutionFormState {
  const b = base ?? defaultBillingResolutionForm(issue);
  return {
    ...b,
    ledgerAction: ctx.ledgerAction,
    ledgerReference: ctx.suggestedLedgerReference ?? b.ledgerReference,
    balanceAfterMwk:
      ctx.balanceAfterMwk != null ? String(ctx.balanceAfterMwk) : b.balanceAfterMwk,
    reconnectionStep: ctx.reconnectionStep,
  };
}

export function validateBillingResolutionForm(
  form: BillingResolutionFormState,
  issue: IssueDetail,
  ctx?: BillingResolutionContextDto | null,
): string | null {
  if (!form.transactionIdConfirmed.trim()) {
    return 'Confirm the transaction ID from the payment proof or channel.';
  }
  if (!form.paymentChannel) return 'Select the payment channel.';
  if (!form.ledgerAction) {
    return ctx
      ? 'Billing rules are still loading — wait a moment and try again.'
      : 'Ledger action is not set.';
  }
  if (ctx?.balanceSource === 'unavailable') {
    return ctx.balanceExplanation;
  }
  if (!form.balanceAfterMwk.trim()) {
    return 'Balance after resolution is not available from billing — refresh or complete posting in CIS first.';
  }
  if (
    form.ledgerAction !== 'no_ledger_change' &&
    form.ledgerAction !== 'pending_ict_sync' &&
    !form.ledgerReference.trim()
  ) {
    return 'Ledger reference is missing — refresh billing context.';
  }
  if (!form.reconnectionStep) return 'Reconnection step is not set — refresh billing context.';
  if (
    (form.reconnectionStep === 'scheduled' ||
      form.reconnectionStep === 'pending_payment_clearance') &&
    !form.reconnectionNotes.trim()
  ) {
    return 'Add reconnection notes (date, crew, or what the customer must do).';
  }
  if (!form.customerContactChannel) {
    return 'Select how the customer was informed.';
  }
  if (
    form.customerContactChannel === 'system_sms' &&
    !issue.reporterPhone?.trim() &&
    !issue.reporterEmail?.trim()
  ) {
    return 'Add reporter phone or email on this issue to send SMS/email, or choose phone / in-person contact.';
  }
  if (form.customerSummary.trim().length < 10) {
    return 'Enter or generate the message the customer received (min 10 characters).';
  }
  if (
    form.customerContactChannel === 'unreachable' &&
    !form.additionalNotes.trim()
  ) {
    return 'Explain why the customer could not be reached (internal note).';
  }
  return null;
}

function customerNotifiedFromChannel(channel: string): 'yes' | 'no' {
  return channel === 'unreachable' ? 'no' : 'yes';
}

export function billingFormToPayload(
  form: BillingResolutionFormState,
): BillingResolutionPayload {
  const channel = form.customerContactChannel;
  return {
    transactionIdConfirmed: form.transactionIdConfirmed.trim(),
    paymentChannel: form.paymentChannel,
    ledgerAction: form.ledgerAction,
    ledgerReference: form.ledgerReference.trim() || undefined,
    balanceAfterMwk: form.balanceAfterMwk.trim(),
    reconnectionStep: form.reconnectionStep,
    reconnectionNotes: form.reconnectionNotes.trim() || undefined,
    customerContactChannel: channel,
    customerNotified: customerNotifiedFromChannel(channel),
    customerSummary: form.customerSummary.trim(),
    additionalNotes: form.additionalNotes.trim() || undefined,
  };
}

export type BillingResolutionRecord = {
  transactionIdConfirmed: string;
  paymentChannel: string;
  ledgerAction: string;
  ledgerReference?: string;
  balanceAfterMwk: string;
  reconnectionStep: string;
  reconnectionNotes?: string;
  customerContactChannel?: string;
  customerNotified: 'yes' | 'no';
  customerSummary: string;
  notificationSms?: boolean;
  notificationEmail?: boolean;
  notificationDetail?: string;
  resolvedAt?: string;
};

export function readBillingResolutionFromIssue(
  issue: IssueDetail,
): BillingResolutionRecord | null {
  const a = issue.issueAttributes;
  if (!a?.[`${BILLING_RES_PREFIX}transaction_id`]) return null;
  return {
    transactionIdConfirmed: String(a[`${BILLING_RES_PREFIX}transaction_id`]),
    paymentChannel: String(a[`${BILLING_RES_PREFIX}payment_channel`] ?? ''),
    ledgerAction: String(a[`${BILLING_RES_PREFIX}ledger_action`] ?? ''),
    ledgerReference: a[`${BILLING_RES_PREFIX}ledger_reference`]
      ? String(a[`${BILLING_RES_PREFIX}ledger_reference`])
      : undefined,
    balanceAfterMwk: String(a[`${BILLING_RES_PREFIX}balance_mwk`] ?? ''),
    reconnectionStep: String(a[`${BILLING_RES_PREFIX}reconnection`] ?? ''),
    reconnectionNotes: a[`${BILLING_RES_PREFIX}reconnection_notes`]
      ? String(a[`${BILLING_RES_PREFIX}reconnection_notes`])
      : undefined,
    customerContactChannel: a[`${BILLING_RES_PREFIX}contact_channel`]
      ? String(a[`${BILLING_RES_PREFIX}contact_channel`])
      : undefined,
    customerNotified:
      a[`${BILLING_RES_PREFIX}customer_notified`] === 'yes' ? 'yes' : 'no',
    customerSummary: String(a[`${BILLING_RES_PREFIX}customer_summary`] ?? ''),
    notificationSms: a[`${BILLING_RES_PREFIX}notification_sms`] === 'yes',
    notificationEmail: a[`${BILLING_RES_PREFIX}notification_email`] === 'yes',
    notificationDetail: a[`${BILLING_RES_PREFIX}notification_detail`]
      ? String(a[`${BILLING_RES_PREFIX}notification_detail`])
      : undefined,
    resolvedAt: a[`${BILLING_RES_PREFIX}resolved_at`]
      ? String(a[`${BILLING_RES_PREFIX}resolved_at`])
      : undefined,
  };
}

export function labelOption(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value.replace(/_/g, ' ');
}

export function isBillingResolutionAttributeKey(key: string): boolean {
  return (
    key.startsWith(BILLING_RES_PREFIX) ||
    key === 'billing_res_contact_channel' ||
    key.startsWith('billing_res_notification_')
  );
}
