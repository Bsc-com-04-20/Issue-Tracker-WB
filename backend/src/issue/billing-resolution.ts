import { BadRequestException } from '@nestjs/common';
import type { Issue } from './issue.entity';
import {
  BILLING_CUSTOMER_CONTACT_CHANNELS,
  customerNotifiedFromChannel,
  type BillingCustomerContactChannel,
} from './billing-customer-notification';

export const BILLING_PAYMENT_CHANNELS = [
  'mobile_money',
  'bank_transfer',
  'cash_office',
  'pay_agent',
  'customer_portal',
  'other',
] as const;

export const BILLING_LEDGER_ACTIONS = [
  'payment_posted',
  'credit_applied',
  'reversal_posted',
  'no_ledger_change',
  'pending_ict_sync',
] as const;

export const BILLING_RECONNECTION_STEPS = [
  'not_required',
  'completed',
  'scheduled',
  'pending_payment_clearance',
  'customer_must_visit_office',
] as const;

export type BillingPaymentChannel = (typeof BILLING_PAYMENT_CHANNELS)[number];
export type BillingLedgerAction = (typeof BILLING_LEDGER_ACTIONS)[number];
export type BillingReconnectionStep = (typeof BILLING_RECONNECTION_STEPS)[number];

export type BillingResolutionInput = {
  transactionIdConfirmed: string;
  paymentChannel: BillingPaymentChannel;
  ledgerAction: BillingLedgerAction;
  ledgerReference?: string;
  balanceAfterMwk: string;
  reconnectionStep: BillingReconnectionStep;
  reconnectionNotes?: string;
  customerContactChannel: BillingCustomerContactChannel;
  customerNotified: 'yes' | 'no';
  customerSummary: string;
  additionalNotes?: string;
};

export const BILLING_RES_ATTR_PREFIX = 'billing_res_';

export function billingResolutionAttributeKeys(): Record<
  keyof Omit<BillingResolutionInput, 'additionalNotes'>,
  string
> {
  return {
    transactionIdConfirmed: `${BILLING_RES_ATTR_PREFIX}transaction_id`,
    paymentChannel: `${BILLING_RES_ATTR_PREFIX}payment_channel`,
    ledgerAction: `${BILLING_RES_ATTR_PREFIX}ledger_action`,
    ledgerReference: `${BILLING_RES_ATTR_PREFIX}ledger_reference`,
    balanceAfterMwk: `${BILLING_RES_ATTR_PREFIX}balance_mwk`,
    reconnectionStep: `${BILLING_RES_ATTR_PREFIX}reconnection`,
    reconnectionNotes: `${BILLING_RES_ATTR_PREFIX}reconnection_notes`,
    customerContactChannel: `${BILLING_RES_ATTR_PREFIX}contact_channel`,
    customerNotified: `${BILLING_RES_ATTR_PREFIX}customer_notified`,
    customerSummary: `${BILLING_RES_ATTR_PREFIX}customer_summary`,
  };
}

const CHANNEL_LABELS: Record<BillingPaymentChannel, string> = {
  mobile_money: 'Mobile money',
  bank_transfer: 'Bank transfer',
  cash_office: 'Cash at office',
  pay_agent: 'Pay agent / vendor',
  customer_portal: 'Customer portal',
  other: 'Other channel',
};

const LEDGER_LABELS: Record<BillingLedgerAction, string> = {
  payment_posted: 'Payment posted to ledger',
  credit_applied: 'Credit / adjustment applied',
  reversal_posted: 'Reversal posted',
  no_ledger_change: 'No ledger change (already correct)',
  pending_ict_sync: 'Pending ICT / channel sync',
};

const RECON_LABELS: Record<BillingReconnectionStep, string> = {
  not_required: 'Reconnection not required',
  completed: 'Reconnection completed',
  scheduled: 'Reconnection scheduled',
  pending_payment_clearance: 'Reconnection after payment clears',
  customer_must_visit_office: 'Customer must visit office',
};

