import type { Issue } from './issue.entity';
import type { BillingResolutionInput } from './billing-resolution';
import {
  labelBillingLedgerAction,
  labelBillingReconnectionStep,
} from './billing-resolution';

export const BILLING_CUSTOMER_CONTACT_CHANNELS = [
  'system_sms',
  'phone_call',
  'in_person',
  'office_visit',
  'unreachable',
] as const;

export type BillingCustomerContactChannel =
  (typeof BILLING_CUSTOMER_CONTACT_CHANNELS)[number];

export type BillingCustomerNotificationResult = {
  channel: BillingCustomerContactChannel;
  smsSent: boolean;
  emailSent: boolean;
  attemptedAt: string;
  detail: string;
};

const CHANNEL_LABELS: Record<BillingCustomerContactChannel, string> = {
  system_sms: 'SMS / email sent by system',
  phone_call: 'Phone call',
  in_person: 'Told in person',
  office_visit: 'Customer will be told at office',
  unreachable: 'Could not reach customer',
};

export function labelCustomerContactChannel(v: string): string {
  return (
    CHANNEL_LABELS[v as BillingCustomerContactChannel] ??
    v.replace(/_/g, ' ')
  );
}

export function customerNotifiedFromChannel(
  channel: BillingCustomerContactChannel,
): 'yes' | 'no' {
  return channel === 'unreachable' ? 'no' : 'yes';
}

export function buildSuggestedCustomerSummary(
  issue: Issue,
  billing: Pick<
    BillingResolutionInput,
    'balanceAfterMwk' | 'reconnectionStep' | 'transactionIdConfirmed'
  >,
): string {
  const name = issue.reporterName?.trim() || 'Customer';
  const account = issue.accountNumber ?? 'your account';
  const recon = labelBillingReconnectionStep(billing.reconnectionStep);
  const bal = billing.balanceAfterMwk;
  let reconLine = '';
  if (billing.reconnectionStep === 'not_required') {
    reconLine = 'No reconnection is required.';
  } else if (billing.reconnectionStep === 'completed') {
    reconLine = 'Your water supply reconnection is complete.';
  } else if (billing.reconnectionStep === 'scheduled') {
    reconLine = 'Reconnection is scheduled — we will confirm the date with you.';
  } else if (billing.reconnectionStep === 'pending_payment_clearance') {
    reconLine = 'Reconnection will proceed once payment clearance is complete.';
  } else if (billing.reconnectionStep === 'customer_must_visit_office') {
    reconLine = 'Please visit our office to complete the next step.';
  } else {
    reconLine = `Reconnection: ${recon}.`;
  }
  return (
    `Dear ${name}, your billing issue on account ${account} is resolved. ` +
    `Transaction ${billing.transactionIdConfirmed} is recorded. ` +
    `Your balance is now MWK ${bal}. ${reconLine} ` +
    `Reference ISS-${issue.id}.`
  );
}

export function buildBillingCustomerSms(
  issue: Issue,
  billing: BillingResolutionInput,
): string {
  const account = issue.accountNumber ?? 'account';
  const recon =
    billing.reconnectionStep === 'not_required'
      ? 'No reconnect needed.'
      : billing.reconnectionStep === 'completed'
        ? 'Reconnected.'
        : labelBillingReconnectionStep(billing.reconnectionStep);
  const text =
    `Water Board: Acct ${account} billing update. ` +
    `Bal MWK ${billing.balanceAfterMwk}. Txn ${billing.transactionIdConfirmed}. ` +
    `${recon} Ref ISS-${issue.id}.`;
  return text.length > 320 ? `${text.slice(0, 317)}...` : text;
}

export function buildBillingCustomerEmail(
  issue: Issue,
  billing: BillingResolutionInput,
): string {
  const greet = issue.reporterName?.trim()
    ? `Dear ${issue.reporterName.trim()},\n\n`
    : '';
  const account = issue.accountNumber ?? '—';
  return (
    `${greet}` +
    `Your billing complaint (reference ISS-${issue.id}) has been resolved.\n\n` +
    `Account: ${account}\n` +
    `Transaction confirmed: ${billing.transactionIdConfirmed}\n` +
    `Ledger: ${labelBillingLedgerAction(billing.ledgerAction)}\n` +
    `Balance after resolution: MWK ${billing.balanceAfterMwk}\n` +
    `Reconnection: ${labelBillingReconnectionStep(billing.reconnectionStep)}\n` +
    `${billing.reconnectionNotes ? `Reconnection notes: ${billing.reconnectionNotes}\n` : ''}` +
    `\nMessage to customer:\n${billing.customerSummary}\n\n` +
    `— Billing desk, Issue tracking`
  );
}

export function stampBillingNotificationAttributes(
  attrs: Record<string, string | number>,
  channel: BillingCustomerContactChannel,
  delivery: BillingCustomerNotificationResult | null,
): Record<string, string | number> {
  const next = { ...attrs };
  next[`billing_res_contact_channel`] = channel;
  if (delivery) {
    next[`billing_res_notification_at`] = delivery.attemptedAt;
    next[`billing_res_notification_sms`] = delivery.smsSent ? 'yes' : 'no';
    next[`billing_res_notification_email`] = delivery.emailSent ? 'yes' : 'no';
    if (delivery.detail) {
      next[`billing_res_notification_detail`] = delivery.detail;
    }
  }
  return next;
}