export function labelBillingPaymentChannel(v: string): string {
  return CHANNEL_LABELS[v as BillingPaymentChannel] ?? v.replace(/_/g, ' ');
}

export function labelBillingLedgerAction(v: string): string {
  return LEDGER_LABELS[v as BillingLedgerAction] ?? v.replace(/_/g, ' ');
}

export function labelBillingReconnectionStep(v: string): string {
  return RECON_LABELS[v as BillingReconnectionStep] ?? v.replace(/_/g, ' ');
}

function assertEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  field: string,
): T {
  if (!allowed.includes(value as T)) {
    throw new BadRequestException(
      `${field} must be one of: ${allowed.join(', ')}`,
    );
  }
  return value as T;
}

export function parseAndValidateBillingResolution(
  raw: unknown,
): BillingResolutionInput {
  if (!raw || typeof raw !== 'object') {
    throw new BadRequestException('billingResolution object is required');
  }
  const o = raw as Record<string, unknown>;
  const transactionIdConfirmed = String(o.transactionIdConfirmed ?? '').trim();
  if (!transactionIdConfirmed) {
    throw new BadRequestException(
      'billingResolution.transactionIdConfirmed is required',
    );
  }
  const paymentChannel = assertEnum(
    String(o.paymentChannel ?? '').trim(),
    BILLING_PAYMENT_CHANNELS,
    'billingResolution.paymentChannel',
  );
  const ledgerAction = assertEnum(
    String(o.ledgerAction ?? '').trim(),
    BILLING_LEDGER_ACTIONS,
    'billingResolution.ledgerAction',
  );
  const balanceAfterMwk = String(o.balanceAfterMwk ?? '').trim();
  if (!balanceAfterMwk) {
    throw new BadRequestException(
      'billingResolution.balanceAfterMwk is required',
    );
  }
  const reconnectionStep = assertEnum(
    String(o.reconnectionStep ?? '').trim(),
    BILLING_RECONNECTION_STEPS,
    'billingResolution.reconnectionStep',
  );
  const contactRaw = String(o.customerContactChannel ?? '').trim();
  if (!contactRaw) {
    throw new BadRequestException(
      'billingResolution.customerContactChannel is required',
    );
  }
  const customerContactChannel = assertEnum(
    contactRaw,
    BILLING_CUSTOMER_CONTACT_CHANNELS,
    'billingResolution.customerContactChannel',
  );
  const customerNotified = customerNotifiedFromChannel(customerContactChannel);
  const customerSummary = String(o.customerSummary ?? '').trim();
  if (customerSummary.length < 10) {
    throw new BadRequestException(
      'billingResolution.customerSummary must describe what the customer was told (min 10 characters)',
    );
  }
  const ledgerReference = String(o.ledgerReference ?? '').trim() || undefined;
  const reconnectionNotes =
    String(o.reconnectionNotes ?? '').trim() || undefined;
  const additionalNotes = String(o.additionalNotes ?? '').trim() || undefined;

  if (
    ledgerAction !== 'no_ledger_change' &&
    ledgerAction !== 'pending_ict_sync' &&
    !ledgerReference
  ) {
    throw new BadRequestException(
      'billingResolution.ledgerReference is required when a ledger posting or credit was made',
    );
  }

  if (
    (reconnectionStep === 'scheduled' ||
      reconnectionStep === 'pending_payment_clearance') &&
    !reconnectionNotes
  ) {
    throw new BadRequestException(
      'billingResolution.reconnectionNotes is required for this reconnection step',
    );
  }

  if (customerNotified === 'no' && !additionalNotes) {
    throw new BadRequestException(
      'billingResolution.additionalNotes is required when the customer was not notified',
    );
  }

  return {
    transactionIdConfirmed,
    paymentChannel,
    ledgerAction,
    ledgerReference,
    balanceAfterMwk,
    reconnectionStep,
    reconnectionNotes,
    customerContactChannel,
    customerNotified,
    customerSummary,
    additionalNotes,
  };
}

export function stampBillingResolutionAttributes(
  attrs: Record<string, string | number>,
  input: BillingResolutionInput,
): Record<string, string | number> {
  const keys = billingResolutionAttributeKeys();
  const next = { ...attrs };
  next[keys.transactionIdConfirmed] = input.transactionIdConfirmed;
  next[keys.paymentChannel] = input.paymentChannel;
  next[keys.ledgerAction] = input.ledgerAction;
  if (input.ledgerReference) {
    next[keys.ledgerReference] = input.ledgerReference;
  }
  next[keys.balanceAfterMwk] = input.balanceAfterMwk;
  next[keys.reconnectionStep] = input.reconnectionStep;
  if (input.reconnectionNotes) {
    next[keys.reconnectionNotes] = input.reconnectionNotes;
  }
  next[keys.customerContactChannel] = input.customerContactChannel;
  next[keys.customerNotified] = input.customerNotified;
  next[keys.customerSummary] = input.customerSummary;
  next[`${BILLING_RES_ATTR_PREFIX}resolved_at`] = new Date().toISOString();
  return next;
}

export function formatBillingResolutionDetails(
  input: BillingResolutionInput,
  issue: Issue,
): string {
  const account =
    issue.accountNumber ??
    (issue.issueAttributes?.accountNumber != null
      ? String(issue.issueAttributes.accountNumber)
      : '—');
  const reportedTx =
    issue.issueAttributes?.transactionId != null
      ? String(issue.issueAttributes.transactionId)
      : null;
  const lines = [
    'BILLING RESOLUTION',
    `Account: ${account}`,
    reportedTx
      ? `Reported transaction (intake): ${reportedTx}`
      : null,
    `Confirmed transaction ID: ${input.transactionIdConfirmed}`,
    `Payment channel: ${labelBillingPaymentChannel(input.paymentChannel)}`,
    `Ledger action: ${labelBillingLedgerAction(input.ledgerAction)}`,
    input.ledgerReference
      ? `Ledger / statement reference: ${input.ledgerReference}`
      : null,
    `Balance after resolution (MWK): ${input.balanceAfterMwk}`,
    `Reconnection: ${labelBillingReconnectionStep(input.reconnectionStep)}`,
    input.reconnectionNotes ? `Reconnection notes: ${input.reconnectionNotes}` : null,
    `Customer contact: ${input.customerContactChannel.replace(/_/g, ' ')}`,
    `Customer notified: ${input.customerNotified === 'yes' ? 'Yes' : 'No'}`,
    `Customer told: ${input.customerSummary}`,
    input.additionalNotes ? `Internal notes: ${input.additionalNotes}` : null,
  ].filter(Boolean) as string[];
  return lines.join('\n');
}

export function readBillingResolutionFromAttributes(
  attrs: Record<string, string | number> | null | undefined,
): Partial<BillingResolutionInput> | null {
  if (!attrs) return null;
  const keys = billingResolutionAttributeKeys();
  if (!attrs[keys.transactionIdConfirmed]) return null;
  return {
    transactionIdConfirmed: String(attrs[keys.transactionIdConfirmed]),
    paymentChannel: String(
      attrs[keys.paymentChannel],
    ) as BillingPaymentChannel,
    ledgerAction: String(attrs[keys.ledgerAction]) as BillingLedgerAction,
    ledgerReference: attrs[keys.ledgerReference]
      ? String(attrs[keys.ledgerReference])
      : undefined,
    balanceAfterMwk: String(attrs[keys.balanceAfterMwk] ?? ''),
    reconnectionStep: String(
      attrs[keys.reconnectionStep],
    ) as BillingReconnectionStep,
    reconnectionNotes: attrs[keys.reconnectionNotes]
      ? String(attrs[keys.reconnectionNotes])
      : undefined,
    customerContactChannel: String(
      attrs[keys.customerContactChannel] ?? 'phone_call',
    ) as BillingCustomerContactChannel,
    customerNotified:
      attrs[keys.customerNotified] === 'yes' ? 'yes' : 'no',
    customerSummary: String(attrs[keys.customerSummary] ?? ''),
  };
}
